/**
 * RefundService - Comprehensive refund orchestration service
 * 
 * Implements e-commerce refund best practices:
 * - Item-level refund tracking (products, shipping, tax, adjustments)
 * - Refundable amount validation to prevent over-refunding
 * - Stripe integration for payment refunds
 * - Idempotent operations using refund IDs
 * - Automatic order payment status updates
 * 
 * Architecture Pattern: Service layer with dependency injection
 */

import type { IStorage } from '../storage';
import type { IPaymentProvider } from './payment/payment-provider.interface';
import type { InsertRefund, InsertRefundLineItem } from '@shared/schema';
import type { NotificationService } from '../notifications';
import { logger } from '../logger';

export interface CreateRefundRequest {
  orderId: string;
  sellerId: string;
  reason?: string;
  // ARCHITECTURE 3: Frontend sends ONLY IDs and quantities - NO amounts!
  // Backend calculates all amounts from its own data
  items?: Array<{
    orderItemId: string;
    quantity: number;
  }>;
  refundShipping?: boolean;
  refundTax?: boolean;
  manualOverride?: {
    totalAmount: string;
    reason: string;
  };
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  totalAmount: string;
  stripeRefundId?: string;
  error?: string;
}

export interface CreateWholesaleRefundRequest {
  orderId: string;
  sellerId: string;
  refundType: 'deposit' | 'balance' | 'full' | 'partial';
  reason?: string;
  customRefundAmountCents?: number; // In cents (wholesale uses cents-based pricing)
  items?: Array<{
    itemId: string; // wholesale_order_items.id
    quantity: number;
    amountCents?: number; // Optional custom amount per item
  }>;
  wholesalePaymentId?: string; // Specific payment to refund
}

export interface WholesaleRefundResult {
  success: boolean;
  refundId: string;
  totalAmount: string;
  stripeRefundId?: string;
  error?: string;
}

export class RefundService {
  constructor(
    private storage: IStorage,
    private paymentProvider: IPaymentProvider,
    private notificationService: NotificationService
  ) {}

