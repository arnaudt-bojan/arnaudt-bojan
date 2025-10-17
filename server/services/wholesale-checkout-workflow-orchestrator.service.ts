/**
 * WholesaleCheckoutWorkflowOrchestrator - B2B Wholesale Checkout Orchestration Service
 * 
 * Centralizes the B2B wholesale checkout workflow with comprehensive error handling,
 * rollback capabilities, and detailed logging.
 * 
 * Architecture:
 * - Simplified orchestration compared to CreateFlowService
 * - Direct sequential flow without complex state machine
 * - Clear rollback/compensation on errors
 * - Comprehensive logging at each step
 * 
 * Wholesale Checkout Flow:
 * 1. Validate cart (MOQ requirements, items exist, in stock, same seller)
 * 2. Calculate totals (wholesale pricing, tax, shipping, currency, deposit/balance split)
 * 3. Create payment intent (Stripe) - DEPOSIT AMOUNT ONLY (not total like B2C)
 * 4. Commit inventory reservations
 * 5. Create wholesale order record (with PO number, VAT, incoterms, payment terms)
 * 6. Create wholesale payment records (deposit + balance)
 * 7. Create shipping metadata (freight collect, buyer pickup, or seller shipping)
 * 8. Send confirmation emails (buyer and seller)
 * 9. Clear cart
 * 
 * Wholesale-Specific Features:
 * - MOQ Validation: Product and variant-level minimum order quantities
 * - Deposit System: Percentage or fixed deposit amount, balance payment later
 * - Payment Terms: Net 30/60/90 payment terms for balance
 * - Wholesale Pricing: Different pricing structure than B2C
 * - Freight Options: Freight collect, buyer pickup, seller shipping
 * - PO Numbers: Purchase order tracking
 * - Incoterms: International shipping terms (FOB, CIF, etc.)
 * 
 * Error Handling & Rollback:
 * - Payment intent fails → Release inventory reservations
 * - Order creation fails → Cancel payment intent, release inventory
 * - Payment record creation fails → Delete order, cancel payment intent, release inventory
 * - Shipping creation fails → Delete order, delete payments, cancel payment intent, release inventory
 * - Notification fails → Log error but don't fail checkout (order already created)
 */

import type { IStorage } from '../storage';
import type { WholesaleCartValidationService } from './wholesale-cart-validation.service';
import type { WholesalePricingService } from './wholesale-pricing.service';
import type { InventoryService } from './inventory.service';
import type { IPaymentProvider } from './payment/payment-provider.interface';
import type { NotificationService } from '../notifications';
import type { WholesaleOrderService } from './wholesale-order.service';
import type { WholesalePaymentService } from './wholesale-payment.service';
import { logger } from '../logger';

/**
 * Wholesale checkout input data
 */
export interface WholesaleCheckoutData {
  buyerId: string;
  sellerId: string;
  cartItems: Array<{
    productId: string;
    quantity: number;
    variant?: {
      size?: string;
      color?: string;
      variantId?: string;
    };
  }>;
  shippingData: {
    shippingType: 'freight_collect' | 'buyer_pickup';
    carrierName?: string;
    freightAccountNumber?: string;
    pickupInstructions?: string;
    pickupAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    invoicingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    shippingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  buyerContact: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  depositTerms?: {
    depositPercentage?: number;
    depositAmount?: number; // In dollars, will be converted to cents
  };
  paymentTerms?: string; // e.g., "Net 30", "Net 60", "Net 90"
  poNumber?: string;
  vatNumber?: string;
  incoterms?: string; // e.g., "FOB", "CIF", "EXW"
  currency?: string; // Target currency (defaults to USD)
  exchangeRate?: number; // Exchange rate snapshot
  expectedShipDate?: Date;
  balancePaymentDueDate?: Date;
  orderDeadline?: Date;
}

/**
 * Wholesale checkout result
 */
export interface WholesaleCheckoutResult {
  success: boolean;
  order?: {
    id: string;
    orderNumber: string;
    subtotalCents: number;
    totalCents: number;
    depositAmountCents: number;
    balanceAmountCents: number;
    currency: string;
    exchangeRate?: string;
  };
  paymentIntentId?: string;
  clientSecret?: string;
  depositPaymentId?: string;
  balancePaymentId?: string;
  error?: string;
  errorCode?: string;
  step?: string; // Which step failed (for debugging)
}

/**
 * Internal state for rollback tracking
 */
interface WholesaleCheckoutState {
  buyerId: string;
  sellerId: string;
  sessionId: string;
  reservationIds: string[];
  paymentIntentId?: string;
  orderId?: string;
  depositPaymentId?: string;
  balancePaymentId?: string;
  shippingMetadataId?: string;
  step: string;
}

/**
 * WholesaleCheckoutWorkflowOrchestrator
 * 
 * Orchestrates the B2B wholesale checkout process with error handling and rollback
 */
export class WholesaleCheckoutWorkflowOrchestrator {
  private state: WholesaleCheckoutState | null = null;

