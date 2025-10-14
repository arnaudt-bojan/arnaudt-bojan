/**
 * OrderLifecycleService - Handles order lifecycle operations
 * 
 * Responsibilities:
 * - Refund processing (full and item-level)
 * - Order status updates
 * - Balance payment requests
 * - Refund history retrieval
 * 
 * Architecture: Clean service layer pattern
 * - Orchestrates business logic
 * - Delegates to storage layer
 * - Handles notifications
 * - Manages Stripe interactions (optional)
 */

import type { IStorage } from '../storage';
import type { Order, OrderItem, Refund, User } from '@shared/schema';
import type { NotificationService } from '../notifications';
import { logger } from '../logger';
import type Stripe from 'stripe';
import { DocumentGenerator } from './document-generator';

// ============================================================================
// Interfaces
// ============================================================================

export interface ProcessRefundParams {
  orderId: string;
  sellerId: string;
  refundType: 'full' | 'item';
  refundItems?: Array<{
    itemId: string;
    quantity: number;
    amount?: number; // Client-supplied amount (will be validated against server calculation)
  }>;
  reason?: string;
  customRefundAmount?: number; // Optional custom refund amount (overrides calculated amount)
}

export interface RefundResult {
  success: boolean;
  refunds?: Refund[];
  stripeRefundId?: string | null;
  refundAmount?: number;
  status?: string;
  error?: string;
  statusCode?: number;
}

export interface MarkItemsReturnedResult {
  success: boolean;
  item?: OrderItem;
  error?: string;
  statusCode?: number;
}

export interface GetRefundHistoryResult {
  success: boolean;
  refunds?: Refund[];
  error?: string;
  statusCode?: number;
}

export interface ResendBalancePaymentResult {
  success: boolean;
  balancePaymentId?: string;
  error?: string;
  statusCode?: number;
}

export interface UpdateOrderStatusResult {
  success: boolean;
  order?: Order;
  error?: string;
  statusCode?: number;
}

export interface UpdateItemTrackingResult {
  success: boolean;
  item?: OrderItem;
  error?: string;
  statusCode?: number;
}

// ============================================================================
// OrderLifecycleService
// ============================================================================

export class OrderLifecycleService {
  constructor(
    private storage: IStorage,
    private notificationService: NotificationService,
    private stripe?: Stripe
  ) {}

