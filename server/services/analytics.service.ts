import { storage } from "../storage";
import { logger } from "../logger";
import { Prisma } from "@prisma/client";

// ============================================================================
// Types for Analytics (Architecture 3 - All calculations server-side)
// ============================================================================

export interface TimeRange {
  startDate: Date;
  endDate: Date;
  period: 'today' | '7days' | '30days' | '90days' | 'year' | 'custom';
}

export interface RevenueAnalytics {
  totalRevenue: number; // Total revenue in dollars
  revenueGrowth: number; // Percentage change vs previous period
  averageOrderValue: number; // Average order value in dollars
  estimatedMRR: number; // Estimated Monthly Recurring Revenue from active subscriptions
  revenueByPeriod: Array<{ date: string; revenue: number }>; // For charts
  previousPeriodRevenue: number; // For comparison
}

export interface OrderAnalytics {
  totalOrders: number;
  orderGrowth: number; // Percentage change vs previous period (server-calculated - Architecture 3)
  ordersByStatus: Array<{ status: string; count: number }>;
  orderCompletionRate: number; // Percentage of delivered orders
  refundRate: number; // Percentage of refunded orders
  ordersByPeriod: Array<{ date: string; orders: number }>; // For charts
  previousPeriodOrders: number; // For comparison
}

export interface ProductAnalytics {
  topSellingProducts: Array<{
    id: string;
    name: string;
    image: string;
    unitsSold: number;
    revenue: number;
    avgPrice: number;
  }>;
  topProductsByRevenue: Array<{
    id: string;
    name: string;
    image: string;
    unitsSold: number;
    revenue: number;
    avgPrice: number;
  }>;
  lowStockAlerts: Array<{
    id: string;
    name: string;
    stock: number;
    image: string;
  }>;
  totalProducts: number;
  activeProducts: number;
}

export interface CustomerAnalytics {
  totalCustomers: number; // Unique customer emails
  newCustomers: number; // New in this time range
  customerGrowth: number; // Percentage change vs previous period (server-calculated - Architecture 3)
  repeatCustomers: number; // Customers with >1 order
  repeatRate: number; // Percentage
  customersByPeriod: Array<{ date: string; customers: number }>; // For charts
  previousPeriodCustomers: number; // For comparison
}

export interface PlatformBreakdown {
  b2c: {
    orders: number;
    revenue: number;
    averageOrderValue: number;
  };
  wholesale: {
    orders: number;
    revenue: number;
    averageOrderValue: number;
  };
}

// ============================================================================
// Analytics Service (Architecture 3 - Server-side calculations only)
// ============================================================================