  constructor(
    private storage: IStorage,
    private wholesaleCartValidationService: WholesaleCartValidationService,
    private wholesalePricingService: WholesalePricingService,
    private inventoryService: InventoryService,
    private paymentProvider: IPaymentProvider,
    private notificationService: NotificationService,
    private wholesaleOrderService: WholesaleOrderService,
    private wholesalePaymentService: WholesalePaymentService
  ) {}

  /**
   * Execute B2B wholesale checkout workflow
   * 
   * @param checkoutData - Wholesale checkout data including cart items, shipping, deposit terms
   * @returns WholesaleCheckoutResult with order details or error information
   */
  async executeCheckout(checkoutData: WholesaleCheckoutData): Promise<WholesaleCheckoutResult> {
    // Initialize state for rollback tracking
    const sessionId = `wholesale_${checkoutData.buyerId}`;
    this.state = {
      buyerId: checkoutData.buyerId,
      sellerId: checkoutData.sellerId,
      sessionId,
      reservationIds: [],
      step: 'INIT',
    };

    const startTime = Date.now();
    logger.info('[Wholesale Checkout] Starting checkout workflow', {
      buyerId: checkoutData.buyerId,
      sellerId: checkoutData.sellerId,
      itemCount: checkoutData.cartItems.length,
      currency: checkoutData.currency || 'USD',
      paymentTerms: checkoutData.paymentTerms,
      poNumber: checkoutData.poNumber,
    });

    try {
      // Step 1: Validate cart (MOQ requirements, items exist, same seller)
      this.state.step = 'CART_VALIDATION';
      logger.info('[Wholesale Checkout] Step 1: Validating cart');
      
      const validationResult = await this.wholesaleCartValidationService.validateCart(
        checkoutData.cartItems,
        checkoutData.sellerId
      );

      if (!validationResult.success || !validationResult.valid) {
        const errorMsg = validationResult.errors.join(', ') || 'Cart validation failed';
        logger.error('[Wholesale Checkout] Cart validation failed', {
          errors: validationResult.errors,
        });
        throw new Error(errorMsg);
      }

      const validatedItems = validationResult.validatedItems;
      const subtotalCents = validationResult.subtotalCents;

      logger.info('[Wholesale Checkout] Cart validated successfully', {
        itemCount: validatedItems.length,
        subtotalCents,
        sellerId: checkoutData.sellerId,
      });

      // Step 2: Calculate totals (wholesale pricing, tax, shipping, currency, deposit/balance split)
      this.state.step = 'CALCULATE_TOTALS';
      logger.info('[Wholesale Checkout] Step 2: Calculating wholesale pricing');

      const pricingResult = await this.wholesalePricingService.calculateWholesalePricing({
        cartItems: checkoutData.cartItems,
        sellerId: checkoutData.sellerId,
        depositPercentage: checkoutData.depositTerms?.depositPercentage,
        depositAmountCents: checkoutData.depositTerms?.depositAmount 
          ? Math.round(checkoutData.depositTerms.depositAmount * 100) 
          : undefined,
        shippingAddress: checkoutData.shippingData.shippingAddress || 
                        checkoutData.shippingData.invoicingAddress,
        shippingMethod: checkoutData.shippingData.shippingType,
        currency: checkoutData.currency || 'USD',
      });

      if (!pricingResult.success) {
        logger.error('[Wholesale Checkout] Pricing calculation failed', {
          error: pricingResult.error,
          moqErrors: pricingResult.moqErrors,
        });
        throw new Error(pricingResult.error || 'Failed to calculate pricing');
      }

      const {
        subtotalCents: calculatedSubtotal,
        depositCents,
        balanceCents,
        taxCents,
        taxRate,
        taxCalculationId,
        shippingCents,
        shippingMethod,
        totalCents,
        currency,
        exchangeRate,
      } = pricingResult;

      logger.info('[Wholesale Checkout] Pricing calculated', {
        subtotalCents: calculatedSubtotal,
        depositCents,
        balanceCents,
        taxCents,
        taxRate,
        shippingCents,
        shippingMethod,
        totalCents,
        currency,
        exchangeRate,
      });

      // Step 3: Create payment intent for DEPOSIT AMOUNT ONLY (not total like B2C)
      this.state.step = 'CREATE_PAYMENT_INTENT';
      logger.info('[Wholesale Checkout] Step 3: Creating payment intent for deposit', {
        depositCents,
        currency,
      });

      const paymentIntent = await this.paymentProvider.createPaymentIntent({
        amount: depositCents, // Only deposit amount, not total
        currency: currency.toLowerCase(),
        metadata: {
          orderType: 'wholesale',
          buyerId: checkoutData.buyerId,
          sellerId: checkoutData.sellerId,
          sessionId,
          paymentType: 'deposit',
          depositCents: depositCents.toString(),
          balanceCents: balanceCents.toString(),
          totalCents: totalCents.toString(),
          poNumber: checkoutData.poNumber || 'N/A',
          paymentTerms: checkoutData.paymentTerms || 'Net 30',
        },
        idempotencyKey: `wholesale_checkout_${sessionId}_${Date.now()}`,
      });

      this.state.paymentIntentId = paymentIntent.id;

      logger.info('[Wholesale Checkout] Payment intent created for deposit', {
        paymentIntentId: paymentIntent.id,
        depositCents,
        balanceCents,
        currency,
      });

      // Step 4: Commit inventory reservations
      this.state.step = 'COMMIT_INVENTORY';
      logger.info('[Wholesale Checkout] Step 4: Validating inventory reservations', {
        sessionId,
      });

      // Get existing reservations for this wholesale session
      const reservations = await this.storage.getStockReservationsBySession(sessionId);
      this.state.reservationIds = reservations.map(r => r.id);

      if (reservations.length === 0) {
        logger.warn('[Wholesale Checkout] No inventory reservations found', {
          sessionId,
        });
      } else {
        logger.info('[Wholesale Checkout] Inventory reservations validated', {
          reservationCount: reservations.length,
          sessionId,
        });
      }

      // Step 5: Create wholesale order record
      this.state.step = 'CREATE_ORDER';
      logger.info('[Wholesale Checkout] Step 5: Creating wholesale order');

      // Calculate balance payment due date based on payment terms
      let balancePaymentDueDate = checkoutData.balancePaymentDueDate;
      if (!balancePaymentDueDate && checkoutData.paymentTerms) {
        const netDays = this.extractNetDays(checkoutData.paymentTerms);
        if (netDays > 0) {
          balancePaymentDueDate = new Date();
          balancePaymentDueDate.setDate(balancePaymentDueDate.getDate() + netDays);
        }
      }

      const orderResult = await this.wholesaleOrderService.createOrder({
        sellerId: checkoutData.sellerId,
        buyerId: checkoutData.buyerId,
        orderData: {
          subtotalCents: calculatedSubtotal,
          taxAmountCents: taxCents,
          totalCents,
          currency,
          exchangeRate: exchangeRate?.toString(),
          depositAmountCents: depositCents,
          balanceAmountCents: balanceCents,
          depositPercentage: checkoutData.depositTerms?.depositPercentage,
          paymentTerms: checkoutData.paymentTerms || 'Net 30',
          expectedShipDate: checkoutData.expectedShipDate,
          balancePaymentDueDate,
          orderDeadline: checkoutData.orderDeadline,
          poNumber: checkoutData.poNumber,
          vatNumber: checkoutData.vatNumber,
          incoterms: checkoutData.incoterms,
          buyerCompanyName: checkoutData.buyerContact.company,
          buyerEmail: checkoutData.buyerContact.email,
          buyerName: checkoutData.buyerContact.name,
        },
        items: validatedItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          productSku: item.matchingVariant?.sku || undefined,
          quantity: item.quantity,
          moq: item.moq,
          unitPriceCents: item.unitPriceCents,
          subtotalCents: item.subtotalCents,
          variant: item.variant,
        })),
      });

