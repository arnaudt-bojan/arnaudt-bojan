# Pre-Order Payment Flow

## Overview
Pre-order products use a two-payment system: an initial deposit and a balance payment when the item is ready to ship. This document explains the best-practice payment flow implemented in Upfirst.

## Payment Philosophy

### Industry Best Practice
**Shipping and tax should be charged when the item ships, NOT with the deposit.**

**Why?**
- Pre-orders can ship months after the deposit
- Shipping costs may change by ship date
- Tax rates may change
- Customers expect to pay shipping when item actually ships
- Prevents charging for shipping that hasn't happened yet

### What Customers See

**Initial Invoice (Full Transparency)**
```
Product Deposit:        $50.00
Shipping (due later):   $10.00  ← Shown but not charged yet
Tax on Deposit:         $4.00   ← Only on deposit amount
―――――――――――――――――――――――――――――――
TOTAL ORDER VALUE:      $110.00
CHARGE TODAY:           $54.00  ← Deposit + tax on deposit
BALANCE DUE LATER:      $56.00  ← Remaining + shipping + tax
```

**Balance Invoice (When Ready to Ship)**
```
Remaining Product Cost: $50.00
Shipping:              $10.00   ← Charged when shipping
Tax on Balance:        $4.80   ← Tax on (remaining + shipping)
―――――――――――――――――――――――――――――――
CHARGE TODAY:          $64.80
```

## Implementation

### Pricing Calculation

```typescript
// Calculate pricing with shipping in BALANCE (default)
const pricing = calculatePricing(
  items,
  shippingCost,
  0,     // taxAmount (will be calculated separately)
  false  // includeShippingInDeposit = false (default)
);

// Result for pre-order:
{
  subtotal: 100,              // Full product price
  depositAmount: 50,          // Product deposit
  shippingCost: 10,           // Full shipping cost
  shippingInDeposit: 0,       // $0 shipping in deposit
  shippingInBalance: 10,      // $10 shipping in balance
  depositTotal: 50,           // Deposit only (no shipping)
  fullTotal: 110,             // Product + shipping
  remainingBalance: 60,       // Remaining product + shipping
  amountToCharge: 50,         // Charge deposit only
  taxableAmount: 50,          // Tax on deposit only
  taxAmount: 0,               // Tax (calculated separately)
  totalWithTax: 50,           // Total with tax
}
```

### Tax Calculation

**Initial Payment (Deposit):**
- Tax calculated on: Deposit amount ONLY
- Example: $50 deposit × 8% = $4.00 tax
- Customer pays: $54.00 total

**Balance Payment (When Shipping):**
- Tax calculated on: Remaining product cost + Shipping
- Example: ($50 remaining + $10 shipping) × 8% = $4.80 tax
- Customer pays: $64.80 total

### Order Flow

**1. Initial Checkout (Deposit Payment)**
```typescript
// Customer places pre-order
POST /api/orders/calculate
{
  "items": [{ "productId": "123", "quantity": 1 }],
  "destination": { "country": "US", "state": "CA" }
}

// Response shows full breakdown
{
  "depositTotal": 50.00,
  "taxAmount": 4.00,          // Tax on deposit only
  "amountToCharge": 54.00,    // What customer pays now
  "remainingBalance": 60.00,  // What's due later (product + shipping)
  "shippingInBalance": 10.00, // Shipping charged with balance
  "paymentType": "deposit"
}

// Create order with deposit payment
POST /api/orders
// Stripe charges: $54.00 (deposit + tax)
// Order stored with remainingBalance: $60.00
```

**2. Balance Payment (When Ready to Ship)**
```typescript
// Seller marks order ready to ship
// System calculates balance payment

const balanceAmount = order.remainingBalance; // $60.00
const balanceTax = balanceAmount * 0.08;      // $4.80
const totalBalanceCharge = 64.80;

// Create Stripe payment intent for balance
stripe.paymentIntents.create({
  amount: 6480, // cents
  description: "Balance payment for Order #123"
});

// After payment:
// - Update order.amountPaid
// - Set order.paymentStatus = "completed"
// - Ship the item
```

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  
  -- Order totals
  total VARCHAR NOT NULL,              -- Full order total (product + shipping)
  subtotal_before_tax VARCHAR,         -- Product subtotal only
  
  -- Payment tracking
  amount_paid VARCHAR DEFAULT '0',     -- Amount paid so far
  remaining_balance VARCHAR DEFAULT '0', -- Amount still due
  payment_type VARCHAR DEFAULT 'full', -- 'full' or 'deposit'
  payment_status VARCHAR DEFAULT 'pending',
  
  -- Tax
  tax_amount VARCHAR,                  -- Tax on what was charged
  
  -- Items (JSON)
  items TEXT NOT NULL,                 -- Includes deposit info per item
  
  -- Status
  status VARCHAR DEFAULT 'pending'
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id VARCHAR PRIMARY KEY,
  order_id VARCHAR NOT NULL,
  
  -- Product info
  product_id VARCHAR NOT NULL,
  product_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL,
  price VARCHAR NOT NULL,
  
  -- Deposit tracking
  deposit_amount VARCHAR,              -- Deposit amount per item
  requires_deposit INTEGER DEFAULT 0,  -- 1 if deposit required
  
  -- Item status (independent tracking)
  item_status VARCHAR DEFAULT 'pending'
);
```

## Example Scenarios

### Scenario 1: Single Pre-Order Item

**Product:**
- Full price: $100
- Deposit: $50
- Shipping: $15

**Initial Payment:**
```
Deposit:     $50.00
Tax (8%):    $4.00
―――――――――――――――――――
CHARGE:      $54.00