export class AnalyticsService {
  /**
   * Calculate time range from period string
   */
  static calculateTimeRange(period: string): TimeRange {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30); // Default to 30 days
    }
    
    return {
      startDate,
      endDate,
      period: period as TimeRange['period']
    };
  }

  /**
   * Calculate previous period time range for growth comparisons
   */
  private static calculatePreviousPeriod(timeRange: TimeRange): TimeRange {
    const duration = timeRange.endDate.getTime() - timeRange.startDate.getTime();
    const previousStartDate = new Date(timeRange.startDate.getTime() - duration);
    const previousEndDate = new Date(timeRange.startDate.getTime());
    
    return {
      startDate: previousStartDate,
      endDate: previousEndDate,
      period: timeRange.period
    };
  }

  /**
   * 1. Revenue Analytics
   * Calculate revenue metrics from orders table (Architecture 3)
   */
  static async getRevenueAnalytics(
    sellerId: string,
    timeRange: TimeRange
  ): Promise<RevenueAnalytics> {
    try {
      const db = storage.db;
      
      // Current period revenue calculation
      const currentRevenue = await db.orders.aggregate({
        where: {
          seller_id: sellerId,
          created_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          },
          status: {
            in: ['processing', 'shipped', 'delivered']
          }
        },
        _sum: {
          total: true
        },
        _count: true
      });

      const totalRevenue = Number(currentRevenue._sum.total || 0);
      const orderCount = currentRevenue._count;
      const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      // Previous period revenue for growth calculation
      const previousPeriod = this.calculatePreviousPeriod(timeRange);
      const previousRevenue = await db.orders.aggregate({
        where: {
          seller_id: sellerId,
          created_at: {
            gte: previousPeriod.startDate,
            lte: previousPeriod.endDate
          },
          status: {
            in: ['processing', 'shipped', 'delivered']
          }
        },
        _sum: {
          total: true
        }
      });

      const previousPeriodRevenue = Number(previousRevenue._sum.total || 0);
      const revenueGrowth = previousPeriodRevenue > 0
        ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : totalRevenue > 0 ? 100 : 0;

      // Revenue by period (daily breakdown for charts)
      // Note: Prisma doesn't have native GROUP BY date support, we need to use raw SQL
      const revenueByDay = await db.$queryRaw<Array<{ date: string; revenue: string }>>`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(CAST(total AS NUMERIC)), 0) as revenue
        FROM orders
        WHERE seller_id = ${sellerId}
          AND created_at >= ${timeRange.startDate}
          AND created_at <= ${timeRange.endDate}
          AND status IN ('processing', 'shipped', 'delivered')
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `;

      const revenueByPeriod = revenueByDay.map((row) => ({
        date: row.date,
        revenue: Number(row.revenue)
      }));

      // Estimated MRR (Architecture 3 - server-side calculation)
      // TODO: Enhance this to calculate actual MRR from subscription products/orders
      // For now, use a simple heuristic: monthly average revenue
      const daysInPeriod = (timeRange.endDate.getTime() - timeRange.startDate.getTime()) / (1000 * 60 * 60 * 24);
      const estimatedMRR = daysInPeriod > 0 ? (totalRevenue / daysInPeriod) * 30 : 0;

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        estimatedMRR: Math.round(estimatedMRR * 100) / 100,
        revenueByPeriod,
        previousPeriodRevenue: Math.round(previousPeriodRevenue * 100) / 100
      };
    } catch (error) {
      logger.error('[AnalyticsService] Error calculating revenue analytics:', error);
      // Return zeros on error (graceful degradation)
      return {
        totalRevenue: 0,
        revenueGrowth: 0,
        averageOrderValue: 0,
        estimatedMRR: 0,
        revenueByPeriod: [],
        previousPeriodRevenue: 0
      };
    }
  }

  /**
   * 2. Order Analytics
   * Calculate order metrics from orders table (Architecture 3)
   */
  static async getOrderAnalytics(
    sellerId: string,
    timeRange: TimeRange
  ): Promise<OrderAnalytics> {
    try {
      const db = storage.db;
      
      // Total orders in current period
      const totalOrders = await db.orders.count({
        where: {
          seller_id: sellerId,
          created_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          }
        }
      });

      // Orders by status breakdown
      const ordersByStatusResult = await db.orders.groupBy({
        by: ['status'],
        where: {
          seller_id: sellerId,
          created_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          }
        },
        _count: {
          status: true
        }
      });

      const ordersByStatus = ordersByStatusResult.map((row) => ({
        status: row.status || 'unknown',
        count: row._count.status
      }));

      // Order completion rate (delivered orders / total orders)
      const deliveredOrders = ordersByStatus.find(s => s.status === 'delivered')?.count || 0;
      const orderCompletionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

      // Refund rate (cancelled orders / total orders)
      const cancelledOrders = ordersByStatus.find(s => s.status === 'cancelled')?.count || 0;
      const refundRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

      // Previous period orders for growth comparison
      const previousPeriod = this.calculatePreviousPeriod(timeRange);
      const previousPeriodOrders = await db.orders.count({
        where: {
          seller_id: sellerId,
          created_at: {
            gte: previousPeriod.startDate,
            lte: previousPeriod.endDate
          }
        }
      });

      // Calculate order growth percentage (Architecture 3 - server-side)
      const orderGrowth = previousPeriodOrders > 0
        ? ((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100
        : totalOrders > 0 ? 100 : 0;

      // Orders by period (daily breakdown for charts)
      const ordersByDay = await db.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM orders
        WHERE seller_id = ${sellerId}
          AND created_at >= ${timeRange.startDate}
          AND created_at <= ${timeRange.endDate}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `;

      const ordersByPeriod = ordersByDay.map((row) => ({
        date: row.date,
        orders: Number(row.count)
      }));

      return {
        totalOrders,
        orderGrowth: Math.round(orderGrowth * 10) / 10,
        ordersByStatus,
        orderCompletionRate: Math.round(orderCompletionRate * 10) / 10,
        refundRate: Math.round(refundRate * 10) / 10,
        ordersByPeriod,
        previousPeriodOrders
      };
    } catch (error) {
      logger.error('[AnalyticsService] Error calculating order analytics:', error);
      return {
        totalOrders: 0,
        orderGrowth: 0,
        ordersByStatus: [],
        orderCompletionRate: 0,
        refundRate: 0,
        ordersByPeriod: [],
        previousPeriodOrders: 0
      };
    }
  }

  /**
   * 3. Product Analytics
   * Calculate product performance from order_items and products tables (Architecture 3)
   */
  static async getProductAnalytics(
    sellerId: string,
    timeRange: TimeRange
  ): Promise<ProductAnalytics> {
    try {
      const db = storage.db;
      
      // Top selling products by quantity (join order_items with orders to filter by sellerId)
      const topByQuantity = await db.$queryRaw<Array<{
        product_id: string;
        product_name: string;
        product_image: string | null;
        units_sold: bigint;
        revenue: string;
      }>>`
        SELECT 
          oi.product_id,
          oi.product_name,
          oi.product_image,
          SUM(oi.quantity) as units_sold,
          SUM(CAST(oi.subtotal AS NUMERIC)) as revenue
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.seller_id = ${sellerId}
          AND o.created_at >= ${timeRange.startDate}
          AND o.created_at <= ${timeRange.endDate}
          AND o.status IN ('processing', 'shipped', 'delivered')
        GROUP BY oi.product_id, oi.product_name, oi.product_image
        ORDER BY units_sold DESC
        LIMIT 10
      `;

      const topSellingProducts = topByQuantity.map((row) => ({
        id: row.product_id,
        name: row.product_name,
        image: row.product_image || '',
        unitsSold: Number(row.units_sold),
        revenue: Math.round(Number(row.revenue) * 100) / 100,
        avgPrice: Math.round((Number(row.revenue) / Number(row.units_sold)) * 100) / 100
      }));

      // Top products by revenue
      const topByRevenue = await db.$queryRaw<Array<{
        product_id: string;
        product_name: string;
        product_image: string | null;
        units_sold: bigint;
        revenue: string;
      }>>`
        SELECT 
          oi.product_id,
          oi.product_name,
          oi.product_image,
          SUM(oi.quantity) as units_sold,
          SUM(CAST(oi.subtotal AS NUMERIC)) as revenue
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.seller_id = ${sellerId}
          AND o.created_at >= ${timeRange.startDate}
          AND o.created_at <= ${timeRange.endDate}
          AND o.status IN ('processing', 'shipped', 'delivered')
        GROUP BY oi.product_id, oi.product_name, oi.product_image
        ORDER BY revenue DESC
        LIMIT 10
      `;

      const topProductsByRevenue = topByRevenue.map((row) => ({
        id: row.product_id,
        name: row.product_name,
        image: row.product_image || '',
        unitsSold: Number(row.units_sold),
        revenue: Math.round(Number(row.revenue) * 100) / 100,
        avgPrice: Math.round((Number(row.revenue) / Number(row.units_sold)) * 100) / 100
      }));

      // Low stock alerts (products with stock < 10)
      const lowStockProducts = await db.products.findMany({
        where: {
          seller_id: sellerId,
          stock: {
            lt: 10,
            gt: 0
          },
          status: 'active'
        },
        select: {
          id: true,
          name: true,
          stock: true,
          image: true
        },
        orderBy: {
          stock: 'asc'
        },
        take: 10
      });

      const lowStockAlerts = lowStockProducts.map((row) => ({
        id: row.id,
        name: row.name,
        stock: Number(row.stock || 0),
        image: row.image || ''
      }));

      // Total products count
      const totalProducts = await db.products.count({
        where: {
          seller_id: sellerId
        }
      });

      // Active products count
      const activeProducts = await db.products.count({
        where: {
          seller_id: sellerId,
          status: 'active'
        }
      });

      return {
        topSellingProducts,
        topProductsByRevenue,
        lowStockAlerts,
        totalProducts,
        activeProducts
      };
    } catch (error) {
      logger.error('[AnalyticsService] Error calculating product analytics:', error);
      return {
        topSellingProducts: [],
        topProductsByRevenue: [],
        lowStockAlerts: [],
        totalProducts: 0,
        activeProducts: 0
      };
    }
  }

  /**
   * 4. Customer Analytics
   * Calculate customer metrics from orders table (Architecture 3)
   */
  static async getCustomerAnalytics(
    sellerId: string,
    timeRange: TimeRange
  ): Promise<CustomerAnalytics> {
    try {
      const db = storage.db;
      
      // Total unique customers (all time for this seller)
      const totalCustomersResult = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT customer_email) as count
        FROM orders
        WHERE seller_id = ${sellerId}
      `;
      const totalCustomers = Number(totalCustomersResult[0]?.count || 0);

      // New customers in current period
      const newCustomersResult = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT customer_email) as count
        FROM orders
        WHERE seller_id = ${sellerId}
          AND created_at >= ${timeRange.startDate}
          AND created_at <= ${timeRange.endDate}
      `;
      const newCustomers = Number(newCustomersResult[0]?.count || 0);

      // Repeat customers (customers with more than 1 order)
      const repeatCustomersResult = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM (
          SELECT customer_email
          FROM orders
          WHERE seller_id = ${sellerId}
          GROUP BY customer_email
          HAVING COUNT(*) > 1
        ) AS repeat_customers
      `;
      const repeatCustomers = Number(repeatCustomersResult[0]?.count || 0);
      const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

      // Previous period customers for growth
      const previousPeriod = this.calculatePreviousPeriod(timeRange);
      const previousCustomersResult = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT customer_email) as count
        FROM orders
        WHERE seller_id = ${sellerId}
          AND created_at >= ${previousPeriod.startDate}
          AND created_at <= ${previousPeriod.endDate}
      `;
      const previousPeriodCustomers = Number(previousCustomersResult[0]?.count || 0);

      // Calculate customer growth percentage (Architecture 3 - server-side)
      const customerGrowth = previousPeriodCustomers > 0
        ? ((newCustomers - previousPeriodCustomers) / previousPeriodCustomers) * 100
        : newCustomers > 0 ? 100 : 0;

      // Customers by period (daily breakdown for charts)
      const customersByDay = await db.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          DATE(created_at) as date,
          COUNT(DISTINCT customer_email) as count
        FROM orders
        WHERE seller_id = ${sellerId}
          AND created_at >= ${timeRange.startDate}
          AND created_at <= ${timeRange.endDate}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `;

      const customersByPeriod = customersByDay.map((row) => ({
        date: row.date,
        customers: Number(row.count)
      }));

      return {
        totalCustomers,
        newCustomers,
        customerGrowth: Math.round(customerGrowth * 10) / 10,
        repeatCustomers,
        repeatRate: Math.round(repeatRate * 10) / 10,
        customersByPeriod,
        previousPeriodCustomers
      };
    } catch (error) {
      logger.error('[AnalyticsService] Error calculating customer analytics:', error);
      return {
        totalCustomers: 0,
        newCustomers: 0,
        customerGrowth: 0,
        repeatCustomers: 0,
        repeatRate: 0,
        customersByPeriod: [],
        previousPeriodCustomers: 0
      };
    }
  }

  /**
   * 5. Platform Breakdown
   * Calculate metrics by platform (B2C vs B2B Wholesale) (Architecture 3)
   */
  static async getPlatformBreakdown(
    sellerId: string,
    timeRange: TimeRange
  ): Promise<PlatformBreakdown> {
    try {
      const db = storage.db;
      
      // B2C (Regular orders)
      const b2cResult = await db.orders.aggregate({
        where: {
          seller_id: sellerId,
          created_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          },
          status: {
            in: ['processing', 'shipped', 'delivered']
          }
        },
        _count: true,
        _sum: {
          total: true
        }
      });

      const b2cOrders = b2cResult._count;
      const b2cRevenue = Number(b2cResult._sum.total || 0);
      const b2cAverageOrderValue = b2cOrders > 0 ? b2cRevenue / b2cOrders : 0;

      // B2B Wholesale orders (total_cents needs to be converted to dollars)
      const wholesaleResult = await db.wholesale_orders.aggregate({
        where: {
          seller_id: sellerId,
          created_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          },
          status: {
            in: ['fulfilled', 'ready_to_release', 'in_production']
          }
        },
        _count: true,
        _sum: {
          total_cents: true
        }
      });

      const wholesaleOrdersCount = wholesaleResult._count;
      const wholesaleRevenueCents = Number(wholesaleResult._sum.total_cents || 0);
      const wholesaleRevenue = wholesaleRevenueCents / 100; // Convert cents to dollars
      const wholesaleAverageOrderValue = wholesaleOrdersCount > 0 ? wholesaleRevenue / wholesaleOrdersCount : 0;

      return {
        b2c: {
          orders: b2cOrders,
          revenue: Math.round(b2cRevenue * 100) / 100,
          averageOrderValue: Math.round(b2cAverageOrderValue * 100) / 100
        },
        wholesale: {
          orders: wholesaleOrdersCount,
          revenue: Math.round(wholesaleRevenue * 100) / 100,
          averageOrderValue: Math.round(wholesaleAverageOrderValue * 100) / 100
        }
      };
    } catch (error) {
      logger.error('[AnalyticsService] Error calculating platform breakdown:', error);
      return {
        b2c: {
          orders: 0,
          revenue: 0,
          averageOrderValue: 0
        },
        wholesale: {
          orders: 0,
          revenue: 0,
          averageOrderValue: 0
        }
      };
    }
  }
}
