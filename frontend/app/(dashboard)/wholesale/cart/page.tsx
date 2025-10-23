'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
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
import {
  GET_WHOLESALE_CART,
  UPDATE_WHOLESALE_CART_ITEM,
  REMOVE_FROM_WHOLESALE_CART,
} from '@/lib/graphql/wholesale-buyer';
import { GetWholesaleCartQuery } from '@/lib/generated/graphql';

export default function WholesaleCartPage() {
  const router = useRouter();

  // Get wholesale cart
  const { data, loading, refetch } = useQuery<GetWholesaleCartQuery>(GET_WHOLESALE_CART, {
    fetchPolicy: 'network-only',
  });

  // Update cart item mutation
  const [updateCartItem, { loading: updating }] = useMutation(UPDATE_WHOLESALE_CART_ITEM, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Error updating cart item:', error);
      alert('Failed to update cart item: ' + error.message);
    },
  });

  // Remove cart item mutation
  const [removeCartItem, { loading: removing }] = useMutation(REMOVE_FROM_WHOLESALE_CART, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Error removing cart item:', error);
      alert('Failed to remove cart item: ' + error.message);
    },
  });

  const cart = data?.getWholesaleCart;

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    updateCartItem({
      variables: {
        input: {
          itemId,
          quantity: newQuantity,
        },
      },
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (confirm('Are you sure you want to remove this item from your cart?')) {
      removeCartItem({
        variables: {
          itemId,
        },
      });
    }
  };

  const handleCheckout = () => {
    router.push('/wholesale/checkout');
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress data-testid="loading-cart" />
        </Box>
      </Container>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <ShoppingCart sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom data-testid="text-empty-cart">
              Your wholesale cart is empty
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Browse the catalog to add products to your cart
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/wholesale/catalog')}
              data-testid="button-browse-catalog"
            >
              Browse Catalog
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Wholesale Cart
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review your items and proceed to checkout
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { md: '2fr 1fr' } }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cart Items ({cart.itemCount})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Line Total</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cart.items.map((item) => (
                    <TableRow
                      key={item.id}
                      data-testid={`row-cart-item-${item.id}`}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          {item.product?.image && (
                            <Box
                              component="img"
                              src={item.product.image}
                              alt={item.productName}
                              sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
                              data-testid={`img-product-${item.id}`}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" data-testid={`text-product-name-${item.id}`}>
                              {item.productName}
                            </Typography>
                            {item.product?.stock !== undefined && (
                              <Typography variant="caption" color="text.secondary">
                                Stock: {item.product.stock}
                              </Typography>
                            )}
                          </Box>
                        </Box>
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
                          disabled={updating}
                          data-testid={`input-quantity-${item.id}`}
                        />
                      </TableCell>
                      <TableCell align="right" data-testid={`text-unit-price-${item.id}`}>
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium" data-testid={`text-line-total-${item.id}`}>
                          {formatCurrency(item.lineTotal)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => handleRemoveItem(item.id)}
                          color="error"
                          size="small"
                          disabled={removing}
                          data-testid={`button-remove-${item.id}`}
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
                  <Typography variant="body2" fontWeight="medium" data-testid="text-subtotal">
                    {formatCurrency(cart.subtotal)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" mb={3}>
                  <Typography variant="h6">
                    Total
                  </Typography>
                  <Typography variant="h6" color="primary" data-testid="text-total">
                    {formatCurrency(cart.subtotal)}
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    Wholesale pricing and deposit terms will be applied at checkout
                  </Typography>
                </Alert>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                endIcon={<ArrowForward />}
                onClick={handleCheckout}
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
                data-testid="button-continue-shopping"
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
