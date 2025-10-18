import { storage } from "../storage";
import { orders, orderItems, products, wholesaleOrders, wholesaleOrderItems } from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc, inArray } from "drizzle-orm";
import { logger } from "../logger";

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
  revenueByPeriod: Array<{ date: string; revenue: number }>; // For charts
  previousPeriodRevenue: number; // For comparison
}

export interface OrderAnalytics {
  totalOrders: number;
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
      const currentRevenue = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
          orderCount: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString()),
            inArray(orders.status, ['processing', 'shipped', 'delivered']) // Count all non-cancelled orders
          )
        );

      const totalRevenue = Number(currentRevenue[0]?.totalRevenue || 0);
      const orderCount = Number(currentRevenue[0]?.orderCount || 0);
      const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      // Previous period revenue for growth calculation
      const previousPeriod = this.calculatePreviousPeriod(timeRange);
      const previousRevenue = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, previousPeriod.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, previousPeriod.endDate.toISOString()),
            inArray(orders.status, ['processing', 'shipped', 'delivered'])
          )
        );

      const previousPeriodRevenue = Number(previousRevenue[0]?.totalRevenue || 0);
      const revenueGrowth = previousPeriodRevenue > 0
        ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : totalRevenue > 0 ? 100 : 0;

      // Revenue by period (daily breakdown for charts)
      const revenueByDay = await db
        .select({
          date: sql<string>`DATE(${orders.createdAt}::timestamp)`,
          revenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString()),
            inArray(orders.status, ['processing', 'shipped', 'delivered'])
          )
        )
        .groupBy(sql`DATE(${orders.createdAt}::timestamp)`)
        .orderBy(sql`DATE(${orders.createdAt}::timestamp)`);

      const revenueByPeriod = revenueByDay.map((row: any) => ({
        date: row.date,
        revenue: Number(row.revenue)
      }));

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
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
      const totalOrdersResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString())
          )
        );

      const totalOrders = Number(totalOrdersResult[0]?.count || 0);

      // Orders by status breakdown
      const ordersByStatusResult = await db
        .select({
          status: orders.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString())
          )
        )
        .groupBy(orders.status);

      const ordersByStatus = ordersByStatusResult.map((row: any) => ({
        status: row.status || 'unknown',
        count: Number(row.count)
      }));

      // Order completion rate (delivered orders / total orders)
      const deliveredOrders = ordersByStatus.find(s => s.status === 'delivered')?.count || 0;
      const orderCompletionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

      // Refund rate (cancelled orders / total orders)
      const cancelledOrders = ordersByStatus.find(s => s.status === 'cancelled')?.count || 0;
      const refundRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

      // Previous period orders for growth comparison
      const previousPeriod = this.calculatePreviousPeriod(timeRange);
      const previousOrdersResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, previousPeriod.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, previousPeriod.endDate.toISOString())
          )
        );

      const previousPeriodOrders = Number(previousOrdersResult[0]?.count || 0);

      // Orders by period (daily breakdown for charts)
      const ordersByDay = await db
        .select({
          date: sql<string>`DATE(${orders.createdAt}::timestamp)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString())
          )
        )
        .groupBy(sql`DATE(${orders.createdAt}::timestamp)`)
        .orderBy(sql`DATE(${orders.createdAt}::timestamp)`);

      const ordersByPeriod = ordersByDay.map((row: any) => ({
        date: row.date,
        orders: Number(row.count)
      }));

      return {
        totalOrders,
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
      const topByQuantity = await db
        .select({
          productId: orderItems.productId,
          productName: orderItems.productName,
          productImage: orderItems.productImage,
          unitsSold: sql<number>`SUM(${orderItems.quantity})`,
          revenue: sql<number>`SUM(CAST(${orderItems.subtotal} AS NUMERIC))`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString()),
            inArray(orders.status, ['processing', 'shipped', 'delivered'])
          )
        )
        .groupBy(orderItems.productId, orderItems.productName, orderItems.productImage)
        .orderBy(desc(sql`SUM(${orderItems.quantity})`))
        .limit(10);

      const topSellingProducts = topByQuantity.map((row: any) => ({
        id: row.productId,
        name: row.productName,
        image: row.productImage || '',
        unitsSold: Number(row.unitsSold),
        revenue: Math.round(Number(row.revenue) * 100) / 100,
        avgPrice: Math.round((Number(row.revenue) / Number(row.unitsSold)) * 100) / 100
      }));

      // Top products by revenue
      const topByRevenue = await db
        .select({
          productId: orderItems.productId,
          productName: orderItems.productName,
          productImage: orderItems.productImage,
          unitsSold: sql<number>`SUM(${orderItems.quantity})`,
          revenue: sql<number>`SUM(CAST(${orderItems.subtotal} AS NUMERIC))`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString()),
            inArray(orders.status, ['processing', 'shipped', 'delivered'])
          )
        )
        .groupBy(orderItems.productId, orderItems.productName, orderItems.productImage)
        .orderBy(desc(sql`SUM(CAST(${orderItems.subtotal} AS NUMERIC))`))
        .limit(10);

      const topProductsByRevenue = topByRevenue.map((row: any) => ({
        id: row.productId,
        name: row.productName,
        image: row.productImage || '',
        unitsSold: Number(row.unitsSold),
        revenue: Math.round(Number(row.revenue) * 100) / 100,
        avgPrice: Math.round((Number(row.revenue) / Number(row.unitsSold)) * 100) / 100
      }));

      // Low stock alerts (products with stock < 10)
      const lowStockProducts = await db
        .select({
          id: products.id,
          name: products.name,
          stock: products.stock,
          image: products.image,
        })
        .from(products)
        .where(
          and(
            eq(products.sellerId, sellerId),
            sql`${products.stock} < 10`,
            sql`${products.stock} > 0`,
            eq(products.status, 'active')
          )
        )
        .orderBy(asc(products.stock))
        .limit(10);

      const lowStockAlerts = lowStockProducts.map((row: any) => ({
        id: row.id,
        name: row.name,
        stock: Number(row.stock || 0),
        image: row.image
      }));

      // Total products count
      const totalProductsResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(products)
        .where(eq(products.sellerId, sellerId));

      const totalProducts = Number(totalProductsResult[0]?.count || 0);

      // Active products count
      const activeProductsResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(products)
        .where(
          and(
            eq(products.sellerId, sellerId),
            eq(products.status, 'active')
          )
        );

      const activeProducts = Number(activeProductsResult[0]?.count || 0);

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
      const totalCustomersResult = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${orders.customerEmail})`,
        })
        .from(orders)
        .where(eq(orders.sellerId, sellerId));

      const totalCustomers = Number(totalCustomersResult[0]?.count || 0);

      // New customers in current period
      const newCustomersResult = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${orders.customerEmail})`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString())
          )
        );

      const newCustomers = Number(newCustomersResult[0]?.count || 0);

      // Repeat customers (customers with more than 1 order)
      const repeatCustomersResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(
          sql`(
            SELECT ${orders.customerEmail}
            FROM ${orders}
            WHERE ${orders.sellerId} = ${sellerId}
            GROUP BY ${orders.customerEmail}
            HAVING COUNT(*) > 1
          ) AS repeat_customers`
        );

      const repeatCustomers = Number(repeatCustomersResult[0]?.count || 0);
      const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

      // Previous period customers for growth
      const previousPeriod = this.calculatePreviousPeriod(timeRange);
      const previousCustomersResult = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${orders.customerEmail})`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, previousPeriod.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, previousPeriod.endDate.toISOString())
          )
        );

      const previousPeriodCustomers = Number(previousCustomersResult[0]?.count || 0);

      // Customers by period (daily breakdown for charts)
      const customersByDay = await db
        .select({
          date: sql<string>`DATE(${orders.createdAt}::timestamp)`,
          count: sql<number>`COUNT(DISTINCT ${orders.customerEmail})`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString())
          )
        )
        .groupBy(sql`DATE(${orders.createdAt}::timestamp)`)
        .orderBy(sql`DATE(${orders.createdAt}::timestamp)`);

      const customersByPeriod = customersByDay.map((row: any) => ({
        date: row.date,
        customers: Number(row.count)
      }));

      return {
        totalCustomers,
        newCustomers,
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
      const b2cResult = await db
        .select({
          orders: sql<number>`COUNT(*)`,
          revenue: sql<number>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(sql`${orders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${orders.createdAt}::timestamp`, timeRange.endDate.toISOString()),
            inArray(orders.status, ['processing', 'shipped', 'delivered'])
          )
        );

      const b2cOrders = Number(b2cResult[0]?.orders || 0);
      const b2cRevenue = Number(b2cResult[0]?.revenue || 0);
      const b2cAverageOrderValue = b2cOrders > 0 ? b2cRevenue / b2cOrders : 0;

      // B2B Wholesale orders (totalCents needs to be converted to dollars)
      const wholesaleResult = await db
        .select({
          orders: sql<number>`COUNT(*)`,
          revenue: sql<number>`COALESCE(SUM(${wholesaleOrders.totalCents}), 0)`,
        })
        .from(wholesaleOrders)
        .where(
          and(
            eq(wholesaleOrders.sellerId, sellerId),
            gte(sql`${wholesaleOrders.createdAt}::timestamp`, timeRange.startDate.toISOString()),
            lte(sql`${wholesaleOrders.createdAt}::timestamp`, timeRange.endDate.toISOString()),
            inArray(wholesaleOrders.status, ['fulfilled', 'ready_to_release', 'in_production'])
          )
        );

      const wholesaleOrdersCount = Number(wholesaleResult[0]?.orders || 0);
      const wholesaleRevenueCents = Number(wholesaleResult[0]?.revenue || 0);
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