  /**
   * Create a refund with validation and Stripe processing
   * 
   * Flow:
   * 1. Validate order belongs to seller
   * 2. Calculate refundable amount
   * 3. Validate refund request against refundable amount (per-item)
   * 4. Create refund record
   * 5. Create refund line items
   * 6. Process Stripe refund with idempotency
   * 7. Update refund status
   * 8. Update order payment status
   * 9. Rollback on Stripe failure
   */
  async createRefund(request: CreateRefundRequest): Promise<RefundResult> {
    let createdRefund: any = null;
    let createdLineItems: any[] = [];

    try {
      // Step 1: Validate order and seller ownership
      const order = await this.storage.getOrder(request.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.sellerId !== request.sellerId) {
        throw new Error('Unauthorized: Order does not belong to this seller');
      }

      // Step 2: Get refundable amounts - backend is source of truth
      const refundableData = await this.storage.getRefundableAmountForOrder(request.orderId);
      const maxRefundable = parseFloat(refundableData.totalRefundable);

      // Step 3: ARCHITECTURE 3 - Backend calculates ALL amounts from its own data
      let totalRefundAmount = 0;
      const calculatedLineItems: Array<{
        type: 'product' | 'shipping' | 'tax' | 'adjustment';
        orderItemId?: string;
        quantity?: number;
        amount: string;
        description: string;
      }> = [];

      // Step 3a: Calculate product item amounts
      if (request.items) {
        for (const item of request.items) {
          const itemRefundable = refundableData.items.find(i => i.itemId === item.orderItemId);
          if (!itemRefundable) {
            throw new Error(`Order item ${item.orderItemId} not found or invalid`);
          }

          // Validate quantity
          if (item.quantity > itemRefundable.refundableQuantity) {
            throw new Error(
              `Cannot refund ${item.quantity} units of ${itemRefundable.productName}. Only ${itemRefundable.refundableQuantity} units are refundable.`
            );
          }

          // Calculate proportional amount based on refundable amount
          const itemMaxRefundable = parseFloat(itemRefundable.refundableAmount);
          const proportionalAmount = (itemMaxRefundable / itemRefundable.refundableQuantity) * item.quantity;
          
          calculatedLineItems.push({
            type: 'product',
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            amount: proportionalAmount.toFixed(2),
            description: itemRefundable.productName,
          });

          totalRefundAmount += proportionalAmount;
        }
      }

      // Step 3b: Calculate shipping amount
      if (request.refundShipping && refundableData.shipping) {
        const shippingRefundable = parseFloat(refundableData.shipping.refundable);
        if (shippingRefundable > 0) {
          calculatedLineItems.push({
            type: 'shipping',
            amount: shippingRefundable.toFixed(2),
            description: 'Shipping refund',
          });
          totalRefundAmount += shippingRefundable;
        }
      }

      // Step 3c: Calculate tax amount
      if (request.refundTax && refundableData.tax) {
        const taxRefundable = parseFloat(refundableData.tax.refundable);
        if (taxRefundable > 0) {
          calculatedLineItems.push({
            type: 'tax',
            amount: taxRefundable.toFixed(2),
            description: 'Tax refund',
          });
          totalRefundAmount += taxRefundable;
        }
      }

      // Step 3d: Apply manual override if provided (must still be <= max refundable)
      if (request.manualOverride) {
        totalRefundAmount = parseFloat(request.manualOverride.totalAmount);
      }

      // Step 4: Validate refund amount doesn't exceed refundable amount
      if (totalRefundAmount > maxRefundable + 0.01) { // Allow 1 cent tolerance for rounding
        throw new Error(
          `Refund amount ${totalRefundAmount.toFixed(2)} exceeds refundable amount ${maxRefundable.toFixed(2)}`
        );
      }

      if (totalRefundAmount <= 0) {
        throw new Error('Refund amount must be greater than zero');
      }

      // Step 5: Create refund record
      const refundData: InsertRefund = {
        orderId: request.orderId,
        totalAmount: totalRefundAmount.toFixed(2),
        currency: order.currency || 'USD',
        reason: request.reason || (request.manualOverride?.reason),
        status: 'pending',
        processedBy: request.sellerId,
      };

      const createdRefund = await this.storage.createRefund(refundData);
      logger.info(`[Refund] Created refund ${createdRefund.id} for order ${request.orderId}`);

      // Step 6: Create refund line items (using backend-calculated amounts)
      const lineItemsData: InsertRefundLineItem[] = calculatedLineItems.map(item => ({
        refundId: createdRefund.id,
        orderItemId: item.orderItemId || null,
        type: item.type,
        quantity: item.quantity || null,
        amount: item.amount,
        description: item.description || null,
      }));

      createdLineItems = await this.storage.createRefundLineItems(lineItemsData);
      logger.info(`[Refund] Created ${createdLineItems.length} line items for refund ${createdRefund.id}`);

      // Step 7: Process Stripe refund with idempotency and proper currency handling
      let stripeRefundId: string | undefined;
      try {
        // Get the payment intent ID from the order
        const paymentIntentId = order.stripePaymentIntentId;
        if (!paymentIntentId) {
          throw new Error('No payment intent found for this order');
        }

        // Get currency from order, default to USD
        const currency = order.currency || 'USD';

        // Convert to smallest currency unit for Stripe using proper currency divisor
        const amountInSmallestUnit = this.convertToSmallestUnit(totalRefundAmount, currency);

        // Use refund ID as idempotency key to prevent duplicate refunds
        const idempotencyKey = `refund_${createdRefund.id}`;

        const stripeRefund = await this.paymentProvider.createRefund({
          paymentIntentId,
          amount: amountInSmallestUnit,
          reason: 'requested_by_customer',
          metadata: {
            orderId: request.orderId,
            refundId: createdRefund.id,
            sellerId: request.sellerId,
          },
        }, idempotencyKey);

        stripeRefundId = stripeRefund.id;
        logger.info(`[Refund] Stripe refund ${stripeRefundId} created for refund ${createdRefund.id}`);

        // Step 8: Update refund status with Stripe refund ID
        await this.storage.updateRefundStatus(
          createdRefund.id,
          stripeRefund.status,
          stripeRefundId
        );

        // Step 9: Update order payment status
        await this.updateOrderPaymentStatus(request.orderId);

        // Step 10: Update order items refunded amounts
        for (const lineItem of calculatedLineItems) {
          if (lineItem.type === 'product' && lineItem.orderItemId && lineItem.quantity) {
            const orderItem = await this.storage.getOrderItemById(lineItem.orderItemId);
            if (orderItem) {
              const newRefundedQty = (orderItem.refundedQuantity || 0) + lineItem.quantity;
              const newRefundedAmount = (parseFloat(orderItem.refundedAmount || '0') + parseFloat(lineItem.amount)).toFixed(2);
              
              const newStatus = newRefundedQty >= orderItem.quantity ? 'refunded' : orderItem.itemStatus;
              
              await this.storage.updateOrderItemRefund(
                lineItem.orderItemId,
                newRefundedQty,
                newRefundedAmount,
                newStatus
              );
            }
          }
        }

        // Step 11: Send refund confirmation email to buyer
        try {
          const seller = await this.storage.getUser(order.sellerId);
          if (seller) {
            // Build line items with descriptions for email (using backend-calculated amounts)
            const emailLineItems = calculatedLineItems.map(item => ({
              type: item.type,
              description: item.description,
              amount: item.amount,
              quantity: item.quantity,
            }));
            
            await this.notificationService.sendRefundConfirmation(order, seller, {
              amount: totalRefundAmount.toFixed(2),
              currency: order.currency || 'USD',
              reason: request.reason || request.manualOverride?.reason,
              lineItems: emailLineItems,
            });
            
            logger.info(`[Refund] Refund confirmation email sent for order ${order.id}`);
          } else {
            logger.error(`[Refund] Seller not found for order ${order.id}, email not sent`);
          }
        } catch (emailError: any) {
          // Log error but don't fail the refund - email is not critical
          logger.error(`[Refund] Failed to send refund confirmation email for order ${order.id}:`, emailError);
        }

        return {
          success: true,
          refundId: createdRefund.id,
          totalAmount: totalRefundAmount.toFixed(2),
          stripeRefundId,
        };

      } catch (stripeError: any) {
        logger.error(`[Refund] Stripe refund failed for refund ${createdRefund.id}:`, stripeError);
        
        // CRITICAL: Mark refund as failed (keeps audit trail)
        // This is safer than deleting records - provides transparency
        await this.storage.updateRefundStatus(createdRefund.id, 'failed');
        logger.info(`[Refund] Marked refund ${createdRefund.id} as failed due to Stripe error`);

        throw new Error(`Stripe refund failed: ${stripeError.message}`);
      }

    } catch (error: any) {
      logger.error(`[Refund] Failed to create refund for order ${request.orderId}:`, error);
      return {
        success: false,
        refundId: '',
        totalAmount: '0',
        error: error.message || 'Failed to process refund',
      };
    }
  }