Balance Due: $65.00 (remaining $50 + shipping $15)
```

**Balance Payment (Later):**
```
Remaining:   $50.00
Shipping:    $15.00
Tax (8%):    $5.20
―――――――――――――――――――
CHARGE:      $70.20
```

### Scenario 2: Pre-Order + Regular Item (Mixed Cart)

**Not Supported** - Cart validation enforces single product type.
Pre-orders and regular items must be purchased separately.

### Scenario 3: Multiple Pre-Order Items (Same Seller)

**Products:**
- Item A: $100 (deposit $50)
- Item B: $80 (deposit $40)
- Shipping: $20

**Initial Payment:**
```
Deposits:    $90.00 ($50 + $40)
Tax (8%):    $7.20
―――――――――――――――――――
CHARGE:      $97.20

Balance Due: $110.00 (remaining $90 + shipping $20)
```

**Balance Payment:**
```
Remaining:   $90.00
Shipping:    $20.00
Tax (8%):    $8.80
―――――――――――――――――――
CHARGE:      $118.80
```

## API Reference

### Calculate Order Summary
`POST /api/orders/calculate`

**Request:**
```json
{
  "items": [
    { "productId": "123", "quantity": 1 }
  ],
  "destination": {
    "country": "US",
    "state": "CA",
    "postalCode": "94102"
  }
}
```

**Response (Pre-Order):**
```json
{
  "subtotal": 100.00,
  "shippingCost": 10.00,
  "depositAmount": 50.00,
  "depositTotal": 50.00,
  "fullTotal": 110.00,
  "remainingBalance": 60.00,
  "taxAmount": 4.00,
  "total": 54.00,
  "paymentType": "deposit",
  "payingDepositOnly": true,
  "shippingInDeposit": 0.00,
  "shippingInBalance": 10.00
}
```

### Create Order
`POST /api/orders`

**Request:**
```json
{
  "customerEmail": "buyer@example.com",
  "customerName": "John Doe",
  "customerAddress": "123 Main St, SF, CA 94102",
  "items": [
    { "productId": "123", "quantity": 1 }
  ],
  "destination": {
    "country": "US",
    "state": "CA",
    "postalCode": "94102"
  }
}
```

**Response:**
```json
{
  "id": "order_123",
  "total": "110.00",
  "amountPaid": "0",
  "remainingBalance": "60.00",
  "paymentType": "deposit",
  "paymentStatus": "pending",
  "taxAmount": "4.00",
  "status": "pending"
}
```

## UI/UX Recommendations

### Checkout Page
```
🛒 Order Summary

Pre-Order Item: Custom Sneakers    $100.00
  ↳ Deposit (50%):                   $50.00
  ↳ Remaining (due when ships):      $50.00

Shipping (charged when ships):       $10.00
Tax (on deposit):                     $4.00
―――――――――――――――――――――――――――――――――――――――
💳 CHARGE TODAY:                      $54.00
📦 BALANCE DUE WHEN SHIPS:           $60.00

ℹ️ You'll pay shipping when your item is ready to ship
```

### Order Confirmation
```
✅ Order Confirmed!

Order #12345
Deposit Payment: $54.00 ✓ Paid

📋 Full Order Details:
Product Deposit:     $50.00 ✓ Paid
Remaining Balance:   $50.00 (due later)
Shipping:           $10.00 (due later)
Tax on Deposit:      $4.00 ✓ Paid
Tax on Balance:      ~$4.80 (estimated, due later)

💡 We'll notify you when your item is ready and 
   collect the remaining balance of $60.00 before shipping.
```

### Balance Payment Email
```
Subject: Your Pre-Order is Ready to Ship! 🎉

Hi John,

Great news! Your pre-order is ready to ship.

To complete your order, please pay the remaining balance:

Remaining Product Cost:  $50.00
Shipping:               $10.00
Tax:                     $4.80
―――――――――――――――――――――――――――――
TOTAL DUE:              $64.80

[Pay Balance & Ship My Order] →

Questions? Reply to this email.
```

## Benefits

### For Customers
✅ Only pay shipping when item actually ships
✅ No upfront shipping costs for items months away
✅ Full transparency - see complete cost breakdown
✅ Fair payment structure

### For Sellers
✅ Collect deposits to fund production
✅ Accurate shipping costs at ship time
✅ Current tax rates applied
✅ Reduced refund requests

### For Platform
✅ Industry best practice
✅ Clear payment flow
✅ Reduced customer support issues
✅ Better user experience

## Migration Notes

**Previous Implementation:**
- Shipping charged with deposit (immediately)
- Customer paid shipping months before delivery

**New Implementation:**
- Shipping charged with balance (when ready to ship)
- Default: `includeShippingInDeposit = false`

**Backward Compatibility:**
- Function signature unchanged
- Can still include shipping in deposit with flag
- Existing orders unaffected
