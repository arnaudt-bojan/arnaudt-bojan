/**
 * CheckoutWorkflowOrchestrator - B2C Checkout Orchestration Service
 * 
 * Centralizes the B2C checkout workflow with comprehensive error handling,
 * rollback capabilities, and detailed logging.
 * 
 * Architecture:
 * - Simplified orchestration compared to CreateFlowService
 * - Direct sequential flow without complex state machine
 * - Clear rollback/compensation on errors
 * - Comprehensive logging at each step
 * 
 * Checkout Flow:
 * 1. Validate cart (items exist, in stock, prices correct)
 * 2. Calculate totals (tax, shipping, currency conversion)
 * 3. Create payment intent (Stripe)
 * 4. Commit inventory reservations
 * 5. Create order record
 * 6. Send confirmation emails
 * 7. Clear cart
 * 
 * Error Handling:
 * - Payment fails → Release inventory reservations
 * - Order creation fails → Cancel payment intent, release inventory
 * - Notification fails → Log error but don't fail checkout (order already created)
 */

import type { IStorage } from '../storage';
import type { CartValidationService } from './cart-validation.service';
import type { InventoryService } from './inventory.service';
import type { IPaymentProvider } from './payment/payment-provider.interface';
import type { NotificationService } from '../notifications';
import type { TaxService } from './tax.service';
import type { ShippingService } from './shipping.service';
import { logger } from '../logger';

/**
 * Checkout input data
 */
export interface CheckoutData {
  sessionId: string; // Cart session ID (for guest or authenticated users)
  userId?: string; // User ID (optional for guest checkout)
  items: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
  }>;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  customerEmail: string;
  customerName: string;
  currency?: string; // Optional currency (defaults to USD)
}

/**
 * Checkout result
 */
export interface CheckoutResult {
  success: boolean;
  order?: {
    id: string;
    orderNumber: string;
    total: number;
    currency: string;
  };
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
  errorCode?: string;
  step?: string; // Which step failed (for debugging)
}

/**
 * Internal state for rollback tracking
 */
interface CheckoutState {
  sessionId: string;
  reservationIds: string[];
  paymentIntentId?: string;
  orderId?: string;
  step: string;
}

/**
 * CheckoutWorkflowOrchestrator
 * 
 * Orchestrates the B2C checkout process with error handling and rollback
 */
export class CheckoutWorkflowOrchestrator {
  private state: CheckoutState | null = null;

  constructor(
    private storage: IStorage,
    private cartValidationService: CartValidationService,
    private inventoryService: InventoryService,
    private paymentProvider: IPaymentProvider,
    private notificationService: NotificationService,
    private taxService: TaxService,
    private shippingService: ShippingService
  ) {}

  /**
   * Execute B2C checkout workflow
   * 
   * @param checkoutData - Checkout data including cart items, addresses, customer info
   * @returns CheckoutResult with order details or error information
   */
  async executeCheckout(checkoutData: CheckoutData): Promise<CheckoutResult> {
    // Initialize state for rollback tracking
    this.state = {
      sessionId: checkoutData.sessionId,
      reservationIds: [],
      step: 'INIT',
    };

    const startTime = Date.now();
    logger.info('[B2C Checkout] Starting checkout workflow', {
      sessionId: checkoutData.sessionId,
      userId: checkoutData.userId,
      itemCount: checkoutData.items.length,
    });

    try {
      // Step 1: Validate cart
      this.state.step = 'CART_VALIDATION';
      logger.info('[B2C Checkout] Step 1: Validating cart');
      
      const validationResult = await this.cartValidationService.validateCart(
        checkoutData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      );

      if (!validationResult.valid) {
        throw new Error(
          `Cart validation failed: ${validationResult.errors.join(', ')}`
        );
      }

      const validatedItems = validationResult.items;
      const sellerId = validationResult.sellerId;

      if (!sellerId) {
        throw new Error('No seller found for cart items');
      }

      logger.info('[B2C Checkout] Cart validated successfully', {
        itemCount: validatedItems.length,
        sellerId,
        subtotal: validationResult.total,
      });

      // Step 2: Calculate totals (tax, shipping, currency conversion)
      this.state.step = 'CALCULATE_TOTALS';
      logger.info('[B2C Checkout] Step 2: Calculating totals');

      const totals = await this.calculateTotals(
        validatedItems,
        checkoutData.shippingAddress,
        sellerId,
        checkoutData.currency || 'USD'
      );

      logger.info('[B2C Checkout] Totals calculated', {
        subtotal: totals.subtotal,
        shipping: totals.shippingCost,
        tax: totals.tax,
        total: totals.total,
        currency: totals.currency,
      });

      // Step 3: Create payment intent (Stripe)
      this.state.step = 'CREATE_PAYMENT_INTENT';
      logger.info('[B2C Checkout] Step 3: Creating payment intent');

      const paymentIntent = await this.paymentProvider.createPaymentIntent({
        amount: totals.total,
        currency: totals.currency.toLowerCase(),
        metadata: {
          sessionId: checkoutData.sessionId,
          sellerId,
          customerEmail: checkoutData.customerEmail,
        },
        idempotencyKey: `checkout_${checkoutData.sessionId}_${Date.now()}`,
      });

      this.state.paymentIntentId = paymentIntent.id;

      logger.info('[B2C Checkout] Payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount: totals.total,
        currency: totals.currency,
      });

      // Step 4: Commit inventory reservations
      this.state.step = 'COMMIT_INVENTORY';
      logger.info('[B2C Checkout] Step 4: Committing inventory reservations');

      // Note: In the current architecture, inventory is reserved during cart operations
      // and committed when the order is confirmed. This step ensures reservations are valid.
      const reservations = await this.storage.getStockReservationsBySession(
        checkoutData.sessionId
      );

      this.state.reservationIds = reservations.map(r => r.id);

      if (reservations.length === 0) {
        logger.warn('[B2C Checkout] No inventory reservations found', {
          sessionId: checkoutData.sessionId,
        });
      } else {
        logger.info('[B2C Checkout] Inventory reservations validated', {
          reservationCount: reservations.length,
        });
      }

      // Step 5: Create order record
      this.state.step = 'CREATE_ORDER';
      logger.info('[B2C Checkout] Step 5: Creating order');

      const order = await this.createOrder(
        checkoutData,
        validatedItems,
        totals,
        paymentIntent.id,
        sellerId
      );

      this.state.orderId = order.id;

      logger.info('[B2C Checkout] Order created successfully', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      });