  /**
   * Get refund history for an order with line items
   */
  async getRefundHistory(orderId: string) {
    return await this.storage.getRefundHistoryWithLineItems(orderId);
  }

  /**
   * Get refundable amounts for an order
   */
  async getRefundableAmount(orderId: string) {
    return await this.storage.getRefundableAmountForOrder(orderId);
  }


  /**
   * Update order payment status based on refund totals
   */
  private async updateOrderPaymentStatus(orderId: string): Promise<void> {
    const order = await this.storage.getOrder(orderId);
    if (!order) {
      logger.error(`[Refund] Order ${orderId} not found when updating payment status`);
      return;
    }

    const refundData = await this.storage.getRefundableAmountForOrder(orderId);
    const totalRefunded = parseFloat(refundData.refundedSoFar);
    const totalPaid = parseFloat(order.amountPaid || '0');

    let newPaymentStatus: string;
    
    if (totalRefunded >= totalPaid) {
      newPaymentStatus = 'refunded';
    } else if (totalRefunded > 0) {
      newPaymentStatus = 'partially_refunded';
    } else {
      newPaymentStatus = order.paymentStatus || 'pending';
    }

    if (newPaymentStatus !== order.paymentStatus) {
      await this.storage.updateOrderPaymentStatus(orderId, newPaymentStatus);
      logger.info(`[Refund] Updated order ${orderId} payment status to ${newPaymentStatus}`);
    }
  }

