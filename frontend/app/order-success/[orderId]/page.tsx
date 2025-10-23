'use client';

import { useQuery } from '@/lib/apollo-client';
import { GET_ORDER } from '@/lib/graphql/queries/orders';
import { GetOrderQuery } from '@/lib/generated/graphql';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle,
  LocalShipping,
  Download,
  Home,
  Email,
  Phone,
  Place,
} from '@mui/icons-material';
import Link from 'next/link';
import { format } from 'date-fns';

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const statusMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    PENDING: 'warning',
    PROCESSING: 'info',
    SHIPPED: 'primary',
    DELIVERED: 'success',
    CANCELLED: 'error',
  };
  return statusMap[status] || 'default';
};

interface OrderItem {
  id: string;
  product?: {
    name: string;
    images?: string[];
  };
  quantity: number;
  lineTotal: string | number;
  unitPrice: string | number;
}

export default function OrderSuccessPage({ params }: { params: { orderId: string } }) {
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { data, loading, error } = useQuery<GetOrderQuery>(GET_ORDER, {
    variables: { id: params.orderId },
    fetchPolicy: 'network-only',
  });
  
  const order = data?.getOrder;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Skeleton variant="text" width={300} height={60} sx={{ mb: 4 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error?.message || 'Order not found'}
        </Alert>
        <Button variant="contained" component={Link} href="/">
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              Order Confirmed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Thank you for your purchase!
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Order Details</Typography>
                <Chip
                  label={order.status}
                  color={getStatusColor(order.status)}
                  data-testid="chip-order-status"
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Order Number
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" data-testid="text-order-number">
                    {order.orderNumber}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Order Date
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" data-testid="text-order-date">
                    {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Payment Status
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {order.paymentStatus}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    Fulfillment Status
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {order.fulfillmentStatus}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Items
              </Typography>

              <Table data-testid="table-order-items">
                <TableBody>
                  {order.items.map((item: OrderItem) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Avatar
                            src={item.product?.images?.[0]}
                            alt={item.product?.name}
                            variant="rounded"
                            sx={{ width: 60, height: 60 }}
                          />
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {item.product?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Qty: {item.quantity}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight="medium">
                          ${parseFloat(String(item.lineTotal)).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ${parseFloat(String(item.unitPrice)).toFixed(2)} each
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalShipping />
                <Typography variant="h6">Shipping Address</Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Place sx={{ fontSize: 20, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2">
                    {order.shippingAddress.fullName}
                  </Typography>
                  <Typography variant="body2">
                    {order.shippingAddress.addressLine1}
                  </Typography>
                  {order.shippingAddress.addressLine2 && (
                    <Typography variant="body2">
                      {order.shippingAddress.addressLine2}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                    {order.shippingAddress.postalCode}
                  </Typography>
                  <Typography variant="body2">
                    {order.shippingAddress.country}
                  </Typography>
                </Box>
              </Box>

              {order.trackingNumber && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Tracking Number
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" fontWeight="medium">
                    {order.trackingNumber}
                  </Typography>
                  {order.carrier && (
                    <Typography variant="caption" color="text.secondary">
                      Carrier: {order.carrier}
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    ${parseFloat(String(order.subtotal)).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Shipping</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    ${parseFloat(String(order.shippingCost)).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Tax</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    ${parseFloat(String(order.taxAmount)).toFixed(2)}
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary" data-testid="text-total-amount">
                    ${parseFloat(String(order.totalAmount)).toFixed(2)} {order.currency}
                  </Typography>
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

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(order.customerEmail || order.buyer?.email) && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Email sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body2" data-testid="text-customer-email">
                      {order.customerEmail || order.buyer?.email}
                    </Typography>
                  </Box>
                )}
                {order.customerPhone && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Phone sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography variant="body2" data-testid="text-customer-phone">
                      {order.customerPhone}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Next Steps
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  We&apos;ve sent a confirmation email to your inbox. You&apos;ll receive shipping updates as your order is processed.
                </Typography>

                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  fullWidth
                  data-testid="button-download-receipt"
                >
                  Download Receipt
                </Button>

                <Button
                  variant="contained"
                  startIcon={<Home />}
                  fullWidth
                  component={Link}
                  href="/"
                  data-testid="button-continue-shopping"
                >
                  Continue Shopping
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