      if (!orderResult.success || !orderResult.order) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      this.state.orderId = orderResult.order.id;

      logger.info('[Wholesale Checkout] Wholesale order created', {
        orderId: orderResult.order.id,
        orderNumber: orderResult.order.orderNumber,
        totalCents,
        depositCents,
        balanceCents,
      });

      // Step 6: Commit inventory reservations to order
      if (this.state.reservationIds.length > 0) {
        logger.info('[Wholesale Checkout] Step 6a: Committing inventory reservations to order', {
          sessionId,
          orderId: this.state.orderId,
          reservationCount: this.state.reservationIds.length,
        });

        try {
          const commitResult = await this.inventoryService.commitReservationsBySession(
            sessionId,
            this.state.orderId
          );

          if (!commitResult.success) {
            logger.error('[Wholesale Checkout] Failed to commit inventory reservations', {
              sessionId,
              orderId: this.state.orderId,
              error: commitResult.error,
            });
            // Note: We don't fail the checkout if reservation commit fails
            // The order is already created, reservations will expire naturally
          } else {
            logger.info('[Wholesale Checkout] Inventory reservations committed', {
              committedCount: commitResult.committed,
              sessionId,
              orderId: this.state.orderId,
            });
          }
        } catch (commitError: any) {
          logger.error('[Wholesale Checkout] Error committing inventory reservations', {
            orderId: this.state.orderId,
            error: commitError.message,
          });
          // Don't fail checkout if reservation commit fails
        }
      }

