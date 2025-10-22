import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { OrderDomainService } from '../../../../../server/services/domain/orders.domain-service';
import { DomainError } from '../../../../../server/services/domain/errors/domain-error';

/**
 * GraphQL OrdersService - Thin layer that delegates to OrderDomainService
 * Architecture 3 Compliance: All business logic in domain service
 */
@Injectable()
export class OrdersService {
  private domainService: OrderDomainService;

  constructor(
    private prismaService: PrismaService,
    private cacheService: CacheService,
    private websocketGateway: AppWebSocketGateway,
  ) {
    // Instantiate domain service with injected dependencies
    this.domainService = new OrderDomainService(
      this.prismaService, // ✅ Use injected PrismaService
      websocketGateway,
      {
        invalidate: async (key: string) => {
          // Adapt NestJS cache service to domain service cache interface
          await this.cacheService.del(key);
          await this.cacheService.delPattern(key);
        },
      },
    );
  }

  // ============================================================================
  // Query Methods - Delegate to Domain Service with Error Handling
  // ============================================================================

  async getOrder(orderId: string, userId: string) {
    try {
      return await this.domainService.getOrder(orderId, userId);
    } catch (error) {
      throw this.convertDomainErrorToGraphQL(error);
    }
  }

  async listOrders(args: {
    sellerId?: string;
    buyerId?: string;
    status?: string;
    first?: number;
    after?: string;
  }) {
    try {
      return await this.domainService.listOrders(args);
    } catch (error) {
      throw this.convertDomainErrorToGraphQL(error);
    }
  }

  async getOrdersByBuyer(buyerId: string) {
    try {
      return await this.domainService.getOrdersByBuyer(buyerId);
    } catch (error) {
      throw this.convertDomainErrorToGraphQL(error);
    }
  }

  async getOrdersBySeller(sellerId: string) {
    try {
      return await this.domainService.getOrdersBySeller(sellerId);
    } catch (error) {
      throw this.convertDomainErrorToGraphQL(error);
    }
  }

  // ============================================================================
  // Mutation Methods - Delegate to Domain Service with Error Handling
  // ============================================================================

  async createOrder(input: any, userId: string) {
    try {
      return await this.domainService.createOrder(input, userId);
    } catch (error) {
      throw this.convertDomainErrorToGraphQL(error);
    }
  }

  async updateOrderFulfillment(input: any, sellerId: string) {
    try {
      // Map GraphQL input to domain service input
      const domainInput = {
        orderId: input.orderId,
        fulfillmentStatus: input.status.toLowerCase(),
        trackingNumber: input.trackingNumber,
        carrier: input.carrier,
        trackingUrl: undefined,
        estimatedDelivery: undefined,
      };

      return await this.domainService.updateOrderFulfillment(domainInput, sellerId);
    } catch (error) {
      throw this.convertDomainErrorToGraphQL(error);
    }
  }

  async issueRefund(input: any, sellerId: string) {
    try {
      // Map GraphQL input to domain service input
      const totalRefundAmount = input.lineItems.reduce((sum: number, item: any) => {
        return sum + parseFloat(item.amount);
      }, 0);

      const firstItemAmount = parseFloat(input.lineItems[0]?.amount || '0');
      const refundType = totalRefundAmount >= firstItemAmount ? 'full' as const : 'partial' as const;
      
      const domainInput = {
        orderId: input.orderId,
        amount: totalRefundAmount,
        reason: input.reason,
        refundType: refundType,
      };

      return await this.domainService.issueRefund(domainInput, sellerId);
    } catch (error) {
      throw this.convertDomainErrorToGraphQL(error);
    }
  }

