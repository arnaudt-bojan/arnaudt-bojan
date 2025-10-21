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
import Grid from '@mui/material/Grid';
import {
  Add,
  Delete,
  Save,
  Send,
  ArrowBack,
} from '@mui/icons-material';
import {
  GET_QUOTATION,
  UPDATE_QUOTATION,
  CALCULATE_QUOTATION_TOTALS,
  UpdateQuotationInput,
  Quotation,
  CalculateQuotationTotalsInput,
  CalculatedQuotationTotals,
} from '@/lib/graphql/trade-quotations';

interface LineItem {
  description: string;
  unitPrice: number;
  quantity: number;
}

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
];

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

const mockCalculatedTotals: CalculatedQuotationTotals = {
  lineItems: [],
  subtotal: 0,
  taxAmount: 0,
  shippingAmount: 0,
  total: 0,
  depositAmount: 0,
  depositPercentage: 50,
  balanceAmount: 0,
};

export default function EditQuotation() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [currency, setCurrency] = useState('USD');
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [validUntil, setValidUntil] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', unitPrice: 0, quantity: 1 },
  ]);

  const [calculatedTotals, setCalculatedTotals] = useState<CalculatedQuotationTotals | null>(null);
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

  const [calculateTotals, { loading: calculating }] = useMutation<
    { calculateQuotationTotals: CalculatedQuotationTotals },
    { input: CalculateQuotationTotalsInput }
  >(CALCULATE_QUOTATION_TOTALS, {
    onCompleted: (data) => {
      setCalculatedTotals(data.calculateQuotationTotals);
      setCalculationError(false);
    },
    onError: (error) => {
      console.error('Failed to calculate totals:', error);
      setCalculationError(true);
      setCalculatedTotals(null);
      setSnackbar({
        open: true,
        message: 'Unable to calculate totals. Please check your connection and try again.',
        severity: 'error',
      });
    },
  });

  const [updateQuotation, { loading: saving }] = useMutation(UPDATE_QUOTATION, {
    onCompleted: () => {
      router.push('/trade/quotations');
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
            unitPrice: parseFloat(item.unitPrice.toString()),
            quantity: item.quantity,
          }))
        );
      }
    }
  }, [quotation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (items.some(item => item.description && item.quantity > 0)) {
        calculateTotals({
          variables: {
            input: {
              lineItems: items.map(item => ({
                description: item.description,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
              })),
              depositPercentage,
            },
          },
        });
      } else {
        setCalculatedTotals(null);
        setCalculationError(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [items, depositPercentage, calculateTotals]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const addRow = () => {
    setItems([...items, { description: '', unitPrice: 0, quantity: 1 }]);
  };

  const removeRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleUpdate = () => {
    const input: UpdateQuotationInput = {
      depositPercentage,
      validUntil: validUntil || undefined,
      deliveryTerms: deliveryTerms || undefined,
      items: items.map((item) => ({
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
    };

    updateQuotation({ variables: { id, input } });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  const isSent = quotation && quotation.status !== 'DRAFT';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} data-testid="page-edit-quotation">
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
          data-testid="button-back"
        >
          Back
        </Button>
        <Typography variant="h3" component="h1" gutterBottom>
          Edit Quotation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {quotation?.quotationNumber}
        </Typography>
      </Box>

      {isSent && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            This quotation has been sent to the buyer. Any changes will create a new version.
          </Typography>
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Quotation Details" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Buyer Email"
                type="email"
                value={quotation?.buyerEmail || ''}
                disabled
                data-testid="input-buyer-email"
              />
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
                label="Currency"
                value={currency}
                disabled
                data-testid="select-currency"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Delivery Terms (Incoterms)"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                data-testid="select-incoterms"
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

      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Line Items"
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={addRow}
              data-testid="button-add-row"
            >
              Add Row
            </Button>
          }
        />
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table data-testid="table-line-items">
              <TableHead>
                <TableRow>
                  <TableCell width="50%">Description</TableCell>
                  <TableCell align="right" width="15%">Quantity</TableCell>
                  <TableCell align="right" width="20%">Unit Price</TableCell>
                  <TableCell align="right" width="20%">Line Total</TableCell>
                  <TableCell align="center" width="5%"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const calculatedItem = calculatedTotals?.lineItems[index];
                  const lineTotal = calculatedItem?.lineTotal;

                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Product description..."
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          data-testid={`input-description-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          inputProps={{ min: 1, style: { textAlign: 'right' } }}
                          data-testid={`input-quantity-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                          data-testid={`input-unit-price-${index}`}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {lineTotal !== undefined ? formatCurrency(lineTotal) : '---'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => removeRow(index)}
                          disabled={items.length === 1}
                          data-testid={`button-remove-row-${index}`}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardHeader title="Payment Terms" />
            <CardContent>
              <Box sx={{ px: 2 }}>
                <Typography gutterBottom>
                  Deposit Percentage: {depositPercentage}%
                </Typography>
                <Slider
                  value={depositPercentage}
                  onChange={(_, value) => setDepositPercentage(value as number)}
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                    { value: 100, label: '100%' },
                  ]}
                  valueLabelDisplay="auto"
                  data-testid="slider-deposit"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardHeader title="Summary" />
            <CardContent>
              {calculating && (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {calculationError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Unable to calculate totals. Please check your connection and try again.
                  </Typography>
                </Alert>
              )}

              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-subtotal">
                    {calculatedTotals ? formatCurrency(calculatedTotals.subtotal) : '---'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Deposit ({calculatedTotals?.depositPercentage || depositPercentage}%)
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-deposit">
                    {calculatedTotals ? formatCurrency(calculatedTotals.depositAmount) : '---'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Balance Due
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-balance">
                    {calculatedTotals ? formatCurrency(calculatedTotals.balanceAmount) : '---'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary" data-testid="text-total">
                    {calculatedTotals ? formatCurrency(calculatedTotals.total) : '---'}
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                fullWidth
                startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                onClick={handleUpdate}
                disabled={saving || items.every(i => !i.description) || calculationError || !calculatedTotals}
                data-testid="button-update-quotation"
              >
                {saving ? 'Updating...' : 'Update Quotation'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
