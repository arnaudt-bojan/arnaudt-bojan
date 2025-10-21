'use client';

import { useState, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Container,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  InputAdornment,
  Skeleton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  ShoppingBag as ShoppingBagIcon,
  HourglassEmpty as HourglassEmptyIcon,
  CheckCircle as CheckCircleIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      firstName
      lastName
    }
  }
`;

const LIST_ORDERS = gql`
  query ListOrders($filter: OrderFilterInput, $first: Int, $after: String) {
    listOrders(filter: $filter, first: $first, after: $after) {
      id
      orderNumber
      status
      createdAt
      totalAmount
      currency
    }
  }
`;

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  currency: string;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'delivered' || statusLower === 'completed') return 'success';
  if (statusLower === 'shipped') return 'primary';
  if (statusLower === 'processing') return 'info';
  if (statusLower === 'pending') return 'warning';
  if (statusLower === 'cancelled') return 'error';
  return 'default';
};

export default function BuyerDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { loading: userLoading, data: userData } = useQuery(GET_CURRENT_USER, {
    fetchPolicy: 'network-only',
  });

  const { loading: ordersLoading, error: ordersError, data: ordersData } = useQuery(LIST_ORDERS, {
    variables: {
      first: 100,
      filter: statusFilter ? { status: statusFilter } : undefined,
    },
    fetchPolicy: 'network-only',
    skip: !userData?.me,
  });

  const user: User | null = userData?.me || null;
  const orders: Order[] = ordersData?.listOrders || [];

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = !searchQuery || 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [orders, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status.toLowerCase() === 'pending').length;
    const completedOrders = orders.filter(o => 
      o.status.toLowerCase() === 'delivered' || o.status.toLowerCase() === 'completed'
    ).length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    return { totalOrders, pendingOrders, completedOrders, totalSpent };
  }, [orders]);

  const columns: GridColDef[] = [
    {
      field: 'orderNumber',
      headerName: 'Order #',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          fontWeight="600"
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          onClick={() => router.push(`/buyer/orders/${params.row.id}`)}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {format(new Date(params.value), 'MMM dd, yyyy')}
        </Typography>
      ),
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="600">
          ${params.value?.toFixed(2) || '0.00'}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value?.replace(/_/g, ' ')}
          size="small"
          color={getStatusColor(params.value)}
          data-testid={`chip-order-status-${params.row.id}`}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton
          size="small"
          color="primary"
          onClick={() => router.push(`/buyer/orders/${params.row.id}`)}
          data-testid={`button-view-order-${params.row.id}`}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  if (userLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={60} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 3 }} />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="warning">
          Please log in to view your orders.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom data-testid="text-welcome-message">
          Welcome back, {user.firstName || user.email}!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track and manage your orders
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card data-testid="card-stat-total-orders">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                  }}
                >
                  <ShoppingBagIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                  <Typography variant="h5" fontWeight="600">
                    {stats.totalOrders}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card data-testid="card-stat-pending">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'warning.light',
                    color: 'warning.contrastText',
                  }}
                >
                  <HourglassEmptyIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                  <Typography variant="h5" fontWeight="600">
                    {stats.pendingOrders}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card data-testid="card-stat-completed">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'success.light',
                    color: 'success.contrastText',
                  }}
                >
                  <CheckCircleIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                  <Typography variant="h5" fontWeight="600">
                    {stats.completedOrders}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card data-testid="card-stat-total-spent">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'info.light',
                    color: 'info.contrastText',
                  }}
                >
                  <AttachMoneyIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Spent
                  </Typography>
                  <Typography variant="h5" fontWeight="600">
                    ${stats.totalSpent.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by order number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 300 }}
            data-testid="input-search-orders"
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="select-status-filter"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="PROCESSING">Processing</MenuItem>
              <MenuItem value="SHIPPED">Shipped</MenuItem>
              <MenuItem value="DELIVERED">Delivered</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* Orders Table */}
      {ordersError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load orders. Please try again later.
        </Alert>
      )}

      {ordersLoading ? (
        <Card sx={{ p: 3 }}>
          <CircularProgress />
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <ShoppingBagIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Orders Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery || statusFilter
              ? 'Try adjusting your filters'
              : 'You haven\'t placed any orders yet'}
          </Typography>
        </Card>
      ) : (
        <Card>
          <DataGrid
            rows={filteredOrders}
            columns={columns}
            pagination
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            pageSizeOptions={[10, 25, 50]}
            autoHeight
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
              },
            }}
            data-testid="datagrid-orders"
          />
        </Card>
      )}
    </Container>
  );
}