      // Step 7: Create wholesale payment records (deposit + balance)
      this.state.step = 'CREATE_PAYMENT_RECORDS';
      logger.info('[Wholesale Checkout] Step 7: Creating payment records');

      // Create deposit payment record
      const depositPaymentResult = await this.wholesalePaymentService.createDepositPayment(
        this.state.orderId,
        depositCents,
        currency,
        exchangeRate?.toString()
      );

      if (!depositPaymentResult.success || !depositPaymentResult.payment) {
        throw new Error(depositPaymentResult.error || 'Failed to create deposit payment record');
      }

      this.state.depositPaymentId = depositPaymentResult.payment.id;

      logger.info('[Wholesale Checkout] Deposit payment record created', {
        depositPaymentId: this.state.depositPaymentId,
        depositCents,
        currency,
      });

      // Create balance payment record (if balance > 0)
      if (balanceCents > 0) {
        const balancePaymentResult = await this.wholesalePaymentService.createBalancePayment(
          this.state.orderId,
          balanceCents,
          balancePaymentDueDate,
          currency,
          exchangeRate?.toString()
        );

        if (!balancePaymentResult.success || !balancePaymentResult.payment) {
          throw new Error(balancePaymentResult.error || 'Failed to create balance payment record');
        }

        this.state.balancePaymentId = balancePaymentResult.payment.id;

        logger.info('[Wholesale Checkout] Balance payment record created', {
          balancePaymentId: this.state.balancePaymentId,
          balanceCents,
          dueDate: balancePaymentDueDate?.toISOString(),
          currency,
        });
      } else {
        logger.info('[Wholesale Checkout] No balance payment needed (deposit = total)');
      }

      // Step 8: Create shipping metadata
      this.state.step = 'CREATE_SHIPPING';
      logger.info('[Wholesale Checkout] Step 8: Creating shipping metadata', {
        shippingType: checkoutData.shippingData.shippingType,
      });

      try {
        const shippingMetadata = await this.storage.createShippingMetadata({
          orderId: this.state.orderId,
          shippingType: checkoutData.shippingData.shippingType,
          carrier: checkoutData.shippingData.carrierName,
          freightAccount: checkoutData.shippingData.freightAccountNumber,
          pickupInstructions: checkoutData.shippingData.pickupInstructions,
          pickupAddress: checkoutData.shippingData.pickupAddress,
        });

        if (shippingMetadata?.id) {
          this.state.shippingMetadataId = shippingMetadata.id;
          logger.info('[Wholesale Checkout] Shipping metadata created', {
            shippingMetadataId: this.state.shippingMetadataId,
            shippingType: checkoutData.shippingData.shippingType,
          });
        }
      } catch (shippingError: any) {
        logger.error('[Wholesale Checkout] Failed to create shipping metadata', {
          error: shippingError.message,
        });
        // Note: Shipping creation failure triggers rollback
        throw new Error(`Failed to create shipping metadata: ${shippingError.message}`);
      }

      // Step 9: Send confirmation emails (buyer and seller)
      this.state.step = 'SEND_NOTIFICATIONS';
      logger.info('[Wholesale Checkout] Step 9: Sending confirmation emails');