  async cancelOrder(orderId: string, userId: string) {
    try {
      // Verify order exists and user has access (buyer can cancel their own orders)
      const order = await this.prismaService.orders.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new GraphQLError('Order not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Only the buyer who placed the order can cancel it
      if (order.user_id !== userId) {
        throw new GraphQLError('Access denied', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      // Check if order can be cancelled (only pending/processing orders)
      if (order.status === 'cancelled' || order.status === 'fulfilled' || order.status === 'refunded') {
        throw new GraphQLError('Order cannot be cancelled', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      // Update order status to cancelled
      const updatedOrder = await this.prismaService.orders.update({
        where: { id: orderId },
        data: { 
          status: 'cancelled',
          updated_at: new Date(),
        },
      });

      // Emit socket event for real-time updates
      this.websocketGateway.emitNotification(userId, {
        type: 'order_cancelled',
        orderId: updatedOrder.id,
        sellerId: updatedOrder.seller_id,
      });

      // Invalidate caches
      await this.cacheService.del(`order:${orderId}`);
      await this.cacheService.delPattern(`orders:buyer:${userId}`);
      await this.cacheService.delPattern(`orders:seller:${order.seller_id}`);

      // Map to GraphQL format (simplified return with available fields)
      return {
        id: updatedOrder.id,
        orderNumber: `ORD-${updatedOrder.id.substring(0, 8).toUpperCase()}`,
        status: updatedOrder.status.toUpperCase(),
        fulfillmentStatus: updatedOrder.fulfillment_status?.toUpperCase() || 'UNFULFILLED',
        totalAmount: parseFloat(updatedOrder.total.toString()),
        subtotalAmount: parseFloat((updatedOrder.subtotal_before_tax || updatedOrder.total).toString()),
        taxAmount: parseFloat((updatedOrder.tax_amount || 0).toString()),
        shippingAmount: parseFloat((updatedOrder.shipping_cost || 0).toString()),
        currency: updatedOrder.currency || 'USD',
        buyerId: updatedOrder.user_id,
        sellerId: updatedOrder.seller_id,
        createdAt: updatedOrder.created_at,
        updatedAt: updatedOrder.updated_at,
      };
    } catch (error) {
      throw this.convertDomainErrorToGraphQL(error);
    }
  }

  async reorderItems(orderId: string, userId: string) {
    try {
      // Verify order exists and user has access
      const order = await this.prismaService.orders.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new GraphQLError('Order not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Only the buyer who placed the order can reorder
      if (order.user_id !== userId) {
        throw new GraphQLError('Access denied', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      // Get order items
      const orderItems = await this.prismaService.order_items.findMany({
        where: { order_id: orderId },
      });

      if (!orderItems || orderItems.length === 0) {
        throw new GraphQLError('Order has no items', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      // Get or create active cart for the buyer
      let cart = await this.prismaService.carts.findFirst({
        where: {
          buyer_id: userId,
          status: 'active',
        },
      });

      if (!cart) {
        cart = await this.prismaService.carts.create({
          data: {
            buyer_id: userId,
            seller_id: order.seller_id,
            status: 'active',
            items: [],
          },
        });
      }

      // Parse existing cart items from JSON
      const existingItems = Array.isArray(cart.items) ? cart.items : [];
      const updatedItems: any[] = [...existingItems];

      // Add order items to cart
      for (const item of orderItems) {
        const existingIndex = updatedItems.findIndex(
          (cartItem: any) => cartItem.productId === item.product_id
        );

        if (existingIndex >= 0) {
          // Update quantity
          (updatedItems[existingIndex] as any).quantity += item.quantity;
        } else {
          // Add new item - convert Decimal to number for JSON storage
          updatedItems.push({
            id: `item_${Date.now()}_${Math.random()}`,
            productId: item.product_id,
            quantity: item.quantity,
            priceCents: parseFloat(item.price.toString()),
          });
        }
      }

      // Update cart with new items
      await this.prismaService.carts.update({
        where: { id: cart.id },
        data: {
          items: updatedItems as any,
          updated_at: new Date(),
        },
      });

      // Invalidate cart cache
      await this.cacheService.del(`cart:${cart.id}`);
      await this.cacheService.delPattern(`cart:buyer:${userId}`);

      // Emit socket event
      this.websocketGateway.emitCartUpdate(userId, {
        cartId: cart.id,
        buyerId: userId,
        itemCount: updatedItems.length,
      });

      // Return cart with items
      return {
        id: cart.id,
        items: updatedItems.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      };
    } catch (error) {
      throw this.convertDomainErrorToGraphQL(error);
    }
  }

  // ============================================================================
  // Helper Methods - GraphQL-specific
  // ============================================================================

  async getOrderItems(orderId: string) {
    const items = await this.prismaService.order_items.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'asc' },
    });

    const mappedItems = items.map(item => this.mapOrderItemToGraphQL(item));
    return mappedItems;
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

  // ============================================================================
  // Error Conversion - Convert Domain Errors to GraphQL Errors
  // ============================================================================

  private convertDomainErrorToGraphQL(error: unknown): GraphQLError {
    // Handle domain errors - use their code and httpStatus directly
    if (error instanceof DomainError) {
      return new GraphQLError(error.message, {
        extensions: {
          code: error.code,
          httpStatus: error.httpStatus,
        },
      });
    }

    // Re-throw if already a GraphQLError
    if (error instanceof GraphQLError) {
      return error;
    }

    // Unknown errors
    console.error('Unknown error in OrdersService:', error);
    return new GraphQLError('An unexpected error occurred', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
