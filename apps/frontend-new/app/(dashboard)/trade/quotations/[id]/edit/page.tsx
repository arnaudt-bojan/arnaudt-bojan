'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  MenuItem,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Slider,
  Alert,
  Divider,
  Skeleton,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Add,
  Delete,
  Save,
  ArrowBack,
} from '@mui/icons-material';
import {
  GET_QUOTATION,
  UPDATE_QUOTATION,
  UpdateQuotationInput,
  Quotation,
} from '@/lib/graphql/trade';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '@upfirst/shared';
import DashboardLayout from '@/components/DashboardLayout';

interface LineItem {
  description: string;
  unitPrice: number;
  quantity: number;
}

const CURRENCY_LABELS: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
};

const CURRENCIES = SUPPORTED_CURRENCIES.map(curr => ({
  value: curr.code,
  label: `${curr.code} - ${CURRENCY_LABELS[curr.code] || curr.code}`
}));

const INCOTERMS = [
  { value: 'EXW', label: 'EXW - Ex Works' },
  { value: 'FOB', label: 'FOB - Free On Board' },
  { value: 'CIF', label: 'CIF - Cost, Insurance, Freight' },
  { value: 'DDP', label: 'DDP - Delivered Duty Paid' },
  { value: 'DAP', label: 'DAP - Delivered at Place' },
  { value: 'FCA', label: 'FCA - Free Carrier' },
  { value: 'CPT', label: 'CPT - Carriage Paid To' },
  { value: 'Other', label: 'Other' },
];

interface CalculatedTotals {
  subtotal: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
  lineItems: Array<{ lineTotal: number }>;
  depositPercentage: number;
}

