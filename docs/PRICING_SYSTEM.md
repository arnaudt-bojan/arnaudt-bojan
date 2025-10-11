# Pricing System Architecture

## Overview
This document describes Upfirst's pricing system architecture, ensuring accuracy and consistency across all payment flows.

## Critical Principle
**What you see is what you charge** - The amount displayed to customers MUST exactly match what Stripe charges.

## Pricing Components

### 1. Product Prices
- Base price per item
- Multiplied by quantity
- Forms the **subtotal**

### 2. Shipping Costs
- Calculated based on seller's shipping configuration:
  - **Flat Rate**: Fixed price
  - **Shipping Matrix**: Zone-based pricing
  - **Real-time (Shippo)**: API-calculated rates
  - **Free Shipping**: $0
- **CRITICAL**: Shipping is ALWAYS included in up-front payment, even for deposits

### 3. Tax (Stripe Tax)
- Calculated automatically by Stripe Tax at checkout
- Based on:
  - Shipping address
  - Seller's tax nexus configuration (countries/states)
  - Taxable amount (product + shipping)
- **Cart Display**: 8% estimate when seller has tax enabled
- **Actual Calculation**: Stripe Tax determines real rate at payment

## Payment Flows

### Full Payment (Regular Products)
```
Subtotal:        $100.00  (products)
Shipping:        $ 15.00  (added to subtotal)
----------------------------
Taxable Amount:  $115.00  (sent to Stripe)
Tax (Stripe):    $  9.20  (8% CA rate, calculated by Stripe)
----------------------------
TOTAL CHARGED:   $124.20  (amount customer pays)
```

### Deposit Payment (Pre-Orders) - FIXED ✅
```
Product Subtotal:  $200.00
Deposit Required:  $ 50.00  (25% of products)
Shipping:          $ 20.00  (INCLUDED in deposit)
----------------------------
Deposit Total:     $ 70.00  (deposit + shipping, sent to Stripe)
Tax (Stripe):      $  5.60  (8% CA rate on $70)
----------------------------
CHARGED NOW:       $ 75.60  (deposit + shipping + tax)

Remaining Balance: $150.00  (remaining product cost, due later)
```

**Key Fix**: Shipping is now included in deposit payment, not deferred to balance payment.

### Balance Payment (Pre-Order Completion)
```
Original Total:      $200.00  (products)
Shipping (paid):     $ 20.00  (already charged with deposit)
Deposit (paid):      $ 50.00  (already charged)
----------------------------
Remaining Balance:   $150.00  (products only, no shipping)
Tax (Stripe):        $ 12.00  (8% CA rate on $150)
----------------------------
CHARGED FOR BALANCE: $162.00  (balance + tax, no shipping)
```

## Fail-Safe System

### Frontend Validation
Located in `client/src/pages/checkout.tsx`:

```typescript
// FAIL-SAFE: Validate displayed amount matches charge amount
const displayedAmount = payingDepositOnly ? depositTotal : fullTotal;
if (Math.abs(displayedAmount - amountToPay) > 0.01) {
  throw new Error(
    `PRICING ERROR: Displayed $${displayedAmount.toFixed(2)} ` +
    `does not match charge $${amountToPay.toFixed(2)}`
  );
}
```

### Backend Verification
The backend should verify:
1. Received amount matches recalculated total
2. Tax calculation is consistent
3. Platform fee is correct

## Service Architecture

### Pricing Service (`shared/pricing-service.ts`)
Centralized calculations for:
- Product subtotals
- Shipping distribution (deposit vs balance)
- Deposit calculations
- Full payment totals
- Tax estimates

### Integration Points
1. **Cart** → Displays estimates using pricing service
2. **Checkout** → Validates amounts before creating payment intent
3. **Backend** → Creates Stripe payment intent with exact amount
4. **Stripe Tax** → Calculates final tax on top of base amount
5. **Order** → Stores complete breakdown for record-keeping

## Data Flow

```
Cart Items + Shipping Config
    ↓
Pricing Service (calculation)
    ↓
Frontend Display (subtotal, shipping, deposit, total)
    ↓
Validation Check (displayed === calculated)
    ↓
Stripe Payment Intent (amount + automatic_tax)
    ↓
Stripe Tax Calculation (adds tax to amount)
    ↓
Final Charge (amount + tax)
    ↓
Order Record (stores all components)
```

## Testing Checklist

### ✅ Regular Product Purchase
- [ ] Product price × quantity = correct subtotal
- [ ] Shipping cost added to subtotal
- [ ] Tax calculated on (subtotal + shipping)
- [ ] Total displayed matches Stripe charge
- [ ] Order stores: subtotal, tax, shipping, total

### ✅ Pre-Order Deposit
- [ ] Deposit amount calculated correctly
- [ ] Shipping INCLUDED in deposit payment ⚠️
- [ ] Tax calculated on (deposit + shipping)
- [ ] Remaining balance excludes shipping ⚠️
- [ ] Total displayed matches Stripe charge

### ✅ Pre-Order Balance Payment
- [ ] Balance = (product total - deposit)
- [ ] Shipping NOT included (already paid) ⚠️
- [ ] Tax calculated on balance only
- [ ] Total displayed matches Stripe charge

### ✅ Tax Scenarios
- [ ] Tax disabled → no tax added
- [ ] Tax enabled → 8% estimate in cart
- [ ] Actual tax calculated by Stripe at checkout
- [ ] Tax breakdown stored in order

## Common Pitfalls (FIXED)

### ❌ OLD: Shipping Not Charged with Deposit
**Problem**: Customers paid deposit without shipping, causing confusion
**Fix**: Shipping now included in deposit payment (line 317-318 in checkout.tsx)

### ❌ OLD: No Pricing Validation
**Problem**: Displayed amount could differ from Stripe charge
**Fix**: Added fail-safe validation before payment intent creation (line 382-391)

### ❌ OLD: Scattered Calculations
**Problem**: Pricing logic duplicated across components
**Fix**: Centralized pricing service in `shared/pricing-service.ts`

## Monitoring & Alerts

### Log These Events
1. Payment intent creation (amount, items, shipping)
2. Tax calculation results (amount, rate, total)
3. Validation failures (displayed vs calculated mismatch)
4. Order completion (final amounts stored)

### Alert On
- Validation failures (pricing mismatch)
- Large discrepancies between estimate and actual tax
- Unusual shipping/deposit combinations

## Future Enhancements

1. **Multi-Currency**: Extend pricing service for currency conversion
2. **Discount Codes**: Add promotion calculation layer
3. **Wholesale Pricing**: B2B-specific calculation rules
4. **Platform Fees**: Transparent fee breakdown for sellers
