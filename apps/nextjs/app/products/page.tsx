'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Container,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Card,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Chip,
  Avatar,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const LIST_PRODUCTS = gql`
  query ListProducts($first: Int, $after: String, $filter: ProductFilterInput) {
    listProducts(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          name
          description
          price
          compare_at_price
          category
          productType
          image
          stock
          inventoryStatus
          created_at
          presentation {
            availabilityText
            badges
            stockLevelIndicator
            availableForPurchase
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  category: string;
  productType: string;
  image?: string;
  stock: number;
  inventoryStatus: string;
  created_at: string;
  presentation?: {
    availabilityText: string;
    badges: string[];
    stockLevelIndicator: string;
    availableForPurchase: boolean;
  };
}

export default function ProductsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const { loading, error, data, refetch } = useQuery(LIST_PRODUCTS, {
    variables: {
      first: pageSize,
      filter: {
        ...(searchQuery && { name: searchQuery }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(typeFilter && { productType: typeFilter }),
      },
    },
    fetchPolicy: 'network-only',
  });

  const [deleteProduct, { loading: deleteLoading }] = useMutation(DELETE_PRODUCT, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Product deleted successfully',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      refetch();
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: `Error deleting product: ${error.message}`,
        severity: 'error',
      });
    },
  });

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteProduct({ variables: { id: productToDelete.id } });
    }
  };

  const handleCloseDialog = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const products: Product[] = data?.listProducts?.edges.map((edge: any) => edge.node) || [];
  const totalCount = data?.listProducts?.totalCount || 0;

  // Extract unique categories from products
  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const columns: GridColDef[] = [
    {
      field: 'image',
      headerName: 'Image',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Avatar
          src={params.row.image || 'https://via.placeholder.com/80?text=No+Image'}
          alt={params.row.name}
          variant="rounded"
          sx={{ width: 50, height: 50 }}
        />
      ),
      sortable: false,
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value} size="small" color="primary" variant="outlined" />
      ),
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="600">
          ${params.value?.toFixed(2) || '0.00'}
        </Typography>
      ),
    },
    {
      field: 'stock',
      headerName: 'Stock',
      width: 100,
      renderCell: (params: GridRenderCellParams) => {
        const stock = params.value || 0;
        const color = stock > 10 ? 'success' : stock > 0 ? 'warning' : 'error';
        return <Chip label={stock} size="small" color={color} />;
      },
    },
    {
      field: 'productType',
      headerName: 'Type',
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const typeColors: { [key: string]: 'default' | 'primary' | 'secondary' | 'success' | 'info' } = {
          'in-stock': 'success',
          'pre-order': 'info',
          'made-to-order': 'secondary',
          'wholesale': 'default',
        };
        return (
          <Chip
            label={params.value}
            size="small"
            color={typeColors[params.value] || 'default'}
          />
        );
      },
    },
    {
      field: 'availabilityText',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const isAvailable = params.row.presentation?.availableForPurchase;
        const text = params.row.presentation?.availabilityText || params.row.inventoryStatus;
        return (
          <Chip
            label={text}
            size="small"
            color={isAvailable ? 'success' : 'default'}
            variant={isAvailable ? 'filled' : 'outlined'}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => router.push(`/products/edit/${params.row.id}`)}
            data-testid={`button-edit-${params.row.id}`}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row)}
            data-testid={`button-delete-${params.row.id}`}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" gutterBottom data-testid="text-page-title">
            Products
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your product catalog
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/products/create')}
          data-testid="button-create-product"
        >
          Create Product
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 250 }}
            data-testid="input-search"
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="category-filter-label">Category</InputLabel>
            <Select
              labelId="category-filter-label"
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
              data-testid="select-category"
            >
              <MenuItem value="" data-testid="option-category-all">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat} data-testid={`option-category-${cat}`}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="type-filter-label">Product Type</InputLabel>
            <Select
              labelId="type-filter-label"
              value={typeFilter}
              label="Product Type"
              onChange={(e) => setTypeFilter(e.target.value)}
              data-testid="select-type"
            >
              <MenuItem value="" data-testid="option-type-all">All Types</MenuItem>
              <MenuItem value="in-stock" data-testid="option-type-in-stock">In Stock</MenuItem>
              <MenuItem value="pre-order" data-testid="option-type-pre-order">Pre-Order</MenuItem>
              <MenuItem value="made-to-order" data-testid="option-type-made-to-order">Made to Order</MenuItem>
              <MenuItem value="wholesale" data-testid="option-type-wholesale">Wholesale</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} data-testid="alert-error">
          Error loading products: {error.message}
        </Alert>
      )}

      {/* DataGrid */}
      <Card>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={products}
            columns={columns}
            loading={loading}
            pageSizeOptions={[5, 10, 25, 50]}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            rowCount={totalCount}
            paginationMode="client"
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                py: 1,
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'background.default',
                borderBottom: 2,
                borderColor: 'divider',
              },
            }}
            localeText={{
              noRowsLabel: 'No products found',
            }}
          />
        </Box>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDialog}
        data-testid="dialog-delete-confirm"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the product "{productToDelete?.name}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            disabled={deleteLoading}
            data-testid="button-cancel-delete"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
            data-testid="button-confirm-delete"
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          data-testid="alert-snackbar"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
