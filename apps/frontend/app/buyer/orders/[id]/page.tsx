'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@/lib/apollo-client';
import { GET_ORDER } from '@/lib/graphql/queries/orders';
import { CANCEL_ORDER, REORDER_ITEMS } from '@/lib/graphql/mutations/orders';
import { GetOrderQuery } from '@/lib/generated/graphql';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  useMediaQuery,
  useTheme,
  Skeleton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack as ArrowBackIcon,
  LocalShipping as LocalShippingIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ShoppingCart as ShoppingCartIcon,
  Download as DownloadIcon,
  Support as SupportIcon,
  LocationOn as LocationOnIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'delivered' || statusLower === 'completed' || statusLower === 'fulfilled') return 'success';
  if (statusLower === 'shipped' || statusLower === 'in_transit') return 'primary';
  if (statusLower === 'processing' || statusLower === 'in_production') return 'info';
  if (statusLower === 'pending' || statusLower === 'awaiting_payment') return 'warning';
  if (statusLower === 'cancelled' || statusLower === 'refunded') return 'error';
  return 'default';
};

const getOrderSteps = () => [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

const getActiveStep = (status: string, fulfillmentStatus?: string) => {
  const statusLower = status.toLowerCase();
  const fulfillmentLower = fulfillmentStatus?.toLowerCase();

  if (statusLower === 'cancelled') return -1;
  if (statusLower === 'delivered' || fulfillmentLower === 'delivered') return 4;
  if (fulfillmentLower === 'out_for_delivery') return 3;
  if (statusLower === 'shipped' || fulfillmentLower === 'shipped' || fulfillmentLower === 'in_transit') return 2;
  if (statusLower === 'processing' || fulfillmentLower === 'processing' || fulfillmentLower === 'in_production') return 1;
  return 0;
};

export default function BuyerOrderDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { loading, error, data, refetch } = useQuery<GetOrderQuery>(GET_ORDER, {
    variables: { id: params.id },
    fetchPolicy: 'network-only',
  });

  const [cancelOrder, { loading: cancelLoading }] = useMutation(CANCEL_ORDER, {
    onCompleted: () => {
      setSnackbarMessage('Order cancelled successfully');
      setSnackbarOpen(true);
      setCancelDialogOpen(false);
      refetch();
    },
    onError: (err) => {
      setSnackbarMessage(`Failed to cancel order: ${err.message}`);
      setSnackbarOpen(true);
    },
  });

  const [reorderItems, { loading: reorderLoading }] = useMutation(REORDER_ITEMS, {
    onCompleted: () => {
      setSnackbarMessage('Items added to cart successfully');
      setSnackbarOpen(true);
      router.push('/cart');
    },
    onError: (err) => {
      setSnackbarMessage(`Failed to reorder: ${err.message}`);
      setSnackbarOpen(true);
    },
  });

  const order = data?.getOrder || null;

  const handleCancelOrder = () => {
    cancelOrder({ variables: { id: params.id } });
  };

  const handleReorder = () => {
    reorderItems({ variables: { orderId: params.id } });
  };

  const handleDownloadInvoice = () => {
    // This would typically generate and download a PDF invoice
    setSnackbarMessage('Invoice download feature coming soon');
    setSnackbarOpen(true);
  };

  const handleContactSupport = () => {
    // This would typically open a support dialog or redirect to support page
    window.location.href = `mailto:support@example.com?subject=Order Support - ${order?.orderNumber}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" width={120} height={40} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Skeleton variant="rectangular" width="100%" height={200} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Skeleton variant="rectangular" width="100%" height={400} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/buyer/dashboard')}
          sx={{ mb: 3 }}
        >
          Back to Orders
        </Button>
        <Alert severity="error">
          Failed to load order details. Please try again later.
        </Alert>
      </Container>
    );
  }

  const canCancelOrder = ['pending', 'processing', 'awaiting_payment'].includes(
    order.status.toLowerCase()
  );

  const activeStep = getActiveStep(order.status, order.fulfillmentStatus);
  const steps = getOrderSteps();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push('/buyer/dashboard')}
        sx={{ mb: 3 }}
        data-testid="button-back"
      >
        Back to Orders
      </Button>

      <Grid container spacing={3}>
        {/* Order Header */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight="600" gutterBottom data-testid="text-order-number">
                    Order #{order.orderNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" data-testid="text-order-date">
                    Placed on {format(new Date(order.createdAt), 'PPP')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <Chip
                    label={order.status.replace(/_/g, ' ')}
                    color={getStatusColor(order.status)}
                    data-testid="chip-order-status"
                  />
                  <Chip
                    label={order.paymentStatus.replace(/_/g, ' ')}
                    color={getStatusColor(order.paymentStatus)}
                    variant="outlined"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Order Timeline */}
              {activeStep >= 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    Order Progress
                  </Typography>
                  <Stepper
                    activeStep={activeStep}
                    orientation={isMobile ? 'vertical' : 'horizontal'}
                    sx={{ mt: 2 }}
                    data-testid="stepper-order-timeline"
                  >
                    {steps.map((label, index) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              )}

              {activeStep === -1 && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  This order has been cancelled
                </Alert>
              )}

              {/* Tracking Information */}
              {order.trackingNumber && (
                <Box sx={{ mt: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <LocalShippingIcon color="primary" />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Tracking Information
                          </Typography>
                          <Typography variant="body2" color="text.secondary" data-testid="text-tracking-number">
                            {order.carrier && `${order.carrier}: `}
                            {order.trackingNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Order Items */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                Order Items
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }} data-testid="table-order-items">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {item.product?.images?.[0] && (
                              <Box
                                component="img"
                                src={item.product.images[0]}
                                alt={item.productName}
                                sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
                              />
                            )}
                            <Box>
                              <Typography variant="body2" fontWeight="500">
                                {item.productName}
                              </Typography>
                              {item.variantId && (
                                <Typography variant="caption" color="text.secondary">
                                  Variant: {item.variantId}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">
                          ${parseFloat(item.unitPrice as string).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          ${parseFloat(item.lineTotal as string).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 3 }} />

              {/* Order Totals */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: { xs: '100%', sm: 300 } }}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal:
                  </Typography>
                  <Typography variant="body2" data-testid="text-order-subtotal">
                    ${parseFloat(order.subtotal as string).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: { xs: '100%', sm: 300 } }}>
                  <Typography variant="body2" color="text.secondary">
                    Shipping:
                  </Typography>
                  <Typography variant="body2" data-testid="text-order-shipping">
                    ${parseFloat(order.shippingCost as string).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: { xs: '100%', sm: 300 } }}>
                  <Typography variant="body2" color="text.secondary">
                    Tax:
                  </Typography>
                  <Typography variant="body2" data-testid="text-order-tax">
                    ${parseFloat(order.taxAmount as string).toFixed(2)}
                  </Typography>
                </Box>
                <Divider sx={{ width: { xs: '100%', sm: 300 }, my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: { xs: '100%', sm: 300 } }}>
                  <Typography variant="h6" fontWeight="600">
                    Total:
                  </Typography>
                  <Typography variant="h6" fontWeight="600" data-testid="text-order-total">
                    ${parseFloat(order.totalAmount as string).toFixed(2)} {order.currency}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Shipping Address & Payment Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocationOnIcon color="primary" />
                <Typography variant="h6" fontWeight="600">
                  Shipping Address
                </Typography>
              </Box>
              {order.shippingAddress ? (
                <Box data-testid="text-shipping-address">
                  <Typography variant="body2">{order.shippingAddress.fullName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress.addressLine1}
                  </Typography>
                  {order.shippingAddress.addressLine2 && (
                    <Typography variant="body2" color="text.secondary">
                      {order.shippingAddress.addressLine2}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress.country}
                  </Typography>
                  {order.shippingAddress.phone && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Phone: {order.shippingAddress.phone}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No shipping address provided
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PaymentIcon color="primary" />
                <Typography variant="h6" fontWeight="600">
                  Payment Information
                </Typography>
              </Box>
              <Box data-testid="text-payment-method">
                <Typography variant="body2" color="text.secondary">
                  Payment Status:{' '}
                  <Chip
                    label={order.paymentStatus.replace(/_/g, ' ')}
                    size="small"
                    color={getStatusColor(order.paymentStatus)}
                  />
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Action Buttons */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadInvoice}
                  data-testid="button-download-invoice"
                >
                  Download Invoice
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShoppingCartIcon />}
                  onClick={handleReorder}
                  disabled={reorderLoading}
                  data-testid="button-reorder"
                >
                  Reorder
                </Button>
                {canCancelOrder && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => setCancelDialogOpen(true)}
                    data-testid="button-cancel-order"
                  >
                    Cancel Order
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<SupportIcon />}
                  onClick={handleContactSupport}
                  data-testid="button-contact-support"
                >
                  Contact Support
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cancel Order Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this order? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>
            No, Keep Order
          </Button>
          <Button
            onClick={handleCancelOrder}
            color="error"
            variant="contained"
            disabled={cancelLoading}
          >
            {cancelLoading ? <CircularProgress size={24} /> : 'Yes, Cancel Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
}
