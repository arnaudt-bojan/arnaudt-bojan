import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Package,
  AlertTriangle
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// ============================================================================
// Types (matching backend Architecture 3 service)
// ============================================================================

interface RevenueAnalytics {
  totalRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  revenueByPeriod: Array<{ date: string; revenue: number }>;
  previousPeriodRevenue: number;
}

interface OrderAnalytics {
  totalOrders: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  orderCompletionRate: number;
  refundRate: number;
  ordersByPeriod: Array<{ date: string; orders: number }>;
  previousPeriodOrders: number;
}

interface ProductAnalytics {
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

interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  customersByPeriod: Array<{ date: string; customers: number }>;
  previousPeriodCustomers: number;
}

interface PlatformBreakdown {
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

interface AnalyticsData {
  revenue: RevenueAnalytics;
  orders: OrderAnalytics;
  products: ProductAnalytics;
  customers: CustomerAnalytics;
  platforms: PlatformBreakdown;
  currency: string;
  period: string;
  timeRange: {
    startDate: string;
    endDate: string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatGrowth(growth: number): string {
  const sign = growth > 0 ? '+' : '';
  return `${sign}${growth.toFixed(1)}%`;
}

// Chart colors (consistent branding)
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];

// ============================================================================
// Analytics Dashboard Component (Architecture 3 - Display Only)
// ============================================================================

export default function SellerAnalytics() {
  const [period, setPeriod] = useState<string>('30days');

  // Fetch analytics data from backend (all calculations done server-side)
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/overview', period],
    refetchOnWindowFocus: false,
    staleTime: 60000, // Cache for 1 minute
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="page-seller-analytics">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your store's performance and insights
          </p>
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6" data-testid="page-seller-analytics">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            No analytics data available
          </p>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const platformData = [
    {
      platform: 'B2C',
      revenue: analytics.platforms.b2c.revenue,
      orders: analytics.platforms.b2c.orders,
    },
    {
      platform: 'Wholesale',
      revenue: analytics.platforms.wholesale.revenue,
      orders: analytics.platforms.wholesale.orders,
    },
  ];

  const orderGrowth = analytics.orders.previousPeriodOrders > 0
    ? ((analytics.orders.totalOrders - analytics.orders.previousPeriodOrders) / analytics.orders.previousPeriodOrders) * 100
    : analytics.orders.totalOrders > 0 ? 100 : 0;

  const customerGrowth = analytics.customers.previousPeriodCustomers > 0
    ? ((analytics.customers.newCustomers - analytics.customers.previousPeriodCustomers) / analytics.customers.previousPeriodCustomers) * 100
    : analytics.customers.newCustomers > 0 ? 100 : 0;

  return (
    <div className="space-y-6" data-testid="page-seller-analytics">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your store's performance and insights
        </p>
      </div>

      {/* Time Range Selector */}
      <Tabs value={period} onValueChange={setPeriod} className="w-full">
        <TabsList data-testid="tabs-time-range">
          <TabsTrigger value="today" data-testid="tab-today">Today</TabsTrigger>
          <TabsTrigger value="7days" data-testid="tab-7days">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30days" data-testid="tab-30days">Last 30 Days</TabsTrigger>
          <TabsTrigger value="90days" data-testid="tab-90days">Last 90 Days</TabsTrigger>
          <TabsTrigger value="year" data-testid="tab-year">This Year</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPI Cards - Mobile Responsive Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue Card */}
        <Card data-testid="card-stat-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              {formatCurrency(analytics.revenue.totalRevenue, analytics.currency)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-revenue-growth">
              {formatGrowth(analytics.revenue.revenueGrowth)} from last period
            </p>
          </CardContent>
        </Card>

        {/* Total Orders Card */}
        <Card data-testid="card-stat-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-orders">
              {analytics.orders.totalOrders}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-order-growth">
              {formatGrowth(orderGrowth)} from last period
            </p>
          </CardContent>
        </Card>

        {/* Average Order Value Card */}
        <Card data-testid="card-stat-aov">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-order-value">
              {formatCurrency(analytics.revenue.averageOrderValue, analytics.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.orders.totalOrders} orders total
            </p>
          </CardContent>
        </Card>

        {/* Total Customers Card */}
        <Card data-testid="card-stat-customers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-customers">
              {analytics.customers.totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-new-customers">
              {analytics.customers.newCustomers} new in this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card data-testid="card-revenue-chart">
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Daily revenue over selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.revenue.revenueByPeriod}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value, analytics.currency)}
                labelFormatter={formatDate}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two Column Layout for Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Platform Breakdown Bar Chart */}
        <Card data-testid="card-platform-breakdown">
          <CardHeader>
            <CardTitle>Revenue by Platform</CardTitle>
            <CardDescription>Compare B2C and Wholesale performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip formatter={(value: number) => formatCurrency(value, analytics.currency)} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                <Bar yAxisId="right" dataKey="orders" fill="#82ca9d" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Breakdown Pie Chart */}
        <Card data-testid="card-order-status">
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Current order status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.orders.ordersByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.status}: ${entry.count}`}
                >
                  {analytics.orders.ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products - Dual View (Table on Desktop, Cards on Mobile) */}
      <Card data-testid="card-top-products">
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
          <CardDescription>By units sold in selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.products.topSellingProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No product sales in this period</p>
            </div>
          ) : (
            <>
              {/* Desktop: Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.products.topSellingProducts.map((product) => (
                      <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {product.image && (
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <span className="line-clamp-2">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{product.unitsSold}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.revenue, analytics.currency)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.avgPrice, analytics.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Card View */}
              <div className="block md:hidden space-y-3">
                {analytics.products.topSellingProducts.map((product) => (
                  <Card key={product.id} data-testid={`card-product-${product.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {product.image && (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="h-16 w-16 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium line-clamp-2 mb-2">{product.name}</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Units Sold:</span>
                              <div className="font-medium">{product.unitsSold}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Revenue:</span>
                              <div className="font-medium">{formatCurrency(product.revenue, analytics.currency)}</div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Avg Price:</span>
                              <div className="font-medium">{formatCurrency(product.avgPrice, analytics.currency)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      {analytics.products.lowStockAlerts.length > 0 && (
        <Card data-testid="card-low-stock">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Products with less than 10 units in stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.products.lowStockAlerts.map((product) => (
                <div 
                  key={product.id} 
                  className="flex items-center justify-between p-3 rounded-md border"
                  data-testid={`alert-product-${product.id}`}
                >
                  <div className="flex items-center gap-3">
                    {product.image && (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Stock:</span>
                    <span className="font-bold text-amber-600">{product.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Stats Row */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-completion-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Order Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.orders.orderCompletionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Orders successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-refund-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.orders.refundRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Cancelled orders
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-repeat-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customer Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.customers.repeatRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.customers.repeatCustomers} repeat customers
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-active-products">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.products.activeProducts}
            </div>
            <p className="text-xs text-muted-foreground">
              of {analytics.products.totalProducts} total products
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
