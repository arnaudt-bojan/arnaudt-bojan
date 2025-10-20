/**
 * WholesaleOrderService - Wholesale B2B order management
 * 
 * Follows Architecture 3: Service Layer Pattern with dependency injection
 * - Service layer handles business logic and orchestration
 * - Storage layer handles data access
 * - Clean dependency injection
 * - Proper error handling
 */

import type { IStorage } from '../storage';
import type { 
  WholesaleOrder, 
  InsertWholesaleOrder,
  WholesaleOrderItem,
  InsertWholesaleOrderItem,
  WholesaleOrderEvent,
  InsertWholesaleOrderEvent,
  WholesalePaymentIntent,
  WholesaleShippingMetadata
} from '@shared/schema';
import { logger } from '../logger';
import type { NotificationService } from '../notifications';

// Service-specific logger with structured logging
const serviceLogger = logger.child({ service: 'WholesaleOrderService' });

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateOrderParams {
  sellerId: string;
  buyerId: string;
  orderData: {
    subtotalCents: number;
    taxAmountCents?: number;
    totalCents: number;
    currency?: string;
    exchangeRate?: string;
    depositAmountCents: number;
    balanceAmountCents: number;
    depositPercentage?: number;
    balancePercentage?: number;
    paymentTerms?: string;
    expectedShipDate?: Date;
    balancePaymentDueDate?: Date;
    orderDeadline?: Date;
    poNumber?: string;
    vatNumber?: string;
    incoterms?: string;
    buyerCompanyName?: string;
    buyerEmail: string;
    buyerName?: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    productSku?: string;
    quantity: number;
    moq: number;
    unitPriceCents: number;
    subtotalCents: number;
    variant?: any;
  }>;
}

export interface CreateOrderResult {
  success: boolean;
  order?: WholesaleOrder;
  error?: string;
  statusCode?: number;
}

export interface GetOrderResult {
  success: boolean;
  order?: WholesaleOrder & { items: WholesaleOrderItem[] };
  error?: string;
  statusCode?: number;
}

export interface GetOrdersResult {
  success: boolean;
  orders?: WholesaleOrder[];
  error?: string;
  statusCode?: number;
}

export interface UpdateStatusResult {
  success: boolean;
  order?: WholesaleOrder;
  error?: string;
  statusCode?: number;
}

export interface CancelOrderResult {
  success: boolean;
  order?: WholesaleOrder;
  error?: string;
  statusCode?: number;
}

export interface GetTimelineResult {
  success: boolean;
  events?: WholesaleOrderEvent[];
  error?: string;
  statusCode?: number;
}

export interface OrderDetailsResult {
  success: boolean;
  orderDetails?: {
    order: WholesaleOrder;
    items: WholesaleOrderItem[];
    paymentIntents: WholesalePaymentIntent[];
    shippingMetadata?: WholesaleShippingMetadata;
    buyer?: {
      id: string;
      name?: string;
      email: string;
      companyName?: string;
      phone?: string;
    };
    seller?: {
      id: string;
      name?: string;
      email: string;
      companyName?: string;
    };
  };
  error?: string;
  statusCode?: number;
}

// ============================================================================
// WholesaleOrderService
// ============================================================================

export class WholesaleOrderService {
  constructor(
    private storage: IStorage,
    private notificationService?: NotificationService
  ) {}

