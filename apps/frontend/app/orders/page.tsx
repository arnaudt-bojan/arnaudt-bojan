'use client';

import { useState } from 'react';
import { useQuery } from '@/lib/apollo-client';
import { LIST_ORDERS } from '@/lib/graphql/queries/orders';
import { ListOrdersQuery } from '@/lib/generated/graphql';
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
  Alert,
  IconButton,
  Chip,
  InputAdornment,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const getStatusColor = (status: string | undefined): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  if (!status) return 'default';
  const statusLower = status.toLowerCase();
  if (statusLower === 'fulfilled' || statusLower === 'paid' || statusLower === 'delivered') return 'success';
  if (statusLower === 'processing' || statusLower === 'in_production' || statusLower === 'in_transit') return 'info';
  if (statusLower === 'pending' || statusLower === 'awaiting_payment') return 'warning';
  if (statusLower === 'cancelled' || statusLower === 'refunded' || statusLower === 'failed') return 'error';
  return 'default';
};

export default function OrdersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  const { loading, error, data } = useQuery<ListOrdersQuery>(LIST_ORDERS, {
    variables: {
      first: 100,
      filter: statusFilter ? { status: statusFilter } : undefined,
    },
    fetchPolicy: 'network-only',
  });

  interface OrderNode {
    id: string;
    orderNumber?: string;
    customerName?: string;
    customerEmail?: string;
    buyer?: {
      fullName?: string;
      email?: string;
    } | null;
    createdAt: string;
    totalAmount: number;
    currency: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
  }

  const orders = data?.listOrders?.edges?.map(edge => edge.node) || [];

  const filteredOrders = orders.filter((order: OrderNode) => {
    const matchesSearch = !searchQuery || 
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

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
          onClick={() => router.push(`/orders/${params.row.id}`)}
          data-testid={`link-order-${params.row.id}`}
        >
          {params.value as string}
        </Typography>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" data-testid={`text-date-${params.row.id}`}>
          {format(new Date(params.value as string), 'MMM dd, yyyy')}
        </Typography>
      ),
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      flex: 1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" fontWeight="500" data-testid={`text-customer-${params.row.id}`}>
            {params.value || params.row.buyer?.fullName || params.row.buyer?.email || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.customerEmail}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="600" data-testid={`text-total-${params.row.id}`}>
          ${(params.value as number)?.toFixed(2) || '0.00'} {params.row.currency}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Order Status',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={(params.value as string)?.replace(/_/g, ' ')}
          size="small"
          color={getStatusColor(params.value as string)}
          data-testid={`chip-status-${params.row.id}`}
        />
      ),
    },
    {
      field: 'paymentStatus',
      headerName: 'Payment',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={(params.value as string)?.replace(/_/g, ' ')}
          size="small"
          color={getStatusColor(params.value as string)}
          variant="outlined"
          data-testid={`chip-payment-${params.row.id}`}
        />
      ),
    },
    {
      field: 'fulfillmentStatus',
      headerName: 'Fulfillment',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={(params.value as string)?.replace(/_/g, ' ')}
          size="small"
          color={getStatusColor(params.value as string)}
          variant="outlined"
          data-testid={`chip-fulfillment-${params.row.id}`}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton
          size="small"
          color="primary"
          onClick={() => router.push(`/orders/${params.row.id}`)}
          data-testid={`button-view-${params.row.id}`}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" gutterBottom data-testid="text-page-title">
            Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and track customer orders
          </Typography>
        </Box>
      </Box>

      <Card sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by order #, customer name, or email..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 300 }}
            data-testid="input-search"
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="select-status"
            >
              <MenuItem value="" data-testid="option-status-all">All Statuses</MenuItem>
              <MenuItem value="PENDING" data-testid="option-status-pending">Pending</MenuItem>
              <MenuItem value="AWAITING_PAYMENT" data-testid="option-status-awaiting-payment">Awaiting Payment</MenuItem>
              <MenuItem value="PAID" data-testid="option-status-paid">Paid</MenuItem>
              <MenuItem value="PROCESSING" data-testid="option-status-processing">Processing</MenuItem>
              <MenuItem value="IN_PRODUCTION" data-testid="option-status-in-production">In Production</MenuItem>
              <MenuItem value="FULFILLED" data-testid="option-status-fulfilled">Fulfilled</MenuItem>
              <MenuItem value="CANCELLED" data-testid="option-status-cancelled">Cancelled</MenuItem>
              <MenuItem value="REFUNDED" data-testid="option-status-refunded">Refunded</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} data-testid="alert-error">
          Error loading orders: {error.message}
        </Alert>
      )}

      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredOrders}
            columns={columns}
            loading={loading}
            pageSizeOptions={[5, 10, 25, 50]}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model: { page: number; pageSize: number }) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            rowCount={filteredOrders.length}
            paginationMode="client"
            disableRowSelectionOnClick
            onRowClick={(params: { row: { id: string } }) => router.push(`/orders/${params.row.id}`)}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                py: 2,
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'background.default',
                borderBottom: 2,
                borderColor: 'divider',
              },
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              },
            }}
            localeText={{
              noRowsLabel: loading ? 'Loading orders...' : 'No orders found',
            }}
          />
        </Box>
      </Card>
    </Container>
  );
}
