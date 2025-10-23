'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@/lib/apollo-client';
import { GET_CART } from '@/lib/graphql/queries/cart';
import { CREATE_ORDER } from '@/lib/graphql/mutations/orders';
import { GetCartQuery, CreateOrderMutation } from '@/lib/generated/graphql';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  Box,
  Alert,
  CircularProgress,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Skeleton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ShoppingCart,
  LocalShipping,
  Payment,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material';
import Link from 'next/link';
import { EMPTY_TOTALS } from '@/lib/shared';

// Form validation schema
const checkoutSchema = z.object({
  // Shipping address
  shippingName: z.string().min(2, 'Name is required'),
  shippingAddress: z.string().min(5, 'Address is required'),
  shippingCity: z.string().min(2, 'City is required'),
  shippingState: z.string().min(2, 'State is required'),
  shippingZip: z.string().min(5, 'ZIP code is required'),
  shippingCountry: z.string().length(2, 'Country is required'),
  shippingPhone: z.string().min(10, 'Phone number is required'),
  
  // Customer details
  customerEmail: z.string().email('Valid email is required'),
  
  // Billing same as shipping
  billingSameAsShipping: z.boolean(),
  
  // Billing address (optional if same as shipping)
  billingName: z.string().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  billingCountry: z.string().optional(),
  
  // Payment method
  paymentMethod: z.string().min(1, 'Payment method is required'),
}).refine((data) => {
  if (!data.billingSameAsShipping) {
    return (
      data.billingName &&
      data.billingAddress &&
      data.billingCity &&
      data.billingState &&
      data.billingZip &&
      data.billingCountry
    );
  }
  return true;
}, {
  message: 'All billing fields are required when not using shipping address',
  path: ['billingName'],
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

// Countries list (simplified)
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
];

// US States list (simplified)
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function CheckoutPage() {
  const router = useRouter();
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [orderError, setOrderError] = useState<string | null>(null);

  // GraphQL Query
  const { data, loading: cartLoading, error: cartError } = useQuery<GetCartQuery>(GET_CART, {
    fetchPolicy: 'network-only',
  });

  // GraphQL Mutation
  const [createOrder, { loading: creatingOrder }] = useMutation<CreateOrderMutation>(CREATE_ORDER, {
    onCompleted: (data) => {
      router.push(`/checkout/complete?orderId=${data.createOrder.id}`);
    },
    onError: (error) => {
      setOrderError(error.message);
    },
  });

  // Form handling
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingName: '',
      shippingAddress: '',
      shippingCity: '',
      shippingState: '',
      shippingZip: '',
      shippingCountry: 'US',
      shippingPhone: '',
      customerEmail: '',
      billingSameAsShipping: true,
      paymentMethod: 'stripe',
    },
  });

  const billingSameAsShipping = watch('billingSameAsShipping');

  // Form submission
  const onSubmit = async (formData: CheckoutFormData) => {
    if (!data?.cart?.id) {
      setOrderError('No cart found');
      return;
    }

    try {
      // Build shipping address
      const shippingAddress = {
        fullName: formData.shippingName,
        addressLine1: formData.shippingAddress,
        city: formData.shippingCity,
        state: formData.shippingState,
        postalCode: formData.shippingZip,
        country: formData.shippingCountry,
        phone: formData.shippingPhone,
      };

      // Build billing address
      const billingAddress = formData.billingSameAsShipping
        ? shippingAddress
        : {
            fullName: formData.billingName || '',
            addressLine1: formData.billingAddress || '',
            city: formData.billingCity || '',
            state: formData.billingState || '',
            postalCode: formData.billingZip || '',
            country: formData.billingCountry || 'US',
          };

      // Create order
      await createOrder({
        variables: {
          input: {
            cartId: data.cart.id,
            shippingAddress,
            billingAddress,
            customerEmail: formData.customerEmail,
            customerName: formData.shippingName,
          },
        },
      });
    } catch (error) {
      console.error('Order creation failed:', error);
    }
  };

  // Loading state
  if (cartLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // Error state
  if (cartError) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          Error loading cart: {cartError.message}
        </Alert>
        <Link href="/cart">
          <Button variant="contained">
            Back to Cart
          </Button>
        </Link>
      </Container>
    );
  }

  const cart = data?.cart;
  const items = cart?.items || [];
  const totals = cart?.totals || EMPTY_TOTALS;

  // Empty cart
  if (items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShoppingCart sx={{ fontSize: 120, color: 'text.secondary', mb: 3 }} />
          <Typography variant="h4" gutterBottom>
            Your cart is empty
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Add some products before checking out.
          </Typography>
          <Link href="/">
            <Button variant="contained" size="large">
              Continue Shopping
            </Button>
          </Link>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Checkout
        </Typography>
        <Link href="/cart">
          <Button
            variant="text"
            startIcon={<ArrowBack />}
            sx={{ mb: 2 }}
          >
            Back to Cart
          </Button>
        </Link>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={4}>
          {/* Left Column: Forms */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Shipping Address */}
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShipping />
                    <Typography variant="h6">Shipping Address</Typography>
                  </Box>
                }
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="shippingName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Full Name"
                          error={!!errors.shippingName}
                          helperText={errors.shippingName?.message}
                          inputProps={{ 'data-testid': 'input-shipping-name' }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="shippingAddress"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Street Address"
                          error={!!errors.shippingAddress}
                          helperText={errors.shippingAddress?.message}
                          inputProps={{ 'data-testid': 'input-shipping-address' }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="shippingCity"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="City"
                          error={!!errors.shippingCity}
                          helperText={errors.shippingCity?.message}
                          inputProps={{ 'data-testid': 'input-shipping-city' }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="shippingState"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.shippingState}>
                          <InputLabel>State</InputLabel>
                          <Select
                            {...field}
                            label="State"
                            inputProps={{ 'data-testid': 'input-shipping-state' }}
                          >
                            {US_STATES.map((state) => (
                              <MenuItem key={state} value={state}>
                                {state}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.shippingState && (
                            <FormHelperText>{errors.shippingState.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="shippingZip"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="ZIP Code"
                          error={!!errors.shippingZip}
                          helperText={errors.shippingZip?.message}
                          inputProps={{ 'data-testid': 'input-shipping-zip' }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="shippingCountry"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.shippingCountry}>
                          <InputLabel>Country</InputLabel>
                          <Select {...field} label="Country">
                            {COUNTRIES.map((country) => (
                              <MenuItem key={country.code} value={country.code}>
                                {country.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.shippingCountry && (
                            <FormHelperText>{errors.shippingCountry.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="shippingPhone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Phone Number"
                          error={!!errors.shippingPhone}
                          helperText={errors.shippingPhone?.message}
                          inputProps={{ 'data-testid': 'input-shipping-phone' }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="customerEmail"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Email Address"
                          type="email"
                          error={!!errors.customerEmail}
                          helperText={errors.customerEmail?.message}
                          inputProps={{ 'data-testid': 'input-customer-email' }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Payment />
                    <Typography variant="h6">Billing Address</Typography>
                  </Box>
                }
              />
              <CardContent>
                <Controller
                  name="billingSameAsShipping"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox {...field} checked={field.value} data-testid="checkbox-billing-same-as-shipping" />}
                      label="Same as shipping address"
                    />
                  )}
                />

                {!billingSameAsShipping && (
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid size={{ xs: 12 }}>
                      <Controller
                        name="billingName"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Full Name"
                            error={!!errors.billingName}
                            helperText={errors.billingName?.message}
                            inputProps={{ 'data-testid': 'input-billing-name' }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Controller
                        name="billingAddress"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Street Address"
                            error={!!errors.billingAddress}
                            helperText={errors.billingAddress?.message}
                            inputProps={{ 'data-testid': 'input-billing-address' }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Controller
                        name="billingCity"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="City"
                            error={!!errors.billingCity}
                            helperText={errors.billingCity?.message}
                            inputProps={{ 'data-testid': 'input-billing-city' }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Controller
                        name="billingState"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.billingState}>
                            <InputLabel>State</InputLabel>
                            <Select
                              {...field}
                              label="State"
                              inputProps={{ 'data-testid': 'input-billing-state' }}
                            >
                              {US_STATES.map((state) => (
                                <MenuItem key={state} value={state}>
                                  {state}
                                </MenuItem>
                              ))}
                            </Select>
                            {errors.billingState && (
                              <FormHelperText>{errors.billingState.message}</FormHelperText>
                            )}
                          </FormControl>
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Controller
                        name="billingZip"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="ZIP Code"
                            error={!!errors.billingZip}
                            helperText={errors.billingZip?.message}
                            inputProps={{ 'data-testid': 'input-billing-zip' }}
                          />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Controller
                        name="billingCountry"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.billingCountry}>
                            <InputLabel>Country</InputLabel>
                            <Select {...field} label="Country">
                              {COUNTRIES.map((country) => (
                                <MenuItem key={country.code} value={country.code}>
                                  {country.name}
                                </MenuItem>
                              ))}
                            </Select>
                            {errors.billingCountry && (
                              <FormHelperText>{errors.billingCountry.message}</FormHelperText>
                            )}
                          </FormControl>
                        )}
                      />
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Payment />
                    <Typography variant="h6">Payment Method</Typography>
                  </Box>
                }
              />
              <CardContent>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.paymentMethod}>
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        {...field}
                        label="Payment Method"
                        inputProps={{ 'data-testid': 'input-payment-method' }}
                      >
                        <MenuItem value="stripe">Credit/Debit Card (Stripe)</MenuItem>
                        <MenuItem value="paypal" disabled>PayPal (Coming Soon)</MenuItem>
                      </Select>
                      {errors.paymentMethod && (
                        <FormHelperText>{errors.paymentMethod.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  Your payment information is secure and encrypted.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column: Order Summary */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
              <CardHeader title="Order Summary" />
              <CardContent>
                {/* Items List */}
                <Box sx={{ mb: 3 }}>
                  {items.map((item) => (
                    <Box
                      key={item.productId}
                      sx={{ display: 'flex', gap: 2, mb: 2 }}
                      data-testid={`order-item-${item.productId}`}
                    >
                      <Avatar
                        src={item.product?.images?.[0]}
                        alt={item.product?.name}
                        variant="rounded"
                        sx={{ width: 60, height: 60 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {item.product?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Qty: {item.quantity}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          ${parseFloat(item.lineTotal).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Totals */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-order-subtotal">
                    ${parseFloat(totals.subtotal.toString()).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Tax</Typography>
                  <Typography variant="body2" fontWeight="medium" data-testid="text-order-tax">
                    ${parseFloat(totals.tax.toString()).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Shipping</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    FREE
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" fontWeight="bold" data-testid="text-order-total">
                    ${parseFloat(totals.total.toString()).toFixed(2)}
                  </Typography>
                </Box>

                {/* Error Message */}
                {orderError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {orderError}
                  </Alert>
                )}

                {/* Place Order Button */}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={creatingOrder ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                  disabled={creatingOrder}
                  data-testid="button-place-order"
                >
                  {creatingOrder ? 'Processing...' : 'Place Order'}
                </Button>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                  By placing your order, you agree to our terms and conditions.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
}
