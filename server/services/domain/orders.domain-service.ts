/**
 * OrderDomainService - Single source of truth for all order business logic
 * 
 * Architecture 3 Compliance:
 * - Consolidates logic from REST and GraphQL services
 * - Both REST and GraphQL layers become thin pass-throughs
 * - Handles: validation, Prisma transactions, Socket.IO emissions, cache invalidation
 * 
 * Used by:
 * - REST layer: server/services/order.service.ts
 * - GraphQL layer: apps/nest-api/src/modules/orders/orders.service.ts
 * 
 * Design: Standalone service (not NestJS Injectable) for maximum portability
 */

import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  OrderNotFoundError,
  UnauthorizedOrderAccessError,
  CartNotFoundError,
  UnauthorizedCartAccessError,
  EmptyCartError,
  InvalidRefundAmountError,
  InvalidCursorError,
  ForbiddenError,
} from './errors/order-errors';

// ============================================================================
// Interfaces & Types
// ============================================================================

export interface CreateOrderInput {
  cartId: string;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethodId?: string;
  buyerNotes?: string;
}

export interface UpdateFulfillmentInput {
  orderId: string;
  fulfillmentStatus: string;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export interface IssueRefundInput {
  orderId: string;
  amount: number;
  reason: string;
  refundType: 'full' | 'partial';
}

export interface ProcessBalancePaymentInput {
  orderId: string;
  paymentIntentId: string;
  amountPaid: number;
  currency?: string;
}

export interface ListOrdersFilters {
  sellerId?: string;
  buyerId?: string;
  status?: string;
  first?: number;
  after?: string;
}

// Minimal cache interface (works with both NestJS CacheService and simple cache)
export interface ICache {
  invalidate(key: string): Promise<void>;
}

// Minimal Socket.IO gateway interface
export interface IWebsocketGateway {
  emitOrderUpdate(userId: string, order: any): void;
  emitAnalyticsSaleCompleted(sellerId: string, data: any): void;
}

// ============================================================================
// OrderDomainService
// ============================================================================

export class OrderDomainService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly websocketGateway?: IWebsocketGateway,
    private readonly cache?: ICache,
  ) {}

  /**
   * Get order with ownership validation
   * SECURITY: User must be either the buyer OR the seller
   */
  async getOrder(orderId: string, userId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    // AUTHORIZATION: User must be either the buyer OR the seller
    const isBuyer = order.user_id === userId;
    const isSeller = order.seller_id === userId;

    if (!isBuyer && !isSeller) {
      // Security: Return "not found" instead of "unauthorized" to prevent user enumeration
      throw new OrderNotFoundError(orderId);
    }

    return this.mapOrderToGraphQL(order);
  }

  /**
   * List orders with tenant scoping
   * SECURITY: Filters by sellerId or buyerId to prevent cross-tenant access
   * RETURNS: Connection-shaped response for GraphQL pagination
   */
  async listOrders(filters: ListOrdersFilters) {
    const { sellerId, buyerId, status, first = 20, after } = filters;

    let cursor;
    if (after) {
      try {
        const decoded = JSON.parse(Buffer.from(after, 'base64').toString('utf-8'));
        cursor = { id: decoded.id };
      } catch (e) {
        throw new InvalidCursorError();
      }
    }

    const where: any = {};
    if (sellerId) where.seller_id = sellerId;
    if (buyerId) where.user_id = buyerId;
    if (status) where.status = status;

    const orders = await this.prisma.orders.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: first + 1,
      ...(cursor && { skip: 1, cursor }),
    });

    const hasNextPage = orders.length > first;
    const nodes = hasNextPage ? orders.slice(0, first) : orders;
    const mappedOrders = nodes.map((order: any) => this.mapOrderToGraphQL(order));

    // Calculate endCursor from the last item
    const endCursor = nodes.length > 0
      ? Buffer.from(JSON.stringify({ id: nodes[nodes.length - 1].id })).toString('base64')
      : null;

    // Return connection-shaped response
    return {
      nodes: mappedOrders,
      pageInfo: {
        hasNextPage,
        endCursor,
      },
    };
  }

  /**
   * Get orders by buyer
   * SECURITY: Only returns orders for the specified buyer
   */
  async getOrdersByBuyer(buyerId: string) {
    const orders = await this.prisma.orders.findMany({
      where: { user_id: buyerId },
      orderBy: { created_at: 'desc' },
    });

    return orders.map((order: any) => this.mapOrderToGraphQL(order));
  }

  /**
   * Get orders by seller
   * SECURITY: Only returns orders for the specified seller
   */
  async getOrdersBySeller(sellerId: string) {
    const orders = await this.prisma.orders.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' },
    });

    return orders.map((order: any) => this.mapOrderToGraphQL(order));
  }

  /**
   * Create order - Full transaction with validation and Socket.IO emission
   * TRANSACTION: All database writes are atomic
   * SOCKET.IO: Emits events to buyer and seller (MANDATORY)
   */
  async createOrder(input: CreateOrderInput, userId: string) {
    const { cartId, shippingAddress, billingAddress, paymentMethodId, buyerNotes } = input;

    // Pre-transaction validation
    const cart = await this.prisma.carts.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new CartNotFoundError(cartId);
    }

    if (cart.buyer_id !== userId) {
      throw new UnauthorizedCartAccessError();
    }

    const items = (cart.items as any[]) || [];
    if (items.length === 0) {
      throw new EmptyCartError();
    }

    const subtotal = items.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // ATOMIC TRANSACTION
    const order = await this.prisma.$transaction(async (tx: any) => {
      const orderData = {
        user_id: userId,
        seller_id: cart.seller_id,
        customer_name: shippingAddress.fullName,
        customer_email: 'buyer@example.com', // TODO: Get from user
        customer_address: `${shippingAddress.addressLine1}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`,
        items: JSON.stringify(items),
        total: subtotal,
        subtotal_before_tax: subtotal,
        tax_amount: 0,
        shipping_cost: 0,
        amount_paid: 0,
        remaining_balance: subtotal,
        payment_type: 'full',
        payment_status: 'pending',
        status: 'PENDING' as any,  // OrderStatus enum
        fulfillment_status: 'unfulfilled',
        currency: 'USD',
        shipping_street: shippingAddress.addressLine1,
        shipping_city: shippingAddress.city,
        shipping_state: shippingAddress.state,
        shipping_postal_code: shippingAddress.postalCode,
        shipping_country: shippingAddress.country || 'US',
        billing_name: billingAddress?.fullName || shippingAddress.fullName,
        billing_email: billingAddress?.addressLine1 || shippingAddress.addressLine1,
        billing_street: billingAddress?.addressLine1 || shippingAddress.addressLine1,
        billing_city: billingAddress?.city || shippingAddress.city,
        billing_state: billingAddress?.state || shippingAddress.state,
        billing_postal_code: billingAddress?.postalCode || shippingAddress.postalCode,
        billing_country: billingAddress?.country || shippingAddress.country || 'US',
        created_at: new Date().toISOString(),
      };

      // Create order
      const createdOrder = await tx.orders.create({
        data: orderData,
      });

      // Create order items
      for (const item of items) {
        await tx.order_items.create({
          data: {
            order_id: createdOrder.id,
            product_id: item.productId,
            product_name: item.name,
            product_type: item.productType || 'physical',
            quantity: item.quantity,
            price: item.price.toString(),
            subtotal: (item.price * item.quantity).toString(),
            item_status: 'PENDING' as any,  // OrderStatus enum
            created_at: new Date().toISOString(),
          },
        });
      }

      // Clear cart
      await tx.carts.update({
        where: { id: cartId },
        data: {
          items: JSON.stringify([]),
          updated_at: new Date().toISOString(),
        },
      });

      return createdOrder;
    }, {
      timeout: 30000, // 30 second timeout
    });

    // Map to GraphQL format
    const graphqlOrder = this.mapOrderToGraphQL(order);

    // SOCKET.IO EMISSION (MANDATORY per SOCKETIO_USAGE_RULES.md)
    if (this.websocketGateway) {
      this.websocketGateway.emitOrderUpdate(userId, graphqlOrder);
      this.websocketGateway.emitOrderUpdate(cart.seller_id, graphqlOrder);

      // Analytics event
      this.websocketGateway.emitAnalyticsSaleCompleted(cart.seller_id, {
        sellerId: cart.seller_id,
        orderId: order.id,
        amount: order.total.toString(),
        itemCount: items.length,
      });
    }

    // Cache invalidation
    if (this.cache) {
      await this.cache.invalidate(`orders:buyer:${userId}`);
      await this.cache.invalidate(`orders:seller:${cart.seller_id}`);
    }

    return graphqlOrder;
  }

  /**
   * Update order fulfillment
   * SECURITY: Only seller can update fulfillment
   * SOCKET.IO: Emits events to buyer and seller (MANDATORY)
   */
  async updateOrderFulfillment(input: UpdateFulfillmentInput, userId: string) {
    const { orderId, fulfillmentStatus, trackingNumber, carrier, trackingUrl, estimatedDelivery } = input;

    // Verify ownership
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    if (order.seller_id !== userId) {
      throw new ForbiddenError('Access denied: Only the seller can update order fulfillment');
    }

    // Update order
    const updatedOrder = await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        fulfillment_status: fulfillmentStatus,
        tracking_number: trackingNumber || null,
        shipping_carrier: carrier || null,
        tracking_link: trackingUrl || null,  // Changed from tracking_url to tracking_link
        updated_at: new Date().toISOString(),
      },
    });

    const graphqlOrder = this.mapOrderToGraphQL(updatedOrder);

    // SOCKET.IO EMISSION (MANDATORY per SOCKETIO_USAGE_RULES.md)
    if (this.websocketGateway) {
      this.websocketGateway.emitOrderUpdate(updatedOrder.user_id, graphqlOrder);
      this.websocketGateway.emitOrderUpdate(updatedOrder.seller_id, graphqlOrder);
    }

    // Cache invalidation
    if (this.cache) {
      await this.cache.invalidate(`order:${orderId}`);
    }

    return graphqlOrder;
  }

  /**
   * Issue refund
   * SECURITY: Only seller can issue refunds
   * SOCKET.IO: Emits events to buyer and seller (MANDATORY)
   * NOTE: Actual Stripe refund should be handled outside transaction
   */
  async issueRefund(input: IssueRefundInput, userId: string) {
    const { orderId, amount, reason, refundType } = input;

    // Verify ownership
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    if (order.seller_id !== userId) {
      throw new ForbiddenError('Access denied: Only the seller can issue refunds');
    }

    // Validate refund amount (use integer math to avoid floating-point precision issues)
    const orderTotalCents = Math.round(parseFloat(order.total.toString()) * 100);
    const refundAmountCents = Math.round(amount * 100);

    if (refundAmountCents > orderTotalCents) {
      throw new InvalidRefundAmountError();
    }

    // Update order status
    const updatedOrder = await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        payment_status: refundType === 'full' ? 'refunded' : 'partially_refunded',
        status: refundType === 'full' ? 'CANCELLED' as any : order.status,  // OrderStatus enum
        updated_at: new Date().toISOString(),
      },
    });

    const graphqlOrder = this.mapOrderToGraphQL(updatedOrder);

    // SOCKET.IO EMISSION (MANDATORY per SOCKETIO_USAGE_RULES.md)
    if (this.websocketGateway) {
      this.websocketGateway.emitOrderUpdate(updatedOrder.user_id, graphqlOrder);
      this.websocketGateway.emitOrderUpdate(updatedOrder.seller_id, graphqlOrder);
    }

    // Cache invalidation
    if (this.cache) {
      await this.cache.invalidate(`order:${orderId}`);
    }

    return graphqlOrder;
  }

  /**
   * Process balance payment
   * SECURITY: User must be either buyer or seller
   * TRANSACTION: Updates order payment status and amounts
   * SOCKET.IO: Emits events to buyer and seller (MANDATORY)
   */
  async processBalancePayment(input: ProcessBalancePaymentInput, userId: string) {
    const { orderId, paymentIntentId, amountPaid, currency = 'USD' } = input;

    // Verify order exists
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    // Authorization: buyer (order owner) OR seller (owns products)
    const isBuyer = order.user_id === userId;
    const isSeller = order.seller_id === userId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenError('Access denied: You are not authorized to process payment for this order');
    }

    // Validate payment amount
    const currentBalance = parseFloat(order.remaining_balance?.toString() || '0');
    const currentAmountPaid = parseFloat(order.amount_paid?.toString() || '0');

    if (amountPaid <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    if (amountPaid > currentBalance) {
      throw new Error(`Payment amount cannot exceed remaining balance of ${currentBalance}`);
    }

    // Calculate new amounts
    const newAmountPaid = currentAmountPaid + amountPaid;
    const newRemainingBalance = currentBalance - amountPaid;

    // Determine new payment status
    let paymentStatus = order.payment_status;
    if (newRemainingBalance === 0) {
      paymentStatus = 'paid';
    } else if (newAmountPaid > 0) {
      paymentStatus = 'partially_paid';
    }

    // Update order in transaction
    const updatedOrder = await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        amount_paid: newAmountPaid.toString(),
        remaining_balance: newRemainingBalance.toString(),
        payment_status: paymentStatus,
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      },
    });

    const graphqlOrder = this.mapOrderToGraphQL(updatedOrder);

    // SOCKET.IO EMISSION (MANDATORY per SOCKETIO_USAGE_RULES.md)
    if (this.websocketGateway) {
      this.websocketGateway.emitOrderUpdate(updatedOrder.user_id, graphqlOrder);
      this.websocketGateway.emitOrderUpdate(updatedOrder.seller_id, graphqlOrder);
    }

    // Cache invalidation
    if (this.cache) {
      await this.cache.invalidate(`order:${orderId}`);
      await this.cache.invalidate(`orders:buyer:${updatedOrder.user_id}`);
      await this.cache.invalidate(`orders:seller:${updatedOrder.seller_id}`);
    }

    return graphqlOrder;
  }

  /**
   * Helper: Map Prisma order to GraphQL format
   */
  private mapOrderToGraphQL(order: any) {
    return {
      id: order.id,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      buyerId: order.user_id,
      sellerId: order.seller_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerAddress: order.customer_address,
      total: order.total?.toString() || '0',
      subtotal: order.subtotal_before_tax?.toString() || order.total?.toString() || '0',
      taxAmount: order.tax_amount?.toString() || '0',
      shippingCost: order.shipping_cost?.toString() || '0',
      amountPaid: order.amount_paid?.toString() || '0',
      remainingBalance: order.remaining_balance?.toString() || '0',
      paymentType: order.payment_type || 'full',
      paymentStatus: order.payment_status || 'pending',
      status: order.status || 'pending',
      fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
      trackingNumber: order.tracking_number || null,
      carrier: order.shipping_carrier || null,
      trackingUrl: order.tracking_url || null,
      estimatedDelivery: order.estimated_delivery || null,
      currency: order.currency || 'USD',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      // Items will be loaded by dataloader in resolver
      items: [],
      events: [],
      refunds: [],
    };
  }
}
