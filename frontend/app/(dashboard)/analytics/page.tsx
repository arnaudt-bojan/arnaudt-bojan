'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp,
  TrendingDown,
  Download,
  ShoppingCart,
  AttachMoney,
  People,
  Inventory,
} from '@mui/icons-material';
import dynamic from 'next/dynamic';
import { DEFAULT_CURRENCY } from '@/lib/shared/config/currency';

// Dynamic import for Recharts to avoid SSR issues
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart as any), { ssr: false }) as any;
const Line = dynamic(() => import('recharts').then(mod => mod.Line as any), { ssr: false }) as any;
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart as any), { ssr: false }) as any;
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar as any), { ssr: false }) as any;
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart as any), { ssr: false }) as any;
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie as any), { ssr: false }) as any;
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell as any), { ssr: false }) as any;
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis as any), { ssr: false }) as any;
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis as any), { ssr: false }) as any;
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid as any), { ssr: false }) as any;
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip as any), { ssr: false }) as any;
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend as any), { ssr: false }) as any;
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer as any), { ssr: false }) as any;

interface OrderStatusEntry {
  status: string;
  count: number;
}

interface AnalyticsData {
  currency: string;
  revenue: {
    totalRevenue: number;
    revenueGrowth: number;
    averageOrderValue: number;
    revenueByPeriod: Array<{ date: string; revenue: number }>;
  };
  orders: {
    totalOrders: number;
    orderGrowth: number;
    orderCompletionRate: number;
    refundRate: number;
    ordersByStatus: OrderStatusEntry[];
  };
  customers: {
    totalCustomers: number;
    customerGrowth: number;
    newCustomers: number;
    repeatCustomers: number;
    repeatRate: number;
  };
  products: {
    activeProducts: number;
    totalProducts: number;
    topSellingProducts: Array<{ name: string; unitsSold: number }>;
  };
  platforms: {
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
  };
}

