/**
 * WholesaleOrderLifecycleService - Handles wholesale order lifecycle operations
 * 
 * Responsibilities:
 * - Refund processing (full and partial) for wholesale orders
 * - Refund history retrieval
 * - Handles cents-based pricing (divide by 100 for Stripe)
 * - Uses wholesale_payments for payment intent lookup
 * 
 * Architecture: Clean service layer pattern
 * - Orchestrates business logic for B2B orders
 * - Delegates to storage layer
 * - Manages Stripe interactions
 */

import type { IStorage } from '../storage';
import type { WholesaleOrder, Refund } from '@shared/schema';
import { logger } from '../logger';
import type Stripe from 'stripe';

// ============================================================================
// Interfaces
// ============================================================================

export interface WholesaleRefundItem {
  itemId: string; // wholesale_order_items.id
  quantity: number; // How many units to refund
  amountCents?: number; // Optional: custom refund amount in cents (for partial refunds)
}

export interface ProcessWholesaleRefundParams {
  orderId: string;
  sellerId: string;
  refundType: 'full' | 'partial' | 'item';
  reason?: string;
  customRefundAmount?: number; // In dollars (will be converted to cents) - for partial refunds
  refundItems?: WholesaleRefundItem[]; // For item-level refunds
  wholesalePaymentId?: string; // Which payment to refund (deposit vs balance)
}

export interface WholesaleRefundResult {
  success: boolean;
  refund?: Refund;
  stripeRefundId?: string | null;
  refundAmount?: number; // In dollars
  status?: string;
  error?: string;
  statusCode?: number;
}

export interface GetWholesaleRefundHistoryResult {
  success: boolean;
  refunds?: Refund[];
  error?: string;
  statusCode?: number;
}

// ============================================================================
// WholesaleOrderLifecycleService
// ============================================================================

export class WholesaleOrderLifecycleService {
  constructor(
    private storage: IStorage,
    private stripe?: Stripe
  ) {}

