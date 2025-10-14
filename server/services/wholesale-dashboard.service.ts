/**
 * WholesaleDashboardService - Wholesale B2B dashboard metrics and analytics
 * 
 * Follows Architecture 3: Service Layer Pattern with dependency injection
 * - Provides seller and buyer dashboard metrics
 * - Calculates revenue, pending payments, order summaries
 */

import type { IStorage } from '../storage';
import type { WholesaleOrder, WholesalePayment } from '@shared/schema';
import { logger } from '../logger';

// ============================================================================
// Interfaces
// ============================================================================

export interface SellerMetrics {
  totalOrders: number;
  totalRevenueCents: number;
  pendingPaymentsCents: number;
  activeOrders: number;
  completedOrders: number;
  currency: string;
}

export interface BuyerMetrics {
  totalOrders: number;
  totalSpentCents: number;
  pendingPaymentsCents: number;
  activeOrders: number;
  completedOrders: number;
  currency: string;
}

export interface OrderStatusCount {
  status: string;
  count: number;
}

export interface PendingPaymentSummary {
  totalPendingCents: number;
  depositPendingCents: number;
  balancePendingCents: number;
  overduePaymentsCents: number;
  currency: string;
}

export interface GetMetricsResult {
  success: boolean;
  metrics?: SellerMetrics | BuyerMetrics;
  error?: string;
  statusCode?: number;
}

export interface GetOrdersResult {
  success: boolean;
  orders?: WholesaleOrder[];
  error?: string;
  statusCode?: number;
}

export interface GetPaymentsResult {
  success: boolean;
  summary?: PendingPaymentSummary;
  error?: string;
  statusCode?: number;
}

export interface GetStatusCountsResult {
  success: boolean;
  counts?: OrderStatusCount[];
  error?: string;
  statusCode?: number;
}

// ============================================================================
// WholesaleDashboardService
// ============================================================================

export class WholesaleDashboardService {
  constructor(private storage: IStorage) {}

  /**
   * Get seller dashboard metrics
   */
  async getSellerMetrics(sellerId: string): Promise<GetMetricsResult> {
    try {
      const orders = await this.storage.getWholesaleOrdersBySellerId(sellerId);

      const metrics: SellerMetrics = {
        totalOrders: orders.length,
        totalRevenueCents: 0,
        pendingPaymentsCents: 0,
        activeOrders: 0,
        completedOrders: 0,
        currency: 'USD',
      };

      for (const order of orders) {
        metrics.totalRevenueCents += order.totalCents;

        if (order.status === 'fulfilled') {
          metrics.completedOrders++;
        } else if (order.status !== 'cancelled') {
          metrics.activeOrders++;
        }

        // Get pending payments for order
        const payments = await this.storage.getWholesalePaymentsByOrderId(order.id);
        const pendingPayments = payments.filter(
          (p: any) => p.status === 'pending' || p.status === 'requested' || p.status === 'overdue'
        );

        for (const payment of pendingPayments) {
          metrics.pendingPaymentsCents += payment.amountCents;
        }

        // Use order currency (assume all orders use same currency)
        if (order.currency) {
          metrics.currency = order.currency;
        }
      }

      logger.info('[WholesaleDashboardService] Seller metrics calculated', {
        sellerId,
        totalOrders: metrics.totalOrders,
      });

      return { success: true, metrics };
    } catch (error: any) {
      logger.error('[WholesaleDashboardService] Failed to get seller metrics', error);
      return {
        success: false,
        error: error.message || 'Failed to get metrics',
        statusCode: 500,
      };
    }
  }

