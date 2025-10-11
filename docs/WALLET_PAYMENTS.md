# Wallet Payment Methods - Complete Implementation Guide

## Overview
Upfirst now supports one-click wallet payments including **Apple Pay**, **Google Pay**, and **Link** (Stripe's payment solution). This provides customers with a fast, secure checkout experience using payment methods and addresses saved in their digital wallets.

## Implementation Status
✅ **FULLY IMPLEMENTED** - Production-ready with all critical fixes applied

## Features

### Dual Payment Flow
The checkout page offers two payment options:

1. **Express Checkout Element** (Top)
   - One-click payment with Apple Pay, Google Pay, or Link
   - Automatically captures shipping address from wallet
   - No need to fill out customer details form manually
   - Preferred method for customers with saved wallet data

2. **PaymentElement** (Bottom)
   - Traditional card entry
   - Wallet options available in tabs (if supported)
   - Fallback for customers without wallet setup

### Supported Payment Methods
- **Apple Pay**: Available on Safari (iOS 10+, macOS Sierra+), Chrome/Edge on macOS
- **Google Pay**: Available on Chrome, Edge, and Chromium browsers
- **Link**: Stripe's one-click payment (cross-browser)
- **Credit Cards**: Always available as fallback

## Technical Architecture

### Frontend Implementation
**File**: `client/src/pages/checkout.tsx`

#### Express Checkout Component
```typescript
<ExpressCheckoutElement
  onConfirm={handleExpressCheckout}
  onReady={() => setIsReady(true)}
  options={{
    buttonType: {
      applePay: 'buy',
      googlePay: 'buy',
    },
    buttonTheme: {
      applePay: 'black',
      googlePay: 'black',
    },
    buttonHeight: 48,
  }}
/>
```

#### Payment Flow Sequence
1. **Prevent Auto-Confirmation**
   ```typescript
   event.preventDefault(); // CRITICAL for async operations
   ```

2. **Validate Elements**
   ```typescript
   const { error: submitError } = await elements.submit();
   ```

3. **Extract Wallet Data**
   ```typescript
   const shippingAddress = event.shippingAddress || event.address || {};
   const walletData = {
     customerName: event.name || event.payerName,
     customerEmail: event.email || event.payerEmail,
     customerAddress: { /* extracted from shippingAddress */ },
     phone: event.phone || shippingAddress.phone,
   };
   ```

4. **Update PaymentIntent with Wallet Address**
   ```typescript
   await apiRequest("POST", `/api/payment-intent/${paymentIntentId}/update-address`, {
     address: walletData.customerAddress,
     email: walletData.customerEmail,
     name: walletData.customerName,
     phone: walletData.phone,
   });
   ```

5. **Confirm Payment**
   ```typescript
   const { error, paymentIntent } = await event.confirm({
     elements,
     clientSecret,
     confirmParams: {
       return_url: window.location.origin + '/checkout/complete',
     },
     redirect: 'if_required',
   });
   ```

6. **Fetch Tax Data & Create Order**
   ```typescript
   const taxData = await apiRequest("GET", `/api/payment-intent/${paymentIntent.id}/tax-data`);
   const order = await apiRequest("POST", "/api/orders", { ...orderData, ...taxData });
   ```

#### PaymentElement Configuration
```typescript
<PaymentElement 
  options={{
    layout: { type: 'tabs' },
    wallets: {
      applePay: 'auto', // ✅ Enabled - shows if available
      googlePay: 'auto', // ✅ Enabled - shows if available
    },
  }}
/>
```

### Backend Implementation
**File**: `server/routes.ts`

#### Update PaymentIntent with Wallet Address
**Endpoint**: `POST /api/payment-intent/:paymentIntentId/update-address`

**Purpose**: Updates PaymentIntent with wallet-provided shipping address BEFORE payment confirmation to ensure accurate tax calculation.

```typescript
app.post("/api/payment-intent/:paymentIntentId/update-address", async (req, res) => {
  const { address, email, name, phone } = req.body;

  // Defensive validation
  if (!address || typeof address !== 'object') {
    return res.status(400).json({ error: "Invalid address data" });
  }

  if (!address.country || !address.postalCode) {
    return res.status(400).json({ error: "Country and postal code are required for tax calculation" });
  }

  // Update PaymentIntent
  await stripe.paymentIntents.update(paymentIntentId, {
    shipping: {
      name: name || "Customer",
      phone: phone || undefined,
      address: {
        line1: address.line1 || "",
        line2: address.line2 || undefined,
        city: address.city || "",
        state: address.state || "",
        postal_code: address.postalCode || "",
        country: address.country || "",
      },
    },
    receipt_email: email || undefined,
  });

  res.json({ success: true });
});
```

**Validation Rules**:
- Address must be an object
- Country is required for tax calculation
- Postal code is required for tax calculation
- Returns 400 errors for invalid data (not 500)

#### Retrieve Tax Data
**Endpoint**: `GET /api/payment-intent/:paymentIntentId/tax-data`

Fetches tax data after payment confirmation (with wallet-updated address).

## Security Considerations

### ✅ All Issues Fixed
1. **No Race Conditions**: `event.preventDefault()` prevents auto-confirmation
2. **Single Confirmation Path**: Uses `event.confirm()` exclusively (no double-confirmation)
3. **Validated Address Updates**: PaymentIntent updated before payment confirmation
4. **Accurate Tax Calculation**: Taxes calculated with correct wallet-provided address
5. **Proper Error Handling**: Defensive validation at all stages

### Data Flow Security
- Customer never supplies prices or totals (server-calculated)
- Address extracted from authenticated wallet (Apple/Google/Stripe)
- PaymentIntent updated server-side before confirmation
- Tax calculation uses verified shipping address

## Production Deployment

### Domain Verification Required
For production, you must verify your domain with Apple Pay and Google Pay:

1. **Stripe Dashboard**
   - Go to Settings → Payment Methods → Apple Pay
   - Add your domain
   - Download verification file
   - Host at: `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`

2. **Google Pay**
   - Enable in Stripe Dashboard
   - Configure Fraud Liability Protection (recommended)

3. **Test Mode**
   - Works in Replit development environment
   - Wallet buttons may not appear without domain verification
   - Test card (4242...) always works

### Environment Configuration
```env
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx  # Production publishable key
STRIPE_SECRET_KEY=sk_live_xxx       # Production secret key
```

## Testing

### Local Testing
1. Wallet buttons may not appear in test mode without domain verification
2. Use test card: `4242 4242 4242 4242` with any future expiry and CVC
3. Test the UI structure (Express Checkout section, dividers, PaymentElement)

### Production Testing
1. Use actual Apple Pay/Google Pay on supported devices
2. Verify wallet address extraction and tax calculation
3. Confirm order creation with wallet-provided data

### Test Scenarios
- ✅ Express Checkout with Apple Pay (if available)
- ✅ Express Checkout with Google Pay (if available)
- ✅ Express Checkout with Link
- ✅ PaymentElement wallet tabs
- ✅ Traditional card payment (fallback)
- ✅ Address extraction from different wallet formats
- ✅ Tax calculation with wallet address
- ✅ Order creation with wallet data

## UI/UX Details

### Visual Structure
```
Payment Section:
├── Express Checkout Element (top)
│   ├── Divider: "Express Checkout"
│   ├── Wallet buttons (Apple Pay, Google Pay, Link)
│   └── Divider: "Or pay with card"
└── PaymentElement (bottom)
    ├── Card tab (default)
    └── Wallet tabs (if available)
```

### User Experience
1. Customer fills shipping details
2. Clicks "Continue to Payment"
3. Sees Express Checkout buttons at top
4. Can choose:
   - One-click wallet payment (top) - uses saved address
   - Traditional card entry (bottom) - manual entry

### Mobile Optimization
- Wallet buttons sized for touch (48px height)
- Black theme for better visibility
- Responsive layout on all devices

## Monitoring & Debugging

### Logs to Monitor
```typescript
// Successful wallet payment
logger.info(`[Express Checkout] Updated PaymentIntent ${paymentIntentId} with wallet address`, {
  city: address.city,
  state: address.state,
  country: address.country,
});

// Tax calculation
logger.info(`[Stripe Tax] Retrieved tax data for payment ${paymentIntentId}: ${taxAmount > 0 ? `$${taxAmount} tax collected` : 'no tax'}`, {
  taxAmount,
  calculationId: taxData.taxCalculationId,
  hasBreakdown: !!taxData.taxBreakdown
});
```

### Common Issues

1. **Wallet buttons don't appear**
   - Domain not verified with Apple/Google
   - Test mode without verification
   - Browser doesn't support wallet
   - **Solution**: Verify domain or use test card

2. **Tax calculation incorrect**
   - Address not updated before payment
   - Missing country/postal code
   - **Solution**: Check update-address endpoint logs

3. **Payment fails**
   - Stripe capability error
   - Invalid wallet data
   - Network timeout
   - **Solution**: Check Stripe Connect setup and error logs

### Error Codes
- `400`: Invalid address data or missing required fields
- `500`: Stripe API error or server issue
- `STRIPE_CAPABILITY_ERROR`: Seller hasn't completed Stripe setup

## Future Enhancements

### Optional Improvements
1. **Skip Manual Form**: Allow wallet payment without filling shipping form
2. **Saved Addresses**: Integrate with saved addresses system
3. **Multiple Currencies**: Support wallet payments in seller's currency
4. **Analytics**: Track wallet payment adoption rates

## References

- [Stripe Express Checkout Element Docs](https://docs.stripe.com/elements/express-checkout-element)
- [Apple Pay Integration](https://docs.stripe.com/apple-pay)
- [Google Pay Integration](https://docs.stripe.com/google-pay)
- [Payment Request Button (Legacy)](https://docs.stripe.com/stripe-js/elements/payment-request-button)

## Implementation History

### October 11, 2025
- **FULL IMPLEMENTATION**: Complete wallet payment support
- Added Express Checkout Element for one-click payments
- Enabled wallet tabs in PaymentElement (applePay: 'auto', googlePay: 'auto')
- Implemented address extraction from wallets
- Created update-address endpoint with validation
- Fixed race conditions with event.preventDefault()
- Fixed payment flow to use event.confirm()
- Architect approved all critical fixes
- See: `client/src/pages/checkout.tsx`, `server/routes.ts`, `replit.md`