export default function EditQuotation() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [validUntil, setValidUntil] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', unitPrice: 0, quantity: 1 },
  ]);

  const [calculatedTotals, setCalculatedTotals] = useState<CalculatedTotals | null>(null);
  const [calculationError, setCalculationError] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error' as 'error' | 'success' | 'info' | 'warning',
  });

  const { data, loading } = useQuery<{ getQuotation: Quotation }>(GET_QUOTATION, {
    variables: { id },
    skip: !id,
  });

  const calculating = false;

  const [updateQuotation, { loading: saving }] = useMutation(UPDATE_QUOTATION, {
    onCompleted: () => {
      router.push('/trade/quotations');
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update quotation',
        severity: 'error',
      });
    },
  });

  const quotation = data?.getQuotation;

  useEffect(() => {
    if (quotation) {
      setCurrency(quotation.currency);
      setDepositPercentage(quotation.depositPercentage);
      setValidUntil(quotation.validUntil ? quotation.validUntil.split('T')[0] : '');
      setDeliveryTerms(quotation.deliveryTerms || '');
      if (quotation.items && quotation.items.length > 0) {
        setItems(
          quotation.items.map((item) => ({
            description: item.description,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          }))
        );
      }
      calculateTotalsLocally();
    }
  }, [quotation]);

  const calculateTotalsLocally = () => {
    const lineItems = items.map(item => ({
      ...item,
      lineTotal: item.unitPrice * item.quantity,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = subtotal;
    const depositAmount = (total * depositPercentage) / 100;
    const balanceAmount = total - depositAmount;

    const totals: CalculatedTotals = {
      lineItems,
      subtotal,
      total,
      depositAmount,
      depositPercentage,
      balanceAmount,
    };

    setCalculatedTotals(totals);
    setCalculationError(false);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', unitPrice: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'unitPrice' || field === 'quantity') {
      newItems[index][field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
    } else {
      newItems[index][field] = value as string;
    }
    setItems(newItems);
    calculateTotalsLocally();
  };

  const handleDepositChange = (_event: Event, value: number | number[]) => {
    const newPercentage = typeof value === 'number' ? value : value[0];
    setDepositPercentage(newPercentage);
    calculateTotalsLocally();
  };

  const handleSubmit = async () => {
    if (items.some(item => !item.description || item.quantity <= 0)) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    const input: UpdateQuotationInput = {
      depositPercentage,
      validUntil: validUntil || undefined,
      deliveryTerms: deliveryTerms || undefined,
      items: items.map(item => ({
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
    };

    await updateQuotation({ variables: { id, input } });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Quotation">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={400} />
        </Container>
      </DashboardLayout>
    );
  }

  if (!quotation) {
    return (
      <DashboardLayout title="Edit Quotation">
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error">Quotation not found</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Quotation">
      <Container maxWidth="xl" sx={{ py: 4 }} data-testid="page-edit-quotation">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom data-testid="text-page-title">
              Edit Quotation
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {quotation.quotationNumber}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => router.push('/trade/quotations')}
            data-testid="button-back"
          >
            Back
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ mb: 3 }}>
              <CardHeader title={<Typography variant="h6">Quotation Details</Typography>} />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      disabled
                      label="Buyer Email"
                      value={quotation.buyerEmail}
                      data-testid="input-buyer-email"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      disabled
                      select
                      label="Currency"
                      value={currency}
                      data-testid="select-currency"
                    >
                      {CURRENCIES.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Valid Until"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      data-testid="input-valid-until"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      select
                      label="Delivery Terms (Incoterms)"
                      value={deliveryTerms}
                      onChange={(e) => setDeliveryTerms(e.target.value)}
                      data-testid="select-delivery-terms"
                    >
                      {INCOTERMS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title={<Typography variant="h6">Line Items</Typography>}
                action={
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleAddItem}
                    data-testid="button-add-item"
                  >
                    Add Item
                  </Button>
                }
              />
              <CardContent>
                <TableContainer component={Paper} variant="outlined" data-testid="table-line-items">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell width="40%">Description</TableCell>
                        <TableCell width="20%" align="right">Unit Price</TableCell>
                        <TableCell width="15%" align="right">Quantity</TableCell>
                        <TableCell width="20%" align="right">Line Total</TableCell>
                        <TableCell width="5%"></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index} data-testid={`row-item-${index}`}>
                          <TableCell>
                            <TextField
                              fullWidth
                              size="small"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="Enter description"
                              data-testid={`input-description-${index}`}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              inputProps={{ min: 0, step: 0.01 }}
                              data-testid={`input-unit-price-${index}`}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              inputProps={{ min: 1 }}
                              data-testid={`input-quantity-${index}`}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveItem(index)}
                              disabled={items.length === 1}
                              data-testid={`button-remove-item-${index}`}
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
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardHeader title={<Typography variant="h6">Quotation Summary</Typography>} />
              <CardContent>
                {calculationError && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Unable to calculate totals. Using local calculation.
                  </Alert>
                )}

                {calculating ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : calculatedTotals ? (
                  <Box data-testid="summary-totals">
                    <Box sx={{ mb: 3 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Subtotal:</Typography>
                        <Typography variant="body2" data-testid="text-subtotal">
                          {formatCurrency(calculatedTotals.subtotal)}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography variant="h6">Total:</Typography>
                        <Typography variant="h6" data-testid="text-total">
                          {formatCurrency(calculatedTotals.total)}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" gutterBottom>
                        Deposit Percentage: {depositPercentage}%
                      </Typography>
                      <Slider
                        value={depositPercentage}
                        onChange={handleDepositChange}
                        min={0}
                        max={100}
                        step={5}
                        marks
                        valueLabelDisplay="auto"
                        data-testid="slider-deposit"
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Deposit ({depositPercentage}%):</Typography>
                        <Typography variant="body2" fontWeight="medium" data-testid="text-deposit">
                          {formatCurrency(calculatedTotals.depositAmount)}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Balance:</Typography>
                        <Typography variant="body2" data-testid="text-balance">
                          {formatCurrency(calculatedTotals.balanceAmount)}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<Save />}
                      onClick={handleSubmit}
                      disabled={saving}
                      data-testid="button-save-quotation"
                    >
                      {saving ? 'Saving...' : 'Update Quotation'}
                    </Button>
                  </Box>
                ) : (
                  <Alert severity="info">
                    Add line items to see quotation summary
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}