  /**
   * Create wholesale order with items and generate order number
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    try {
      const { sellerId, buyerId, orderData, items } = params;

      // Generate order number: WH-YYYYMMDD-XXXXX
      const orderNumber = this.generateOrderNumber();

      // Create order
      const orderInsert: InsertWholesaleOrder = {
        orderNumber,
        sellerId,
        buyerId,
        subtotalCents: orderData.subtotalCents,
        taxAmountCents: orderData.taxAmountCents || 0,
        totalCents: orderData.totalCents,
        currency: orderData.currency || 'USD',
        exchangeRate: orderData.exchangeRate,
        depositAmountCents: orderData.depositAmountCents,
        balanceAmountCents: orderData.balanceAmountCents,
        depositPercentage: orderData.depositPercentage?.toString(),
        balancePercentage: orderData.balancePercentage?.toString(),
        paymentTerms: orderData.paymentTerms || 'Net 30',
        expectedShipDate: orderData.expectedShipDate,
        balancePaymentDueDate: orderData.balancePaymentDueDate,
        orderDeadline: orderData.orderDeadline,
        poNumber: orderData.poNumber,
        vatNumber: orderData.vatNumber,
        incoterms: orderData.incoterms,
        buyerCompanyName: orderData.buyerCompanyName,
        buyerEmail: orderData.buyerEmail,
        buyerName: orderData.buyerName,
        status: 'pending',
      };

      const order = await this.storage.createWholesaleOrder(orderInsert);

      if (!order) {
        return { 
          success: false, 
          error: 'Failed to create order',
          statusCode: 500 
        };
      }

      // Create order items
      for (const item of items) {
        const itemInsert: InsertWholesaleOrderItem = {
          wholesaleOrderId: order.id,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          productSku: item.productSku,
          quantity: item.quantity,
          moq: item.moq,
          unitPriceCents: item.unitPriceCents,
          subtotalCents: item.subtotalCents,
          variant: item.variant,
        };

        await this.storage.createWholesaleOrderItem(itemInsert);
      }

      // Create order created event
      await this.createOrderEvent({
        wholesaleOrderId: order.id,
        eventType: 'order_created',
        description: `Order ${orderNumber} created`,
        payload: { orderNumber, itemCount: items.length },
      });

      serviceLogger.info('[WholesaleOrderService] Order created successfully', {
        orderId: order.id,
        orderNumber,
        sellerId,
        buyerId,
        currency: orderData.currency || 'USD',
        exchangeRate: orderData.exchangeRate,
      });

      return { success: true, order };
    } catch (error: any) {
      serviceLogger.error('[WholesaleOrderService] Failed to create order', { error });
      return { 
        success: false, 
        error: error.message || 'Failed to create order',
        statusCode: 500 
      };
    }
  }

  /**
   * Get order with items
   */
  async getOrder(orderId: string): Promise<GetOrderResult> {
    try {
      const order = await this.storage.getWholesaleOrder(orderId);

      if (!order) {
        return { 
          success: false, 
          error: 'Order not found',
          statusCode: 404 
        };
      }

      const items = await this.storage.getWholesaleOrderItems(orderId);

      return { 
        success: true, 
        order: { ...order, items } 
      };
    } catch (error: any) {
      serviceLogger.error('[WholesaleOrderService] Failed to get order', { error, orderId });
      return { 
        success: false, 
        error: error.message || 'Failed to get order',
        statusCode: 500 
      };
    }
  }

  /**
   * Get all seller orders
   */
  async getOrdersBySeller(sellerId: string): Promise<GetOrdersResult> {
    try {
      const orders = await this.storage.getWholesaleOrdersBySellerId(sellerId);

      return { success: true, orders };
    } catch (error: any) {
      serviceLogger.error('[WholesaleOrderService] Failed to get seller orders', { error, sellerId });
      return { 
        success: false, 
        error: error.message || 'Failed to get orders',
        statusCode: 500 
      };
    }
  }

  /**
   * Get all buyer orders
   */
  async getOrdersByBuyer(buyerId: string): Promise<GetOrdersResult> {
    try {
      const orders = await this.storage.getWholesaleOrdersByBuyerId(buyerId);

      return { success: true, orders };
    } catch (error: any) {
      serviceLogger.error('[WholesaleOrderService] Failed to get buyer orders', { error, buyerId });
      return { 
        success: false, 
        error: error.message || 'Failed to get orders',
        statusCode: 500 
      };
    }
  }

  /**
   * Get order details with all relations (items, payments, shipping, buyer/seller info)
   * Access control: seller OR buyer of order
   */
  async getOrderDetails(orderId: string, userId: string): Promise<OrderDetailsResult> {
    try {
      // Get order
      const order = await this.storage.getWholesaleOrder(orderId);
      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          statusCode: 404,
        };
      }

      // Access control: user must be seller or buyer
      if (order.sellerId !== userId && order.buyerId !== userId) {
        return {
          success: false,
          error: 'Access denied',
          statusCode: 403,
        };
      }

