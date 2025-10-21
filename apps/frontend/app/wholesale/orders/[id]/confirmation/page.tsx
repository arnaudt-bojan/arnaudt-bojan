'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
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
  Chip,
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
import { GET_WHOLESALE_ORDER } from '@/lib/graphql/wholesale-buyer';

// Mock order data (would come from GraphQL)
const mockOrderData = {
  id: 'order-123',
  orderNumber: 'WHS-20251020-ABC123',
  status: 'PENDING',
  paymentStatus: 'DEPOSIT_PAID',
  items: [
    {
      id: '1',
      productName: 'Premium Wholesale T-Shirt',
      productSku: 'SKU-TS-001',
      quantity: 15,
      unitPrice: 12.50,
      lineTotal: 187.50,
    },
    {
      id: '2',
      productName: 'Classic Wholesale Jeans',
      productSku: 'SKU-JN-002',
      quantity: 8,
      unitPrice: 35.00,
      lineTotal: 280.00,
    },
  ],
  subtotal: 467.50,
  totalAmount: 467.50,
  depositAmount: 140.25,
  depositPercentage: 30,
  balanceDue: 327.25,
  paymentTerms: 'Net 30',
  balancePaymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  expectedShipDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  buyerEmail: 'buyer@example.com',
  buyerName: 'John Doe',
  buyerCompanyName: 'ABC Retail Inc.',
  createdAt: new Date().toISOString(),
  seller: {
    businessName: 'Wholesale Supplier Co.',
    email: 'seller@example.com',
  },
};

export default function WholesaleOrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  // In real implementation, would use GraphQL query
  const loading = false;
  const order = mockOrderData;

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
            <Grid xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Order Number
              </Typography>
              <Typography variant="h5" fontWeight="medium" data-testid="text-order-number">
                {order.orderNumber}
              </Typography>
            </Grid>
            <Grid xs={12} md={6}>
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
            <PaymentIcon color="primary" />
            <Typography variant="h6">Payment Status</Typography>
          </Box>

          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium">
              Deposit Paid Successfully
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid xs={12} md={4}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Order Value
                </Typography>
                <Typography variant="h6" fontWeight="medium">
                  {formatCurrency(order.totalAmount)}
                </Typography>
              </Box>
            </Grid>
            <Grid xs={12} md={4}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'success.lighter',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  Deposit Paid ({order.depositPercentage}%)
                </Typography>
                <Typography variant="h6" fontWeight="medium" color="success.dark">
                  {formatCurrency(order.depositAmount)}
                </Typography>
              </Box>
            </Grid>
            <Grid xs={12} md={4}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'warning.lighter',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  Balance Due ({order.paymentTerms})
                </Typography>
                <Typography variant="h6" fontWeight="medium" color="warning.dark">
                  {formatCurrency(order.balanceDue)}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Balance Payment Due Date
            </Typography>
            <Typography variant="body1" fontWeight="medium" color="error">
              {formatDate(order.balancePaymentDueDate)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Order Items
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {item.productSku}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">
                        {formatCurrency(item.lineTotal)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} align="right">
                    <Typography variant="h6">Subtotal</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(order.subtotal)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Shipping Info */}
      {order.expectedShipDate && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <LocalShipping color="primary" />
              <Typography variant="h6">Shipping Information</Typography>
            </Box>

            <Alert severity="info">
              <Typography variant="body2">
                Expected Ship Date: <strong>{formatDate(order.expectedShipDate)}</strong>
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Contact Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Email color="primary" />
            <Typography variant="h6">Order Confirmation</Typography>
          </Box>

          <Alert severity="info">
            <Typography variant="body2">
              A confirmation email has been sent to <strong>{order.buyerEmail}</strong>
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={() => alert('Download invoice functionality would be here')}
        >
          Download Invoice
        </Button>
        <Button
          variant="outlined"
          startIcon={<Receipt />}
          onClick={() => router.push('/wholesale/orders')}
        >
          View All Orders
        </Button>
        <Button
          variant="outlined"
          onClick={() => router.push('/wholesale/catalog')}
        >
          Continue Shopping
        </Button>
      </Box>
    </Container>
  );
}
