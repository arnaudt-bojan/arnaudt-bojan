/**
 * PlatformAnalyticsService - ShopSwift platform-wide analytics
 * 
 * Follows Architecture 3 service layer pattern:
 * - Service layer handles business logic and calculations
 * - Storage layer handles data access
 * - Clean dependency injection
 */

import type { IStorage } from '../storage';
import type { User, Product, Order } from '@shared/schema';
import { logger } from '../logger';

export interface SellerMetrics {
  totalSellers: number;
  activeSellers: number;
  newSignupsLast7Days: number;
  newSignupsLast30Days: number;
  trialToPaidConversion: number;
  churnRate: number;
}

export interface PlatformHealth {
  activeStores: number;
  totalGMV: number;
  avgOrderValue: number;
  totalOrders: number;
}

export interface FeatureUsage {
  madeToOrder: number;
  preOrder: number;
  inStock: number;
  wholesale: number;
}

export interface MarketSignals {
  signupTrend: "growing" | "stable" | "declining";
  seasonalBoost: boolean;
  adBudgetAvailable: number;
}

export interface PlatformAnalytics {
  sellerMetrics: SellerMetrics;
  platformHealth: PlatformHealth;
  featureUsage: FeatureUsage;
  marketSignals: MarketSignals;
}

export class PlatformAnalyticsService {
  constructor(private storage: IStorage) {}

