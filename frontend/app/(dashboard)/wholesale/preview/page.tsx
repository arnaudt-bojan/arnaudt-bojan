'use client';

import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { LIST_WHOLESALE_PRODUCTS } from '@/lib/graphql/wholesale';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Alert,
  AlertTitle,
  Button,
  Skeleton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Eye, Package, ExternalLink } from 'lucide-react';
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

export default function WholesalePreview() {
  const router = useRouter();
  const { loading, data } = useQuery<ListWholesaleProductsData>(LIST_WHOLESALE_PRODUCTS);

  const products = data?.listProducts?.edges?.map(edge => edge.node) || [];
  const activeProducts = products.filter((p) => p.status === 'ACTIVE');

  const formatCurrency = (amount: string | number) => {
    const cents = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
    }).format(cents / 100);
  };

  return (
    <DashboardLayout>
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
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
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
              data-testid="button-create-product"
            >
              Create Wholesale Product
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {activeProducts.map((product) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={product.id}>
                <Card 
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
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
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                      <Typography variant="h6" component="h3" fontWeight="medium">
                        {product.name}
                      </Typography>
                      <Chip 
                        label={product.category} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      paragraph
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {product.description}
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Wholesale Price
                        </Typography>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {formatCurrency(product.price)}
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary" display="block">
                          In Stock
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {product.stock} units
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Footer Actions */}
        <Box display="flex" gap={2} justifyContent="center" mt={4}>
          <Button
            variant="outlined"
            onClick={() => router.push('/wholesale/products')}
            data-testid="button-manage-products"
          >
            Manage Products
          </Button>
          <Button
            variant="contained"
            onClick={() => router.push('/wholesale/dashboard')}
            data-testid="button-dashboard"
          >
            Back to Dashboard
          </Button>
        </Box>
      </Container>
    </DashboardLayout>
  );
}
