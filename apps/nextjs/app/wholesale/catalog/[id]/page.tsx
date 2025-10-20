'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import {
  Container,
  Grid,
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
import {
  ArrowBack,
  ShoppingCart,
  Inventory,
  LocalOffer,
  Info,
  Payment,
} from '@mui/icons-material';
import { GET_WHOLESALE_PRODUCT } from '@/lib/graphql/wholesale-buyer';

export default function WholesaleProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [quantity, setQuantity] = useState(1);

  const { data, loading, error } = useQuery(GET_WHOLESALE_PRODUCT, {
    variables: { id: productId },
    skip: !productId,
  });

  const product = data?.getProduct;

  // Simulate MOQ (would come from server in real implementation)
  const moq = 10;
  const moqMet = quantity >= moq;

  const handleAddToCart = () => {
    if (!moqMet) {
      alert(`Minimum order quantity is ${moq} units`);
      return;
    }
    // In real implementation, would call GraphQL mutation
    router.push('/wholesale/cart');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Product not found or failed to load.
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/wholesale/catalog')}
          sx={{ mt: 2 }}
        >
          Back to Catalog
        </Button>
      </Container>
    );
  }

  const subtotal = (parseFloat(product.price) * quantity).toFixed(2);
  const depositPercentage = 30; // Would come from server
  const depositAmount = (parseFloat(subtotal) * (depositPercentage / 100)).toFixed(2);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => router.push('/wholesale/catalog')}
        sx={{ mb: 3 }}
      >
        Back to Catalog
      </Button>

      <Grid container spacing={4}>
        {/* Product Images */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="img"
              image={product.image || '/placeholder-product.png'}
              alt={product.name}
              sx={{ width: '100%', height: 'auto', maxHeight: 500, objectFit: 'contain' }}
            />
          </Card>
        </Grid>

        {/* Product Details */}
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {product.name}
            </Typography>

            {product.sku && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                SKU: {product.sku}
              </Typography>
            )}

            {product.category && (
              <Chip label={product.category} size="small" sx={{ mb: 2 }} />
            )}

            <Divider sx={{ my: 2 }} />

            {/* Price */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" color="primary" fontWeight="bold">
                ${parseFloat(product.price).toFixed(2)}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  per unit
                </Typography>
              </Typography>
              {product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price) && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ textDecoration: 'line-through' }}
                >
                  ${parseFloat(product.compareAtPrice).toFixed(2)}
                </Typography>
              )}
            </Box>

            {/* Stock Status */}
            <Box sx={{ mb: 3 }}>
              {product.stockQuantity > 0 ? (
                <Chip
                  icon={<Inventory />}
                  label={`${product.stockQuantity} units in stock`}
                  color="success"
                />
              ) : (
                <Chip
                  icon={<Inventory />}
                  label="Out of stock"
                  color="error"
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
                      <TableCell>Deposit Required</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium" data-testid="text-deposit-amount">
                          {depositPercentage}% (${depositAmount})
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Balance Due</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium" data-testid="text-balance-due">
                          {100 - depositPercentage}% (${(parseFloat(subtotal) - parseFloat(depositAmount)).toFixed(2)})
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Payment Terms</TableCell>
                      <TableCell align="right">Net 30</TableCell>
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
              disabled={!moqMet || product.stockQuantity === 0}
              data-testid="button-add-to-cart"
            >
              {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </Box>
        </Grid>

        {/* Product Description */}
        {product.description && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Product Description
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {product.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
