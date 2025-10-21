'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@/lib/apollo-client';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { PlusCircle, Search, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const LIST_WHOLESALE_PRODUCTS = gql`
  query ListWholesaleProducts {
    listWholesaleProducts {
      edges {
        node {
          id
          name
          description
          wholesalePrice
          moq
          stock
          status
          category
          image
        }
      }
    }
  }
`;

const DELETE_WHOLESALE_PRODUCT = gql`
  mutation DeleteWholesaleProduct($id: ID!) {
    deleteWholesaleProduct(id: $id) {
      success
    }
  }
`;

export default function WholesaleProducts() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const { loading, data, refetch } = useQuery(LIST_WHOLESALE_PRODUCTS);
  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_WHOLESALE_PRODUCT, {
    onCompleted: () => {
      refetch();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
  });

  const products = data?.listWholesaleProducts?.edges?.map((edge: any) => edge.node) || [];

  const categories = Array.from(new Set(products.map((p: any) => p.category)));

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
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
      field: 'moq',
      headerName: 'MOQ',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'wholesalePrice',
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
            startIcon={<Pencil size={14} />}
            onClick={() => router.push(`/wholesale/products/edit/${params.row.id}`)}
            data-testid={`button-edit-${params.row.id}`}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={14} />}
            onClick={() => handleDelete(params.row.id)}
            data-testid={`button-delete-${params.row.id}`}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-wholesale-products">
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            Wholesale Products
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your wholesale B2B product catalog
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

      {/* Search and Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: <Search size={20} style={{ marginRight: 8, color: '#666' }} />,
          }}
          data-testid="input-search"
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            label="Category"
            data-testid="select-category"
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map((category: any) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* DataGrid */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredProducts}
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
          data-testid="datagrid-wholesale-products"
        />
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this wholesale product? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