  /**
   * Convert amount from major units to smallest currency unit (cents/smallest unit)
   * Handles different currency exponents:
   * - Zero-decimal currencies (JPY, KRW, etc.): divisor = 1
   * - Two-decimal currencies (USD, EUR, GBP, etc.): divisor = 100
   * - Three-decimal currencies (BHD, JOD, KWD, etc.): divisor = 1000
   */
  private convertToSmallestUnit(amount: number, currency: string): number {
    const divisor = this.getCurrencyDivisor(currency);
    return Math.round(amount * divisor);
  }

  /**
   * Get currency divisor based on currency code
   * This ensures proper conversion for all Stripe-supported currencies
   */
  private getCurrencyDivisor(currency: string): number {
    const upperCurrency = currency.toUpperCase();
    
    // Zero-decimal currencies (no cents/paise)
    const zeroDecimalCurrencies = [
      'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 
      'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
    ];
    
    // Three-decimal currencies
    const threeDecimalCurrencies = ['BHD', 'JOD', 'KWD', 'OMR', 'TND'];
    
    if (zeroDecimalCurrencies.includes(upperCurrency)) {
      return 1;
    } else if (threeDecimalCurrencies.includes(upperCurrency)) {
      return 1000;
    }
    
    return 100; // Default: two decimal places (USD, EUR, GBP, etc.)
  }

  // ============================================================================
  // Wholesale Refund Processing
  // ============================================================================

