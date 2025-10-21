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
  Chip,
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
  AttachMoney,
  Description,
} from '@mui/icons-material';
import { GET_QUOTATION_BY_TOKEN, ACCEPT_QUOTATION, Quotation } from '@/lib/graphql/trade-quotations';
import { format, differenceInDays } from 'date-fns';

export default function QuotationViewPage() {
  const params = useParams();
  const token = params?.token as string;

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const { data, loading, refetch } = useQuery<{ getQuotationByToken: Quotation }>(GET_QUOTATION_BY_TOKEN, {
    variables: { token },
    skip: !token,
  });

  const [acceptQuotation, { loading: accepting }] = useMutation(ACCEPT_QUOTATION, {
    onCompleted: () => {
      refetch();
      setAcceptDialogOpen(false);
    },
  });

  const quotation = data?.getQuotationByToken;

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleAccept = () => {
    acceptQuotation({
      variables: {
        token,
        buyerInfo: null,
      },
    });
  };

  const handleReject = () => {
    // TODO: Implement reject mutation
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
    <Container maxWidth="lg" sx={{ py: 4 }} data-testid="page-quotation-view">
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Trade Quotation
        </Typography>
        <Typography variant="h5" color="primary" gutterBottom>
          {quotation.quotationNumber}
        </Typography>
        {quotation.seller && (
          <Typography variant="body1" color="text.secondary">
            from {quotation.seller.username}
          </Typography>
        )}
      </Box>

      {/* Status Alerts */}
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
          <AlertTitle>Expires Soon</AlertTitle>
          This quotation will expire in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
        </Alert>
      )}

      {/* Seller Info */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Seller Information" />
        <CardContent>
          <Grid container spacing={2}>
            {quotation.seller && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business color="action" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Company
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {quotation.seller.username}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email color="action" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {quotation.seller.email}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday color="action" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Quotation Date
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {format(new Date(quotation.createdAt), 'MMMM dd, yyyy')}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            {quotation.validUntil && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Valid Until
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {format(new Date(quotation.validUntil), 'MMMM dd, yyyy')}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {quotation.deliveryTerms && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalShipping color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Delivery Terms
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {quotation.deliveryTerms}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Items" />
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table data-testid="table-quotation-items">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quotation.items?.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(parseFloat(item.unitPrice.toString()), quotation.currency)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(parseFloat(item.lineTotal?.toString() || '0'), quotation.currency)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 3 }} />

          {/* Totals */}
          <Grid container spacing={2} justifyContent="flex-end">
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1" fontWeight="medium" data-testid="text-subtotal">
                  {formatCurrency(parseFloat(quotation.subtotal.toString()), quotation.currency)}
                </Typography>
              </Box>
              {parseFloat(quotation.taxAmount.toString()) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Tax:</Typography>
                  <Typography variant="body1" fontWeight="medium" data-testid="text-tax">
                    {formatCurrency(parseFloat(quotation.taxAmount.toString()), quotation.currency)}
                  </Typography>
                </Box>
              )}
              {parseFloat(quotation.shippingAmount.toString()) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Shipping:</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(parseFloat(quotation.shippingAmount.toString()), quotation.currency)}
                  </Typography>
                </Box>
              )}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary" data-testid="text-total">
                  {formatCurrency(parseFloat(quotation.total.toString()), quotation.currency)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payment Terms */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Payment Terms" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Deposit ({quotation.depositPercentage}%)
                </Typography>
                <Typography variant="h5" color="primary">
                  {formatCurrency(parseFloat(quotation.depositAmount.toString()), quotation.currency)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Due upon acceptance
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Balance
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(parseFloat(quotation.balanceAmount.toString()), quotation.currency)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Due before delivery
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isExpired && !isAccepted && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            color="success"
            startIcon={<CheckCircle />}
            onClick={() => setAcceptDialogOpen(true)}
            data-testid="button-accept-quotation"
          >
            Accept Quotation
          </Button>
          <Button
            variant="outlined"
            size="large"
            color="error"
            startIcon={<Cancel />}
            onClick={() => setRejectDialogOpen(true)}
            data-testid="button-reject-quotation"
          >
            Reject
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Download />}
            data-testid="button-download-pdf"
          >
            Download PDF
          </Button>
        </Box>
      )}

      {/* Accept Dialog */}
      <Dialog open={acceptDialogOpen} onClose={() => setAcceptDialogOpen(false)}>
        <DialogTitle>Accept Quotation?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            By accepting this quotation, you agree to the terms and will be required to pay a deposit of{' '}
            <strong>{formatCurrency(parseFloat(quotation.depositAmount.toString()), quotation.currency)}</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAcceptDialogOpen(false)} disabled={accepting}>
            Cancel
          </Button>
          <Button onClick={handleAccept} color="success" variant="contained" disabled={accepting}>
            {accepting ? 'Accepting...' : 'Accept & Proceed to Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Reject Quotation?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reject this quotation? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject Quotation
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
