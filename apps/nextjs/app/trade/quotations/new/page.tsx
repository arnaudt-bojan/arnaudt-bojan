'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
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
} from '@mui/material';
import {
  Add,
  Delete,
  Save,
  Send,
  ArrowBack,
} from '@mui/icons-material';
import { CREATE_QUOTATION, CreateQuotationInput } from '@/lib/graphql/trade-quotations';

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

export default function QuotationBuilder() {
  const router = useRouter();
  const [buyerEmail, setBuyerEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [validUntil, setValidUntil] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', unitPrice: 0, quantity: 1 },
  ]);

  const [createQuotation, { loading: saving }] = useMutation(CREATE_QUOTATION, {
    onCompleted: (data) => {
      router.push('/trade/quotations');
    },
  });

  // Calculate totals (client-side for display, but server will recalculate)
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

  const handleSave = (asDraft: boolean) => {
    const input: CreateQuotationInput = {
      buyerEmail,
      currency,
      depositPercentage,
      validUntil: validUntil || undefined,
      deliveryTerms: deliveryTerms || undefined,
      items: items.map((item) => ({
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
    };

    createQuotation({ variables: { input } });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} data-testid="page-quotation-builder">
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
          Create New Quotation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Build a professional quotation for your buyer
        </Typography>
      </Box>

      {/* Quotation Header */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Quotation Details" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Buyer Email"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
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
                select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                data-testid="select-currency"
              >
                {CURRENCIES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
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
          startIcon={<Save />}
          onClick={() => handleSave(true)}
          disabled={saving || !buyerEmail || items.some((i) => !i.description)}
          data-testid="button-save-draft"
        >
          Save as Draft
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<Send />}
          onClick={() => handleSave(false)}
          disabled={saving || !buyerEmail || items.some((i) => !i.description)}
          data-testid="button-send-quotation"
        >
          Send to Buyer
        </Button>
      </Box>
    </Container>
  );
}
