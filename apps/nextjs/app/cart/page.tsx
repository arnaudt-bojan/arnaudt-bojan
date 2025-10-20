'use client';

import { useQuery, useMutation, gql, ApolloError } from '@apollo/client';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  IconButton,
  Button,
  TextField,
  Divider,
  Box,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  ShoppingCartOutlined,
  ArrowBack,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// GraphQL Queries and Mutations
const GET_CART = gql`
  query GetCart {
    cart: getCartBySession(sessionId: "") {
      id
      items {
        id
        productId
        variantId
        quantity
        unitPrice
        lineTotal
        product {
          id
          name
          price
          images
        }
      }
      totals {
        subtotal
        tax
        shipping
        total
      }
    }
  }
`;

const UPDATE_CART_ITEM = gql`
  mutation UpdateCartItem($cartId: ID!, $itemId: ID!, $quantity: Int!) {
    updateCartItem(cartId: $cartId, input: { itemId: $itemId, quantity: $quantity }) {
      success
      message
      cart {
        id
        items {
          id
          quantity
          lineTotal
        }
        totals {
          subtotal
          tax
          shipping
          total
        }
      }
    }
  }
`;

const REMOVE_FROM_CART = gql`
  mutation RemoveFromCart($cartId: ID!, $productId: ID!, $variantId: ID) {
    removeFromCart(cartId: $cartId, productId: $productId, variantId: $variantId) {
      success
      message
      cart {
        id
        items {
          id
        }
        totals {
          subtotal
          tax
          shipping
          total
        }
      }
    }
  }
`;

