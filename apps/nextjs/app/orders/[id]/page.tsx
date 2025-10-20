'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Avatar,
  DialogContentText,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocalShipping as LocalShippingIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const GET_ORDER = gql`
  query GetOrder($id: ID!) {
    getOrder(id: $id) {
      id
      orderNumber
      status
      fulfillmentStatus
      paymentStatus
      subtotal
      shippingCost
      taxAmount
      totalAmount
      currency
      customerName
      customerEmail
      customerPhone
      shippingAddress {
        fullName
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
        phone
      }
      billingAddress {
        fullName
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
        phone
      }
      trackingNumber
      carrier
      createdAt
      paidAt
      buyer {
        id
        email
        fullName
      }
      items {
        id
        productId
        productName
        productImage
        quantity
        unitPrice
        lineTotal
        fulfillmentStatus
      }
    }
  }
`;

const UPDATE_FULFILLMENT = gql`
  mutation UpdateFulfillment($input: UpdateOrderFulfillmentInput!) {
    updateFulfillment(input: $input) {
      id
      orderNumber
      status
      fulfillmentStatus
      trackingNumber
      carrier
    }
  }
`;

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'fulfilled' || statusLower === 'paid' || statusLower === 'delivered') return 'success';
  if (statusLower === 'processing' || statusLower === 'in_production' || statusLower === 'in_transit') return 'info';
  if (statusLower === 'pending' || statusLower === 'awaiting_payment') return 'warning';
  if (statusLower === 'cancelled' || statusLower === 'refunded' || statusLower === 'failed') return 'error';
  return 'default';
};

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const { loading, error, data, refetch } = useQuery(GET_ORDER, {
    variables: { id: params.id },
    fetchPolicy: 'network-only',
  });

  const [updateFulfillment, { loading: updateLoading }] = useMutation(UPDATE_FULFILLMENT, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Order updated successfully',
        severity: 'success',
      });
      setTrackingDialogOpen(false);
      setStatusDialogOpen(false);
      setTrackingNumber('');
      setCarrier('');
      refetch();
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: `Error updating order: ${error.message}`,
        severity: 'error',
      });
    },
  });

  const handleAddTracking = () => {
    updateFulfillment({
      variables: {
        input: {
          orderId: params.id,
          status: 'IN_TRANSIT',
          trackingNumber,
          carrier,
        },
      },
    });
  };

  const handleUpdateStatus = () => {
    updateFulfillment({
      variables: {
        input: {
          orderId: params.id,
          status: newStatus,
        },
      },
    });
  };

  const handleMarkFulfilled = () => {
    updateFulfillment({
      variables: {
        input: {
          orderId: params.id,
          status: 'FULFILLED',
        },
      },
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress data-testid="loading-spinner" />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" data-testid="alert-error">
          Error loading order: {error.message}
        </Alert>
      </Container>
    );
  }

  const order = data?.getOrder;

  if (!order) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="warning" data-testid="alert-not-found">
          Order not found
        </Alert>
      </Container>
    );
  }

  const itemsTotal = order.items?.reduce((sum: number, item: any) => sum + item.lineTotal, 0) || 0;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/orders')}
          sx={{ mb: 2 }}
          data-testid="button-back"
        >
          Back to Orders
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" gutterBottom data-testid="text-order-number">
              Order {order.orderNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Created on {format(new Date(order.createdAt), 'MMMM dd, yyyy \'at\' h:mm a')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<LocalShippingIcon />}
              onClick={() => setTrackingDialogOpen(true)}
              data-testid="button-add-tracking"
            >
              {order.trackingNumber ? 'Update Tracking' : 'Add Tracking'}
            </Button>
            <Button
              variant="contained"
              onClick={() => setStatusDialogOpen(true)}
              data-testid="button-update-status"
            >
              Update Status
            </Button>
            {order.fulfillmentStatus !== 'FULFILLED' && (
              <Button
                variant="contained"
                color="success"
                onClick={handleMarkFulfilled}
                disabled={updateLoading}
                data-testid="button-mark-fulfilled"
              >
                Mark as Fulfilled
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Items
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items?.map((item: any) => (
                      <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                              src={item.productImage || 'https://via.placeholder.com/60?text=No+Image'}
                              alt={item.productName}
                              variant="rounded"
                              sx={{ width: 60, height: 60 }}
                            />
                            <Typography variant="body2" fontWeight="500" data-testid={`text-item-name-${item.id}`}>
                              {item.productName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center" data-testid={`text-item-quantity-${item.id}`}>
                          {item.quantity}
                        </TableCell>
                        <TableCell align="right" data-testid={`text-item-price-${item.id}`}>
                          ${item.unitPrice?.toFixed(2)}
                        </TableCell>
                        <TableCell align="right" data-testid={`text-item-total-${item.id}`}>
                          <Typography variant="body2" fontWeight="600">
                            ${item.lineTotal?.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.fulfillmentStatus?.replace(/_/g, ' ')}
                            size="small"
                            color={getStatusColor(item.fulfillmentStatus)}
                            data-testid={`chip-item-status-${item.id}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Box sx={{ width: '100%', maxWidth: 300 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Subtotal:</Typography>
                    <Typography variant="body2" data-testid="text-subtotal">
                      ${order.subtotal?.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Shipping:</Typography>
                    <Typography variant="body2" data-testid="text-shipping">
                      ${order.shippingCost?.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Tax:</Typography>
                    <Typography variant="body2" data-testid="text-tax">
                      ${order.taxAmount?.toFixed(2)}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6" color="primary" data-testid="text-total">
                      ${order.totalAmount?.toFixed(2)} {order.currency}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Order Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={order.status?.replace(/_/g, ' ')}
                      color={getStatusColor(order.status)}
                      data-testid="chip-order-status"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Payment Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={order.paymentStatus?.replace(/_/g, ' ')}
                      color={getStatusColor(order.paymentStatus)}
                      data-testid="chip-payment-status"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fulfillment Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={order.fulfillmentStatus?.replace(/_/g, ' ')}
                      color={getStatusColor(order.fulfillmentStatus)}
                      data-testid="chip-fulfillment-status"
                    />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" data-testid="text-customer-name">
                  <strong>Name:</strong> {order.customerName || order.buyer?.fullName || 'N/A'}
                </Typography>
                <Typography variant="body2" data-testid="text-customer-email">
                  <strong>Email:</strong> {order.customerEmail || order.buyer?.email}
                </Typography>
                {order.customerPhone && (
                  <Typography variant="body2" data-testid="text-customer-phone">
                    <strong>Phone:</strong> {order.customerPhone}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shipping Address
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {order.shippingAddress ? (
                <Box data-testid="text-shipping-address">
                  <Typography variant="body2">{order.shippingAddress.fullName}</Typography>
                  <Typography variant="body2">{order.shippingAddress.addressLine1}</Typography>
                  {order.shippingAddress.addressLine2 && (
                    <Typography variant="body2">{order.shippingAddress.addressLine2}</Typography>
                  )}
                  <Typography variant="body2">
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </Typography>
                  <Typography variant="body2">{order.shippingAddress.country}</Typography>
                  {order.shippingAddress.phone && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Phone:</strong> {order.shippingAddress.phone}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No shipping address
                </Typography>
              )}
            </CardContent>
          </Card>

          {order.trackingNumber && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Shipping Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box>
                  <Typography variant="body2" data-testid="text-tracking-number">
                    <strong>Tracking Number:</strong> {order.trackingNumber}
                  </Typography>
                  {order.carrier && (
                    <Typography variant="body2" sx={{ mt: 1 }} data-testid="text-carrier">
                      <strong>Carrier:</strong> {order.carrier}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <Dialog
        open={trackingDialogOpen}
        onClose={() => setTrackingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        data-testid="dialog-tracking"
      >
        <DialogTitle>Add Tracking Information</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Tracking Number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              fullWidth
              required
              data-testid="input-tracking-number"
            />
            <FormControl fullWidth>
              <InputLabel id="carrier-label">Carrier</InputLabel>
              <Select
                labelId="carrier-label"
                value={carrier}
                label="Carrier"
                onChange={(e) => setCarrier(e.target.value)}
                data-testid="select-carrier"
              >
                <MenuItem value="UPS" data-testid="option-carrier-ups">UPS</MenuItem>
                <MenuItem value="FedEx" data-testid="option-carrier-fedex">FedEx</MenuItem>
                <MenuItem value="USPS" data-testid="option-carrier-usps">USPS</MenuItem>
                <MenuItem value="DHL" data-testid="option-carrier-dhl">DHL</MenuItem>
                <MenuItem value="Other" data-testid="option-carrier-other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setTrackingDialogOpen(false)}
            disabled={updateLoading}
            data-testid="button-cancel-tracking"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddTracking}
            variant="contained"
            disabled={!trackingNumber || !carrier || updateLoading}
            data-testid="button-save-tracking"
          >
            {updateLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        data-testid="dialog-status"
      >
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="status-label">New Status</InputLabel>
            <Select
              labelId="status-label"
              value={newStatus}
              label="New Status"
              onChange={(e) => setNewStatus(e.target.value)}
              data-testid="select-new-status"
            >
              <MenuItem value="PENDING" data-testid="option-status-pending">Pending</MenuItem>
              <MenuItem value="PROCESSING" data-testid="option-status-processing">Processing</MenuItem>
              <MenuItem value="IN_PRODUCTION" data-testid="option-status-in-production">In Production</MenuItem>
              <MenuItem value="READY_TO_SHIP" data-testid="option-status-ready-to-ship">Ready to Ship</MenuItem>
              <MenuItem value="FULFILLED" data-testid="option-status-fulfilled">Fulfilled</MenuItem>
              <MenuItem value="CANCELLED" data-testid="option-status-cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setStatusDialogOpen(false)}
            disabled={updateLoading}
            data-testid="button-cancel-status"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            disabled={!newStatus || updateLoading}
            data-testid="button-save-status"
          >
            {updateLoading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          data-testid="alert-snackbar"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