  /**
   * Process a refund (full or item-level)
   * 
   * CRITICAL SECURITY REQUIREMENTS:
   * - Server-side amount recalculation (NEVER trust client amounts)
   * - Handle manual/cash payments (skip Stripe for these)
   * - Cumulative refund tracking
   * - Item-level refund records
   * - Proper authorization checks
   * 
   * @param params - Refund parameters
   * @returns RefundResult with success status and refund details
   */
  async processRefund(params: ProcessRefundParams): Promise<RefundResult> {
    try {
      const { orderId, sellerId, refundType, refundItems, reason, customRefundAmount } = params;

      // 1. Validation
      if (!refundType || !['full', 'item'].includes(refundType)) {
        return {
          success: false,
          error: "Invalid refund type. Must be 'full' or 'item'",
          statusCode: 400,
        };
      }

      if (refundType === 'item' && (!refundItems || refundItems.length === 0)) {
        return {
          success: false,
          error: "refundItems required for item-level refund",
          statusCode: 400,
        };
      }

      // 2. Order/items retrieval
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        return {
          success: false,
          error: "Order not found",
          statusCode: 404,
        };
      }

      const orderItems = await this.storage.getOrderItems(orderId);
      if (orderItems.length === 0) {
        return {
          success: false,
          error: "No order items found",
          statusCode: 404,
        };
      }

      // 3. Authorization check - Verify seller owns the products
      const firstItem = orderItems[0];
      const product = await this.storage.getProduct(firstItem.productId);
      if (!product || product.sellerId !== sellerId) {
        return {
          success: false,
          error: "Unauthorized to refund this order",
          statusCode: 403,
        };
      }

      // 4. Server-side refund amount calculation (SECURITY: NEVER trust client amounts)
      let refundAmount = 0;
      const itemsToRefund: Map<string, { item: OrderItem; quantity: number; amount: number }> = new Map();

      if (refundType === 'full') {
        // ARCHITECTURE 3: Full refund uses stored order.total (includes shipping + tax)
        // Calculate total already refunded across all items
        let totalAlreadyRefunded = 0;
        for (const item of orderItems) {
          totalAlreadyRefunded += parseFloat(item.refundedAmount || '0');
        }

        // Refund amount = order total - already refunded (or custom amount if provided)
        const orderTotal = parseFloat(order.total);
        const maxRefundable = orderTotal - totalAlreadyRefunded;

        // Use custom amount if provided, otherwise use calculated max refundable
        if (customRefundAmount !== undefined) {
          // Validate custom amount doesn't exceed max refundable
          if (customRefundAmount > maxRefundable + 0.01) {
            return {
              success: false,
              error: `Custom refund amount $${customRefundAmount.toFixed(2)} exceeds maximum refundable amount $${maxRefundable.toFixed(2)}`,
              statusCode: 400,
            };
          }
          if (customRefundAmount <= 0) {
            return {
              success: false,
              error: "Custom refund amount must be greater than zero",
              statusCode: 400,
            };
          }
          refundAmount = customRefundAmount;
          logger.info(`[Refund] Using custom refund amount: $${customRefundAmount} (max refundable: $${maxRefundable})`);

          // CRITICAL: Distribute custom amount proportionally across items
          // Calculate total remaining refundable amount for proportion calculation
          let totalRemainingRefundable = 0;
          const itemRefundableAmounts = new Map<string, number>();
          
          for (const item of orderItems) {
            const itemTotal = parseFloat(item.subtotal);
            const alreadyRefunded = parseFloat(item.refundedAmount || '0');
            const itemRefundable = itemTotal - alreadyRefunded;
            
            if (itemRefundable > 0) {
              totalRemainingRefundable += itemRefundable;
              itemRefundableAmounts.set(item.id, itemRefundable);
            }
          }

          // Distribute custom amount proportionally
          for (const item of orderItems) {
            const refundedQty = item.refundedQuantity || 0;
            const refundableQty = item.quantity - refundedQty;
            const itemRefundable = itemRefundableAmounts.get(item.id) || 0;

            if (refundableQty > 0 && itemRefundable > 0) {
              // Calculate proportional amount: (item's refundable / total refundable) * custom amount
              const proportionalAmount = (itemRefundable / totalRemainingRefundable) * customRefundAmount;
              
              // CRITICAL: Only mark quantity as refunded if the FULL item amount is being refunded
              // For partial custom refunds, don't increment quantity - only track amount
              const isFullItemRefund = Math.abs(proportionalAmount - itemRefundable) < 0.01;
              
              itemsToRefund.set(item.id, {
                item,
                quantity: isFullItemRefund ? refundableQty : 0, // Only mark qty if full amount refunded
                amount: proportionalAmount,
              });
            }
          }
        } else {
          // No custom amount - refund full remaining balance
          refundAmount = maxRefundable;

          // Distribute full refund across items
          for (const item of orderItems) {
            const refundedQty = item.refundedQuantity || 0;
            const refundableQty = item.quantity - refundedQty;
            const itemTotal = parseFloat(item.subtotal);
            const alreadyRefunded = parseFloat(item.refundedAmount || '0');
            const itemRefundAmount = itemTotal - alreadyRefunded;

            if (refundableQty > 0 && itemRefundAmount > 0) {
              itemsToRefund.set(item.id, {
                item,
                quantity: refundableQty,
                amount: itemRefundAmount,
              });
            }
          }
        }

        // Validation: Ensure we have refundable amount
        if (refundAmount <= 0) {
          return {
            success: false,
            error: "No refundable amount available",
            statusCode: 400,
          };
        }
      } else if (refundType === 'item') {
        // Item-level refund with specified quantities
        // SECURITY: Always recompute amount from price × quantity, never trust client
        for (const refundItem of refundItems!) {
          const item = orderItems.find((i) => i.id === refundItem.itemId);
          if (!item) {
            return {
              success: false,
              error: `Order item ${refundItem.itemId} not found`,
              statusCode: 404,
            };
          }

          const refundedQty = item.refundedQuantity || 0;
          const refundableQty = item.quantity - refundedQty;

          if (refundItem.quantity > refundableQty) {
            return {
              success: false,
              error: `Cannot refund ${refundItem.quantity} units of item ${item.productName}. Only ${refundableQty} units available for refund.`,
              statusCode: 400,
            };
          }

          // SECURITY: Recompute refund amount from stored price - never trust client amount
          const pricePerUnit = parseFloat(item.price);
          const serverCalculatedAmount = pricePerUnit * refundItem.quantity;

          // Validate client amount matches (with small tolerance for floating point)
          const clientAmount = refundItem.amount || 0;
          const difference = Math.abs(serverCalculatedAmount - clientAmount);
          if (difference > 0.01) {
            logger.warn(
              `[Refund Security] Client amount mismatch for item ${item.id}: client=${clientAmount}, server=${serverCalculatedAmount}`
            );
          }

          // Validate against remaining refundable balance
          const alreadyRefunded = parseFloat(item.refundedAmount || '0');
          const itemTotal = parseFloat(item.subtotal);
          const maxRefundable = itemTotal - alreadyRefunded;

          if (serverCalculatedAmount > maxRefundable + 0.01) {
            return {
              success: false,
              error: `Refund amount $${serverCalculatedAmount.toFixed(2)} exceeds remaining refundable amount $${maxRefundable.toFixed(2)} for item ${item.productName}`,
              statusCode: 400,
            };
          }

          refundAmount += serverCalculatedAmount;
          itemsToRefund.set(item.id, {
            item,
            quantity: refundItem.quantity,
            amount: serverCalculatedAmount, // Use server-computed amount, not client amount
          });
        }
      }

      if (refundAmount <= 0) {
        return {
          success: false,
          error: "No refundable amount available",
          statusCode: 400,
        };
      }

      // 5. Stripe refund (for Stripe payments) OR skip (for manual/cash payments)
      const paymentIntentId = order.stripeBalancePaymentIntentId || order.stripePaymentIntentId;
      let stripeRefund: Stripe.Refund | null = null;

      // Process Stripe refund only if payment was made through Stripe
      if (paymentIntentId && order.paymentType !== 'manual' && order.paymentType !== 'cash') {
        if (!this.stripe) {
          return {
            success: false,
            error: "Stripe is not configured",
            statusCode: 503,
          };
        }

        logger.info(`[Refund] Processing Stripe refund for order ${orderId}, amount: $${refundAmount}`);

        stripeRefund = await this.stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            orderId,
            refundType,
            orderItemIds: Array.from(itemsToRefund.keys()).join(','),
          },
        });
      } else {
        logger.info(`[Refund] Skipping Stripe refund for manual/cash payment - order ${orderId}, amount: $${refundAmount}`);
      }

      // 6. Create refund records for each item
      const refunds: Refund[] = [];
      for (const [itemId, refundData] of Array.from(itemsToRefund.entries())) {
        const { item, quantity, amount } = refundData;

        const refund = await this.storage.createRefund({
          orderId,
          orderItemId: item.id,
          amount: amount.toFixed(2),
          reason: reason || null,
          refundType: refundType,
          stripeRefundId: stripeRefund?.id || null,
          status: stripeRefund ? (stripeRefund.status === 'succeeded' ? 'succeeded' : 'pending') : 'succeeded',
          processedBy: sellerId,
        });
        refunds.push(refund);

        // 7. Update order item refund tracking
        const newRefundedQty = (item.refundedQuantity || 0) + quantity;
        const newRefundedAmount = parseFloat(item.refundedAmount || '0') + amount;
        const newStatus = newRefundedQty >= item.quantity ? 'refunded' : item.itemStatus;

        await this.storage.updateOrderItemRefund(
          item.id,
          newRefundedQty,
          newRefundedAmount.toFixed(2),
          newStatus
        );
      }

      // 8. Calculate cumulative refunds and update order payment status
      const allOrderRefunds = await this.storage.getRefundsByOrderId(orderId);
      const totalRefundedAmount = allOrderRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      // ARCHITECTURE 3: Compare refunds against stored order.total, not amountPaid
      const orderTotal = parseFloat(order.total);

      // Update payment status based on cumulative refunds
      const newPaymentStatus = totalRefundedAmount >= orderTotal - 0.01 ? 'refunded' : 'partially_refunded';
      await this.storage.updateOrderPaymentStatus(orderId, newPaymentStatus);

      // 9. Send item-specific refund notifications (async, don't wait)
      void this.sendRefundNotifications(orderId, sellerId, order, itemsToRefund, refundAmount);

      return {
        success: true,
        refunds,
        stripeRefundId: stripeRefund?.id || null,
        refundAmount: refundAmount,
        status: stripeRefund?.status || 'succeeded',
      };
    } catch (error: any) {
      logger.error("OrderLifecycleService: Error processing refund", error);
      return {
        success: false,
        error: error.message || "Failed to process refund",
        statusCode: 500,
      };
    }
  }

  /**
   * Mark order items as returned
   * 
   * @param orderId - Order ID
   * @param itemId - Order item ID
   * @param sellerId - Seller ID (for authorization)
   * @returns MarkItemsReturnedResult
   */
  async markItemsReturned(orderId: string, itemId: string, sellerId: string): Promise<MarkItemsReturnedResult> {
    try {
      const orderItem = await this.storage.getOrderItemById(itemId);
      if (!orderItem || orderItem.orderId !== orderId) {
        return {
          success: false,
          error: "Order item not found",
          statusCode: 404,
        };
      }

      // Verify seller owns this product
      const product = await this.storage.getProduct(orderItem.productId);
      if (!product || product.sellerId !== sellerId) {
        return {
          success: false,
          error: "Unauthorized",
          statusCode: 403,
        };
      }

      // Update item status to returned
      const updatedItem = await this.storage.updateOrderItemStatus(itemId, 'returned');

      return {
        success: true,
        item: updatedItem,
      };
    } catch (error: any) {
      logger.error("OrderLifecycleService: Error marking item as returned", error);
      return {
        success: false,
        error: "Failed to mark item as returned",
        statusCode: 500,
      };
    }
  }

  /**
   * Get refund history for an order
   * 
   * @param orderId - Order ID
   * @param userId - User ID (buyer or seller)
   * @returns GetRefundHistoryResult
   */
  async getRefundHistory(orderId: string, userId: string): Promise<GetRefundHistoryResult> {
    try {
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        return {
          success: false,
          error: "Order not found",
          statusCode: 404,
        };
      }

      // Verify access (buyer or seller)
      const isBuyer = order.userId === userId;
      if (!isBuyer) {
        const orderItems = await this.storage.getOrderItems(orderId);
        if (orderItems.length > 0) {
          const product = await this.storage.getProduct(orderItems[0].productId);
          if (!product || product.sellerId !== userId) {
            return {
              success: false,
              error: "Unauthorized",
              statusCode: 403,
            };
          }
        } else {
          return {
            success: false,
            error: "Unauthorized",
            statusCode: 403,
          };
        }
      }

      const refunds = await this.storage.getRefundsByOrderId(orderId);

      return {
        success: true,
        refunds,
      };
    } catch (error: any) {
      logger.error("OrderLifecycleService: Error fetching refunds", error);
      return {
        success: false,
        error: "Failed to fetch refunds",
        statusCode: 500,
      };
    }
  }

  /**
   * Resend balance payment request email
   * 
   * @param orderId - Order ID
   * @param sellerId - Seller ID (for authorization)
   * @returns ResendBalancePaymentResult
   */
  async resendBalancePaymentRequest(orderId: string, sellerId: string): Promise<ResendBalancePaymentResult> {
    try {
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        return {
          success: false,
          error: "Order not found",
          statusCode: 404,
        };
      }

      // Verify seller owns products in this order
      const orderItems = await this.storage.getOrderItems(orderId);
      if (orderItems.length === 0) {
        return {
          success: false,
          error: "Order has no items",
          statusCode: 404,
        };
      }

      const firstProduct = await this.storage.getProduct(orderItems[0].productId);
      if (!firstProduct || firstProduct.sellerId !== sellerId) {
        return {
          success: false,
          error: "Access denied",
          statusCode: 403,
        };
      }

      // Get seller info for email
      const seller = await this.storage.getUser(sellerId);
      if (!seller) {
        return {
          success: false,
          error: "Seller not found",
          statusCode: 404,
        };
      }

      // Get the most recent balance request
      const balanceRequest = await this.storage.getBalanceRequestByOrderId(orderId);
      if (!balanceRequest) {
        return {
          success: false,
          error: "No balance request found - please create one first",
          statusCode: 404,
        };
      }

      // Check if balance request has expired
      if (balanceRequest.expiresAt && new Date() > balanceRequest.expiresAt) {
        return {
          success: false,
          error: "Balance request has expired - please create a new one",
          statusCode: 400,
        };
      }

      // Generate new session token for the existing balance request
      const crypto = await import('crypto');
      const SESSION_SECRET = process.env.SESSION_SECRET || 'default-secret-change-me';
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionTokenHash = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(sessionToken)
        .digest('hex');

      // Update balance request with new session token
      await this.storage.updateBalanceRequest(balanceRequest.id, {
        sessionTokenHash,
        emailSentAt: new Date(),
      });

      // Get updated balance request
      const updatedBalanceRequest = await this.storage.getBalanceRequest(balanceRequest.id);
      if (!updatedBalanceRequest) {
        return {
          success: false,
          error: "Failed to update balance request",
          statusCode: 500,
        };
      }

      // Send balance payment request email with new token
      await this.notificationService.sendBalancePaymentRequest(
        order,
        seller,
        updatedBalanceRequest,
        sessionToken
      );

      logger.info(`[Balance Payment] Resent request to ${order.customerEmail} for order ${order.id}`);

      return {
        success: true,
        balancePaymentId: balanceRequest.id,
      };
    } catch (error: any) {
      logger.error("OrderLifecycleService: Error resending balance payment request", error);
      return {
        success: false,
        error: "Failed to resend balance payment request",
        statusCode: 500,
      };
    }
  }

  /**
   * Update order status
   * 
   * @param orderId - Order ID
   * @param status - New order status
   * @param userId - User ID (for authorization)
   * @returns UpdateOrderStatusResult
   */
  async updateOrderStatus(orderId: string, status: string, userId: string): Promise<UpdateOrderStatusResult> {
    try {
      // Get user for authorization check
      const user = await this.storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
          statusCode: 404,
        };
      }

      // Check if order exists
      const existingOrder = await this.storage.getOrder(orderId);
      if (!existingOrder) {
        return {
          success: false,
          error: "Order not found",
          statusCode: 404,
        };
      }

      // Authorization: only seller of products in order or admin can update status
      const isAdmin = user.role === 'owner' || user.role === 'admin';
      if (!isAdmin) {
        try {
          const items = typeof existingOrder.items === 'string' ? JSON.parse(existingOrder.items) : existingOrder.items;
          const allProducts = await this.storage.getAllProducts();
          const orderProductIds = items.map((item: any) => item.productId);
          const sellerProducts = allProducts.filter(p => p.sellerId === userId);
          const sellerProductIds = new Set(sellerProducts.map(p => p.id));

          const isSeller = orderProductIds.some((id: string) => sellerProductIds.has(id));

          if (!isSeller) {
            return {
              success: false,
              error: "Access denied",
              statusCode: 403,
            };
          }
        } catch {
          return {
            success: false,
            error: "Access denied",
            statusCode: 403,
          };
        }
      }

      // Update order status
      const order = await this.storage.updateOrderStatus(orderId, status);

      // Auto-generate documents based on status change (async, non-blocking)
      void this.autoGenerateDocuments(order, status, userId);

      return {
        success: true,
        order,
      };
    } catch (error: any) {
      logger.error("OrderLifecycleService: Error updating order status", error);
      return {
        success: false,
        error: error.message || "Failed to update order status",
        statusCode: 500,
      };
    }
  }

  /**
   * Update order item tracking information
   * 
   * @param itemId - Order item ID
   * @param trackingData - Tracking information
   * @param userId - User ID (for authorization)
   * @returns UpdateItemTrackingResult
   */
  async updateItemTracking(
    itemId: string,
    trackingData: {
      trackingNumber: string;
      trackingCarrier?: string;
      trackingUrl?: string;
      notifyCustomer?: boolean;
    },
    userId: string
  ): Promise<UpdateItemTrackingResult> {
    try {
      const user = await this.storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          error: "User not found",
          statusCode: 404,
        };
      }

      // Get the order item to find the order
      const item = await this.storage.getOrderItemById(itemId);
      if (!item) {
        return {
          success: false,
          error: "Order item not found",
          statusCode: 404,
        };
      }

      const order = await this.storage.getOrder(item.orderId);
      if (!order) {
        return {
          success: false,
          error: "Order not found",
          statusCode: 404,
        };
      }

      // Authorization: only seller can update tracking
      const isAdmin = user.role === 'owner' || user.role === 'admin';
      if (!isAdmin) {
        try {
          const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          const allProducts = await this.storage.getAllProducts();
          const orderProductIds = orderItems.map((item: any) => item.productId);
          const sellerProducts = allProducts.filter(p => p.sellerId === userId);
          const sellerProductIds = new Set(sellerProducts.map(p => p.id));

          const isSeller = orderProductIds.some((id: string) => sellerProductIds.has(id));

          if (!isSeller) {
            return {
              success: false,
              error: "Access denied",
              statusCode: 403,
            };
          }
        } catch {
          return {
            success: false,
            error: "Access denied",
            statusCode: 403,
          };
        }
      }

      // Update item tracking (automatically sets status to 'shipped')
      const updatedItem = await this.storage.updateOrderItemTracking(
        itemId,
        trackingData.trackingNumber,
        trackingData.trackingCarrier,
        trackingData.trackingUrl
      );

      if (!updatedItem) {
        return {
          success: false,
          error: "Failed to update tracking",
          statusCode: 500,
        };
      }

      // Update order fulfillment status
      await this.storage.updateOrderFulfillmentStatus(item.orderId);

      // Send notification if requested (async, non-blocking)
      if (trackingData.notifyCustomer) {
        void this.sendTrackingNotification(order, updatedItem, userId);
      }

      return {
        success: true,
        item: updatedItem,
      };
    } catch (error: any) {
      logger.error("OrderLifecycleService: Error updating item tracking", error);
      return {
        success: false,
        error: error.message || "Failed to update tracking information",
        statusCode: 500,
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Send refund notifications (async, non-blocking)
   * 
   * @param orderId - Order ID
   * @param sellerId - Seller ID
   * @param order - Order object
   * @param itemsToRefund - Map of items to refund
   * @param totalRefundAmount - Total refund amount across all items
   */
  private async sendRefundNotifications(
    orderId: string,
    sellerId: string,
    order: Order,
    itemsToRefund: Map<string, { item: OrderItem; quantity: number; amount: number }>,
    totalRefundAmount: number
  ): Promise<void> {
    try {
      const seller = await this.storage.getUser(sellerId);
      if (!seller) {
        logger.warn(`[Notifications] Seller ${sellerId} not found for refund notification`);
        return;
      }

      // Collect refund data with quantities and amounts
      const refundedItemsData = Array.from(itemsToRefund.values());

      // Send refund email notification to buyer with complete refund data
      await this.notificationService.sendOrderRefunded(order, seller, totalRefundAmount, refundedItemsData);

      logger.info(`[Notifications] Refund notification email sent for order ${orderId}, total refund: $${totalRefundAmount}, ${refundedItemsData.length} items`);
    } catch (error) {
      logger.error("[Notifications] Failed to send refund notification:", error);
    }
  }

  /**
   * Auto-generate documents based on order status change (async, non-blocking)
   * 
   * @param order - Order object
   * @param status - New order status
   * @param userId - User ID who triggered the status change
   */
  private async autoGenerateDocuments(order: Order, status: string, userId: string): Promise<void> {
    try {
      const documentGenerator = new DocumentGenerator(this.storage);

      // Auto-generate invoice when order is paid
      if (status === 'paid') {
        logger.info(`[Auto-Generate] Generating invoice for order ${order.id}`);

        // Get seller ID from order
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if (items.length === 0) {
          logger.error("[Auto-Generate] Cannot generate invoice: order has no items");
          return;
        }

        const allProducts = await this.storage.getAllProducts();
        const firstProduct = allProducts.find(p => p.id === items[0].productId);
        if (!firstProduct) {
          logger.error("[Auto-Generate] Cannot generate invoice: product not found");
          return;
        }

        const sellerId = firstProduct.sellerId;
        const seller = await this.storage.getUser(sellerId);
        if (!seller) {
          logger.error("[Auto-Generate] Cannot generate invoice: seller not found");
          return;
        }

        // Determine order type based on product types
        const orderType = items.some((item: any) => item.productType === 'wholesale') ? 'wholesale' : 'b2c';

        await documentGenerator.generateInvoice({
          order,
          seller,
          orderType,
          generatedBy: userId,
          generationTrigger: 'automatic',
        });

        logger.info(`[Auto-Generate] Invoice generated successfully for order ${order.id}`);
      }

      // Auto-generate packing slip when order is ready to ship
      if (status === 'ready_to_ship') {
        logger.info(`[Auto-Generate] Generating packing slip for order ${order.id}`);

        // Get seller ID from order
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        if (items.length === 0) {
          logger.error("[Auto-Generate] Cannot generate packing slip: order has no items");
          return;
        }

        const allProducts = await this.storage.getAllProducts();
        const firstProduct = allProducts.find(p => p.id === items[0].productId);
        if (!firstProduct) {
          logger.error("[Auto-Generate] Cannot generate packing slip: product not found");
          return;
        }

        const sellerId = firstProduct.sellerId;
        const seller = await this.storage.getUser(sellerId);
        if (!seller) {
          logger.error("[Auto-Generate] Cannot generate packing slip: seller not found");
          return;
        }

        await documentGenerator.generatePackingSlip({
          order,
          seller,
          generatedBy: userId,
          generationTrigger: 'automatic',
        });

        logger.info(`[Auto-Generate] Packing slip generated successfully for order ${order.id}`);
      }
    } catch (error) {
      logger.error("[Auto-Generate] Failed to generate document:", error);
    }
  }

  /**
   * Send tracking notification to customer (async, non-blocking)
   * 
   * @param order - Order object
   * @param item - Order item
   * @param userId - User ID (seller)
   */
  private async sendTrackingNotification(order: Order, item: OrderItem, userId: string): Promise<void> {
    try {
      const seller = await this.storage.getUser(userId);

      if (seller) {
        await this.notificationService.sendItemTracking(order, item, seller);
        logger.info(`[Notifications] Item tracking notification sent for item ${item.id}`);
      }
    } catch (error) {
      logger.error("[Notifications] Failed to send item tracking notification:", error);
    }
  }
}
