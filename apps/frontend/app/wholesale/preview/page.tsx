'use client';

import { useQuery, gql } from '@apollo/client';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Alert,
  AlertTitle,
  Button,
  Skeleton,
} from '@mui/material';
import { Eye, Package, ExternalLink } from 'lucide-react';
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

export default function WholesalePreview() {
  const router = useRouter();
  const { loading, data } = useQuery(LIST_WHOLESALE_PRODUCTS);

  const products = data?.listWholesaleProducts?.edges?.map((edge: any) => edge.node) || [];
  const activeProducts = products.filter((p: any) => p.status === 'ACTIVE');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-wholesale-preview">
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Wholesale Catalog Preview
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This is how buyers will see your wholesale catalog
        </Typography>
      </Box>

      {/* Info Alert */}
      <Alert 
        severity="info" 
        icon={<Eye />}
        sx={{ mb: 4 }}
        data-testid="alert-preview-info"
      >
        <AlertTitle>Preview Mode</AlertTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
          <Typography variant="body2">
            This is a preview of your wholesale product catalog. Buyers will see this when they access your wholesale store.
            No purchase functionality is available in preview mode.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            endIcon={<ExternalLink size={16} />}
            onClick={() => router.push('/wholesale/buyers')}
            data-testid="button-invite-buyers"
          >
            Invite Buyers
          </Button>
        </Box>
      </Alert>

      {/* Products Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" height={32} />
                  <Skeleton variant="text" height={20} />
                  <Skeleton variant="text" height={20} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : activeProducts.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Package size={64} color="#ccc" style={{ margin: '0 auto' }} />
          <Typography variant="h6" color="text.secondary" mt={3}>
            No Active Wholesale Products
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1} mb={3}>
            Create and activate wholesale products to see them in the preview
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/wholesale/products/create')}
            data-testid="button-create-first-product"
          >
            Create Your First Product
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {activeProducts.map((product: any) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
                data-testid={`card-product-${product.id}`}
              >
                {product.image && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={product.image}
                    alt={product.name}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                {!product.image && (
                  <Box
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.100',
                    }}
                  >
                    <Package size={48} color="#999" />
                  </Box>
                )}
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" component="h2" gutterBottom fontWeight="bold">
                    {product.name}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2,
                      flexGrow: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {product.description}
                  </Typography>
                  
                  <Box mb={2}>
                    <Chip 
                      label={product.category} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  <Box>
                    <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
                      {formatCurrency(product.wholesalePrice)}
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Minimum Order
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {product.moq} units
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Available Stock
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {product.stock} units
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    variant="outlined"
                    disabled
                    sx={{ mt: 2 }}
                  >
                    Add to Cart (Preview Only)
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Footer Info */}
      {activeProducts.length > 0 && (
        <Box mt={6} textAlign="center">
          <Alert severity="info" icon={false}>
            <Typography variant="body2">
              Showing {activeProducts.length} active wholesale product{activeProducts.length !== 1 ? 's' : ''}.
              Only active products are visible to buyers.
            </Typography>
          </Alert>
        </Box>
      )}
    </Container>
  );
}