  /**
   * Get buyer dashboard metrics
   */
  async getBuyerMetrics(buyerId: string): Promise<GetMetricsResult> {
    try {
      const orders = await this.storage.getWholesaleOrdersByBuyerId(buyerId);

      const metrics: BuyerMetrics = {
        totalOrders: orders.length,
        totalSpentCents: 0,
        pendingPaymentsCents: 0,
        activeOrders: 0,
        completedOrders: 0,
        currency: 'USD',
      };

      for (const order of orders) {
        metrics.totalSpentCents += order.totalCents;

        if (order.status === 'fulfilled') {
          metrics.completedOrders++;
        } else if (order.status !== 'cancelled') {
          metrics.activeOrders++;
        }

        // Get pending payments for order
        const payments = await this.storage.getWholesalePaymentsByOrderId(order.id);
        const pendingPayments = payments.filter(
          (p: any) => p.status === 'pending' || p.status === 'requested' || p.status === 'overdue'
        );

        for (const payment of pendingPayments) {
          metrics.pendingPaymentsCents += payment.amountCents;
        }

        // Use order currency
        if (order.currency) {
          metrics.currency = order.currency;
        }
      }

      logger.info('[WholesaleDashboardService] Buyer metrics calculated', {
        buyerId,
        totalOrders: metrics.totalOrders,
      });

      return { success: true, metrics };
    } catch (error: any) {
      logger.error('[WholesaleDashboardService] Failed to get buyer metrics', error);
      return {
        success: false,
        error: error.message || 'Failed to get metrics',
        statusCode: 500,
      };
    }
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(sellerId: string, limit: number = 10): Promise<GetOrdersResult> {
    try {
      const allOrders = await this.storage.getWholesaleOrdersBySellerId(sellerId);

      // Sort by created date descending and limit
      const recentOrders = allOrders
        .sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        })
        .slice(0, limit);

      return { success: true, orders: recentOrders };
    } catch (error: any) {
      logger.error('[WholesaleDashboardService] Failed to get recent orders', error);
      return {
        success: false,
        error: error.message || 'Failed to get orders',
        statusCode: 500,
      };
    }
  }

  /**
   * Get pending payments summary
   */
  async getPendingPayments(sellerId: string): Promise<GetPaymentsResult> {
    try {
      const orders = await this.storage.getWholesaleOrdersBySellerId(sellerId);

      const summary: PendingPaymentSummary = {
        totalPendingCents: 0,
        depositPendingCents: 0,
        balancePendingCents: 0,
        overduePaymentsCents: 0,
        currency: 'USD',
      };

      for (const order of orders) {
        const payments = await this.storage.getWholesalePaymentsByOrderId(order.id);

        for (const payment of payments) {
          if (payment.status === 'pending' || payment.status === 'requested') {
            summary.totalPendingCents += payment.amountCents;

            if (payment.paymentType === 'deposit') {
              summary.depositPendingCents += payment.amountCents;
            } else if (payment.paymentType === 'balance') {
              summary.balancePendingCents += payment.amountCents;
            }
          }

          if (payment.status === 'overdue') {
            summary.overduePaymentsCents += payment.amountCents;
            summary.totalPendingCents += payment.amountCents;
          }
        }

        if (order.currency) {
          summary.currency = order.currency;
        }
      }

      return { success: true, summary };
    } catch (error: any) {
      logger.error('[WholesaleDashboardService] Failed to get pending payments', error);
      return {
        success: false,
        error: error.message || 'Failed to get payments',
        statusCode: 500,
      };
    }
  }

  /**
   * Get order counts by status
   */
  async getOrderStatusCounts(sellerId: string): Promise<GetStatusCountsResult> {
    try {
      const orders = await this.storage.getWholesaleOrdersBySellerId(sellerId);

      const statusMap = new Map<string, number>();

      for (const order of orders) {
        const count = statusMap.get(order.status) || 0;
        statusMap.set(order.status, count + 1);
      }

      const counts: OrderStatusCount[] = Array.from(statusMap.entries()).map(
        ([status, count]) => ({ status, count })
      );

      return { success: true, counts };
    } catch (error: any) {
      logger.error('[WholesaleDashboardService] Failed to get order status counts', error);
      return {
        success: false,
        error: error.message || 'Failed to get status counts',
        statusCode: 500,
      };
    }
  }
}
