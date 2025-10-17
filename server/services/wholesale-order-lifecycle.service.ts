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
import type { RefundService } from './refund.service';

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
    private refundService?: RefundService
  ) {}

  /**
   * Process a wholesale order refund (full, partial, or item-level)
   * 
   * ARCHITECTURE 3: Delegates to shared RefundService for refund processing
   * - No duplicate Stripe code
   * - Shared validation and error handling
   * - Consistent refund tracking across B2C and wholesale
   * 
   * @param params - Refund parameters
   * @returns WholesaleRefundResult with success status and refund details
   */
  async processRefund(params: ProcessWholesaleRefundParams): Promise<WholesaleRefundResult> {
    try {
      const { orderId, sellerId, refundType, reason, customRefundAmount, refundItems, wholesalePaymentId } = params;

      // Validate refund service is available
      if (!this.refundService) {
        logger.error('[WholesaleRefund] RefundService not configured');
        return {
          success: false,
          error: 'Refund service not configured',
          statusCode: 500,
        };
      }

      // Validate refund type
      if (!refundType || !['full', 'partial', 'item'].includes(refundType)) {
        return {
          success: false,
          error: "Invalid refund type. Must be 'full', 'partial', or 'item'",
          statusCode: 400,
        };
      }

      // Calculate custom refund amount in cents if provided (wholesale uses cents)
      let customRefundAmountCents: number | undefined;
      if (refundType === 'partial' && customRefundAmount) {
        customRefundAmountCents = Math.round(customRefundAmount * 100);
      } else if (refundType === 'partial' && !customRefundAmount) {
        return {
          success: false,
          error: "Custom refund amount required for partial refunds",
          statusCode: 400,
        };
      }

      // Validate item refunds
      if (refundType === 'item' && (!refundItems || refundItems.length === 0)) {
        return {
          success: false,
          error: "Refund items required for item-level refunds",
          statusCode: 400,
        };
      }

      // Map refund type to RefundService format
      const refundServiceType: 'deposit' | 'balance' | 'full' | 'partial' = 
        refundType === 'item' ? 'partial' : refundType as any;

      // Transform wholesale refund items to RefundService format
      const items = refundItems?.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        amountCents: item.amountCents,
      }));

      // Delegate to shared RefundService
      const result = await this.refundService.createWholesaleRefund({
        orderId,
        sellerId,
        refundType: refundServiceType,
        reason,
        customRefundAmountCents,
        items,
        wholesalePaymentId,
      });

      // Transform result to WholesaleRefundResult format
      if (result.success) {
        // Get the created refund for backward compatibility
        const refunds = await this.storage.getRefundsByOrderId(orderId);
        const refund = refunds[refunds.length - 1]; // Most recent

        return {
          success: true,
          refund,
          stripeRefundId: result.stripeRefundId || null,
          refundAmount: parseFloat(result.totalAmount),
          status: 'succeeded',
        };
      } else {
        return {
          success: false,
          error: result.error || 'Refund failed',
          statusCode: 400,
        };
      }
    } catch (error: any) {
      logger.error('[WholesaleRefund] Wholesale refund processing failed', {
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