  /**
   * Process a wholesale order refund (full, partial, or item-level)
   * 
   * CRITICAL REQUIREMENTS:
   * - Handle cents-based pricing (divide by 100 for Stripe API)
   * - Fetch from wholesale_orders table (not orders)
   * - Use wholesale_payments for payment intent lookup
   * - Support item-level refunds with quantity tracking
   * - Track refunded amounts in wholesale_order_items
   * - Link refunds to specific wholesale payments
   * 
   * @param params - Refund parameters
   * @returns WholesaleRefundResult with success status and refund details
   */
  async processRefund(params: ProcessWholesaleRefundParams): Promise<WholesaleRefundResult> {
    try {
      const { orderId, sellerId, refundType, reason, customRefundAmount, refundItems, wholesalePaymentId } = params;

      // 1. Validation
      if (!refundType || !['full', 'partial', 'item'].includes(refundType)) {
        return {
          success: false,
          error: "Invalid refund type. Must be 'full', 'partial', or 'item'",
          statusCode: 400,
        };
      }

      if (refundType === 'partial' && !customRefundAmount) {
        return {
          success: false,
          error: "Custom refund amount required for partial refunds",
          statusCode: 400,
        };
      }

      if (refundType === 'item' && (!refundItems || refundItems.length === 0)) {
        return {
          success: false,
          error: "Refund items required for item-level refunds",
          statusCode: 400,
        };
      }

      // 2. Get wholesale order
      const order = await this.storage.getWholesaleOrder(orderId);
      if (!order) {
        return {
          success: false,
          error: "Wholesale order not found",
          statusCode: 404,
        };
      }

      // 3. Authorization check - Verify seller owns this order
      if (order.sellerId !== sellerId) {
        return {
          success: false,
          error: "Unauthorized to refund this order",
          statusCode: 403,
        };
      }

      // 4. Calculate refund amount based on type
      let refundAmountCents = 0;
      let refundAmountDollars = 0;
      const itemRefunds: Array<{ itemId: string; quantity: number; amountCents: number }> = [];
      
      if (refundType === 'full') {
        // Full refund: use total order amount
        refundAmountCents = order.totalCents;
        refundAmountDollars = order.totalCents / 100;
      } else if (refundType === 'partial') {
        // Partial refund: use custom amount
        refundAmountDollars = customRefundAmount!;
        refundAmountCents = Math.round(customRefundAmount! * 100);
      } else if (refundType === 'item') {
        // Item-level refund: calculate per item
        const orderItems = await this.storage.getWholesaleOrderItems(orderId);
        
        for (const refundItem of refundItems!) {
          const orderItem = orderItems.find(i => i.id === refundItem.itemId);
          
          if (!orderItem) {
            return {
              success: false,
              error: `Order item ${refundItem.itemId} not found`,
              statusCode: 404,
            };
          }

          // Validate refund quantity
          const alreadyRefundedQty = orderItem.refundedQuantity || 0;
          const availableToRefund = orderItem.quantity - alreadyRefundedQty;
          
          if (refundItem.quantity <= 0 || refundItem.quantity > availableToRefund) {
            return {
              success: false,
              error: `Invalid refund quantity for item ${orderItem.productName}. Available: ${availableToRefund}`,
              statusCode: 400,
            };
          }

          // Calculate refund amount for this item
          let itemRefundCents: number;
          if (refundItem.amountCents) {
            // Custom amount provided
            itemRefundCents = refundItem.amountCents;
          } else {
            // Calculate proportional amount: (unitPrice * quantity)
            const unitPriceCents = orderItem.unitPriceCents;
            itemRefundCents = unitPriceCents * refundItem.quantity;
          }

          refundAmountCents += itemRefundCents;
          itemRefunds.push({
            itemId: refundItem.itemId,
            quantity: refundItem.quantity,
            amountCents: itemRefundCents,
          });
        }
        
        refundAmountDollars = refundAmountCents / 100;
      }

      // Validate refund amount
      const maxRefundable = order.totalCents / 100;
      if (refundAmountDollars <= 0 || refundAmountDollars > maxRefundable) {
        return {
          success: false,
          error: `Refund amount must be between $0.01 and $${maxRefundable.toFixed(2)}`,
          statusCode: 400,
        };
      }

      // 5. Check for existing refunds and calculate remaining refundable amount
      const existingRefunds = await this.storage.getRefundsByOrderId(orderId);
      const totalRefunded = existingRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const remainingRefundable = maxRefundable - totalRefunded;

      if (refundAmountDollars > remainingRefundable) {
        return {
          success: false,
          error: `Cannot refund $${refundAmountDollars.toFixed(2)}. Only $${remainingRefundable.toFixed(2)} remaining after previous refunds.`,
          statusCode: 400,
        };
      }

      // 6. Get payment intent from wholesale_payments
      const payments = await this.storage.getWholesalePaymentsByOrderId(orderId);
      const paidPayments = payments.filter(p => p.status === 'paid' && p.stripePaymentIntentId);
      
      let stripeRefundId: string | null = null;

      // 7. Process Stripe refund if payment intent exists
      if (this.stripe && paidPayments.length > 0) {
        try {
          // Get the most recent paid payment intent
          const latestPayment = paidPayments[paidPayments.length - 1];
          const paymentIntentId = latestPayment.stripePaymentIntentId!;

          // CRITICAL: Convert dollars to cents for Stripe API
          const refundAmountCents = Math.round(refundAmountDollars * 100);

          // Map custom reason to Stripe-valid reason (or use default)
          const stripeReason: 'duplicate' | 'fraudulent' | 'requested_by_customer' = 
            reason === 'duplicate' || reason === 'fraudulent' ? reason : 'requested_by_customer';

          const stripeRefund = await this.stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: refundAmountCents,
            reason: stripeReason,
          });

          stripeRefundId = stripeRefund.id;

          logger.info('Stripe refund processed for wholesale order', {
            orderId,
            refundId: stripeRefundId,
            amountCents: refundAmountCents,
            amountDollars: refundAmountDollars,
          });
        } catch (error: any) {
          logger.error('Stripe refund failed for wholesale order', {
            orderId,
            error: error.message,
          });
          return {
            success: false,
            error: `Stripe refund failed: ${error.message}`,
            statusCode: 500,
          };
        }
      } else if (!this.stripe) {
        logger.warn('Stripe not configured, skipping payment refund', { orderId });
      }