      try {
        // Get seller info for email
        const seller = await this.storage.getUser(checkoutData.sellerId);
        
        // Get order items for email
        const orderItems = await this.storage.getWholesaleOrderItems(this.state.orderId);

        if (seller) {
          await this.notificationService.sendWholesaleOrderConfirmation(
            orderResult.order,
            seller,
            orderItems
          );

          logger.info('[Wholesale Checkout] Order confirmation emails sent', {
            orderId: this.state.orderId,
            buyerEmail: checkoutData.buyerContact.email,
            sellerEmail: seller.email || 'unknown',
          });
        } else {
          logger.warn('[Wholesale Checkout] Seller not found, skipping email notification', {
            sellerId: checkoutData.sellerId,
          });
        }
      } catch (emailError: any) {
        // Note: Email failure doesn't fail checkout (order already created)
        logger.error('[Wholesale Checkout] Failed to send confirmation emails', {
          error: emailError.message,
          orderId: this.state.orderId,
        });
      }

      // Step 10: Clear cart
      this.state.step = 'CLEAR_CART';
      logger.info('[Wholesale Checkout] Step 10: Clearing wholesale cart');

      try {
        await this.storage.clearWholesaleCart(checkoutData.buyerId);
        logger.info('[Wholesale Checkout] Cart cleared', {
          buyerId: checkoutData.buyerId,
        });
      } catch (cartError: any) {
        // Note: Cart clear failure doesn't fail checkout
        logger.error('[Wholesale Checkout] Failed to clear cart', {
          error: cartError.message,
          buyerId: checkoutData.buyerId,
        });
      }

      // Success!
      const duration = Date.now() - startTime;
      logger.info('[Wholesale Checkout] Checkout completed successfully', {
        orderId: this.state.orderId,
        orderNumber: orderResult.order.orderNumber,
        duration: `${duration}ms`,
        depositCents,
        balanceCents,
        totalCents,
        currency,
      });

