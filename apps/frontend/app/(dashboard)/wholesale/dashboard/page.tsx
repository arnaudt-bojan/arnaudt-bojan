'use client';

import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  PlusCircle,
  Eye,
} from 'lucide-react';
import {
  GET_WHOLESALE_STATS,
  GET_RECENT_WHOLESALE_ORDERS,
} from '@/lib/graphql/wholesale';
import { DEFAULT_CURRENCY } from '@upfirst/shared';

interface WholesaleStats {
  totalProducts: number;
  totalBuyers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

interface WholesaleOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  createdAt: string;
  buyer: {
    id: string;
    email: string;
    fullName?: string;
  };
}

export default function WholesaleDashboard() {
  const router = useRouter();

  const { loading: statsLoading, data: statsData } = useQuery<{ wholesaleStats: WholesaleStats }>(
    GET_WHOLESALE_STATS
  );

  const { loading: ordersLoading, data: ordersData } = useQuery<{
    listWholesaleOrders: { edges: Array<{ node: WholesaleOrder }> };
  }>(GET_RECENT_WHOLESALE_ORDERS);

  const stats = statsData?.wholesaleStats;
  const recentOrders =
    ordersData?.listWholesaleOrders?.edges?.map((edge) => edge.node) || [];

  const getStatusColor = (
    status: string
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const statusColors: Record<
      string,
      'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
    > = {
      pending: 'warning',
      deposit_paid: 'info',
      awaiting_balance: 'primary',
      balance_overdue: 'error',
      ready_to_release: 'success',
      in_production: 'info',
      fulfilled: 'success',
      cancelled: 'default',
    };
    return statusColors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      deposit_paid: 'Deposit Paid',
      awaiting_balance: 'Awaiting Balance',
      balance_overdue: 'Balance Overdue',
      ready_to_release: 'Ready to Release',
      in_production: 'In Production',
      fulfilled: 'Fulfilled',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-wholesale-dashboard">
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            Wholesale Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of your B2B wholesale operations
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card data-testid="card-stat-products">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1}
                >
                  <Typography variant="body2" color="text.secondary">
                    Products
                  </Typography>
                  <Package size={20} color="#666" />
                </Box>
                {statsLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    data-testid="text-total-products"
                  >
                    {stats?.totalProducts || 0}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card data-testid="card-stat-buyers">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1}
                >
                  <Typography variant="body2" color="text.secondary">
                    Active Buyers
                  </Typography>
                  <Users size={20} color="#666" />
                </Box>
                {statsLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    data-testid="text-total-buyers"
                  >
                    {stats?.totalBuyers || 0}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card data-testid="card-stat-orders">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1}
                >
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                  <ShoppingCart size={20} color="#666" />
                </Box>
                {statsLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    data-testid="text-total-orders"
                  >
                    {stats?.totalOrders || 0}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card data-testid="card-stat-revenue">
              <CardContent>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1}
                >
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                  <DollarSign size={20} color="#666" />
                </Box>
                {statsLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    data-testid="text-total-revenue"
                  >
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Package size={24} style={{ marginRight: 12 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Products
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Manage your B2B product catalog with MOQs and wholesale pricing
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    startIcon={<PlusCircle size={18} />}
                    onClick={() => router.push('/wholesale/products/create')}
                    data-testid="button-create-product"
                  >
                    Create Product
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Eye size={18} />}
                    onClick={() => router.push('/wholesale/products')}
                    data-testid="button-view-products"
                  >
                    View All
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Users size={24} style={{ marginRight: 12 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Buyers
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Manage your wholesale customers and send invitations
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    startIcon={<PlusCircle size={18} />}
                    onClick={() => router.push('/wholesale/buyers')}
                    data-testid="button-invite-buyers"
                  >
                    Invite Buyers
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Eye size={18} />}
                    onClick={() => router.push('/wholesale/buyers')}
                    data-testid="button-view-buyers"
                  >
                    View All
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <ShoppingCart size={24} style={{ marginRight: 12}} />
                  <Typography variant="h6" fontWeight="bold">
                    Orders
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Track and fulfill your wholesale orders
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    startIcon={<Eye size={18} />}
                    onClick={() => router.push('/wholesale/orders')}
                    data-testid="button-view-orders"
                  >
                    View Orders
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Orders */}
        <Card>
          <CardContent>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={3}
            >
              <Typography variant="h6" fontWeight="bold">
                Recent Orders
              </Typography>
              <Button
                variant="text"
                onClick={() => router.push('/wholesale/orders')}
                data-testid="button-view-all-orders"
              >
                View All
              </Button>
            </Box>

            {ordersLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : recentOrders.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No orders yet
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table data-testid="table-recent-orders">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order #</TableCell>
                      <TableCell>Buyer</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Deposit</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        hover
                        data-testid={`row-order-${order.id}`}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {order.orderNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {order.buyer.fullName || order.buyer.email}
                        </TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(order.depositAmount)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(order.status)}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              router.push(`/wholesale/orders/${order.id}`)
                            }
                            data-testid={`button-view-order-${order.id}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Container>
    </DashboardLayout>
  );
}
