'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@/lib/apollo-client';
import {
  Container,
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Skeleton,
  Alert,
  Snackbar,
  Avatar,
  InputAdornment,
  Chip,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  ShoppingCart,
  FilterList,
  Store,
} from '@mui/icons-material';

// GraphQL Queries and Mutations
const GET_SELLER_BY_USERNAME = gql`
  query GetSellerByUsername($username: String!) {
    getSellerByUsername(username: $username) {
      id
      displayName
      storeName
      description
      banner
      logo
    }
  }
`;

const LIST_PRODUCTS = gql`
  query ListProducts(
    $sellerId: ID!
    $search: String
    $category: String
    $first: Int
    $after: String
    $sortBy: String
  ) {
    listProducts(
      filter: { sellerId: $sellerId, search: $search, category: $category }
      first: $first
      after: $after
      sortBy: $sortBy
    ) {
      edges {
        node {
          id
          name
          description
          price
          images
          category
          stock_quantity
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

const ADD_TO_CART = gql`
  mutation AddToCart($productId: ID!, $quantity: Int!) {
    addToCart(productId: $productId, quantity: $quantity) {
      id
      items {
        id
        product {
          id
          name
          price
        }
        quantity
      }
    }
  }
`;

interface SellerStorefrontPageProps {
  params: {
    username: string;
  };
}

export default function SellerStorefrontPage({ params }: SellerStorefrontPageProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { username } = params;

  // State management
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const productsPerPage = 12;

  // Fetch seller data
  // Note: This query might not exist yet in the backend
  // Using placeholder/fallback for now
  const { data: sellerData, loading: sellerLoading, error: sellerError } = useQuery(GET_SELLER_BY_USERNAME, {
    variables: { username },
    // If query fails, we'll show a placeholder message
    onError: (error) => {
      console.warn('GraphQL getSellerByUsername not implemented yet:', error.message);
    },
  });

  const seller = sellerData?.getSellerByUsername;
  const sellerId = seller?.id || 'placeholder-seller-id'; // Fallback for development

  // Fetch products
  // Note: This query might not exist yet in the backend
  const { data: productsData, loading: productsLoading, error: productsError } = useQuery(LIST_PRODUCTS, {
    variables: {
      sellerId,
      search: search || undefined,
      category: category || undefined,
      sortBy,
      first: productsPerPage,
      after: page > 1 ? `cursor-${(page - 1) * productsPerPage}` : undefined,
    },
    skip: !sellerId || sellerId === 'placeholder-seller-id', // Skip if no valid seller
    onError: (error) => {
      console.warn('GraphQL listProducts not implemented yet:', error.message);
    },
  });

  const products = productsData?.listProducts?.edges?.map((edge: any) => edge.node) || [];
  const pageInfo = productsData?.listProducts?.pageInfo;
  const totalCount = productsData?.listProducts?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / productsPerPage);

  // Add to cart mutation
  const [addToCart, { loading: addingToCart }] = useMutation(ADD_TO_CART, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Product added to cart successfully!',
        severity: 'success',
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to add product to cart',
        severity: 'error',
      });
    },
  });

  // Extract unique categories from products
  const categories = Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)));

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart({
        variables: {
          productId,
          quantity: 1,
        },
      });
    } catch (error) {
      console.error('Add to cart error:', error);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleCategoryChange = (event: any) => {
    setCategory(event.target.value);
    setPage(1); // Reset to first page on filter
  };

  const handleSortChange = (event: any) => {
    setSortBy(event.target.value);
    setPage(1); // Reset to first page on sort
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatPrice = (price: string | number) => {
    return `$${parseFloat(price.toString()).toFixed(2)}`;
  };

  // Loading state
  if (sellerLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="40%" />
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {[...Array(6)].map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                <Skeleton variant="rectangular" height={250} />
                <Skeleton variant="text" sx={{ mt: 1 }} />
                <Skeleton variant="text" width="60%" />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    );
  }

  // Error or seller not found
  if (sellerError || !seller) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Store sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Store Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            The store "@{username}" could not be found or is not currently active.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Note: GraphQL endpoint "getSellerByUsername" may not be implemented yet.
            This is a placeholder for development.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      {/* Seller Banner */}
      {seller.banner && (
        <Box
          sx={{
            width: '100%',
            height: { xs: 200, md: 300 },
            backgroundImage: `url(${seller.banner})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
          data-testid="img-store-banner"
        />
      )}

      {/* Seller Header */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          py: 3,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {seller.logo && (
              <Avatar
                src={seller.logo}
                alt={seller.storeName || seller.displayName}
                sx={{ width: { xs: 64, md: 96 }, height: { xs: 64, md: 96 } }}
                data-testid="img-seller-logo"
              />
            )}
            <Box>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" data-testid="text-store-name">
                {seller.storeName || seller.displayName}
              </Typography>
              {seller.description && (
                <Typography variant="body1" color="text.secondary" data-testid="text-store-description">
                  {seller.description}
                </Typography>
              )}
              <Chip label={`@${username}`} size="small" sx={{ mt: 1 }} />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Products Section */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Filters and Search Bar */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="Search products..."
                value={search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                data-testid="input-search-products"
              />
            </Grid>

            {/* Category Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  onChange={handleCategoryChange}
                  label="Category"
                  data-testid="select-category-filter"
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

            {/* Sort */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={handleSortChange}
                  label="Sort By"
                  data-testid="select-sort-products"
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="price-low">Price: Low to High</MenuItem>
                  <MenuItem value="price-high">Price: High to Low</MenuItem>
                  <MenuItem value="name-asc">Name: A-Z</MenuItem>
                  <MenuItem value="name-desc">Name: Z-A</MenuItem>
                  <MenuItem value="popular">Most Popular</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Results Count */}
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="body2" color="text.secondary" textAlign={{ xs: 'left', md: 'right' }}>
                {totalCount} {totalCount === 1 ? 'product' : 'products'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Products Grid or Loading/Error States */}
        {productsLoading ? (
          <Grid container spacing={3}>
            {[...Array(productsPerPage)].map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                <Card>
                  <Skeleton variant="rectangular" height={250} />
                  <CardContent>
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : productsError ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            GraphQL listProducts endpoint not yet implemented. This is a placeholder for development.
            Error: {productsError.message}
          </Alert>
        ) : products.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <FilterList sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Products Found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {search || category
                ? 'Try adjusting your search or filters'
                : 'This store has no products available yet'}
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Product Grid */}
            <Grid container spacing={3}>
              {products.map((product: any) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                    data-testid={`card-product-${product.id}`}
                  >
                    {product.images && product.images.length > 0 && (
                      <CardMedia
                        component="img"
                        height="250"
                        image={product.images[0]}
                        alt={product.name}
                        sx={{ objectFit: 'cover' }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography
                        variant="h6"
                        component="h3"
                        gutterBottom
                        noWrap
                        data-testid={`text-product-name-${product.id}`}
                      >
                        {product.name}
                      </Typography>
                      {product.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            mb: 1,
                          }}
                        >
                          {product.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                        <Typography
                          variant="h6"
                          color="primary"
                          fontWeight="bold"
                          data-testid={`text-product-price-${product.id}`}
                        >
                          {formatPrice(product.price)}
                        </Typography>
                        {product.stock_quantity !== undefined && (
                          <Typography variant="caption" color={product.stock_quantity > 0 ? 'success.main' : 'error.main'}>
                            {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<ShoppingCart />}
                        onClick={() => handleAddToCart(product.id)}
                        disabled={addingToCart || (product.stock_quantity !== undefined && product.stock_quantity <= 0)}
                        data-testid={`button-add-to-cart-${product.id}`}
                      >
                        {product.stock_quantity !== undefined && product.stock_quantity <= 0
                          ? 'Out of Stock'
                          : 'Add to Cart'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size={isMobile ? 'small' : 'large'}
                  showFirstButton
                  showLastButton
                  data-testid="pagination-products"
                  siblingCount={isMobile ? 0 : 1}
                />
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Footer */}
      <Box sx={{ bgcolor: 'background.paper', py: 4, borderTop: 1, borderColor: 'divider', mt: 8 }}>
        <Container maxWidth="lg">
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              © 2025 {seller.storeName || seller.displayName}. Powered by Upfirst.
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
