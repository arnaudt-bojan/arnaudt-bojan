'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import {
  Container,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  ArrowBack,
  ShoppingCart,
  Inventory,
  Info,
  Payment,
} from '@mui/icons-material';
import { GET_WHOLESALE_PRODUCT } from '@/lib/graphql/wholesale-buyer';
import { GetWholesaleProductQuery } from '@/lib/generated/graphql';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WholesaleProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const productId = resolvedParams.id;

  const [quantity, setQuantity] = useState(1);

  const { data, loading, error } = useQuery<GetWholesaleProductQuery>(GET_WHOLESALE_PRODUCT, {
    variables: { id: productId },
    skip: !productId,
  });

  const product = data?.getProduct;

  const moq = 10;
  const moqMet = quantity >= moq;

  const handleAddToCart = () => {
    if (!moqMet) {
      alert(`Minimum order quantity is ${moq} units`);
      return;
    }
    router.push('/wholesale/cart');
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress data-testid="loading-product" />
        </Box>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" data-testid="alert-error">
          Product not found or failed to load.
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/wholesale/catalog')}
          sx={{ mt: 2 }}
          data-testid="button-back-to-catalog"
        >
          Back to Catalog
        </Button>
      </Container>
    );
  }

  const subtotal = (parseFloat(product.price) * quantity).toFixed(2);
  const depositPercentage = 30;
  const depositAmount = (parseFloat(subtotal) * (depositPercentage / 100)).toFixed(2);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => router.push('/wholesale/catalog')}
        sx={{ mb: 3 }}
        data-testid="button-back"
      >
        Back to Catalog
      </Button>

      <Grid container spacing={4}>
        {/* Product Images */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardMedia
              component="img"
              image={product.image || '/placeholder-product.png'}
              alt={product.name}
              sx={{ width: '100%', height: 'auto', maxHeight: 500, objectFit: 'contain' }}
              data-testid="img-product"
            />
          </Card>
        </Grid>

        {/* Product Details */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom data-testid="text-product-name">
              {product.name}
            </Typography>

            {product.sku && (
              <Typography variant="body2" color="text.secondary" gutterBottom data-testid="text-product-sku">
                SKU: {product.sku}
              </Typography>
            )}

            {product.category && (
              <Chip label={product.category} size="small" sx={{ mb: 2 }} data-testid="chip-category" />
            )}

            <Divider sx={{ my: 2 }} />

            {/* Price */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" color="primary" fontWeight="bold" data-testid="text-price">
                ${parseFloat(product.price).toFixed(2)}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  per unit
                </Typography>
              </Typography>
            </Box>

            {/* Stock Status */}
            <Box sx={{ mb: 3 }}>
              {product.stock > 0 ? (
                <Chip
                  icon={<Inventory />}
                  label={`${product.stock} units in stock`}
                  color="success"
                  data-testid="chip-stock"
                />
              ) : (
                <Chip
                  icon={<Inventory />}
                  label="Out of stock"
                  color="error"
                  data-testid="chip-stock"
                />
              )}
            </Box>

            {/* MOQ Alert */}
            <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="medium" data-testid="text-moq-requirement">
                Minimum Order Quantity (MOQ): {moq} units
              </Typography>
            </Alert>

            {/* Quantity Selector */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quantity
              </Typography>
              <TextField
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, step: 1 }}
                fullWidth
                data-testid="input-quantity"
                error={!moqMet}
                helperText={!moqMet ? `Must meet MOQ of ${moq} units` : `Subtotal: $${subtotal}`}
              />
            </Box>

            {/* Payment Terms */}
            <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Payment color="primary" />
                  <Typography variant="subtitle1" fontWeight="medium">
                    Payment Terms
                  </Typography>
                </Box>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Deposit ({depositPercentage}%)</TableCell>
                      <TableCell align="right" data-testid="text-deposit-amount">
                        ${depositAmount}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Balance Due (Net 30)</TableCell>
                      <TableCell align="right" data-testid="text-balance-amount">
                        ${(parseFloat(subtotal) - parseFloat(depositAmount)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Total</strong></TableCell>
                      <TableCell align="right"><strong data-testid="text-total-amount">${subtotal}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Add to Cart Button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<ShoppingCart />}
              onClick={handleAddToCart}
              disabled={!moqMet || !product.stock || product.stock < 1}
              data-testid="button-add-to-cart"
            >
              {!moqMet ? `Add ${moq - quantity} more to meet MOQ` : 'Add to Cart'}
            </Button>

            {/* Product Description */}
            {product.description && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2" color="text.secondary" data-testid="text-description">
                  {product.description}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
