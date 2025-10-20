export interface AnalyticsSaleCompletedEvent {
  sellerId: string;
  orderId: string;
  amount: string;
  productId?: string;
  timestamp: Date;
}

export interface AnalyticsProductViewedEvent {
  sellerId: string;
  productId: string;
  viewCount: number;
  timestamp: Date;
}

export interface AnalyticsRevenueUpdatedEvent {
  sellerId: string;
  totalRevenue: string;
  newRevenue: string;
  period: 'today' | 'week' | 'month' | 'year';
  timestamp: Date;
}

export interface AnalyticsInventoryAlertEvent {
  sellerId: string;
  productId: string;
  productName: string;
  currentStock: number;
  alertType: 'low' | 'out';
  timestamp: Date;
}

export interface AnalyticsMetricsUpdatedEvent {
  sellerId: string;
  metrics: {
    totalOrders?: number;
    totalRevenue?: string;
    totalProducts?: number;
    averageOrderValue?: string;
  };
  timestamp: Date;
}
