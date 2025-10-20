import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { OrderDomainService } from '../../../../../server/services/domain/orders.domain-service';
import {
  OrderNotFoundError,
  UnauthorizedOrderAccessError,
  CartNotFoundError,
  UnauthorizedCartAccessError,
  EmptyCartError,
  InvalidRefundAmountError,
  InvalidCursorError,
  ForbiddenError,
  OrderDomainError,
} from '../../../../../server/services/domain/errors/order-errors';

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

      const domainInput = {
        orderId: input.orderId,
        amount: totalRefundAmount,
        reason: input.reason,
        refundType: totalRefundAmount >= parseFloat(input.lineItems[0]?.amount || '0') ? 'full' : 'partial' as const,
      };

      return await this.domainService.issueRefund(domainInput, sellerId);
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

    return items.map(item => this.mapOrderItemToGraphQL(item));
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
    // Handle domain-specific errors
    if (error instanceof OrderNotFoundError || error instanceof UnauthorizedOrderAccessError) {
      return new GraphQLError(error.message, {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (error instanceof CartNotFoundError) {
      return new GraphQLError(error.message, {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (error instanceof UnauthorizedCartAccessError || error instanceof ForbiddenError) {
      return new GraphQLError(error.message, {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    if (error instanceof EmptyCartError || error instanceof InvalidRefundAmountError || error instanceof InvalidCursorError) {
      return new GraphQLError(error.message, {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    if (error instanceof OrderDomainError) {
      // Catch-all for other domain errors
      return new GraphQLError(error.message, {
        extensions: { code: 'BAD_REQUEST' },
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