  /**
   * Get comprehensive platform analytics
   */
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    try {
      // Fetch all data in parallel for efficiency
      const [users, products, orders] = await Promise.all([
        this.storage.getAllUsers(),
        this.storage.getAllProducts(),
        this.storage.getAllOrders(),
      ]);

      // Calculate all metrics
      const sellerMetrics = this.calculateSellerMetrics(users, products);
      const platformHealth = this.calculatePlatformHealth(orders, products, users);
      const featureUsage = this.calculateFeatureUsage(products, users);
      const marketSignals = this.calculateMarketSignals(users, orders);

      return {
        sellerMetrics,
        platformHealth,
        featureUsage,
        marketSignals,
      };
    } catch (error) {
      logger.error('[PlatformAnalyticsService] Failed to calculate analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate seller-related metrics
   */
  private calculateSellerMetrics(users: User[], products: Product[]): SellerMetrics {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total sellers: users with role admin/owner/seller
    const sellers = users.filter(u => 
      u.role === "admin" || u.role === "owner" || u.role === "seller"
    );
    const totalSellers = sellers.length;

    // Active sellers: sellers with at least 1 product (any status)
    const sellerIds = new Set(products.map(p => p.sellerId));
    const activeSellers = sellers.filter(s => sellerIds.has(s.id)).length;

    // New signups
    const newSignupsLast7Days = users.filter(u => {
      if (!u.createdAt) return false;
      const createdAt = new Date(u.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length;

    const newSignupsLast30Days = users.filter(u => {
      if (!u.createdAt) return false;
      const createdAt = new Date(u.createdAt);
      return createdAt >= thirtyDaysAgo;
    }).length;

    // Trial to paid conversion
    // Estimate: users with trialEndsAt in past and current subscriptionStatus='active'
    const trialConverted = users.filter(u => {
      if (!u.trialEndsAt || !u.subscriptionStatus) return false;
      const trialEnded = new Date(u.trialEndsAt) < now;
      return trialEnded && u.subscriptionStatus === 'active';
    }).length;

    const totalTrialUsers = users.filter(u => u.trialEndsAt).length;
    const trialToPaidConversion = totalTrialUsers > 0 
      ? Math.round((trialConverted / totalTrialUsers) * 100) 
      : 0;

    // Churn rate: users with subscriptionStatus='cancelled' divided by total paid users
    const cancelledUsers = users.filter(u => 
      u.subscriptionStatus === 'canceled' || u.subscriptionStatus === 'cancelled'
    ).length;
    
    const paidUsers = users.filter(u => 
      u.subscriptionStatus === 'active' || 
      u.subscriptionStatus === 'canceled' || 
      u.subscriptionStatus === 'cancelled'
    ).length;

    const churnRate = paidUsers > 0 
      ? Math.round((cancelledUsers / paidUsers) * 100) 
      : 0;

    return {
      totalSellers,
      activeSellers,
      newSignupsLast7Days,
      newSignupsLast30Days,
      trialToPaidConversion,
      churnRate,
    };
  }

  /**
   * Calculate platform health metrics
   */
  private calculatePlatformHealth(
    orders: Order[], 
    products: Product[], 
    users: User[]
  ): PlatformHealth {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Map products to sellers for order attribution
    const productToSeller = new Map<string, string>();
    products.forEach(p => {
      productToSeller.set(p.id, p.sellerId);
    });

    // Total GMV and order count
    const totalGMV = orders.reduce((sum, order) => {
      const total = parseFloat(order.total as string) || 0;
      return sum + total;
    }, 0);

    const totalOrders = orders.length;

    const avgOrderValue = totalOrders > 0 
      ? Math.round((totalGMV / totalOrders) * 100) / 100 
      : 0;

    // Active stores: sellers with at least 1 order in last 30 days
    const recentSellerIds = new Set<string>();
    orders.forEach(order => {
      if (!order.createdAt) return;
      const orderDate = new Date(order.createdAt);
      if (orderDate >= thirtyDaysAgo) {
        // Parse items JSON to get product IDs
        try {
          const items = JSON.parse(order.items);
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const sellerId = productToSeller.get(item.productId);
              if (sellerId) {
                recentSellerIds.add(sellerId);
              }
            });
          }
        } catch (error) {
          logger.warn('[PlatformAnalyticsService] Failed to parse order items:', { 
            orderId: order.id, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    });

    const activeStores = recentSellerIds.size;

    return {
      activeStores,
      totalGMV: Math.round(totalGMV * 100) / 100,
      avgOrderValue,
      totalOrders,
    };
  }

  /**
   * Calculate feature usage metrics
   */
  private calculateFeatureUsage(products: Product[], users: User[]): FeatureUsage {
    // Get unique seller IDs for each product type
    const madeToOrderSellers = new Set<string>();
    const preOrderSellers = new Set<string>();
    const inStockSellers = new Set<string>();
    const wholesaleSellers = new Set<string>();

    products.forEach(product => {
      const sellerId = product.sellerId;
      
      switch (product.productType) {
        case 'made-to-order':
          madeToOrderSellers.add(sellerId);
          break;
        case 'pre-order':
          preOrderSellers.add(sellerId);
          break;
        case 'in-stock':
          inStockSellers.add(sellerId);
          break;
        case 'wholesale':
          wholesaleSellers.add(sellerId);
          break;
      }
    });

    return {
      madeToOrder: madeToOrderSellers.size,
      preOrder: preOrderSellers.size,
      inStock: inStockSellers.size,
      wholesale: wholesaleSellers.size,
    };
  }

  /**
   * Calculate market signal metrics
   */
  private calculateMarketSignals(users: User[], orders: Order[]): MarketSignals {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Signup trend: compare last 7 days vs previous 7 days
    const signupsLast7Days = users.filter(u => {
      if (!u.createdAt) return false;
      const createdAt = new Date(u.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length;

    const signupsPrevious7Days = users.filter(u => {
      if (!u.createdAt) return false;
      const createdAt = new Date(u.createdAt);
      return createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo;
    }).length;

    let signupTrend: "growing" | "stable" | "declining";
    if (signupsLast7Days > signupsPrevious7Days * 1.1) {
      signupTrend = "growing";
    } else if (signupsLast7Days < signupsPrevious7Days * 0.9) {
      signupTrend = "declining";
    } else {
      signupTrend = "stable";
    }

    // Seasonal boost: GMV last 30 days > 120% of previous 30 days
    const gmvLast30Days = orders
      .filter(o => {
        if (!o.createdAt) return false;
        const orderDate = new Date(o.createdAt);
        return orderDate >= thirtyDaysAgo;
      })
      .reduce((sum, order) => sum + (parseFloat(order.total as string) || 0), 0);

    const gmvPrevious30Days = orders
      .filter(o => {
        if (!o.createdAt) return false;
        const orderDate = new Date(o.createdAt);
        return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
      })
      .reduce((sum, order) => sum + (parseFloat(order.total as string) || 0), 0);

    const seasonalBoost = gmvPrevious30Days > 0 && gmvLast30Days > gmvPrevious30Days * 1.2;

    // Ad budget available: sum of all sellers' adBudgetAvailable
    // Note: This field doesn't exist in the schema, so default to 0
    const adBudgetAvailable = 0;

    return {
      signupTrend,
      seasonalBoost,
      adBudgetAvailable,
    };
  }
}
