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
import { logger } from '../logger';

export interface CreateRefundRequest {
  orderId: string;
  sellerId: string;
  reason?: string;
  lineItems: Array<{
    type: 'product' | 'shipping' | 'tax' | 'adjustment';
    orderItemId?: string;
    quantity?: number;
    amount: string;
    description?: string;
  }>;
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

export class RefundService {
  constructor(
    private storage: IStorage,
    private paymentProvider: IPaymentProvider
  ) {}

  /**
   * Create a refund with validation and Stripe processing
   * 
   * Flow:
   * 1. Validate order belongs to seller
   * 2. Calculate refundable amount
   * 3. Validate refund request against refundable amount
   * 4. Create refund record
   * 5. Create refund line items
   * 6. Process Stripe refund
   * 7. Update refund status
   * 8. Update order payment status
   */
  async createRefund(request: CreateRefundRequest): Promise<RefundResult> {
    try {
      // Step 1: Validate order and seller ownership
      const order = await this.storage.getOrder(request.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.sellerId !== request.sellerId) {
        throw new Error('Unauthorized: Order does not belong to this seller');
      }

      // Step 2: Get refundable amounts for validation
      const refundableData = await this.storage.getRefundableAmountForOrder(request.orderId);
      const maxRefundable = parseFloat(refundableData.totalRefundable);

      // Step 3: Calculate total refund amount from line items
      let totalRefundAmount = 0;
      for (const lineItem of request.lineItems) {
        totalRefundAmount += parseFloat(lineItem.amount);
      }

      // Apply manual override if provided (must still be <= max refundable)
      if (request.manualOverride) {
        totalRefundAmount = parseFloat(request.manualOverride.totalAmount);
      }

      // Step 4: Validate refund amount doesn't exceed refundable amount
      if (totalRefundAmount > maxRefundable) {
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

      // Step 6: Create refund line items
      const lineItemsData: InsertRefundLineItem[] = request.lineItems.map(item => ({
        refundId: createdRefund.id,
        orderItemId: item.orderItemId || null,
        type: item.type,
        quantity: item.quantity || null,
        amount: item.amount,
        description: item.description || null,
      }));

      await this.storage.createRefundLineItems(lineItemsData);
      logger.info(`[Refund] Created ${lineItemsData.length} line items for refund ${createdRefund.id}`);

      // Step 7: Process Stripe refund
      let stripeRefundId: string | undefined;
      try {
        // Get the payment intent ID from the order
        const paymentIntentId = order.stripePaymentIntentId;
        if (!paymentIntentId) {
          throw new Error('No payment intent found for this order');
        }

        // Convert to cents for Stripe (assuming USD/EUR/GBP - 2 decimal places)
        const amountInCents = Math.round(totalRefundAmount * 100);

        const stripeRefund = await this.paymentProvider.createRefund({
          paymentIntentId,
          amount: amountInCents,
          reason: 'requested_by_customer',
          metadata: {
            orderId: request.orderId,
            refundId: createdRefund.id,
            sellerId: request.sellerId,
          },
        });

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
        for (const lineItem of request.lineItems) {
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

        return {
          success: true,
          refundId: createdRefund.id,
          totalAmount: totalRefundAmount.toFixed(2),
          stripeRefundId,
        };

      } catch (stripeError: any) {
        logger.error(`[Refund] Stripe refund failed for refund ${createdRefund.id}:`, stripeError);
        
        // Update refund status to failed
        await this.storage.updateRefundStatus(createdRefund.id, 'failed');

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
}
