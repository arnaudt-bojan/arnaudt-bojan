'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useParams } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  AlertTitle,
  Divider,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  CheckCircle,
  Cancel,
  Download,
  Business,
  Email,
  CalendarToday,
  LocalShipping,
} from '@mui/icons-material';
import { 
  GET_QUOTATION_BY_TOKEN, 
  ACCEPT_QUOTATION,
} from '@/lib/graphql/trade';
import { format, differenceInDays } from 'date-fns';
import { DEFAULT_CURRENCY } from '@/lib/shared';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal?: string | number;
}

interface QuotationData {
  id: string;
  quotationNumber: string;
  status: string;
  validUntil?: string;
  createdAt?: string;
  total: number;
  currency: string;
  depositPercentage: number;
  deliveryTerms?: string;
  items?: QuotationItem[];
  subtotal?: number;
  taxAmount?: number;
  shippingAmount?: number;
  depositAmount?: number;
  balanceAmount?: number;
  seller?: {
    username: string;
    email: string;
    sellerAccount?: {
      businessName?: string;
      storeName?: string;
    };
  };
}

export default function QuotationViewPage() {
  const params = useParams();
  const token = params?.token as string;

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const { data, loading, refetch } = useQuery<{ getQuotationByToken: QuotationData }>(GET_QUOTATION_BY_TOKEN, {
    variables: { token },
    skip: !token,
  });

  const [acceptQuotation, { loading: accepting }] = useMutation(ACCEPT_QUOTATION, {
    onCompleted: () => {
      refetch();
      setAcceptDialogOpen(false);
    },
    onError: (error) => {
      console.error('Failed to accept quotation:', error);
    },
  });

  const quotation = data?.getQuotationByToken;

  const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleAccept = () => {
    if (quotation) {
      acceptQuotation({
        variables: {
          id: quotation.id,
        },
      });
    }
  };

  const handleReject = () => {
    setRejectDialogOpen(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  if (!quotation) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          <AlertTitle>Quotation Not Found</AlertTitle>
          This quotation link is invalid or has expired.
        </Alert>
      </Container>
    );
  }

  const daysUntilExpiry = quotation.validUntil
    ? differenceInDays(new Date(quotation.validUntil), new Date())
    : null;

  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isAccepted = ['ACCEPTED', 'DEPOSIT_PAID', 'BALANCE_DUE', 'FULLY_PAID', 'COMPLETED'].includes(quotation.status);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-quotation-view">
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom data-testid="text-page-title">
          Trade Quotation
        </Typography>
        <Typography variant="h5" color="primary" gutterBottom data-testid="text-quotation-number">
          {quotation.quotationNumber}
        </Typography>
        {quotation.seller && (
          <Typography variant="body1" color="text.secondary" data-testid="text-seller">
            from {quotation.seller.sellerAccount?.businessName || quotation.seller.sellerAccount?.storeName || quotation.seller.username}
          </Typography>
        )}
      </Box>

      {isExpired && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Quotation Expired</AlertTitle>
          This quotation expired on {format(new Date(quotation.validUntil!), 'MMMM dd, yyyy')}
        </Alert>
      )}

      {isAccepted && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Quotation Accepted</AlertTitle>
          You have accepted this quotation. Payment instructions have been sent to your email.
        </Alert>
      )}

      {!isExpired && !isAccepted && daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Expiring Soon</AlertTitle>
          This quotation expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 3 }}>
            <CardHeader title={<Typography variant="h6">Quotation Details</Typography>} />
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Business color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Seller
                      </Typography>
                      <Typography variant="body2" data-testid="text-seller-name">
                        {quotation.seller?.sellerAccount?.businessName || quotation.seller?.username || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Email color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Contact
                      </Typography>
                      <Typography variant="body2" data-testid="text-seller-email">
                        {quotation.seller?.email || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CalendarToday color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Valid Until
                      </Typography>
                      <Typography variant="body2" data-testid="text-valid-until">
                        {quotation.validUntil ? format(new Date(quotation.validUntil), 'MMMM dd, yyyy') : 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <LocalShipping color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Delivery Terms
                      </Typography>
                      <Typography variant="body2" data-testid="text-delivery-terms">
                        {quotation.deliveryTerms || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={<Typography variant="h6">Line Items</Typography>} />
            <CardContent>
              <TableContainer component={Paper} variant="outlined" data-testid="table-line-items">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Line Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(quotation.items || []).map((item, index) => (
                      <TableRow key={item.id || index} data-testid={`row-item-${index}`}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(parseFloat(item.unitPrice.toString()), quotation.currency)}
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(
                              parseFloat(item.unitPrice.toString()) * item.quantity,
                              quotation.currency
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardHeader title={<Typography variant="h6">Payment Summary</Typography>} />
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2" data-testid="text-subtotal">
                    {formatCurrency(quotation.subtotal || 0, quotation.currency)}
                  </Typography>
                </Box>
                {quotation.taxAmount ? (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Tax:</Typography>
                    <Typography variant="body2">
                      {formatCurrency(quotation.taxAmount, quotation.currency)}
                    </Typography>
                  </Box>
                ) : null}
                {quotation.shippingAmount ? (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Shipping:</Typography>
                    <Typography variant="body2">
                      {formatCurrency(quotation.shippingAmount, quotation.currency)}
                    </Typography>
                  </Box>
                ) : null}
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" data-testid="text-total">
                    {formatCurrency(quotation.total, quotation.currency)}
                  </Typography>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="caption">
                  Deposit Required: {quotation.depositPercentage}%
                </Typography>
              </Alert>

              <Box sx={{ mb: 3 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" fontWeight="medium">
                    Deposit ({quotation.depositPercentage}%):
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-deposit">
                    {formatCurrency(quotation.depositAmount || 0, quotation.currency)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Balance Due:</Typography>
                  <Typography variant="body2" data-testid="text-balance">
                    {formatCurrency(quotation.balanceAmount || 0, quotation.currency)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {!isAccepted && !isExpired && (
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<CheckCircle />}
                    onClick={() => setAcceptDialogOpen(true)}
                    data-testid="button-accept-quotation"
                  >
                    Accept Quotation
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => setRejectDialogOpen(true)}
                    data-testid="button-reject-quotation"
                  >
                    Reject
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={acceptDialogOpen}
        onClose={() => setAcceptDialogOpen(false)}
        data-testid="dialog-accept-quotation"
      >
        <DialogTitle>Accept Quotation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to accept this quotation? You will receive payment instructions via email.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcceptDialogOpen(false)} data-testid="button-cancel-accept">
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            color="success"
            variant="contained"
            disabled={accepting}
            data-testid="button-confirm-accept"
          >
            {accepting ? 'Accepting...' : 'Accept'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        data-testid="dialog-reject-quotation"
      >
        <DialogTitle>Reject Quotation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reject this quotation?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            color="error"
            variant="contained"
            data-testid="button-confirm-reject"
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
