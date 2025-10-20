import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private websocketGateway: AppWebSocketGateway,
  ) {}

  async getOrder(orderId: string, userId: string) {
    // CRITICAL FIX: Validate ownership before returning order
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new GraphQLError('Order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // AUTHORIZATION: User must be either the buyer OR the seller
    const isBuyer = order.user_id === userId;
    const isSeller = order.seller_id === userId;

    if (!isBuyer && !isSeller) {
      // Security: Return "not found" instead of "unauthorized" to prevent user enumeration
      throw new GraphQLError('Order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
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
    const { sellerId, buyerId, status, first = 20, after } = args;

    let cursor;
    if (after) {
      try {
        const decoded = JSON.parse(Buffer.from(after, 'base64').toString('utf-8'));
        cursor = { id: decoded.id };
      } catch (e) {
        throw new GraphQLError('Invalid cursor', {
          extensions: { code: 'BAD_REQUEST' },
        });
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

    return nodes.map(order => this.mapOrderToGraphQL(order));
  }

  async getOrdersByBuyer(buyerId: string) {
    const orders = await this.prisma.orders.findMany({
      where: { user_id: buyerId },
      orderBy: { created_at: 'desc' },
    });

    return orders.map(order => this.mapOrderToGraphQL(order));
  }

  async getOrdersBySeller(sellerId: string) {
    const orders = await this.prisma.orders.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' },
    });

    return orders.map(order => this.mapOrderToGraphQL(order));
  }

  async createOrder(input: any, userId: string) {
    const { cartId, shippingAddress, billingAddress, paymentMethodId, buyerNotes } = input;

    // Pre-transaction validation
    const cart = await this.prisma.carts.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new GraphQLError('Cart not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (cart.buyer_id !== userId) {
      throw new GraphQLError('Unauthorized: Cart does not belong to the current user', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const items = (cart.items as any[]) || [];
    if (items.length === 0) {
      throw new GraphQLError('Cart is empty', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const subtotal = items.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Transaction: Create order, order items, and update cart atomically
    const order = await this.prisma.runTransaction(async (tx) => {
      const orderData = {
        user_id: userId,
        seller_id: cart.seller_id,
        customer_name: shippingAddress.fullName,
        customer_email: 'buyer@example.com',
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
        status: 'pending',
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

      // Step 1: Create order
      const createdOrder = await tx.orders.create({
        data: orderData,
      });

      // Step 2: Create order items
      for (const item of items) {
        await tx.order_items.create({
          data: {
            order_id: createdOrder.id,
            product_id: item.id,
            product_name: item.name,
            product_image: item.images?.[0] || null,
            product_type: item.productType,
            quantity: item.quantity,
            price: parseFloat(item.price),
            subtotal: parseFloat(item.price) * item.quantity,
            variant: item.variant || null,
            item_status: 'pending',
            product_sku: item.productSku || null,
            variant_sku: item.variantSku || null,
          },
        });
      }

      // Step 3: Update cart status
      await tx.carts.update({
        where: { id: cartId },
        data: { 
          items: [] as any, 
          status: 'completed',
          updated_at: new Date() 
        },
      });

      return createdOrder;
    });

    // Cache invalidation: Clear order caches for buyer and seller
    await this.cacheService.delPattern(`orders:buyer:${userId}`);
    await this.cacheService.delPattern(`orders:seller:${cart.seller_id}`);

    const graphqlOrder = this.mapOrderToGraphQL(order);

    // External API calls (Socket.IO) - OUTSIDE transaction
    this.websocketGateway.emitOrderUpdate(userId, graphqlOrder);
    this.websocketGateway.emitOrderUpdate(cart.seller_id, graphqlOrder);

    this.websocketGateway.emitAnalyticsSaleCompleted(cart.seller_id, {
      sellerId: cart.seller_id,
      orderId: order.id,
      amount: order.total.toString(),
      productId: items[0]?.id || undefined,
    });

    return graphqlOrder;
  }

  async updateOrderFulfillment(input: any, sellerId: string) {
    const { orderId, status, trackingNumber, carrier, notes } = input;

    // Pre-transaction validation
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new GraphQLError('Order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (order.seller_id !== sellerId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Transaction: Update order and order items atomically
    const updatedOrder = await this.prisma.runTransaction(async (tx) => {
      const updateData: any = {
        fulfillment_status: status.toLowerCase(),
      };

      if (trackingNumber) updateData.tracking_number = trackingNumber;
      if (carrier) updateData.shipping_carrier = carrier;

      // Step 1: Update order
      const updated = await tx.orders.update({
        where: { id: orderId },
        data: updateData,
      });

      // Step 2: Update order items if tracking info provided
      if (trackingNumber && carrier) {
        await tx.order_items.updateMany({
          where: { order_id: orderId },
          data: {
            tracking_number: trackingNumber,
            tracking_carrier: carrier,
            item_status: status.toLowerCase(),
          },
        });
      }

      return updated;
    });

    // Cache invalidation: Clear order caches
    await this.cacheService.del(`order:${orderId}`);
    await this.cacheService.delPattern(`orders:buyer:${updatedOrder.user_id}`);
    await this.cacheService.delPattern(`orders:seller:${updatedOrder.seller_id}`);

    const graphqlOrder = this.mapOrderToGraphQL(updatedOrder);

    // External API calls (Socket.IO) - OUTSIDE transaction
    this.websocketGateway.emitOrderUpdate(updatedOrder.user_id, graphqlOrder);
    this.websocketGateway.emitOrderUpdate(updatedOrder.seller_id, graphqlOrder);

    return graphqlOrder;
  }

  async issueRefund(input: any, sellerId: string) {
    const { orderId, lineItems, reason } = input;

    // Pre-transaction validation
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new GraphQLError('Order not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (order.seller_id !== sellerId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const totalRefundAmount = lineItems.reduce((sum: number, item: any) => {
      return sum + parseFloat(item.amount);
    }, 0);

    // Transaction: Update order status atomically
    const updatedOrder = await this.prisma.runTransaction(async (tx) => {
      return await tx.orders.update({
        where: { id: orderId },
        data: {
          payment_status: 'refunded',
          status: 'refunded',
        },
      });
    });

    // Cache invalidation: Clear order caches
    await this.cacheService.del(`order:${orderId}`);
    await this.cacheService.delPattern(`orders:buyer:${updatedOrder.user_id}`);
    await this.cacheService.delPattern(`orders:seller:${updatedOrder.seller_id}`);

    const graphqlOrder = this.mapOrderToGraphQL(updatedOrder);

    // External API calls (Socket.IO) - OUTSIDE transaction
    // TODO: Actual Stripe refund API call should go here (OUTSIDE transaction)
    this.websocketGateway.emitOrderUpdate(updatedOrder.user_id, graphqlOrder);
    this.websocketGateway.emitOrderUpdate(updatedOrder.seller_id, graphqlOrder);

    return graphqlOrder;
  }

  async getOrderItems(orderId: string) {
    const items = await this.prisma.order_items.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'asc' },
    });

    return items.map(item => this.mapOrderItemToGraphQL(item));
  }

  private mapOrderToGraphQL(order: any) {
    return {
      id: order.id,
      orderNumber: `ORD-${order.id.substring(0, 8).toUpperCase()}`,
      sellerId: order.seller_id,
      buyerId: order.user_id,
      status: order.status?.toUpperCase() || 'PENDING',
      fulfillmentStatus: order.fulfillment_status?.toUpperCase() || 'UNFULFILLED',
      paymentStatus: order.payment_status?.toUpperCase() || 'PENDING',
      subtotal: order.subtotal_before_tax || order.total,
      shippingCost: order.shipping_cost || 0,
      taxAmount: order.tax_amount || 0,
      totalAmount: order.total,
      currency: order.currency || 'USD',
      depositAmount: order.deposit_amount_cents ? order.deposit_amount_cents / 100 : null,
      balanceDue: order.balance_due_cents ? order.balance_due_cents / 100 : null,
      balancePaidAt: order.balance_paid_at,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.billing_phone,
      shippingAddress: {
        fullName: order.customer_name,
        addressLine1: order.shipping_street,
        addressLine2: null,
        city: order.shipping_city,
        state: order.shipping_state,
        postalCode: order.shipping_postal_code,
        country: order.shipping_country,
        phone: order.billing_phone,
      },
      billingAddress: order.billing_street ? {
        fullName: order.billing_name,
        addressLine1: order.billing_street,
        addressLine2: null,
        city: order.billing_city,
        state: order.billing_state,
        postalCode: order.billing_postal_code,
        country: order.billing_country,
        phone: order.billing_phone,
      } : null,
      trackingNumber: order.tracking_number,
      carrier: order.shipping_carrier,
      paymentIntentId: order.stripe_payment_intent_id,
      createdAt: order.created_at,
      updatedAt: order.created_at,
      paidAt: order.balance_paid_at,
    };
  }

  private mapOrderItemToGraphQL(item: any) {
    return {
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id,
      variantId: null,
      productName: item.product_name,
      productImage: item.product_image,
      variantDetails: item.variant,
      quantity: item.quantity,
      unitPrice: item.price,
      lineTotal: item.subtotal,
      fulfillmentStatus: item.item_status?.toUpperCase() || 'UNFULFILLED',
      createdAt: item.created_at,
    };
  }
}
