'use client';

import { useState } from 'react';
import { useQuery } from '@/lib/apollo-client';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Button,
  TextField,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  ShoppingCart,
  Inventory,
  LocalOffer,
} from '@mui/icons-material';
import { LIST_WHOLESALE_PRODUCTS } from '@/lib/graphql/wholesale-buyer';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name';

export default function WholesaleCatalogPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, loading, error } = useQuery(LIST_WHOLESALE_PRODUCTS, {
    variables: {
      filter: {
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        status: 'ACTIVE',
      },
      sort: {
        field: sortBy === 'name' ? 'NAME' : sortBy.includes('price') ? 'PRICE' : 'CREATED_AT',
        direction: sortBy === 'price-high' ? 'DESC' : 'ASC',
      },
      first: 50,
    },
  });

  const products = data?.listProducts?.edges?.map((edge: any) => edge.node) || [];
  const categories = Array.from(
    new Set(products.map((p: any) => p.category).filter(Boolean))
  );

  const handleProductClick = (productId: string) => {
    router.push(`/wholesale/catalog/${productId}`);
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Failed to load wholesale catalog. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Wholesale Catalog
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse products with wholesale pricing and MOQ requirements
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat: string) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="name">Name (A-Z)</MenuItem>
                <MenuItem value="price-low">Price (Low to High)</MenuItem>
                <MenuItem value="price-high">Price (High to Low)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {/* Product Grid */}
      {!loading && products.length === 0 && (
        <Alert severity="info">
          No products found. Try adjusting your search filters.
        </Alert>
      )}

      {!loading && products.length > 0 && (
        <Grid container spacing={3}>
          {products.map((product: any) => (
            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card
                data-testid={`card-product-${product.id}`}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6,
                  },
                }}
                onClick={() => handleProductClick(product.id)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={product.image || '/placeholder-product.png'}
                  alt={product.name}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom noWrap>
                    {product.name}
                  </Typography>

                  {product.sku && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      SKU: {product.sku}
                    </Typography>
                  )}

                  <Box sx={{ my: 1 }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      ${parseFloat(product.price).toFixed(2)}
                    </Typography>
                    {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textDecoration: 'line-through' }}
                      >
                        ${parseFloat(product.compareAtPrice).toFixed(2)}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    {product.stockQuantity > 0 ? (
                      <Chip
                        label={`${product.stockQuantity} in stock`}
                        size="small"
                        color="success"
                        icon={<Inventory />}
                      />
                    ) : (
                      <Chip
                        label="Out of stock"
                        size="small"
                        color="error"
                        icon={<Inventory />}
                      />
                    )}
                  </Box>

                  {product.category && (
                    <Chip
                      label={product.category}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ShoppingCart />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product.id);
                    }}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Results Count */}
      {!loading && products.length > 0 && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {products.length} product{products.length !== 1 ? 's' : ''}
            {data?.listProducts?.totalCount && ` of ${data.listProducts.totalCount}`}
          </Typography>
        </Box>
      )}
    </Container>
  );
}
