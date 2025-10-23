'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { LIST_PRODUCTS } from '@/lib/graphql/queries/products';
import { ADD_TO_CART } from '@/lib/graphql/mutations/cart';
import { GET_SELLER_BY_USERNAME } from '@/lib/graphql/queries/wholesale';
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
  SelectChangeEvent,
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
import Grid2 from '@mui/material/Grid2';
import {
  Search,
  ShoppingCart,
  FilterList,
  Store,
} from '@mui/icons-material';
import { useParams } from 'next/navigation';

interface SellerStorefrontPageProps {
  params: {
    username: string;
  };
}

export default function SellerStorefrontPage(_props: SellerStorefrontPageProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const params = useParams();
  const username = params?.username as string;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const productsPerPage = 12;

  interface GetSellerByUsernameData {
    getSellerByUsername: {
      id: string;
      username: string;
      email: string;
      fullName?: string;
      sellerAccount?: {
        id: string;
        businessName?: string;
        storeName?: string;
        storeSlug?: string;
        logoUrl?: string;
        brandColor?: string;
      };
    };
  }

  const { data: sellerData, loading: sellerLoading, error: sellerError } = useQuery<GetSellerByUsernameData>(
    GET_SELLER_BY_USERNAME,
    {
      variables: { username },
      skip: !username,
    }
  );

  const seller = sellerData?.getSellerByUsername;
  const sellerId = seller?.id;

  interface ProductNode {
    id: string;
    name: string;
    description?: string;
    price: string | number;
    category?: string;
    images?: string[];
    stock_quantity?: number;
  }

  interface PageInfo {
    hasNextPage: boolean;
    endCursor?: string;
  }

  interface ListProductsData {
    listProducts: {
      edges: Array<{ node: ProductNode }>;
      pageInfo: PageInfo;
      totalCount: number;
    };
  }

  const { data: productsData, loading: productsLoading, error: productsError } = useQuery<ListProductsData>(LIST_PRODUCTS, {
    variables: {
      sellerId,
      search: search || undefined,
      category: category || undefined,
      sortBy,
      first: productsPerPage,
      after: page > 1 ? `cursor-${(page - 1) * productsPerPage}` : undefined,
    },
    skip: !sellerId,
  });

  const products = productsData?.listProducts?.edges?.map((edge) => edge.node) || [];
  const _pageInfo = productsData?.listProducts?.pageInfo;
  const totalCount = productsData?.listProducts?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / productsPerPage);

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

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

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
    setPage(1);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value);
    setPage(1);
  };

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortBy(event.target.value);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatPrice = (price: string | number) => {
    return `$${parseFloat(price.toString()).toFixed(2)}`;
  };

  if (sellerLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="40%" />
          <Grid2 container spacing={3} sx={{ mt: 2 }}>
            {[...Array(6)].map((_, i) => (
              <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                <Skeleton variant="rectangular" height={250} />
                <Skeleton variant="text" sx={{ mt: 1 }} />
                <Skeleton variant="text" width="60%" />
              </Grid2>
            ))}
          </Grid2>
        </Box>
      </Container>
    );
  }

  if (sellerError || !seller) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Store sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Store Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            The store &quot;@{username}&quot; could not be found or is not currently active.
          </Typography>
        </Paper>
      </Container>
    );
  }

  const storeName = seller?.sellerAccount?.storeName || seller?.username;
  const businessName = seller?.sellerAccount?.businessName;
  const logoUrl = seller?.sellerAccount?.logoUrl;
  const brandColor = seller?.sellerAccount?.brandColor;

  return (
    <>
      {brandColor && (
        <Box
          sx={{
            width: '100%',
            height: { xs: 200, md: 300 },
            backgroundImage: `url(${brandColor})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
          data-testid="img-store-banner"
        />
      )}

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
            {logoUrl && (
              <Avatar
                src={logoUrl}
                alt={storeName || seller.fullName}
                sx={{ width: { xs: 64, md: 96 }, height: { xs: 64, md: 96 } }}
                data-testid="img-seller-logo"
              />
            )}
            <Box>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" data-testid="text-store-name">
                {storeName || seller.fullName}
              </Typography>
              {businessName && (
                <Typography variant="body1" color="text.secondary" data-testid="text-store-description">
                  {businessName}
                </Typography>
              )}
              <Chip label={`@${username}`} size="small" sx={{ mt: 1 }} />
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Grid2 container spacing={2} alignItems="center">
            <Grid2 size={{ xs: 12, md: 4 }}>
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
                data-testid="input-search"
              />
            </Grid2>

            <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  onChange={handleCategoryChange}
                  label="Category"
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterList />
                    </InputAdornment>
                  }
                  data-testid="select-category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>

            <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={handleSortChange}
                  label="Sort By"
                  data-testid="select-sort"
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="price-low">Price: Low to High</MenuItem>
                  <MenuItem value="price-high">Price: High to Low</MenuItem>
                  <MenuItem value="name">Name: A to Z</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
          </Grid2>
        </Box>

        {productsLoading ? (
          <Grid2 container spacing={3}>
            {[...Array(8)].map((_, i) => (
              <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                <Card>
                  <Skeleton variant="rectangular" height={250} />
                  <CardContent>
                    <Skeleton variant="text" height={30} />
                    <Skeleton variant="text" width="60%" />
                  </CardContent>
                </Card>
              </Grid2>
            ))}
          </Grid2>
        ) : productsError ? (
          <Alert severity="error" sx={{ mt: 3 }}>
            Failed to load products. Please try again later.
          </Alert>
        ) : products.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Store sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No products found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filters
            </Typography>
          </Paper>
        ) : (
          <>
            <Grid2 container spacing={3}>
              {products.map((product) => (
                <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                    data-testid={`card-product-${product.id}`}
                  >
                    <CardMedia
                      component="img"
                      height="250"
                      image={product.images?.[0] || '/placeholder.png'}
                      alt={product.name}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography
                        variant="h6"
                        component="h3"
                        gutterBottom
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
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
                      <Typography variant="h6" color="primary" fontWeight="bold" data-testid={`text-product-price-${product.id}`}>
                        {formatPrice(product.price)}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<ShoppingCart />}
                        onClick={() => handleAddToCart(product.id)}
                        disabled={addingToCart}
                        data-testid={`button-add-to-cart-${product.id}`}
                      >
                        Add to Cart
                      </Button>
                    </CardActions>
                  </Card>
                </Grid2>
              ))}
            </Grid2>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size={isMobile ? 'small' : 'medium'}
                  data-testid="pagination-products"
                />
              </Box>
            )}
          </>
        )}
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </>
  );
}
