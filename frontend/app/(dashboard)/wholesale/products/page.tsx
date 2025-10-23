'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  LIST_WHOLESALE_PRODUCTS,
  DELETE_WHOLESALE_PRODUCT,
} from '@/lib/graphql/wholesale';
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PlusCircle, Search, Pencil, Trash2 } from 'lucide-react';
import { DEFAULT_CURRENCY } from '@/lib/shared';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  status: string;
  category: string;
  image?: string;
}

interface ListWholesaleProductsData {
  listProducts: {
    edges: Array<{
      node: Product;
    }>;
  };
}

export default function WholesaleProducts() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const { loading, data, refetch } = useQuery<ListWholesaleProductsData>(LIST_WHOLESALE_PRODUCTS);
  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_WHOLESALE_PRODUCT, {
    onCompleted: () => {
      refetch();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
  });

  const products = data?.listProducts?.edges?.map(edge => edge.node) || [];

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount: string | number) => {
    const cents = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
    }).format(cents / 100);
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct({ variables: { id: productToDelete } });
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Product Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
    },
    {
      field: 'price',
      headerName: 'Wholesale Price',
      width: 150,
      renderCell: (params: GridRenderCellParams) => formatCurrency(params.value),
    },
    {
      field: 'stock',
      headerName: 'Stock',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={params.value === 'ACTIVE' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Pencil size={16} />}
            onClick={() => router.push(`/wholesale/products/edit/${params.row.id}`)}
            data-testid={`button-edit-product-${params.row.id}`}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={16} />}
            onClick={() => handleDelete(params.row.id)}
            data-testid={`button-delete-product-${params.row.id}`}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-wholesale-products">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
              Wholesale Products
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your B2B wholesale product catalog
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PlusCircle />}
            onClick={() => router.push('/wholesale/products/create')}
            data-testid="button-create-product"
          >
            Create Product
          </Button>
        </Box>

        {/* Filters */}
        <Box display="flex" gap={2} mb={3}>
          <TextField
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search size={20} style={{ marginRight: 8, color: '#666' }} />,
            }}
            sx={{ flexGrow: 1 }}
            data-testid="input-search-products"
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Category"
              data-testid="select-category-filter"
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Products Grid */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredProducts}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            disableRowSelectionOnClick
            data-testid="grid-products"
          />
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          data-testid="dialog-delete-product"
        >
          <DialogTitle>Delete Product</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              color="error"
              variant="contained"
              disabled={deleting}
              data-testid="button-confirm-delete"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </DashboardLayout>
  );
}