      // Fetch all related data in parallel
      const [items, paymentIntents, shippingMetadata, buyerUser, sellerUser] = await Promise.all([
        this.storage.getWholesaleOrderItems(orderId),
        this.storage.getPaymentIntentsByOrderId(orderId),
        this.storage.getShippingMetadataByOrderId(orderId),
        this.storage.getUser(order.buyerId),
        this.storage.getUser(order.sellerId),
      ]);

      // Format buyer info
      const buyer = buyerUser ? {
        id: buyerUser.id,
        name: buyerUser.firstName && buyerUser.lastName 
          ? `${buyerUser.firstName} ${buyerUser.lastName}` 
          : buyerUser.firstName || buyerUser.lastName || order.buyerName || undefined,
        email: (buyerUser.email || order.buyerEmail) ?? '',
        companyName: order.buyerCompanyName || undefined,
        phone: buyerUser.businessPhone || undefined,
      } : undefined;

      // Format seller info
      const seller = sellerUser ? {
        id: sellerUser.id,
        name: sellerUser.firstName && sellerUser.lastName 
          ? `${sellerUser.firstName} ${sellerUser.lastName}` 
          : sellerUser.firstName || sellerUser.lastName || undefined,
        email: sellerUser.email ?? '',
        companyName: sellerUser.companyName || undefined,
      } : undefined;

      serviceLogger.info('[WholesaleOrderService] Order details retrieved', {
        orderId,
        userId,
        itemCount: items.length,
      });

