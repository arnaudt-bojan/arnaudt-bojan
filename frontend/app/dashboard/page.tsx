'use client';

import { useQuery } from '@/lib/apollo-client';
import { LIST_PRODUCTS } from '@/lib/graphql/queries/products';
import { GET_CURRENT_USER } from '@/lib/graphql/queries/user';
import { ListProductsQuery, GetCurrentUserQuery } from '@/lib/generated/graphql';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Box,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardPage() {
  const { loading: productsLoading, error: productsError, data: productsData } = useQuery<ListProductsQuery>(LIST_PRODUCTS, {
    variables: { first: 10 },
  });

  const { loading: userLoading, error: userError, data: userData } = useQuery<GetCurrentUserQuery>(GET_CURRENT_USER);

  return (
    <DashboardLayout title="Product Dashboard">
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom data-testid="text-page-title">
            Welcome{userData?.getCurrentUser?.fullName ? `, ${userData.getCurrentUser.fullName}` : ''}
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom data-testid="text-api-info">
            Fetching data from GraphQL API at {process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql'}
          </Typography>
        </Box>

        {userLoading && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        )}

        {userError && (
          <Alert severity="info" sx={{ mb: 2 }} data-testid="alert-user-error">
            User authentication: {userError.message}
          </Alert>
        )}

        {productsLoading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress data-testid="loader-products" />
          </Box>
        )}

        {productsError && (
          <Alert severity="error" sx={{ mb: 2 }} data-testid="alert-products-error">
            Error loading products: {productsError.message}
          </Alert>
        )}

        {productsData?.listProducts && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom data-testid="text-total-products">
                Total Products: {productsData.listProducts.totalCount}
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {productsData.listProducts.edges.map(({ node: product }) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                  <Card data-testid={`card-product-${product.id}`}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={product.image || 'https://via.placeholder.com/300x200?text=No+Image'}
                      alt={product.name}
                      sx={{ objectFit: 'cover' }}
                      data-testid={`img-product-${product.id}`}
                    />
                    <CardContent>
                      <Typography gutterBottom variant="h6" component="div" data-testid={`text-product-name-${product.id}`}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} data-testid={`text-product-description-${product.id}`}>
                        {product.description?.substring(0, 100)}
                        {product.description && product.description.length > 100 ? '...' : ''}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Chip label={product.category} size="small" color="primary" data-testid={`chip-category-${product.id}`} />
                        <Chip label={product.productType} size="small" data-testid={`chip-type-${product.id}`} />
                        {product.presentation?.badges?.map((badge: string, i: number) => (
                          <Chip key={i} label={badge} size="small" variant="outlined" data-testid={`chip-badge-${product.id}-${i}`} />
                        ))}
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" color="primary" data-testid={`text-product-price-${product.id}`}>
                          ${product.price}
                        </Typography>
                        <Chip
                          label={product.presentation?.availabilityText || product.status}
                          size="small"
                          color={product.presentation?.availableForPurchase ? 'success' : 'default'}
                          data-testid={`chip-availability-${product.id}`}
                        />
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }} data-testid={`text-product-stock-${product.id}`}>
                        Stock: {product.presentation?.stockQuantity || product.stock}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {!productsLoading && !productsError && (!productsData?.listProducts || productsData.listProducts.edges.length === 0) && (
          <Alert severity="info" data-testid="alert-no-products">
            No products found. The GraphQL API is working but returned no data.
          </Alert>
        )}
      </Container>
    </DashboardLayout>
  );
}
