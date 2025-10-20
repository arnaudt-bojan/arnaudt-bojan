'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Grid,
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
} from '@mui/material';
import {
  Add,
  Delete,
  Save,
  Send,
  ArrowBack,
} from '@mui/icons-material';
import { GET_QUOTATION, UPDATE_QUOTATION, UpdateQuotationInput, Quotation } from '@/lib/graphql/trade-quotations';

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

  const { data, loading } = useQuery<{ getQuotation: Quotation }>(GET_QUOTATION, {
    variables: { id },
    skip: !id,
  });

  const [updateQuotation, { loading: saving }] = useMutation(UPDATE_QUOTATION, {
    onCompleted: () => {
      router.push('/trade/quotations');
    },
  });

  const quotation = data?.getQuotation;

  // Load existing data
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

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const depositAmount = (subtotal * depositPercentage) / 100;
  const balanceAmount = subtotal - depositAmount;

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

      {/* Quotation Header */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Quotation Details" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Buyer Email"
                type="email"
                value={quotation?.buyerEmail || ''}
                disabled
                data-testid="input-buyer-email"
              />
            </Grid>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Currency"
                value={currency}
                disabled
                data-testid="select-currency"
              />
            </Grid>
            <Grid item xs={12} md={6}>
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

      {/* Line Items Table */}
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
                  <TableCell align="right" width="20%">Total</TableCell>
                  <TableCell align="center" width="5%"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
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
                      <Typography variant="body2" fontWeight="medium" data-testid={`text-line-total-${index}`}>
                        {formatCurrency(item.unitPrice * item.quantity)}
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Payment Terms */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Payment Terms" />
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>
              Deposit Percentage: {depositPercentage}%
            </Typography>
            <Slider
              value={depositPercentage}
              onChange={(_, value) => setDepositPercentage(value as number)}
              min={10}
              max={90}
              step={5}
              marks
              valueLabelDisplay="auto"
              data-testid="slider-deposit-percentage"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Subtotal
                </Typography>
                <Typography variant="h6" data-testid="text-subtotal">
                  {formatCurrency(subtotal)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Deposit ({depositPercentage}%)
                </Typography>
                <Typography variant="h6" color="primary" data-testid="text-deposit-amount">
                  {formatCurrency(depositAmount)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Balance
                </Typography>
                <Typography variant="h6" data-testid="text-balance-amount">
                  {formatCurrency(balanceAmount)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="large"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={handleUpdate}
          disabled={saving || items.some((i) => !i.description)}
          data-testid="button-update-quotation"
        >
          Update Quotation
        </Button>
      </Box>
    </Container>
  );
}
