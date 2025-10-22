'use client';

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
// TODO: Backend schema gaps - these queries don't exist yet
// import {
//   GET_WHOLESALE_CART,
//   UPDATE_WHOLESALE_CART_ITEM,
//   REMOVE_FROM_WHOLESALE_CART,
// } from '@/lib/graphql/wholesale-buyer';
import { DEFAULT_CURRENCY } from '@/../../shared/config/currency';

const mockCartData = {
  wholesaleCart: {
    id: 'cart-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    subtotalCents: 46750,
    depositCents: 14025,
    balanceDueCents: 32725,
    depositPercentage: 30,
    currency: DEFAULT_CURRENCY,
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: '1',
        productId: 'prod-1',
        productName: 'Premium Wholesale T-Shirt',
        productSku: 'TS-001',
        productImage: '/placeholder-product.png',
        quantity: 15,
        unitPriceCents: 1250,
        lineTotalCents: 18750,
        moq: 10,
        moqCompliant: true,
      },
      {
        id: '2',
        productId: 'prod-2',
        productName: 'Classic Wholesale Jeans',
        productSku: 'JN-002',
        productImage: '/placeholder-product.png',
        quantity: 8,
        unitPriceCents: 3500,
        lineTotalCents: 28000,
        moq: 5,
        moqCompliant: true,
      },
    ],
  },
};

export default function WholesaleCartPage() {
  const router = useRouter();

  interface CartData {
    wholesaleCart: {
      id: string;
      items: Array<{
        id: string;
        moqCompliant: boolean;
      }>;
    } | null;
  }

  // TODO: Backend schema gaps - comment out until backend implements wholesale cart operations
  // const { data, loading, refetch } = useQuery<CartData>(GET_WHOLESALE_CART, {
  //   fetchPolicy: 'cache-and-network',
  // });
  const data: CartData = { wholesaleCart: null };
  interface MoqError {
    id: string;
    productName: string;
    quantity: number;
    moq: number;
  }

  const loading = false;
  const _refetch = () => {};

  interface CartMutationParams {
    variables?: {
      itemId?: string;
      quantity?: number;
    };
  }

  // const [updateCartItem, { loading: updating }] = useMutation(UPDATE_WHOLESALE_CART_ITEM, {
  //   onCompleted: () => {
  //     _refetch();
  //   },
  //   onError: (error) => {
  //     console.error('Error updating cart item:', error);
  //   },
  // });
  const updateCartItem = (_params?: CartMutationParams) => console.warn('Update cart not implemented - backend schema gap');
  const updating = false;

  // const [removeCartItem, { loading: removing }] = useMutation(REMOVE_FROM_WHOLESALE_CART, {
  //   onCompleted: () => {
  //     _refetch();
  //   },
  //   onError: (error) => {
  //     console.error('Error removing cart item:', error);
  //   },
  // });
  const removeCartItem = (_params?: CartMutationParams) => console.warn('Remove from cart not implemented - backend schema gap');
  const removing = false;

  const cart = data?.wholesaleCart || mockCartData.wholesaleCart;

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    updateCartItem({
      variables: {
        itemId,
        quantity: newQuantity,
      },
    });
  };

  const handleRemoveItem = (itemId: string) => {
    removeCartItem({
      variables: {
        itemId,
      },
    });
  };

  interface CartItem {
    id: string;
    moqCompliant: boolean;
  }

  const handleCheckout = () => {
    const hasErrors = cart.items.some((item: CartItem) => !item.moqCompliant);
    if (hasErrors) {
      alert('Please fix MOQ errors before proceeding to checkout');
      return;
    }
    router.push('/wholesale/checkout');
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const moqErrors = cart.items.filter((item: CartItem) => !item.moqCompliant);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!cart || cart.items.length === 0) {
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Wholesale Cart
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review your items and proceed to checkout
        </Typography>
      </Box>

      {moqErrors.length > 0 && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
            MOQ Requirements Not Met
          </Typography>
          {moqErrors.map((item: MoqError) => (
            <Typography key={item.id} variant="body2">
              • {item.productName}: Quantity {item.quantity} is below MOQ of {item.moq}
            </Typography>
          ))}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { md: '2fr 1fr' } }}>
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
                    <TableCell align="right">Line Total</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cart.items.map((item: MoqError & { unitPriceCents: number; lineTotalCents: number; productImage: string; moqCompliant: boolean }) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        bgcolor: !item.moqCompliant ? 'error.lighter' : 'transparent',
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
                          error={!item.moqCompliant}
                          disabled={updating}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.unitPriceCents)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium">
                          {formatCurrency(item.lineTotalCents)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => handleRemoveItem(item.id)}
                          color="error"
                          size="small"
                          disabled={removing}
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
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(cart.subtotalCents)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption" display="block" fontWeight="medium">
                    Payment Terms
                  </Typography>
                  <Typography variant="caption">
                    {cart.depositPercentage}% deposit required at checkout
                  </Typography>
                </Alert>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Deposit Required ({cart.depositPercentage}%)
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-deposit-amount">
                    {formatCurrency(cart.depositCents)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Balance Due (Net 30)
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-balance-due">
                    {formatCurrency(cart.balanceDueCents)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" mb={3}>
                  <Typography variant="h6">
                    Total Order Value
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(cart.subtotalCents)}
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
