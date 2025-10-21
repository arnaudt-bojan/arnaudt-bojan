'use client';

import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Container,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

const LIST_WHOLESALE_ORDERS = gql`
  query ListWholesaleOrders($filter: WholesaleOrderFilter) {
    listWholesaleOrders(filter: $filter) {
      edges {
        node {
          id
          orderNumber
          status
          totalAmount
          depositAmount
          balanceAmount
          paymentTerms
          createdAt
          buyer {
            id
            email
            fullName
          }
          items {
            id
            quantity
            product {
              id
              name
            }
          }
          calculatedDepositAmount
          calculatedBalanceAmount
        }
      }
    }
  }
`;

export default function WholesaleOrders() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');

  const { loading, data } = useQuery(LIST_WHOLESALE_ORDERS, {
    variables: {
      filter: statusFilter !== 'all' ? { status: statusFilter.toUpperCase() } : undefined,
    },
  });

  const orders = data?.listWholesaleOrders?.edges?.map((edge: any) => edge.node) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      PENDING: 'warning',
      DEPOSIT_PAID: 'info',
      AWAITING_BALANCE: 'primary',
      BALANCE_OVERDUE: 'error',
      READY_TO_RELEASE: 'success',
      IN_PRODUCTION: 'info',
      FULFILLED: 'success',
      CANCELLED: 'default',
    };
    return statusColors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      DEPOSIT_PAID: 'Deposit Paid',
      AWAITING_BALANCE: 'Awaiting Balance',
      BALANCE_OVERDUE: 'Balance Overdue',
      READY_TO_RELEASE: 'Ready to Release',
      IN_PRODUCTION: 'In Production',
      FULFILLED: 'Fulfilled',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  };

  const columns: GridColDef[] = [
    {
      field: 'orderNumber',
      headerName: 'Order #',
      width: 120,
    },
    {
      field: 'buyer',
      headerName: 'Buyer',
      width: 200,
      renderCell: (params: GridRenderCellParams) => 
        params.row.buyer?.fullName || params.row.buyer?.email || 'Unknown',
    },
    {
      field: 'items',
      headerName: 'Products',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => params.row.items?.length || 0,
    },
    {
      field: 'depositAmount',
      headerName: 'Deposit Paid',
      width: 130,
      renderCell: (params: GridRenderCellParams) => 
        formatCurrency(params.row.calculatedDepositAmount || params.row.depositAmount || 0),
    },
    {
      field: 'balanceAmount',
      headerName: 'Balance Due',
      width: 130,
      renderCell: (params: GridRenderCellParams) => 
        formatCurrency(params.row.calculatedBalanceAmount || params.row.balanceAmount || 0),
    },
    {
      field: 'paymentTerms',
      headerName: 'Payment Terms',
      width: 130,
      renderCell: (params: GridRenderCellParams) => 
        params.value?.replace('NET_', 'Net ').replace('IMMEDIATE', 'Immediate') || 'N/A',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getStatusLabel(params.value)}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 120,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Eye size={14} />}
          onClick={() => router.push(`/wholesale/orders/${params.row.id}`)}
          data-testid={`button-view-${params.row.id}`}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-wholesale-orders">
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Wholesale Orders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track and manage your B2B orders
        </Typography>
      </Box>

      {/* Status Filter */}
      <Box mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
            data-testid="select-status"
          >
            <MenuItem value="all">All Orders</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="deposit_paid">Deposit Paid</MenuItem>
            <MenuItem value="awaiting_balance">Awaiting Balance</MenuItem>
            <MenuItem value="balance_overdue">Balance Overdue</MenuItem>
            <MenuItem value="ready_to_release">Ready to Release</MenuItem>
            <MenuItem value="in_production">In Production</MenuItem>
            <MenuItem value="fulfilled">Fulfilled</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* DataGrid */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={orders}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e0e0e0',
            },
          }}
          data-testid="datagrid-wholesale-orders"
        />
      </Box>
    </Container>
  );
}
