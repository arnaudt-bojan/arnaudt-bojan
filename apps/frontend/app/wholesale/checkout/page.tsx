'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  TextField,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ShoppingCart,
  LocalShipping,
  Payment as PaymentIcon,
  CheckCircle,
} from '@mui/icons-material';

// Mock cart data (would come from GraphQL)
const mockOrderData = {
  items: [
    {
      id: '1',
      productName: 'Premium Wholesale T-Shirt',
      quantity: 15,
      moq: 10,
      unitPriceCents: 1250,
      subtotalCents: 18750,
    },
    {
      id: '2',
      productName: 'Classic Wholesale Jeans',
      quantity: 8,
      moq: 5,
      unitPriceCents: 3500,
      subtotalCents: 28000,
    },
  ],
  subtotalCents: 46750, // Server-calculated
  depositPercentage: 30, // Server-calculated
  depositAmountCents: 14025, // Server-calculated
  balanceDueCents: 32725, // Server-calculated
  totalCents: 46750, // Server-calculated
  currency: 'USD',
  paymentTerms: 'Net 30',
};

const steps = ['Shipping Info', 'Review Order', 'Payment'];

export default function WholesaleCheckoutPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [shippingType, setShippingType] = useState('freight_collect');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    company: '',
    carrierName: '',
    freightAccountNumber: '',
    pickupInstructions: '',
  });

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handlePlaceOrder();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handlePlaceOrder = () => {
    if (!acceptedTerms) {
      alert('Please accept the terms and conditions');
      return;
    }
    // In real implementation, would call GraphQL mutation
    const orderId = 'WHS-' + Date.now();
    router.push(`/wholesale/orders/${orderId}/confirmation`);
  };

  const isStepValid = () => {
    if (activeStep === 0) {
      return (
        formData.contactName &&
        formData.contactEmail &&
        formData.contactPhone &&
        formData.company
      );
    }
    if (activeStep === 2) {
      return acceptedTerms;
    }
    return true;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Wholesale Checkout
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete your wholesale order
        </Typography>
      </Box>

      {/* Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { md: '2fr 1fr' } }}>
        {/* Main Content */}
        <Box>
          {/* Step 1: Shipping Info */}
          {activeStep === 0 && (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <LocalShipping color="primary" />
                  <Typography variant="h6">Shipping Information</Typography>
                </Box>

                <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Shipping Type
                  </Typography>
                  <RadioGroup
                    value={shippingType}
                    onChange={(e) => setShippingType(e.target.value)}
                  >
                    <FormControlLabel
                      value="freight_collect"
                      control={<Radio />}
                      label="Freight Collect (use my freight account)"
                    />
                    <FormControlLabel
                      value="buyer_pickup"
                      control={<Radio />}
                      label="Buyer Pickup"
                    />
                  </RadioGroup>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Contact Name"
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactName: e.target.value }))
                      }
                      required
                    />
                  </Grid>
                  <Grid xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Company Name"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, company: e.target.value }))
                      }
                      required
                    />
                  </Grid>
                  <Grid xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Contact Email"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))
                      }
                      required
                    />
                  </Grid>
                  <Grid xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Contact Phone"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))
                      }
                      required
                    />
                  </Grid>

                  {shippingType === 'freight_collect' && (
                    <>
                      <Grid xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Carrier Name"
                          value={formData.carrierName}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, carrierName: e.target.value }))
                          }
                        />
                      </Grid>
                      <Grid xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Freight Account Number"
                          value={formData.freightAccountNumber}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              freightAccountNumber: e.target.value,
                            }))
                          }
                        />
                      </Grid>
                    </>
                  )}

                  {shippingType === 'buyer_pickup' && (
                    <Grid xs={12}>
                      <TextField
                        fullWidth
                        label="Pickup Instructions"
                        multiline
                        rows={3}
                        value={formData.pickupInstructions}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            pickupInstructions: e.target.value,
                          }))
                        }
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Review Order */}
          {activeStep === 1 && (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <ShoppingCart color="primary" />
                  <Typography variant="h6">Review Your Order</Typography>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">MOQ</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockOrderData.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="center">{item.moq}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.unitPriceCents)}
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="medium">
                              {formatCurrency(item.subtotalCents)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Divider sx={{ my: 3 }} />

                <Alert severity="info">
                  <Typography variant="body2">
                    All MOQ requirements have been met for this order.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment */}
          {activeStep === 2 && (
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={3}>
                  <PaymentIcon color="primary" />
                  <Typography variant="h6">Payment Information</Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Deposit Payment Required
                  </Typography>
                  <Typography variant="body2">
                    A {mockOrderData.depositPercentage}% deposit of{' '}
                    <strong>{formatCurrency(mockOrderData.depositAmountCents)}</strong> is
                    required to place this order. The remaining balance will be due according to
                    the payment terms ({mockOrderData.paymentTerms}).
                  </Typography>
                </Alert>

                <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.default' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Payment Method
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Stripe payment integration would be here
                    </Typography>
                  </CardContent>
                </Card>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I accept the wholesale terms and conditions and agree to pay the deposit
                    </Typography>
                  }
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepValid()}
              fullWidth
            >
              {activeStep === steps.length - 1 ? 'Place Order & Pay Deposit' : 'Continue'}
            </Button>
          </Box>
        </Box>

        {/* Order Summary Sidebar */}
        <Box>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>

              <Box sx={{ my: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(mockOrderData.subtotalCents)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Deposit ({mockOrderData.depositPercentage}%)
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" color="primary">
                    {formatCurrency(mockOrderData.depositAmountCents)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Balance Due ({mockOrderData.paymentTerms})
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(mockOrderData.balanceDueCents)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="h6">
                    Total Order Value
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(mockOrderData.totalCents)}
                  </Typography>
                </Box>
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  You will pay the deposit amount now. The balance will be due in 30 days.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
