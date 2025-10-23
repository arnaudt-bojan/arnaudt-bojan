'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
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
  IconButton,
  Menu,
  MenuItem as MenuItemComponent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Send,
  Visibility,
  Search,
} from '@mui/icons-material';
import { 
  LIST_QUOTATIONS, 
  SEND_QUOTATION,
  Quotation 
} from '@/lib/graphql/trade';
import { format } from 'date-fns';
import { DEFAULT_CURRENCY } from '@/lib/shared';
import DashboardLayout from '@/components/DashboardLayout';

export default function QuotationsList() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data, loading, refetch } = useQuery<{ listQuotations: { edges: Array<{ node: Quotation }> } }>(LIST_QUOTATIONS);

  const [sendQuotation] = useMutation(SEND_QUOTATION, {
    onCompleted: () => {
      refetch();
      setAnchorEl(null);
    },
    onError: (error) => {
      console.warn('Send quotation feature not yet implemented - backend schema gap', error);
    },
  });

  const quotations = (data?.listQuotations?.edges || []).map(edge => edge.node);

  const filteredQuotations = quotations.filter((q) => {
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter.toUpperCase();
    const matchesSearch =
      searchTerm === '' ||
      q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
      DRAFT: { label: 'Draft', color: 'default' },
      SENT: { label: 'Sent', color: 'info' },
      VIEWED: { label: 'Viewed', color: 'primary' },
      ACCEPTED: { label: 'Accepted', color: 'success' },
      DEPOSIT_PAID: { label: 'Deposit Paid', color: 'success' },
      BALANCE_DUE: { label: 'Balance Due', color: 'warning' },
      FULLY_PAID: { label: 'Fully Paid', color: 'success' },
      COMPLETED: { label: 'Completed', color: 'success' },
      REJECTED: { label: 'Rejected', color: 'error' },
      EXPIRED: { label: 'Expired', color: 'error' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' as const };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, quotation: Quotation) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuotation(quotation);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuotation(null);
  };

  const handleEdit = () => {
    if (selectedQuotation) {
      router.push(`/trade/quotations/${selectedQuotation.id}/edit`);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedQuotation) {
      router.push(`/trade/view/${selectedQuotation.id}`);
    }
    handleMenuClose();
  };

  const handleSend = () => {
    if (selectedQuotation) {
      sendQuotation({ variables: { id: selectedQuotation.id } });
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedQuotation(null);
  };

  const columns: GridColDef[] = [
    {
      field: 'quotationNumber',
      headerName: 'Quotation #',
      width: 180,
      renderCell: (params: GridRenderCellParams<Quotation>) => (
        <Typography variant="body2" fontWeight="medium" data-testid={`text-quotation-${params.row.id}`}>
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
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      renderCell: (params: GridRenderCellParams<Quotation>) => (
        <Typography variant="body2">
          {format(new Date(params.value as string), 'MMM dd, yyyy')}
        </Typography>
      ),
    },
    {
      field: 'validUntil',
      headerName: 'Valid Until',
      width: 150,
      renderCell: (params: GridRenderCellParams<Quotation>) => (
        <Typography variant="body2">
          {params.value ? format(new Date(params.value as string), 'MMM dd, yyyy') : 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Quotation>) => (
        <IconButton
          size="small"
          onClick={(e) => handleMenuOpen(e, params.row)}
          data-testid={`button-actions-${params.row.id}`}
        >
          <MoreVert />
        </IconButton>
      ),
    },
  ];

  return (
    <DashboardLayout title="Trade Quotations">
      <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-quotations-list">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom data-testid="text-page-title">
              Trade Quotations
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage all your professional quotations
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/trade/quotations/new')}
            data-testid="button-create-quotation"
          >
            New Quotation
          </Button>
        </Box>

        <Card>
          <CardHeader
            title={
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by quotation # or buyer email..."
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
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="viewed">Viewed</MenuItem>
                    <MenuItem value="accepted">Accepted</MenuItem>
                    <MenuItem value="deposit_paid">Deposit Paid</MenuItem>
                    <MenuItem value="balance_due">Balance Due</MenuItem>
                    <MenuItem value="fully_paid">Fully Paid</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            }
          />
          <CardContent>
            <Box sx={{ height: 600, width: '100%' }} data-testid="datagrid-quotations">
              <DataGrid
                rows={filteredQuotations}
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

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItemComponent onClick={handleView} data-testid="menu-view">
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            View
          </MenuItemComponent>
          <MenuItemComponent onClick={handleEdit} data-testid="menu-edit">
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItemComponent>
          <MenuItemComponent onClick={handleSend} data-testid="menu-send">
            <Send fontSize="small" sx={{ mr: 1 }} />
            Send to Buyer
          </MenuItemComponent>
          <MenuItemComponent onClick={handleDelete} data-testid="menu-delete">
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItemComponent>
        </Menu>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          data-testid="dialog-delete-confirmation"
        >
          <DialogTitle>Delete Quotation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained" data-testid="button-confirm-delete">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
}
