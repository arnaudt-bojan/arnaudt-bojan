'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
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
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ShoppingCart,
  LocalShipping,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import {
  GET_WHOLESALE_CART,
  PLACE_WHOLESALE_ORDER,
} from '@/lib/graphql/wholesale-buyer';
import { GetWholesaleCartQuery } from '@/lib/generated/graphql';

const steps = ['Shipping Info', 'Review Order', 'Payment'];

export default function WholesaleCheckoutPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [shippingType, setShippingType] = useState('freight_collect');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    carrierName: '',
    freightAccountNumber: '',
    pickupInstructions: '',
    poNumber: '',
  });

  // Load wholesale cart
  const { data, loading: cartLoading, error: cartError } = useQuery<GetWholesaleCartQuery>(
    GET_WHOLESALE_CART,
    {
      fetchPolicy: 'network-only',
    }
  );

  // Place wholesale order mutation
  const [placeOrder, { loading: placing }] = useMutation(PLACE_WHOLESALE_ORDER, {
    onCompleted: (data) => {
      const orderId = data.placeWholesaleOrder.id;
      router.push(`/wholesale/orders/${orderId}/confirmation`);
    },
    onError: (error) => {
      setOrderError(error.message);
      console.error('Error placing wholesale order:', error);
    },
  });

  const cart = data?.getWholesaleCart;

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
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

  const handlePlaceOrder = async () => {
    if (!acceptedTerms) {
      setOrderError('Please accept the terms and conditions');
      return;
    }

    if (!cart || !cart.sellerId) {
      setOrderError('Invalid cart');
      return;
    }

    try {
      // Build shipping address
      const shippingAddress = {
        fullName: formData.contactName,
        addressLine1: formData.address,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        phone: formData.contactPhone,
      };

      // Build order items from cart
      const items = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      // Place order
      await placeOrder({
        variables: {
          input: {
            sellerId: cart.sellerId,
            items,
            shippingAddress,
            billingAddress: shippingAddress,
            poNumber: formData.poNumber || undefined,
            paymentTerms: 'Net 30',
          },
        },
      });
    } catch (error) {
      console.error('Order placement failed:', error);
    }
  };

  const isStepValid = () => {
    if (activeStep === 0) {
      return (
        formData.contactName &&
        formData.contactEmail &&
        formData.contactPhone &&
        formData.company &&
        formData.address &&
        formData.city &&
        formData.state &&
        formData.postalCode
      );
    }
    if (activeStep === 2) {
      return acceptedTerms;
    }
    return true;
  };

  // Loading state
  if (cartLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Error state
  if (cartError) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          Error loading cart: {cartError.message}
        </Alert>
      </Container>
    );
  }

  // Empty cart
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <ShoppingCart sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Your cart is empty
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Add items to your cart before checking out
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/wholesale/catalog')}
            >
              Browse Catalog
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Wholesale Checkout
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete your wholesale order
        </Typography>
      </Box>

      {/* Order Error */}
      {orderError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setOrderError(null)}>
          {orderError}
        </Alert>
      )}

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
                      control={<Radio data-testid="radio-freight-collect" />}
                      label="Freight Collect (use my freight account)"
                    />
                    <FormControlLabel
                      value="buyer_pickup"
                      control={<Radio data-testid="radio-buyer-pickup" />}
                      label="Buyer Pickup"
                    />
                  </RadioGroup>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Contact Name"
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactName: e.target.value }))
                      }
                      required
                      data-testid="input-contact-name"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Company Name"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, company: e.target.value }))
                      }
                      required
                      data-testid="input-company"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Contact Email"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))
                      }
                      required
                      data-testid="input-contact-email"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Contact Phone"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))
                      }
                      required
                      data-testid="input-contact-phone"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, address: e.target.value }))
                      }
                      required
                      data-testid="input-address"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="City"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, city: e.target.value }))
                      }
                      required
                      data-testid="input-city"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="State"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, state: e.target.value }))
                      }
                      required
                      data-testid="input-state"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      label="Postal Code"
                      value={formData.postalCode}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, postalCode: e.target.value }))
                      }
                      required
                      data-testid="input-postal-code"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="PO Number (Optional)"
                      value={formData.poNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, poNumber: e.target.value }))
                      }
                      data-testid="input-po-number"
                    />
                  </Grid>

                  {shippingType === 'freight_collect' && (
                    <>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Carrier Name"
                          value={formData.carrierName}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, carrierName: e.target.value }))
                          }
                          data-testid="input-carrier-name"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
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
                          data-testid="input-freight-account"
                        />
                      </Grid>
                    </>
                  )}

                  {shippingType === 'buyer_pickup' && (
                    <Grid size={{ xs: 12 }}>
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
                        data-testid="input-pickup-instructions"
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
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cart.items.map((item) => (
                        <TableRow key={item.id} data-testid={`row-order-item-${item.id}`}>
                          <TableCell data-testid={`text-product-name-${item.id}`}>
                            {item.productName}
                          </TableCell>
                          <TableCell align="center" data-testid={`text-quantity-${item.id}`}>
                            {item.quantity}
                          </TableCell>
                          <TableCell align="right" data-testid={`text-unit-price-${item.id}`}>
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="medium" data-testid={`text-subtotal-${item.id}`}>
                              {formatCurrency(item.lineTotal)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Divider sx={{ my: 3 }} />

                <Alert severity="info" data-testid="alert-order-info">
                  <Typography variant="body2">
                    Review your order details before proceeding to payment.
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
                    Wholesale Payment Terms
                  </Typography>
                  <Typography variant="body2" data-testid="text-deposit-info">
                    Payment terms will be Net 30. Order will be processed upon confirmation.
                  </Typography>
                </Alert>

                <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.default' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Payment Method
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Stripe payment integration for deposit (if required by seller)
                    </Typography>
                  </CardContent>
                </Card>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      data-testid="checkbox-accept-terms"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I accept the wholesale terms and conditions
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
              data-testid="button-back"
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isStepValid() || placing}
              fullWidth
              data-testid="button-next"
            >
              {placing ? (
                <CircularProgress size={24} />
              ) : activeStep === steps.length - 1 ? (
                'Place Order'
              ) : (
                'Continue'
              )}
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
                  <Typography variant="body2" fontWeight="medium" data-testid="text-summary-subtotal">
                    {formatCurrency(cart.subtotal)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Items
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {cart.itemCount}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="h6">
                    Total
                  </Typography>
                  <Typography variant="h6" color="primary" data-testid="text-summary-total">
                    {formatCurrency(cart.subtotal)}
                  </Typography>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  Payment terms: Net 30. Final pricing and deposit requirements will be confirmed by seller.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}
