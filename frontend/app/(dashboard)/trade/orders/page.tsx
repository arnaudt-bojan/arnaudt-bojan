'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  MenuItem,
  Box,
  Chip,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Visibility,
  Search,
} from '@mui/icons-material';
import { LIST_QUOTATIONS, Quotation } from '@/lib/graphql/trade';
import { format } from 'date-fns';
import { DEFAULT_CURRENCY } from '@/lib/shared';
import DashboardLayout from '@/components/DashboardLayout';

export default function TradeOrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading } = useQuery<{ listQuotations: { edges: Array<{ node: Quotation }> } }>(LIST_QUOTATIONS);

  const quotations = (data?.listQuotations?.edges || []).map(edge => edge.node);

  const orders = quotations.filter((q) =>
    ['ACCEPTED', 'DEPOSIT_PAID', 'BALANCE_DUE', 'FULLY_PAID', 'COMPLETED'].includes(q.status)
  );

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter.toUpperCase();
    const matchesSearch =
      searchTerm === '' ||
      order.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
      ACCEPTED: { label: 'Accepted', color: 'success' },
      DEPOSIT_PAID: { label: 'Deposit Paid', color: 'info' },
      BALANCE_DUE: { label: 'Balance Due', color: 'warning' },
      FULLY_PAID: { label: 'Fully Paid', color: 'success' },
      COMPLETED: { label: 'Completed', color: 'success' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' as const };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getPaymentStatusChip = (status: string) => {
    const statusMap: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
      ACCEPTED: { label: 'Pending', color: 'warning' },
      DEPOSIT_PAID: { label: 'Deposit Paid', color: 'info' },
      BALANCE_DUE: { label: 'Balance Due', color: 'warning' },
      FULLY_PAID: { label: 'Paid', color: 'success' },
      COMPLETED: { label: 'Paid', color: 'success' },
    };

    const config = statusMap[status] || { label: 'Unknown', color: 'default' as const };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const columns: GridColDef[] = [
    {
      field: 'orderId',
      headerName: 'Order #',
      width: 150,
      renderCell: (params: GridRenderCellParams<Quotation>) => (
        <Typography variant="body2" fontWeight="medium" data-testid={`text-order-${params.row.id}`}>
          {params.row.orderId || 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'quotationNumber',
      headerName: 'Quotation #',
      width: 180,
      renderCell: (params: GridRenderCellParams<Quotation>) => (
        <Typography variant="body2" color="primary" data-testid={`text-quotation-${params.row.id}`}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'buyerEmail',
      headerName: 'Buyer',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: GridRenderCellParams<Quotation>) => (
        <Typography variant="body2" fontWeight="medium">
          {formatCurrency(parseFloat(params.value.toString()), params.row.currency)}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams<Quotation>) => getStatusChip(params.value as string),
    },
    {
      field: 'paymentStatus',
      headerName: 'Payment Status',
      width: 150,
      renderCell: (params: GridRenderCellParams<Quotation>) => getPaymentStatusChip(params.row.status),
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 150,
      renderCell: (params: GridRenderCellParams<Quotation>) => (
        <Typography variant="body2">
          {format(new Date(params.value as string), 'MMM dd, yyyy')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Quotation>) => (
        <Button
          size="small"
          startIcon={<Visibility />}
          onClick={() => router.push(`/trade/quotations/${params.row.id}/edit`)}
          data-testid={`button-view-${params.row.id}`}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Trade Orders">
      <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-trade-orders">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom data-testid="text-page-title">
              Trade Orders
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage accepted quotations and orders
            </Typography>
          </Box>
        </Box>

        <Card>
          <CardHeader
            title={
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by order # or buyer email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                    data-testid="input-search"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label="Status Filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    data-testid="select-status-filter"
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="accepted">Accepted</MenuItem>
                    <MenuItem value="deposit_paid">Deposit Paid</MenuItem>
                    <MenuItem value="balance_due">Balance Due</MenuItem>
                    <MenuItem value="fully_paid">Fully Paid</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            }
          />
          <CardContent>
            <Box sx={{ height: 600, width: '100%' }} data-testid="datagrid-orders">
              <DataGrid
                rows={filteredOrders}
                columns={columns}
                loading={loading}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                }}
                disableRowSelectionOnClick
              />
            </Box>
          </CardContent>
        </Card>
      </Container>
    </DashboardLayout>
  );
}
