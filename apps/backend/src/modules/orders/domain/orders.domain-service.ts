import { DomainError } from '../../../common/errors/domain-error';

/**
 * OrderDomainService - Domain logic for orders
 * 
 * This service encapsulates all business logic for order operations.
 * It's designed to be framework-agnostic and can be used by any presentation layer.
 */
export class OrderDomainService {
  constructor(
    private prisma: any,
    private websocketGateway: any,
    private cache: any,
  ) {}

  async getOrder(orderId: string, userId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: true,
      },
    });

    if (!order) {
      throw new DomainError('Order not found', 'ORDER_NOT_FOUND', 404);
    }

    if (order.user_id !== userId && order.seller_id !== userId) {
      throw new DomainError('Access denied', 'FORBIDDEN', 403);
    }

    return this.mapOrderToGraphQL(order);
  }

  async listOrders(args: {
    sellerId?: string;
    buyerId?: string;
    status?: string;
    first?: number;
    after?: string;
  }) {
    const where: any = {};
    
    if (args.sellerId) where.seller_id = args.sellerId;
    if (args.buyerId) where.user_id = args.buyerId;
    if (args.status) where.status = args.status.toLowerCase();

    const orders = await this.prisma.orders.findMany({
      where,
      take: args.first || 20,
      orderBy: { created_at: 'desc' },
    });

    return {
      edges: orders.map((order: any) => ({
        node: this.mapOrderToGraphQL(order),
        cursor: order.id,
      })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: orders[0]?.id || null,
        endCursor: orders[orders.length - 1]?.id || null,
      },
    };
  }

  async getOrdersByBuyer(buyerId: string) {
    const orders = await this.prisma.orders.findMany({
      where: { user_id: buyerId },
      orderBy: { created_at: 'desc' },
    });

    return orders.map((order: any) => this.mapOrderToGraphQL(order));
  }

  async getOrdersBySeller(sellerId: string) {
    const orders = await this.prisma.orders.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' },
    });

    return orders.map((order: any) => this.mapOrderToGraphQL(order));
  }

  async createOrder(input: any, userId: string) {
    const order = await this.prisma.orders.create({
      data: {
        user_id: userId,
        seller_id: input.sellerId,
        status: 'pending',
        fulfillment_status: 'unfulfilled',
        total: input.totalAmount,
        subtotal_before_tax: input.subtotalAmount,
        tax_amount: input.taxAmount,
        shipping_cost: input.shippingAmount,
        currency: input.currency || 'USD',
      },
    });

    if (this.websocketGateway) {
      this.websocketGateway.emitOrderUpdate(input.sellerId, {
        orderId: order.id,
        status: order.status,
      });
    }

    await this.cache.invalidate(`orders:buyer:${userId}`);
    await this.cache.invalidate(`orders:seller:${input.sellerId}`);

    return this.mapOrderToGraphQL(order);
  }

  async updateOrderFulfillment(input: any, sellerId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: input.orderId },
    });

    if (!order) {
      throw new DomainError('Order not found', 'ORDER_NOT_FOUND', 404);
    }

    if (order.seller_id !== sellerId) {
      throw new DomainError('Access denied', 'FORBIDDEN', 403);
    }

    const updatedOrder = await this.prisma.orders.update({
      where: { id: input.orderId },
      data: {
        fulfillment_status: input.fulfillmentStatus,
        tracking_number: input.trackingNumber,
        carrier: input.carrier,
        updated_at: new Date(),
      },
    });

    if (this.websocketGateway) {
      this.websocketGateway.emitOrderUpdate(sellerId, {
        orderId: updatedOrder.id,
        fulfillmentStatus: updatedOrder.fulfillment_status,
      });
    }

    await this.cache.invalidate(`order:${input.orderId}`);
    await this.cache.invalidate(`orders:buyer:${order.user_id}`);
    await this.cache.invalidate(`orders:seller:${sellerId}`);

    return this.mapOrderToGraphQL(updatedOrder);
  }

  async issueRefund(input: any, sellerId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: input.orderId },
    });

    if (!order) {
      throw new DomainError('Order not found', 'ORDER_NOT_FOUND', 404);
    }

    if (order.seller_id !== sellerId) {
      throw new DomainError('Access denied', 'FORBIDDEN', 403);
    }

    const updatedOrder = await this.prisma.orders.update({
      where: { id: input.orderId },
      data: {
        status: 'refunded',
        updated_at: new Date(),
      },
    });

    if (this.websocketGateway) {
      this.websocketGateway.emitOrderUpdate(sellerId, {
        orderId: updatedOrder.id,
        status: 'refunded',
      });
    }

    await this.cache.invalidate(`order:${input.orderId}`);
    await this.cache.invalidate(`orders:buyer:${order.user_id}`);
    await this.cache.invalidate(`orders:seller:${sellerId}`);

    return this.mapOrderToGraphQL(updatedOrder);
  }

  private mapOrderToGraphQL(order: any) {
    return {
      id: order.id,
      orderNumber: `ORD-${order.id.substring(0, 8).toUpperCase()}`,
      status: order.status.toUpperCase(),
      fulfillmentStatus: order.fulfillment_status?.toUpperCase() || 'UNFULFILLED',
      totalAmount: parseFloat(order.total.toString()),
      subtotalAmount: parseFloat((order.subtotal_before_tax || order.total).toString()),
      taxAmount: parseFloat((order.tax_amount || 0).toString()),
      shippingAmount: parseFloat((order.shipping_cost || 0).toString()),
      currency: order.currency || 'USD',
      buyerId: order.user_id,
      sellerId: order.seller_id,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      trackingNumber: order.tracking_number,
      carrier: order.carrier,
    };
  }
}
