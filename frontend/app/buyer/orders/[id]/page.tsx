'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ORDER } from '@/lib/graphql/queries/orders';
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
  Cancel as CancelIcon,
  ShoppingCart as ShoppingCartIcon,
  Download as DownloadIcon,
  Support as SupportIcon,
  LocationOn as LocationOnIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
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

export default function BuyerOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const id = params?.id as string;

  const { loading, error, data, refetch: _refetch } = useQuery<GetOrderQuery>(GET_ORDER, {
    variables: { id },
    fetchPolicy: 'network-only',
    skip: !id,
  });

  const cancelLoading = false;
  const reorderLoading = false;

  const order = data?.getOrder || null;

  const handleCancelOrder = () => {
    setSnackbarMessage('Cancel order feature coming soon - backend implementation needed');
    setSnackbarOpen(true);
  };

  const handleReorder = () => {
    setSnackbarMessage('Reorder feature coming soon - backend implementation needed');
    setSnackbarOpen(true);
  };

  const handleDownloadInvoice = () => {
    setSnackbarMessage('Invoice download feature coming soon');
    setSnackbarOpen(true);
  };

  const handleContactSupport = () => {
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
                    {steps.map((label, _index) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {order.trackingNumber && (
                  <Button
                    variant="outlined"
                    startIcon={<LocalShippingIcon />}
                    data-testid="button-track-shipment"
                  >
                    Track Shipment
                  </Button>
                )}
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
                  Reorder Items
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

        {/* Order Items */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Items
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items?.map((item: any, index: number) => (
                      <TableRow key={index} data-testid={`row-order-item-${index}`}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {item.product?.image && (
                              <Box
                                component="img"
                                src={item.product.image}
                                alt={item.product.name}
                                sx={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 1 }}
                              />
                            )}
                            <Box>
                              <Typography variant="body2" fontWeight="600">
                                {item.product?.name || 'Product'}
                              </Typography>
                              {item.variantName && (
                                <Typography variant="caption" color="text.secondary">
                                  {item.variantName}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">${parseFloat(item.price || '0').toFixed(2)}</TableCell>
                        <TableCell align="right">
                          ${(parseFloat(item.price || '0') * item.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Order Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    ${parseFloat(order.subtotal || order.totalAmount || '0').toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Shipping
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    ${parseFloat(order.shippingCost || '0').toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tax
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    ${parseFloat(order.taxAmount || '0').toFixed(2)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" fontWeight="700" data-testid="text-order-total">
                    ${parseFloat(order.totalAmount || '0').toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Shipping Address */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOnIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" fontWeight="600">
                    Shipping Address
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" data-testid="text-shipping-address">
                  {order.shippingAddress?.street}<br />
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}<br />
                  {order.shippingAddress?.country}
                </Typography>
              </Box>

              {/* Payment Method */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PaymentIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" fontWeight="600">
                    Payment Method
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" data-testid="text-payment-method">
                  {order.paymentMethod || 'Credit Card'}
                </Typography>
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
          <Button onClick={() => setCancelDialogOpen(false)} data-testid="button-cancel-dialog-close">
            No, Keep Order
          </Button>
          <Button
            onClick={handleCancelOrder}
            color="error"
            variant="contained"
            disabled={cancelLoading}
            data-testid="button-confirm-cancel"
          >
            Yes, Cancel Order
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