const useAnalyticsData = (period: string) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/overview?period=${period}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch analytics data');
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  return { data, loading, error };
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30days');
  const { data: analytics, loading, error } = useAnalyticsData(period);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: analytics?.currency || DEFAULT_CURRENCY,
    }).format(amount);
  };

  const formatGrowth = (growth: number) => {
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value', 'Growth'],
      ['Total Revenue', analytics.revenue.totalRevenue, analytics.revenue.revenueGrowth],
      ['Total Orders', analytics.orders.totalOrders, analytics.orders.orderGrowth],
      ['Average Order Value', analytics.revenue.averageOrderValue, ''],
      ['Total Customers', analytics.customers.totalCustomers, analytics.customers.customerGrowth],
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${period}-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!analytics) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="info">No analytics data available</Alert>
      </Container>
    );
  }

  const customerDistribution = [
    { name: 'New', value: analytics.customers.newCustomers },
    { name: 'Returning', value: analytics.customers.repeatCustomers },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your store&apos;s performance and insights
        </Typography>
      </Box>

      {/* Controls */}
      <Box mb={4} display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="date-range-label">Date Range</InputLabel>
          <Select
            labelId="date-range-label"
            value={period}
            label="Date Range"
            onChange={(e) => setPeriod(e.target.value)}
            data-testid="select-date-range"
          >
            <MenuItem value="7days">Last 7 Days</MenuItem>
            <MenuItem value="30days">Last 30 Days</MenuItem>
            <MenuItem value="90days">Last 90 Days</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>

        <Box flexGrow={1} />

        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={exportToCSV}
          data-testid="button-export-data"
        >
          Export Data
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Revenue */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card data-testid="card-stat-revenue">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Total Revenue
                </Typography>
                <AttachMoney sx={{ color: 'primary.main' }} />
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold" mb={1}>
                {formatCurrency(analytics.revenue.totalRevenue)}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {analytics.revenue.revenueGrowth >= 0 ? (
                  <TrendingUp fontSize="small" sx={{ color: 'success.main' }} />
                ) : (
                  <TrendingDown fontSize="small" sx={{ color: 'error.main' }} />
                )}
                <Typography
                  variant="caption"
                  color={analytics.revenue.revenueGrowth >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatGrowth(analytics.revenue.revenueGrowth)} from last period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Orders */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card data-testid="card-stat-orders">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Total Orders
                </Typography>
                <ShoppingCart sx={{ color: 'primary.main' }} />
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold" mb={1}>
                {analytics.orders.totalOrders.toLocaleString()}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {analytics.orders.orderGrowth >= 0 ? (
                  <TrendingUp fontSize="small" sx={{ color: 'success.main' }} />
                ) : (
                  <TrendingDown fontSize="small" sx={{ color: 'error.main' }} />
                )}
                <Typography
                  variant="caption"
                  color={analytics.orders.orderGrowth >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatGrowth(analytics.orders.orderGrowth)} from last period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Average Order Value */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card data-testid="card-stat-aov">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Avg Order Value
                </Typography>
                <TrendingUp sx={{ color: 'primary.main' }} />
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold" mb={1}>
                {formatCurrency(analytics.revenue.averageOrderValue)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {analytics.orders.totalOrders} orders total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Conversion Rate */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card data-testid="card-stat-conversion">
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Order Completion Rate
                </Typography>
                <People sx={{ color: 'primary.main' }} />
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold" mb={1}>
                {analytics.orders.orderCompletionRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Orders successfully delivered
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue Over Time Chart */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12 }}>
          <Card data-testid="chart-revenue-over-time">
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Revenue Over Time
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Daily revenue breakdown for the selected period
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={analytics.revenue.revenueByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(value: any) => `$${value}`} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={formatDate}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Revenue"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Top Selling Products */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card data-testid="chart-top-products">
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Top Selling Products
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                By units sold
              </Typography>
              {analytics.products.topSellingProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.products.topSellingProducts.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    <Legend />
                    <Bar dataKey="unitsSold" fill="#10b981" name="Units Sold" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  py={6}
                >
                  <Inventory sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">No product sales in this period</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Order Status Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card data-testid="chart-revenue-by-category">
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Order Status Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Current order status breakdown
              </Typography>
              {analytics.orders.ordersByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.orders.ordersByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry: any) => `${entry.status}: ${entry.count}`}
                    >
                      {analytics.orders.ordersByStatus.map((entry: OrderStatusEntry, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  py={6}
                >
                  <ShoppingCart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">No orders in this period</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Customer Insights */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Customer Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                New vs Returning customers
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={customerDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {customerDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Key Metrics
              </Typography>
              <Box display="flex" flexDirection="column" gap={3} mt={3}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Refund Rate
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {analytics.orders.refundRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ height: 8, bgcolor: 'grey.200', borderRadius: 1 }}>
                    <Box
                      sx={{
                        width: `${Math.min(analytics.orders.refundRate, 100)}%`,
                        height: '100%',
                        bgcolor: 'error.main',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Repeat Customer Rate
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {analytics.customers.repeatRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ height: 8, bgcolor: 'grey.200', borderRadius: 1 }}>
                    <Box
                      sx={{
                        width: `${Math.min(analytics.customers.repeatRate, 100)}%`,
                        height: '100%',
                        bgcolor: 'success.main',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Active Products
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {analytics.products.activeProducts} / {analytics.products.totalProducts}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Platform Breakdown */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                B2C Revenue
              </Typography>
              <Box display="flex" flexDirection="column" gap={2} mt={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Orders
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {analytics.platforms.b2c.orders}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(analytics.platforms.b2c.revenue)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Order Value
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(analytics.platforms.b2c.averageOrderValue)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Wholesale Revenue
              </Typography>
              <Box display="flex" flexDirection="column" gap={2} mt={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Orders
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {analytics.platforms.wholesale.orders}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(analytics.platforms.wholesale.revenue)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Order Value
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(analytics.platforms.wholesale.averageOrderValue)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