      return {
        success: true,
        order: {
          id: orderResult.order.id,
          orderNumber: orderResult.order.orderNumber,
          subtotalCents: calculatedSubtotal,
          totalCents,
          depositAmountCents: depositCents,
          balanceAmountCents: balanceCents,
          currency,
          exchangeRate: exchangeRate?.toString(),
        },
        paymentIntentId: this.state.paymentIntentId,
        clientSecret: paymentIntent.clientSecret,
        depositPaymentId: this.state.depositPaymentId,
        balancePaymentId: this.state.balancePaymentId,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('[Wholesale Checkout] Checkout failed', {
        error: error.message,
        step: this.state?.step,
        duration: `${duration}ms`,
        buyerId: checkoutData.buyerId,
        sellerId: checkoutData.sellerId,
      });

      // Rollback created resources
      await this.rollback();

      return {
        success: false,
        error: error.message || 'Checkout failed',
        errorCode: 'CHECKOUT_FAILED',
        step: this.state?.step,
      };
    } finally {
      // Clear state
      this.state = null;
    }
  }

  /**
   * Rollback created resources on checkout failure
   * 
   * Cleanup order (reverse of creation):
   * 1. Release inventory reservations
   * 2. Cancel payment intent
   * 3. Delete shipping metadata
   * 4. Delete balance payment record
   * 5. Delete deposit payment record
   * 6. Delete order items
   * 7. Delete order
   */
  private async rollback(): Promise<void> {
    if (!this.state) {
      return;
    }

    logger.warn('[Wholesale Checkout] Initiating rollback', {
      step: this.state.step,
      orderId: this.state.orderId,
      paymentIntentId: this.state.paymentIntentId,
      depositPaymentId: this.state.depositPaymentId,
      balancePaymentId: this.state.balancePaymentId,
      shippingMetadataId: this.state.shippingMetadataId,
    });

    const rollbackResults: string[] = [];

    try {
      // Step 1: Release inventory reservations
      if (this.state.reservationIds.length > 0) {
        try {
          logger.info('[Wholesale Checkout Rollback] Releasing inventory reservations', {
            sessionId: this.state.sessionId,
            reservationCount: this.state.reservationIds.length,
          });

          for (const reservationId of this.state.reservationIds) {
            await this.inventoryService.releaseReservation(reservationId);
          }

          rollbackResults.push(
            `Released ${this.state.reservationIds.length} inventory reservations`
          );
        } catch (err: any) {
          logger.error('[Wholesale Checkout Rollback] Failed to release inventory', err);
          rollbackResults.push(`Failed to release inventory: ${err.message}`);
        }
      }

      // Step 2: Cancel payment intent (if created)
      if (this.state.paymentIntentId) {
        try {
          logger.info('[Wholesale Checkout Rollback] Canceling payment intent', {
            paymentIntentId: this.state.paymentIntentId,
          });

          await this.paymentProvider.cancelPayment(this.state.paymentIntentId);
          rollbackResults.push(`Canceled payment intent ${this.state.paymentIntentId}`);
        } catch (err: any) {
          logger.error('[Wholesale Checkout Rollback] Failed to cancel payment intent', err);
          rollbackResults.push(`Failed to cancel payment intent: ${err.message}`);
        }
      }

      // Step 3: Delete shipping metadata (if created)
      if (this.state.shippingMetadataId) {
        try {
          logger.info('[Wholesale Checkout Rollback] Deleting shipping metadata', {
            shippingMetadataId: this.state.shippingMetadataId,
          });

          await this.storage.deleteWholesaleShippingDetails(this.state.shippingMetadataId);
          rollbackResults.push(`Deleted shipping metadata ${this.state.shippingMetadataId}`);
        } catch (err: any) {
          logger.error('[Wholesale Checkout Rollback] Failed to delete shipping metadata', err);
          rollbackResults.push(`Failed to delete shipping metadata: ${err.message}`);
        }
      }

      // Step 4: Delete balance payment record (if created)
      if (this.state.balancePaymentId) {
        try {
          logger.info('[Wholesale Checkout Rollback] Deleting balance payment', {
            balancePaymentId: this.state.balancePaymentId,
          });

          await this.storage.deleteWholesalePayment(this.state.balancePaymentId);
          rollbackResults.push(`Deleted balance payment ${this.state.balancePaymentId}`);
        } catch (err: any) {
          logger.error('[Wholesale Checkout Rollback] Failed to delete balance payment', err);
          rollbackResults.push(`Failed to delete balance payment: ${err.message}`);
        }
      }

      // Step 5: Delete deposit payment record (if created)
      if (this.state.depositPaymentId) {
        try {
          logger.info('[Wholesale Checkout Rollback] Deleting deposit payment', {
            depositPaymentId: this.state.depositPaymentId,
          });

          await this.storage.deleteWholesalePayment(this.state.depositPaymentId);
          rollbackResults.push(`Deleted deposit payment ${this.state.depositPaymentId}`);
        } catch (err: any) {
          logger.error('[Wholesale Checkout Rollback] Failed to delete deposit payment', err);
          rollbackResults.push(`Failed to delete deposit payment: ${err.message}`);
        }
      }

      // Step 6: Delete order items (if order created)
      if (this.state.orderId) {
        try {
          logger.info('[Wholesale Checkout Rollback] Deleting order items', {
            orderId: this.state.orderId,
          });

          const orderItems = await this.storage.getWholesaleOrderItems(this.state.orderId);
          
          for (const item of orderItems) {
            await this.storage.deleteWholesaleOrderItem(item.id);
          }

          rollbackResults.push(`Deleted ${orderItems.length} order items`);
        } catch (err: any) {
          logger.error('[Wholesale Checkout Rollback] Failed to delete order items', err);
          rollbackResults.push(`Failed to delete order items: ${err.message}`);
        }
      }

      // Step 7: Delete order (if created)
      if (this.state.orderId) {
        try {
          logger.info('[Wholesale Checkout Rollback] Deleting order', {
            orderId: this.state.orderId,
          });

          await this.storage.deleteWholesaleOrder(this.state.orderId);
          rollbackResults.push(`Deleted order ${this.state.orderId}`);
        } catch (err: any) {
          logger.error('[Wholesale Checkout Rollback] Failed to delete order', err);
          rollbackResults.push(`Failed to delete order: ${err.message}`);
        }
      }

      logger.info('[Wholesale Checkout Rollback] Rollback completed', {
        resultCount: rollbackResults.length,
        results: rollbackResults.join('; '),
      });

    } catch (error: any) {
      logger.error('[Wholesale Checkout Rollback] Rollback process failed', {
        error: error.message,
        results: rollbackResults,
      });
    }
  }

  /**
   * Extract net days from payment terms string
   * e.g., "Net 30" -> 30, "Net 60" -> 60
   */
  private extractNetDays(paymentTerms: string): number {
    const match = paymentTerms.match(/Net\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }
}
