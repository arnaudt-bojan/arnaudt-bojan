'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Delete,
  ShoppingCart,
  ArrowForward,
  Warning,
} from '@mui/icons-material';

// Mock cart data (would come from GraphQL in real implementation)
const mockCartData = {
  items: [
    {
      id: '1',
      productId: 'prod-1',
      productName: 'Premium Wholesale T-Shirt',
      productImage: '/placeholder-product.png',
      quantity: 15,
      moq: 10,
      unitPriceCents: 1250, // $12.50
      subtotalCents: 18750, // $187.50
    },
    {
      id: '2',
      productId: 'prod-2',
      productName: 'Classic Wholesale Jeans',
      productImage: '/placeholder-product.png',
      quantity: 8,
      moq: 5,
      unitPriceCents: 3500, // $35.00
      subtotalCents: 28000, // $280.00
    },
  ],
  subtotalCents: 46750, // $467.50 - server-calculated
  depositPercentage: 30,
  depositAmountCents: 14025, // $140.25 - server-calculated
  balanceDueCents: 32725, // $327.25 - server-calculated
  currency: 'USD',
};

export default function WholesaleCartPage() {
  const router = useRouter();
  const [cartData, setCartData] = useState(mockCartData);
  const [loading, setLoading] = useState(false);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setCartData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              subtotalCents: item.unitPriceCents * newQuantity,
            }
          : item
      ),
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setCartData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleCheckout = () => {
    const hasErrors = cartData.items.some((item) => item.quantity < item.moq);
    if (hasErrors) {
      alert('Please fix MOQ errors before proceeding to checkout');
      return;
    }
    router.push('/wholesale/checkout');
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const moqErrors = cartData.items.filter((item) => item.quantity < item.moq);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (cartData.items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <ShoppingCart sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Your wholesale cart is empty
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Browse the catalog to add products to your cart
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/wholesale/catalog')}
            >
              Browse Catalog
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Wholesale Cart
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review your items and proceed to checkout
        </Typography>
      </Box>

      {/* MOQ Validation Alerts */}
      {moqErrors.length > 0 && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
            MOQ Requirements Not Met
          </Typography>
          {moqErrors.map((item) => (
            <Typography key={item.id} variant="body2">
              • {item.productName}: Quantity {item.quantity} is below MOQ of {item.moq}
            </Typography>
          ))}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { md: '2fr 1fr' } }}>
        {/* Cart Items */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cart Items
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="center">MOQ</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartData.items.map((item) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        bgcolor: item.quantity < item.moq ? 'error.lighter' : 'transparent',
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box
                            component="img"
                            src={item.productImage}
                            alt={item.productName}
                            sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
                          />
                          <Typography variant="body2">{item.productName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="medium">
                          {item.moq}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                          }
                          inputProps={{ min: 1, step: 1 }}
                          size="small"
                          sx={{ width: 80 }}
                          error={item.quantity < item.moq}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.unitPriceCents)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium">
                          {formatCurrency(item.subtotalCents)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => handleRemoveItem(item.id)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Cart Summary */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>

              <Box sx={{ my: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(cartData.subtotalCents)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption" display="block" fontWeight="medium">
                    Payment Terms
                  </Typography>
                  <Typography variant="caption">
                    {cartData.depositPercentage}% deposit required at checkout
                  </Typography>
                </Alert>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Deposit Required ({cartData.depositPercentage}%)
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-deposit-amount">
                    {formatCurrency(cartData.depositAmountCents)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Balance Due (Net 30)
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-balance-due">
                    {formatCurrency(cartData.balanceDueCents)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" mb={3}>
                  <Typography variant="h6">
                    Total Order Value
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(cartData.subtotalCents)}
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                endIcon={<ArrowForward />}
                onClick={handleCheckout}
                disabled={moqErrors.length > 0}
                data-testid="button-checkout"
              >
                Proceed to Checkout
              </Button>

              <Button
                variant="text"
                size="small"
                fullWidth
                onClick={() => router.push('/wholesale/catalog')}
                sx={{ mt: 1 }}
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