      return {
        success: true,
        orderDetails: {
          order,
          items,
          paymentIntents,
          shippingMetadata,
          buyer,
          seller,
        },
      };
    } catch (error: any) {
      serviceLogger.error('[WholesaleOrderService] Failed to get order details', { error, orderId, userId });
      return {
        success: false,
        error: error.message || 'Failed to get order details',
        statusCode: 500,
      };
    }
  }

  /**
   * Validate status transition
   * Issue 2 Fix: Enforce order lifecycle state machine
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      pending: ['deposit_paid', 'cancelled'],
      deposit_paid: ['awaiting_balance', 'cancelled'],
      awaiting_balance: ['balance_overdue', 'ready_to_release', 'cancelled'],
      balance_overdue: ['ready_to_release', 'cancelled'],
      ready_to_release: ['in_production', 'cancelled'],
      in_production: ['fulfilled', 'cancelled'],
      fulfilled: [], // Terminal state
      cancelled: [], // Terminal state
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Update order status
   * Issue 2 Fix: Validate status transitions before updating
   */
  async updateOrderStatus(
    orderId: string, 
    status: string, 
    performedBy?: string
  ): Promise<UpdateStatusResult> {
    try {
      const order = await this.storage.getWholesaleOrder(orderId);

      if (!order) {
        return { 
          success: false, 
          error: 'Order not found',
          statusCode: 404 
        };
      }

      // Issue 2: Validate status transition
      const isValidTransition = this.validateStatusTransition(order.status, status);
      
      if (!isValidTransition) {
        serviceLogger.error('[WholesaleOrderService] Invalid status transition', {
          orderId,
          currentStatus: order.status,
          attemptedStatus: status,
        });
        return {
          success: false,
          error: `Invalid status transition from '${order.status}' to '${status}'. This transition is not allowed.`,
          statusCode: 400,
        };
      }

      const updatedOrder = await this.storage.updateWholesaleOrder(orderId, { 
        status: status as any 
      });

      if (!updatedOrder) {
        return { 
          success: false, 
          error: 'Failed to update status',
          statusCode: 500 
        };
      }

      // Create status change event
      await this.createOrderEvent({
        wholesaleOrderId: orderId,
        eventType: 'status_change',
        description: `Order status changed from ${order.status} to ${status}`,
        payload: { oldStatus: order.status, newStatus: status },
        performedBy,
      });

      serviceLogger.info('[WholesaleOrderService] Order status updated', {
        orderId,
        oldStatus: order.status,
        newStatus: status,
      });

      // Send email notifications based on status change
      if (this.notificationService) {
        try {
          const seller = await this.storage.getUser(order.sellerId);
          const buyer = await this.storage.getUser(order.buyerId);

          if (status === 'fulfilled' && seller) {
            // Check if tracking info exists to determine email type
            const shippingMetadata = await this.storage.getShippingMetadataByOrderId(orderId);
            
            if (shippingMetadata?.trackingNumber && shippingMetadata?.carrier) {
              // Send shipped email with tracking
              await this.notificationService.sendWholesaleOrderShipped(
                updatedOrder, 
                seller, 
                {
                  carrier: shippingMetadata.carrier,
                  trackingNumber: shippingMetadata.trackingNumber,
                  trackingUrl: `https://tracking.example.com/${shippingMetadata.trackingNumber}`
                }
              );
            } else {
              // Send fulfilled email (pickup or no tracking)
              const shippingDetails = await this.storage.getWholesaleShippingDetails(orderId);
              const fulfillmentType = shippingDetails?.shippingType === 'buyer_pickup' ? 'pickup' : 'shipped';
              const pickupDetails = fulfillmentType === 'pickup' ? {
                address: shippingDetails?.pickupAddress,
                instructions: `Contact: ${shippingDetails?.pickupContactName || 'N/A'}`
              } : undefined;
              
              await this.notificationService.sendWholesaleOrderFulfilled(
                updatedOrder, 
                seller, 
                fulfillmentType, 
                pickupDetails
              );
            }
          } else if (status === 'balance_overdue' && seller && buyer) {
            // Send overdue email to both buyer and seller
            const paymentLink = `${process.env.BASE_URL || 'http://localhost:5000'}/wholesale/orders/${orderId}/pay-balance`;
            await this.notificationService.sendWholesaleBalanceOverdue(
              updatedOrder, 
              seller, 
              buyer, 
              paymentLink
            );
          }
        } catch (emailError: any) {
          serviceLogger.error('[WholesaleOrderService] Failed to send status change email', { error: emailError });
        }
      }

      return { success: true, order: updatedOrder };
    } catch (error: any) {
      serviceLogger.error('[WholesaleOrderService] Failed to update order status', { error, orderId });
      return { 
        success: false, 
        error: error.message || 'Failed to update status',
        statusCode: 500 
      };
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string, 
    reason?: string, 
    performedBy?: string
  ): Promise<CancelOrderResult> {
    try {
      const order = await this.storage.getWholesaleOrder(orderId);

      if (!order) {
        return { 
          success: false, 
          error: 'Order not found',
          statusCode: 404 
        };
      }

      const updatedOrder = await this.storage.updateWholesaleOrder(orderId, { 
        status: 'cancelled' 
      });

      if (!updatedOrder) {
        return { 
          success: false, 
          error: 'Failed to cancel order',
          statusCode: 500 
        };
      }

      // Create cancellation event
      await this.createOrderEvent({
        wholesaleOrderId: orderId,
        eventType: 'order_cancelled',
        description: reason || 'Order cancelled',
        payload: { reason },
        performedBy,
      });

      serviceLogger.info('[WholesaleOrderService] Order cancelled', {
        orderId,
        reason,
      });

      return { success: true, order: updatedOrder };
    } catch (error: any) {
      serviceLogger.error('[WholesaleOrderService] Failed to cancel order', { error, orderId });
      return { 
        success: false, 
        error: error.message || 'Failed to cancel order',
        statusCode: 500 
      };
    }
  }

  /**
   * Get order timeline (events)
   */
  async getOrderTimeline(orderId: string): Promise<GetTimelineResult> {
    try {
      const events = await this.storage.getWholesaleOrderEvents(orderId);

      return { success: true, events };
    } catch (error: any) {
      serviceLogger.error('[WholesaleOrderService] Failed to get order timeline', { error, orderId });
      return { 
        success: false, 
        error: error.message || 'Failed to get timeline',
        statusCode: 500 
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate order number: WH-YYYYMMDD-XXXXX
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    
    return `WH-${year}${month}${day}-${random}`;
  }

  /**
   * Create order event
   */
  private async createOrderEvent(event: InsertWholesaleOrderEvent): Promise<void> {
    try {
      await this.storage.createWholesaleOrderEvent(event);
    } catch (error: any) {
      serviceLogger.error('[WholesaleOrderService] Failed to create order event', { error });
    }
  }
}