export default function CartPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [couponCode, setCouponCode] = useState('');

  // GraphQL Query
  const { data, loading, error, refetch } = useQuery(GET_CART, {
    fetchPolicy: 'network-only',
  });

  // GraphQL Mutations
  const [updateCartItem, { loading: updating }] = useMutation(UPDATE_CART_ITEM, {
    onCompleted: () => {
      refetch();
    },
    onError: (error: ApolloError) => {
      alert(`Error updating cart: ${error.message}`);
    },
  });

  const [removeFromCart, { loading: removing }] = useMutation(REMOVE_FROM_CART, {
    onCompleted: () => {
      refetch();
    },
    onError: (error: ApolloError) => {
      alert(`Error removing item: ${error.message}`);
    },
  });

  // Handlers
  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = data?.cart?.items.find((i: any) => i.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) return;

    updateCartItem({
      variables: {
        cartId: data.cart.id,
        itemId,
        quantity: newQuantity,
      },
    });
  };

  const handleRemoveItem = (productId: string, variantId?: string) => {
    if (!data?.cart?.id) return;

    removeFromCart({
      variables: {
        cartId: data.cart.id,
        productId,
        variantId: variantId || null,
      },
    });
  };

  const handleApplyCoupon = () => {
    // Placeholder for coupon functionality
    alert(`Applying coupon: ${couponCode}`);
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Skeleton variant="text" width={200} height={60} sx={{ mb: 4 }} />
        <Grid container spacing={4}>
          <Grid xs={12} md={8}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 2 }} />
            ))}
          </Grid>
          <Grid xs={12} md={4}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          Error loading cart: {error.message}
        </Alert>
        <Button variant="contained" component={Link} href="/">
          Back to Shopping
        </Button>
      </Container>
    );
  }

  const cart = data?.cart;
  const items = cart?.items || [];
  const totals = cart?.totals || { subtotal: '0', tax: '0', shipping: '0', total: '0' };
  const isEmpty = items.length === 0;

  // Empty cart state
  if (isEmpty) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
          }}
        >
          <ShoppingCartOutlined sx={{ fontSize: 120, color: 'text.secondary', mb: 3 }} />
          <Typography variant="h4" gutterBottom>
            Your cart is empty
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Add some products to get started!
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={Link}
            href="/"
            sx={{ mt: 2 }}
          >
            Continue Shopping
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Shopping Cart
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Cart Items */}
        <Grid xs={12} md={8}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            {/* Desktop: Table Layout */}
            {!isMobile && (
              <Table>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow key={item.id} data-testid={`cart-item-${item.id}`}>
                      {/* Product Image */}
                      <TableCell>
                        <Avatar
                          src={item.product?.images?.[0]}
                          alt={item.product?.name}
                          variant="rounded"
                          sx={{ width: 80, height: 80 }}
                        />
                      </TableCell>

                      {/* Product Info */}
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">
                          {item.product?.name}
                        </Typography>
                        {item.variantId && (
                          <Typography variant="body2" color="text.secondary">
                            Variant: {item.variantId}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          ${parseFloat(item.unitPrice).toFixed(2)} each
                        </Typography>
                      </TableCell>

                      {/* Quantity Controls */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleQuantityChange(item.id, -1)}
                            disabled={item.quantity <= 1 || updating}
                            data-testid={`button-decrease-quantity-${item.id}`}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography variant="body1" sx={{ minWidth: 30, textAlign: 'center' }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleQuantityChange(item.id, 1)}
                            disabled={updating}
                            data-testid={`button-increase-quantity-${item.id}`}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>

                      {/* Subtotal */}
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight="medium">
                          ${parseFloat(item.lineTotal).toFixed(2)}
                        </Typography>
                      </TableCell>

                      {/* Remove Button */}
                      <TableCell>
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveItem(item.productId, item.variantId)}
                          disabled={removing}
                          data-testid={`button-remove-item-${item.id}`}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Mobile: Card Layout */}
            {isMobile && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map((item: any) => (
                  <Card key={item.id} variant="outlined" data-testid={`cart-item-${item.id}`}>
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Avatar
                          src={item.product?.images?.[0]}
                          alt={item.product?.name}
                          variant="rounded"
                          sx={{ width: 80, height: 80 }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {item.product?.name}
                          </Typography>
                          {item.variantId && (
                            <Typography variant="body2" color="text.secondary">
                              Variant: {item.variantId}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            ${parseFloat(item.unitPrice).toFixed(2)} each
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.id, -1)}
                                disabled={item.quantity <= 1 || updating}
                                data-testid={`button-decrease-quantity-${item.id}`}
                              >
                                <Remove fontSize="small" />
                              </IconButton>
                              <Typography variant="body1" sx={{ minWidth: 30, textAlign: 'center' }}>
                                {item.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.id, 1)}
                                disabled={updating}
                                data-testid={`button-increase-quantity-${item.id}`}
                              >
                                <Add fontSize="small" />
                              </IconButton>
                            </Box>

                            <Typography variant="h6" fontWeight="bold">
                              ${parseFloat(item.lineTotal).toFixed(2)}
                            </Typography>
                          </Box>

                          <Button
                            variant="text"
                            color="error"
                            size="small"
                            startIcon={<Delete />}
                            onClick={() => handleRemoveItem(item.productId, item.variantId)}
                            disabled={removing}
                            data-testid={`button-remove-item-${item.id}`}
                            sx={{ mt: 1 }}
                          >
                            Remove
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {/* Continue Shopping */}
            <Box sx={{ mt: 3 }}>
              <Button
                variant="text"
                startIcon={<ArrowBack />}
                component={Link}
                href="/"
              >
                Continue Shopping
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Cart Summary */}
        <Grid xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              position: { md: 'sticky' },
              top: { md: 24 },
            }}
          >
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            <Divider sx={{ my: 2 }} />

            {/* Subtotal */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Subtotal</Typography>
              <Typography variant="body1" fontWeight="medium" data-testid="text-cart-subtotal">
                ${parseFloat(totals.subtotal).toFixed(2)}
              </Typography>
            </Box>

            {/* Tax */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Tax</Typography>
              <Typography variant="body1" fontWeight="medium" data-testid="text-cart-tax">
                ${parseFloat(totals.tax).toFixed(2)}
              </Typography>
            </Box>

            {/* Shipping */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1">Shipping</Typography>
              <Typography variant="body1" fontWeight="medium" data-testid="text-cart-shipping">
                ${parseFloat(totals.shipping).toFixed(2)}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Total */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" fontWeight="bold" data-testid="text-cart-total">
                ${parseFloat(totals.total).toFixed(2)}
              </Typography>
            </Box>

            {/* Coupon Code */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Coupon Code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                data-testid="input-coupon-code"
                sx={{ mb: 1 }}
              />
              <Button
                fullWidth
                variant="outlined"
                onClick={handleApplyCoupon}
                disabled={!couponCode}
                data-testid="button-apply-coupon"
              >
                Apply Coupon
              </Button>
            </Box>

            {/* Checkout Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleCheckout}
              data-testid="button-checkout"
              sx={{ py: 1.5 }}
            >
              Proceed to Checkout
            </Button>

            {/* Security Notice */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
              Secure checkout powered by Stripe
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