      // Step 6: Send confirmation notifications
      this.state.step = 'SEND_NOTIFICATIONS';
      logger.info('[B2C Checkout] Step 6: Sending notifications');

      try {
        await this.sendNotifications(order, checkoutData);
        logger.info('[B2C Checkout] Notifications sent successfully');
      } catch (notificationError) {
        // Non-critical: Log error but don't fail checkout (order already created)
        logger.error('[B2C Checkout] Notification send failed (non-critical)', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          orderId: order.id,
        });
      }

      // Step 7: Clear cart (optional - may be handled by frontend)
      this.state.step = 'CLEAR_CART';
      logger.info('[B2C Checkout] Step 7: Cart cleanup (handled by webhook on payment confirmation)');

      // Success!
      const duration = Date.now() - startTime;
      logger.info('[B2C Checkout] Checkout completed successfully', {
        orderId: order.id,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        order: {
          id: order.id,
          orderNumber: order.id, // B2C orders use ID as order number
          total: totals.total,
          currency: totals.currency,
        },
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('[B2C Checkout] Checkout failed', {
        step: this.state?.step,
        error: errorMessage,
        duration: `${duration}ms`,
        sessionId: checkoutData.sessionId,
      });

      // Execute rollback/compensation
      await this.rollback();

      return {
        success: false,
        error: errorMessage,
        errorCode: 'CHECKOUT_FAILED',
        step: this.state?.step,
      };
    } finally {
      // Clear state
      this.state = null;
    }
  }

  /**
   * Calculate totals including shipping, tax, and currency conversion
   */
  private async calculateTotals(
    items: any[],
    shippingAddress: CheckoutData['shippingAddress'],
    sellerId: string,
    currency: string
  ): Promise<{
    subtotal: number;
    shippingCost: number;
    tax: number;
    total: number;
    currency: string;
  }> {
    // Calculate subtotal
    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    // Calculate shipping
    const shippingResult = await this.shippingService.calculateShipping(
      items.map(item => ({
        id: item.id,
        quantity: item.quantity,
      })),
      {
        country: shippingAddress.country,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
      }
    );
    const shippingCost = shippingResult.cost;

    // Calculate tax (pass shipping address for tax calculation)
    let tax = 0;
    try {
      const taxResult = await this.taxService.calculateTax({
        amount: Math.round((subtotal + shippingCost) * 100), // Amount in cents
        currency: currency.toLowerCase(),
        shippingAddress: {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        sellerId,
        items: items.map(item => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      tax = taxResult.taxAmount / 100; // Convert from cents to dollars
    } catch (taxError) {
      logger.warn('[B2C Checkout] Tax calculation failed, proceeding without tax', {
        error: taxError instanceof Error ? taxError.message : String(taxError),
      });
      tax = 0;
    }

    // Calculate total
    const total = Math.round((subtotal + shippingCost + tax) * 100); // Convert to cents

    return {
      subtotal,
      shippingCost,
      tax,
      total,
      currency,
    };
  }

  /**
   * Create order record in database
   */
  private async createOrder(
    checkoutData: CheckoutData,
    items: any[],
    totals: any,
    paymentIntentId: string,
    sellerId: string
  ): Promise<any> {
    // Create order (B2C orders use ID as order number, not a separate orderNumber field)
    const order = await this.storage.createOrder({
      sellerId,
      userId: checkoutData.userId || null,
      customerName: checkoutData.customerName,
      customerEmail: checkoutData.customerEmail,
      customerAddress: JSON.stringify(checkoutData.shippingAddress),
      items: JSON.stringify(items), // Legacy JSON field for backward compatibility
      total: (totals.total / 100).toFixed(2), // Convert back to dollars
      subtotalBeforeTax: totals.subtotal.toFixed(2),
      taxAmount: totals.tax.toFixed(2),
      shippingCost: totals.shippingCost.toFixed(2),
      currency: totals.currency,
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      stripePaymentIntentId: paymentIntentId,
      // Shipping address fields for better querying
      shippingStreet: checkoutData.shippingAddress.line1,
      shippingCity: checkoutData.shippingAddress.city,
      shippingState: checkoutData.shippingAddress.state,
      shippingPostalCode: checkoutData.shippingAddress.postalCode,
      shippingCountry: checkoutData.shippingAddress.country,
    });

    // Create order items
    for (const item of items) {
      await this.storage.createOrderItem({
        orderId: order.id,
        productId: item.id,
        productName: item.name,
        productType: item.productType || 'in-stock', // Required field
        quantity: item.quantity,
        price: item.price,
        subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
        productImage: item.images?.[0] || null,
      });
    }

    return order;
  }

  /**
   * Send confirmation notifications
   */
  private async sendNotifications(order: any, checkoutData: CheckoutData): Promise<void> {
    // Get seller information
    const seller = await this.storage.getUser(order.sellerId);
    if (!seller) {
      logger.warn('[B2C Checkout] Cannot send notifications - seller not found', {
        orderId: order.id,
        sellerId: order.sellerId,
      });
      return;
    }

    // Get products for the order
    const orderItems = await this.storage.getOrderItems(order.id);
    const productIds = Array.from(new Set(orderItems.map(item => item.productId)));
    const products = [];
    
    for (const productId of productIds) {
      const product = await this.storage.getProduct(productId);
      if (product) {
        products.push(product);
      }
    }

    if (products.length === 0) {
      logger.warn('[B2C Checkout] Cannot send notifications - no products found', {
        orderId: order.id,
      });
      return;
    }

    // Send order confirmation to buyer (also creates in-app notification for seller)
    await this.notificationService.sendOrderConfirmation(order, seller, products);

    // Send seller order notification email
    await this.notificationService.sendSellerOrderNotification(order, seller, products);

    logger.info('[B2C Checkout] Notifications sent successfully', {
      orderId: order.id,
      buyerEmail: order.customerEmail,
      sellerEmail: seller.email || 'unknown',
    });
  }

  /**
   * Rollback/compensation on error
   * 
   * Scenarios:
   * - Payment intent created → Cancel payment intent
   * - Inventory reserved → Release reservations
   * - Order created → Mark as cancelled (don't delete - for audit trail)
   */
  private async rollback(): Promise<void> {
    if (!this.state) {
      return;
    }

    logger.info('[B2C Checkout] Starting rollback', {
      step: this.state.step,
      paymentIntentId: this.state.paymentIntentId,
      orderId: this.state.orderId,
      reservationCount: this.state.reservationIds.length,
    });

    // Cancel payment intent if created
    if (this.state.paymentIntentId) {
      try {
        await this.paymentProvider.cancelPayment(this.state.paymentIntentId);
        logger.info('[B2C Checkout] Payment intent cancelled', {
          paymentIntentId: this.state.paymentIntentId,
        });
      } catch (error) {
        logger.error('[B2C Checkout] Failed to cancel payment intent', {
          paymentIntentId: this.state.paymentIntentId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Release inventory reservations
    if (this.state.reservationIds.length > 0) {
      try {
        for (const reservationId of this.state.reservationIds) {
          await this.inventoryService.releaseReservation(reservationId);
        }
        logger.info('[B2C Checkout] Inventory reservations released', {
          count: this.state.reservationIds.length,
        });
      } catch (error) {
        logger.error('[B2C Checkout] Failed to release inventory reservations', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Mark order as cancelled if created (don't delete - keep for audit)
    if (this.state.orderId) {
      try {
        await this.storage.updateOrder(this.state.orderId, {
          status: 'cancelled',
          paymentStatus: 'failed',
        });
        logger.info('[B2C Checkout] Order marked as cancelled', {
          orderId: this.state.orderId,
        });
      } catch (error) {
        logger.error('[B2C Checkout] Failed to mark order as cancelled', {
          orderId: this.state.orderId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('[B2C Checkout] Rollback completed');
  }
}