      // 8. Update wholesale_order_items for item-level refunds
      if (refundType === 'item' && itemRefunds.length > 0) {
        for (const itemRefund of itemRefunds) {
          const orderItem = await this.storage.getWholesaleOrderItem(itemRefund.itemId);
          if (orderItem) {
            const newRefundedQty = (orderItem.refundedQuantity || 0) + itemRefund.quantity;
            const newRefundedAmountCents = (orderItem.refundedAmountCents || 0) + itemRefund.amountCents;
            
            await this.storage.updateWholesaleOrderItemRefund(
              itemRefund.itemId,
              newRefundedQty,
              newRefundedAmountCents
            );
          }
        }
      }

      // 9. Create refund record(s)
      let refund: Refund;
      
      if (refundType === 'item' && itemRefunds.length > 0) {
        // For item-level refunds, create a refund record for each item
        // (In practice, you might create one refund with details or multiple - this creates one summary refund)
        refund = await this.storage.createRefund({
          orderId: order.id,
          orderItemId: null, // Will use wholesaleOrderItemId instead
          amount: refundAmountDollars.toFixed(2),
          reason: reason || 'Item-level wholesale refund',
          refundType,
          stripeRefundId,
          status: stripeRefundId ? 'succeeded' : 'pending',
          processedBy: sellerId,
          wholesaleOrderId: order.id,
          wholesalePaymentId: wholesalePaymentId || null,
          wholesaleOrderItemId: itemRefunds.length === 1 ? itemRefunds[0].itemId : null, // Single item or null for multi-item
        });
      } else {
        // For full/partial refunds, create a single order-level refund
        refund = await this.storage.createRefund({
          orderId: order.id,
          orderItemId: null,
          amount: refundAmountDollars.toFixed(2),
          reason: reason || 'Wholesale order refund',
          refundType,
          stripeRefundId,
          status: stripeRefundId ? 'succeeded' : 'pending',
          processedBy: sellerId,
          wholesaleOrderId: order.id,
          wholesalePaymentId: wholesalePaymentId || null,
          wholesaleOrderItemId: null,
        });
      }

      logger.info('Wholesale refund processed successfully', {
        orderId,
        refundId: refund.id,
        amount: refundAmountDollars,
        type: refundType,
        itemRefunds: itemRefunds.length > 0 ? itemRefunds : undefined,
      });

      return {
        success: true,
        refund,
        stripeRefundId,
        refundAmount: refundAmountDollars,
        status: refund.status,
      };
    } catch (error: any) {
      logger.error('Wholesale refund processing failed', {
        orderId: params.orderId,
        error: error.message,
      });
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: 500,
      };
    }
  }

  /**
   * Get refund history for a wholesale order
   * 
   * @param orderId - Wholesale order ID
   * @returns GetWholesaleRefundHistoryResult with refunds array
   */
  async getRefundHistory(orderId: string): Promise<GetWholesaleRefundHistoryResult> {
    try {
      const refunds = await this.storage.getRefundsByOrderId(orderId);
      
      return {
        success: true,
        refunds,
      };
    } catch (error: any) {
      logger.error('Failed to get wholesale refund history', {
        orderId,
        error: error.message,
      });
      return {
        success: false,
        error: error.message || 'Internal server error',
        statusCode: 500,
      };
    }
  }
}