  /**
   * Create a wholesale refund with support for deposit/balance payment refunds
   * 
   * Flow:
   * 1. Validate wholesale order and seller ownership
   * 2. Determine which payment to refund (deposit, balance, or both)
   * 3. Calculate refund amounts (cents-based for wholesale)
   * 4. Validate against refundable amounts
   * 5. Process Stripe refund using shared paymentProvider
   * 6. Create refund record with wholesale metadata
   * 7. Update wholesale order items
   * 8. Send notifications
   * 
   * Wholesale-specific features:
   * - Handles deposit and balance payments separately
   * - Supports cents-based pricing
   * - Links to wholesale_payments table
   * - Updates wholesale_order_items refund tracking
   */
  async createWholesaleRefund(request: CreateWholesaleRefundRequest): Promise<WholesaleRefundResult> {
    try {
      // Step 1: Validate wholesale order and seller ownership
      const order = await this.storage.getWholesaleOrder(request.orderId);
      if (!order) {
        throw new Error('Wholesale order not found');
      }

      if (order.sellerId !== request.sellerId) {
        throw new Error('Unauthorized: Order does not belong to this seller');
      }

      // Step 2: Get wholesale payments to determine payment intent
      const payments = await this.storage.getWholesalePaymentsByOrderId(request.orderId);
      const paidPayments = payments.filter(p => p.status === 'paid' && p.stripePaymentIntentId);

      if (paidPayments.length === 0) {
        throw new Error('No paid payments found for this order');
      }

      // Step 3: Determine which payment to refund based on refund type
      let paymentIntentId: string;
      let refundAmountCents: number;
      let refundedPaymentType: 'deposit' | 'balance' | 'full';

      if (request.refundType === 'deposit') {
        // Refund deposit payment only
        const depositPayment = paidPayments.find(p => p.paymentType === 'deposit');
        if (!depositPayment || !depositPayment.stripePaymentIntentId) {
          throw new Error('No paid deposit payment found');
        }
        paymentIntentId = depositPayment.stripePaymentIntentId;
        refundAmountCents = request.customRefundAmountCents || depositPayment.amountCents;
        refundedPaymentType = 'deposit';
      } else if (request.refundType === 'balance') {
        // Refund balance payment only
        const balancePayment = paidPayments.find(p => p.paymentType === 'balance');
        if (!balancePayment || !balancePayment.stripePaymentIntentId) {
          throw new Error('No paid balance payment found');
        }
        paymentIntentId = balancePayment.stripePaymentIntentId;
        refundAmountCents = request.customRefundAmountCents || balancePayment.amountCents;
        refundedPaymentType = 'balance';
      } else if (request.refundType === 'full') {
        // Refund most recent payment (or both if needed)
        const latestPayment = paidPayments[paidPayments.length - 1];
        paymentIntentId = latestPayment.stripePaymentIntentId!;
        refundAmountCents = request.customRefundAmountCents || order.totalCents;
        refundedPaymentType = 'full';
      } else if (request.refundType === 'partial') {
        // Partial refund - use custom amount and most recent payment
        if (!request.customRefundAmountCents) {
          throw new Error('Custom refund amount required for partial refunds');
        }
        const latestPayment = paidPayments[paidPayments.length - 1];
        paymentIntentId = latestPayment.stripePaymentIntentId!;
        refundAmountCents = request.customRefundAmountCents;
        refundedPaymentType = 'full'; // Stored as 'full' but with partial amount
      } else {
        throw new Error(`Invalid refund type: ${request.refundType}`);
      }

      // Step 4: Validate refund amount
      const maxRefundableCents = order.totalCents;
      if (refundAmountCents <= 0 || refundAmountCents > maxRefundableCents) {
        throw new Error(
          `Refund amount must be between $0.01 and $${(maxRefundableCents / 100).toFixed(2)}`
        );
      }

      // Step 5: Check for existing refunds (OVER-REFUND VALIDATION)
      // CRITICAL: Only count succeeded refunds to prevent over-refunding
      const existingRefunds = await this.storage.getRefundsByOrderId(request.orderId);
      const totalRefundedCents = existingRefunds
        .filter(r => r.status === 'succeeded')
        .reduce((sum, r) => sum + parseFloat(r.totalAmount) * 100, 0);
      const remainingRefundableCents = maxRefundableCents - totalRefundedCents;

      if (refundAmountCents > remainingRefundableCents) {
        throw new Error(
          `Cannot refund $${(refundAmountCents / 100).toFixed(2)}. Only $${(remainingRefundableCents / 100).toFixed(2)} remaining after previous refunds.`
        );
      }

      // Step 6: Create refund record FIRST with 'pending' status (ATOMIC OPERATION)
      const refundAmountDollars = refundAmountCents / 100;
      const refund = await this.storage.createRefund({
        orderId: request.orderId,
        totalAmount: refundAmountDollars.toFixed(2),
        currency: order.currency || 'USD',
        reason: request.reason || `Wholesale ${request.refundType} refund`,
        status: 'pending', // Start as pending, update after Stripe success
        processedBy: request.sellerId,
        wholesaleOrderId: request.orderId,
        wholesalePaymentId: request.wholesalePaymentId || null,
      });

      logger.info(`[WholesaleRefund] Created refund ${refund.id} for order ${request.orderId}`);

      // Step 7: Process Stripe refund using shared paymentProvider (with atomic rollback)
      let stripeRefundId: string | undefined;
      try {
        const currency = order.currency || 'USD';
        const amountInSmallestUnit = this.convertToSmallestUnit(refundAmountDollars, currency);
        
        // Use refund ID as idempotency key to prevent duplicate refunds
        const idempotencyKey = `refund_${refund.id}`;
        
        const stripeRefund = await this.paymentProvider.createRefund({
          paymentIntentId,
          amount: amountInSmallestUnit,
          reason: 'requested_by_customer',
          metadata: {
            orderId: request.orderId,
            refundId: refund.id,
            refundType: request.refundType,
            sellerId: request.sellerId,
            wholesaleOrder: 'true',
          },
        }, idempotencyKey);

        stripeRefundId = stripeRefund.id;
        logger.info(`[WholesaleRefund] Stripe refund ${stripeRefundId} created for refund ${refund.id}`);

        // Step 8: ONLY AFTER Stripe success - Update refund status with Stripe refund ID
        await this.storage.updateRefundStatus(
          refund.id,
          stripeRefund.status,
          stripeRefundId
        );

        // Step 9-10: Post-processing wrapped in try-catch
        // CRITICAL: Once Stripe succeeds, we MUST return success even if post-processing fails
        try {
          // Step 9: Update wholesale order items if item-level refund
          if (request.items && request.items.length > 0) {
            for (const item of request.items) {
              const orderItem = await this.storage.getWholesaleOrderItem(item.itemId);
              if (orderItem) {
                const newRefundedQty = (orderItem.refundedQuantity || 0) + item.quantity;
                const itemRefundCents = item.amountCents || 
                  (orderItem.unitPriceCents * item.quantity);
                const newRefundedAmountCents = (orderItem.refundedAmountCents || 0) + itemRefundCents;
                
                await this.storage.updateWholesaleOrderItemRefund(
                  item.itemId,
                  newRefundedQty,
                  newRefundedAmountCents
                );
              }
            }
          }

          // Step 10: Update wholesale order status
          await this.updateWholesaleOrderPaymentStatus(request.orderId);
        } catch (postError: any) {
          // Log but don't propagate - refund already succeeded in Stripe
          logger.error(`[WholesaleRefund] Post-processing error after successful refund ${refund.id}:`, postError);
        }

      } catch (error: any) {
        // Only executes if Stripe itself failed (before stripeRefundId was set)
        logger.error(`[WholesaleRefund] Stripe refund failed for refund ${refund.id}:`, error);
        
        if (!stripeRefundId) {
          await this.storage.updateRefundStatus(refund.id, 'failed');
          logger.info(`[WholesaleRefund] Marked refund ${refund.id} as failed - Stripe refund did not complete`);
        }

        throw error;
      }

      // Step 11: Send refund confirmation email
      try {
        const seller = await this.storage.getUser(order.sellerId);
        const buyer = await this.storage.getUser(order.buyerId);
        
        if (seller && buyer) {
          // Create a B2C-compatible order object for email template
          const orderForEmail = {
            id: order.id,
            orderNumber: order.orderNumber,
            sellerId: order.sellerId,
            userId: order.buyerId, // Map buyerId to userId for B2C email template
            currency: order.currency || 'USD',
          };

          await this.notificationService.sendRefundConfirmation(
            orderForEmail as any,
            seller,
            {
              amount: refundAmountDollars.toFixed(2),
              currency: order.currency || 'USD',
              reason: request.reason,
              lineItems: request.items?.map(item => ({
                type: 'product' as const,
                description: `Wholesale item refund`,
                amount: ((item.amountCents || 0) / 100).toFixed(2),
                quantity: item.quantity,
              })) || [],
            }
          );
          
          logger.info(`[WholesaleRefund] Refund confirmation email sent for order ${order.id}`);
        }
      } catch (emailError: any) {
        logger.error(`[WholesaleRefund] Failed to send refund confirmation email for order ${order.id}:`, emailError);
      }

      return {
        success: true,
        refundId: refund.id,
        totalAmount: refundAmountDollars.toFixed(2),
        stripeRefundId,
      };

    } catch (error: any) {
      logger.error(`[WholesaleRefund] Failed to create wholesale refund for order ${request.orderId}:`, error);
      return {
        success: false,
        refundId: '',
        totalAmount: '0',
        error: error.message || 'Failed to process wholesale refund',
      };
    }
  }

  /**
   * Update wholesale order status based on refund totals
   * Note: Wholesale orders use 'status' field, not 'paymentStatus'
   */
  private async updateWholesaleOrderPaymentStatus(orderId: string): Promise<void> {
    const order = await this.storage.getWholesaleOrder(orderId);
    if (!order) {
      logger.error(`[WholesaleRefund] Order ${orderId} not found when updating payment status`);
      return;
    }

    const refunds = await this.storage.getRefundsByOrderId(orderId);
    // CRITICAL: Only count succeeded refunds to prevent orders being marked cancelled based on pending/failed refunds
    const totalRefundedDollars = refunds
      .filter(r => r.status === 'succeeded')
      .reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
    const totalRefundedCents = Math.round(totalRefundedDollars * 100);
    const totalPaidCents = order.totalCents;

    // Wholesale orders don't have paymentStatus, they use the main status field
    // We'll update it if the order is fully refunded
    if (totalRefundedCents >= totalPaidCents && order.status !== 'cancelled') {
      await this.storage.updateWholesaleOrder(orderId, { status: 'cancelled' });
      logger.info(`[WholesaleRefund] Updated order ${orderId} status to cancelled (fully refunded)`);
    }
  }
}
