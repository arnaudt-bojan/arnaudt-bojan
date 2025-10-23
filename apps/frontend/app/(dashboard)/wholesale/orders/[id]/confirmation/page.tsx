'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import DashboardLayout from '@/components/DashboardLayout';
import { GET_WHOLESALE_ORDER } from '@/lib/graphql/wholesale';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  CheckCircle,
  Download,
  LocalShipping,
  Receipt,
  Payment as PaymentIcon,
  Email,
} from '@mui/icons-material';
import { DEFAULT_CURRENCY } from '@upfirst/shared';

interface WholesaleOrderItem {
  id: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface WholesaleOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  items: WholesaleOrderItem[];
  subtotal: number;
  totalAmount: number;
  depositAmount: number;
  depositPercentage?: number;
  balanceDue: number;
  balanceAmount: number;
  paymentTerms: string;
  balancePaidAt?: string;
  createdAt: string;
  buyer: {
    email: string;
    fullName?: string;
  };
  seller: {
    businessName?: string;
    email: string;
  };
  calculatedDepositAmount?: number;
  calculatedBalanceAmount?: number;
}

interface GetWholesaleOrderData {
  getWholesaleOrder: WholesaleOrder;
}

export default function WholesaleOrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { loading, data } = useQuery<GetWholesaleOrderData>(GET_WHOLESALE_ORDER, {
    variables: { id: orderId },
  });

  const order = data?.getWholesaleOrder;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">Order not found</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  const depositAmount = order.calculatedDepositAmount || order.depositAmount || 0;
  const balanceAmount = order.calculatedBalanceAmount || order.balanceAmount || order.balanceDue || 0;

  return (
    <DashboardLayout>
      <Container maxWidth="lg" sx={{ py: 4 }} data-testid="page-order-confirmation">
        {/* Success Header */}
        <Card sx={{ mb: 3, bgcolor: 'success.lighter' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <CheckCircle sx={{ fontSize: 60, color: 'success.main' }} />
              <Box>
                <Typography variant="h4" color="success.dark" gutterBottom>
                  Order Confirmed!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Your wholesale order has been successfully placed
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Order Number */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Order Number
                </Typography>
                <Typography variant="h5" fontWeight="medium" data-testid="text-order-number">
                  {order.orderNumber}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Order Date
                </Typography>
                <Typography variant="h6">
                  {formatDate(order.createdAt)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PaymentIcon />
              <Typography variant="h6" fontWeight="medium">
                Payment Information
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Amount
                </Typography>
                <Typography variant="h6" data-testid="text-total-amount">
                  {formatCurrency(order.totalAmount)}
                </Typography>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Deposit Paid
                </Typography>
                <Typography variant="h6" color="success.main" data-testid="text-deposit-amount">
                  {formatCurrency(depositAmount)}
                </Typography>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Balance Due
                </Typography>
                <Typography variant="h6" color="warning.main" data-testid="text-balance-due">
                  {formatCurrency(balanceAmount)}
                </Typography>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Payment Terms
                </Typography>
                <Typography variant="h6">
                  {order.paymentTerms}
                </Typography>
              </Grid>
            </Grid>

            {balanceAmount > 0 && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Balance Payment:</strong> The remaining balance of {formatCurrency(balanceAmount)} is due according to the {order.paymentTerms} payment terms. 
                  You will receive a payment request email when the order is ready for shipment.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Receipt />
              <Typography variant="h6" fontWeight="medium">
                Order Items
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table data-testid="table-order-items">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.productSku || '-'}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} align="right">
                      <Typography fontWeight="medium">Subtotal:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">{formatCurrency(order.subtotal)}</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} align="right">
                      <Typography variant="h6" fontWeight="bold">Total:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" fontWeight="bold">{formatCurrency(order.totalAmount)}</Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <LocalShipping />
              <Typography variant="h6" fontWeight="medium">
                Shipping & Next Steps
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body1" paragraph>
              <strong>What happens next:</strong>
            </Typography>
            <Box component="ol" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" paragraph>
                Your order is now being processed by {order.seller.businessName || order.seller.email}
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                You will receive email updates at {order.buyer.email} about your order status
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                When your order is ready to ship, you'll receive a balance payment request
              </Typography>
              <Typography component="li" variant="body2" paragraph>
                After balance payment, your order will be shipped with tracking information
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="outlined"
            startIcon={<Download />}
            data-testid="button-download-invoice"
          >
            Download Invoice
          </Button>
          <Button
            variant="outlined"
            startIcon={<Email />}
            data-testid="button-email-confirmation"
          >
            Email Confirmation
          </Button>
          <Button
            variant="contained"
            onClick={() => router.push('/wholesale/orders')}
            data-testid="button-view-orders"
          >
            View All Orders
          </Button>
        </Box>
      </Container>
    </DashboardLayout>
  );
}
