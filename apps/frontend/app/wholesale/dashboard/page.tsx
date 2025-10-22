'use client';

import { useQuery, gql } from '@/lib/apollo-client';
import { GET_CURRENT_USER } from '@/lib/graphql/queries/user';
import { DEFAULT_CURRENCY } from '@/../../shared/config/currency';
import { GetCurrentUserQuery } from '@/lib/generated/graphql';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  PlusCircle,
  Eye,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const GET_WHOLESALE_STATS = gql`
  query GetWholesaleStats {
    wholesaleStats {
      totalProducts
      totalBuyers
      totalOrders
      totalRevenue
      pendingOrders
    }
  }
`;

const GET_RECENT_WHOLESALE_ORDERS = gql`
  query GetRecentWholesaleOrders {
    listWholesaleOrders(first: 5) {
      edges {
        node {
          id
          orderNumber
          status
          totalAmount
          depositAmount
          balanceAmount
          createdAt
          buyer {
            id
            email
            fullName
          }
        }
      }
    }
  }
`;

export default function WholesaleDashboard() {
  const router = useRouter();
  
  interface StatsData {
    wholesaleStats?: {
      totalProducts: number;
      totalBuyers: number;
      totalOrders: number;
      totalRevenue: number;
      pendingOrders: number;
    };
  }

  interface OrderEdge {
    node: {
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
    };
  }

  interface OrdersData {
    listWholesaleOrders?: {
      edges: OrderEdge[];
    };
  }

  const { loading: statsLoading, data: statsData } = useQuery<StatsData>(GET_WHOLESALE_STATS);
  const { loading: ordersLoading, data: ordersData } = useQuery<OrdersData>(GET_RECENT_WHOLESALE_ORDERS);
  const { data: _userData } = useQuery<GetCurrentUserQuery>(GET_CURRENT_USER);

  const stats = statsData?.wholesaleStats;
  const recentOrders = ordersData?.listWholesaleOrders?.edges?.map((edge) => edge.node) || [];

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
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
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Products
                </Typography>
                <Package size={20} color="#666" />
              </Box>
              {statsLoading ? (
                <Skeleton width={60} height={32} />
              ) : (
                <Typography variant="h4" fontWeight="bold" data-testid="text-total-products">
                  {stats?.totalProducts || 0}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card data-testid="card-stat-buyers">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Active Buyers
                </Typography>
                <Users size={20} color="#666" />
              </Box>
              {statsLoading ? (
                <Skeleton width={60} height={32} />
              ) : (
                <Typography variant="h4" fontWeight="bold" data-testid="text-total-buyers">
                  {stats?.totalBuyers || 0}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card data-testid="card-stat-orders">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Total Orders
                </Typography>
                <ShoppingCart size={20} color="#666" />
              </Box>
              {statsLoading ? (
                <Skeleton width={60} height={32} />
              ) : (
                <Typography variant="h4" fontWeight="bold" data-testid="text-total-orders">
                  {stats?.totalOrders || 0}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card data-testid="card-stat-revenue">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
                </Typography>
                <DollarSign size={20} color="#666" />
              </Box>
              {statsLoading ? (
                <Skeleton width={80} height={32} />
              ) : (
                <Typography variant="h4" fontWeight="bold" data-testid="text-total-revenue">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card data-testid="card-recent-orders">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Orders
                </Typography>
                <Button
                  size="small"
                  onClick={() => router.push('/wholesale/orders')}
                  data-testid="button-view-all-orders"
                >
                  View All
                </Button>
              </Box>

              {ordersLoading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={60} sx={{ mb: 1 }} />
                  ))}
                </Box>
              ) : recentOrders.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <ShoppingCart size={48} color="#ccc" style={{ margin: '0 auto' }} />
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    No wholesale orders yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Order #</TableCell>
                        <TableCell>Buyer</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                          <TableCell>{order.orderNumber}</TableCell>
                          <TableCell>{order.buyer?.fullName || order.buyer?.email || 'Unknown'}</TableCell>
                          <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={getStatusLabel(order.status)} 
                              color={getStatusColor(order.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<Eye size={16} />}
                              onClick={() => router.push(`/wholesale/orders/${order.id}`)}
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
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card data-testid="card-quick-actions">
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<PlusCircle />}
                  onClick={() => router.push('/wholesale/products/create')}
                  data-testid="button-create-wholesale-product"
                >
                  Create Product
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Users />}
                  onClick={() => router.push('/wholesale/invitations')}
                  data-testid="button-invite-buyer"
                >
                  Invite Buyer
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Package />}
                  onClick={() => router.push('/wholesale/products')}
                  data-testid="button-view-wholesale-products"
                >
                  View Products
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ShoppingCart />}
                  onClick={() => router.push('/wholesale/orders')}
                  data-testid="button-view-wholesale-orders"
                >
                  View Orders
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Users />}
                  onClick={() => router.push('/wholesale/buyers')}
                  data-testid="button-manage-buyers"
                >
                  Manage Buyers
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
