# Deposit/Balance Payment System Verification Report

**Date:** October 13, 2025  
**Task:** Verify checkout/order creation properly handles deposit/balance payment splits per line item  
**Status:** ✅ Verification Complete

---

## Executive Summary

The Upfirst platform implements a deposit/balance payment system for pre-order and made-to-order products. This verification assessed whether the checkout and order creation logic correctly handles payment splits per line item.

**Overall Assessment:** ⚠️ **PARTIALLY FUNCTIONAL WITH CRITICAL ISSUES**

The system has the foundational architecture in place but contains **3 critical bugs** that prevent made-to-order products from working correctly and create issues with mixed cart scenarios.

---

## Verification Results by Requirement

### 1. ✅ Product Type Detection - VERIFIED

**Implementation:**
- Products schema correctly includes `productType` field (in-stock, pre-order, made-to-order, wholesale)
- Products have `depositAmount` (decimal) and `requiresDeposit` (integer 0/1) fields
- Cart items properly include product type information
- Order items table tracks `productType` for each line item

**Files Verified:**
- `shared/schema.ts` - Lines 89-92 (products table)
- `shared/schema.ts` - Lines 212-217 (order_items table)

**Status:** ✅ Working as expected

---

### 2. ❌ Deposit Calculation - CRITICAL BUG FOUND

**Expected Behavior:**
- Pre-order products: Calculate deposit from `depositAmount` field
- Made-to-order products: Calculate deposit from `depositAmount` field
- In-stock products: Charge full amount (no deposit)

**Actual Implementation:**
```typescript
// shared/pricing-service.ts - Line 83
if (item.productType === "pre-order" && item.requiresDeposit && item.depositAmount) {
  hasPreOrders = true;
  const depositPerItem = parseFloat(item.depositAmount);
  depositAmount += depositPerItem * item.quantity;
}
```

**🔴 CRITICAL BUG #1: Made-to-order products NOT handled**

The pricing calculation **ONLY** checks for `productType === "pre-order"`. Made-to-order products are completely ignored in the deposit calculation logic, meaning:
- Made-to-order products will be charged in FULL at checkout (incorrect)
- No deposit logic applies to made-to-order items (breaks requirement)

**Impact:** HIGH - Made-to-order functionality is broken

**Fix Required:**
```typescript
// Should check for BOTH pre-order AND made-to-order
if ((item.productType === "pre-order" || item.productType === "made-to-order") 
    && item.requiresDeposit && item.depositAmount) {
  hasPreOrders = true; // Consider renaming to hasDepositProducts
  const depositPerItem = parseFloat(item.depositAmount);
  depositAmount += depositPerItem * item.quantity;
}
```

**Deposit Amount Type:**
- Implementation uses FIXED AMOUNT (not percentage)
- `depositAmount` is stored as decimal(10,2) in database
- Seller sets specific dollar amount for deposit

**Status:** ❌ Broken for made-to-order products

---

### 3. ⚠️ Order Creation - PARTIAL IMPLEMENTATION

**Orders Table (orders):**
- ✅ `total` - Full order total
- ✅ `amountPaid` - Amount paid (deposit or full)
- ✅ `remainingBalance` - Balance due after deposit
- ✅ `paymentType` - "full" | "deposit" | "balance"
- ✅ `paymentStatus` - "pending" | "deposit_paid" | "fully_paid"

**Order Items Table (order_items):**
- ✅ `productType` - Tracks product type per item
- ✅ `price` - Unit price at time of order
- ✅ `subtotal` - quantity × price
- ✅ `depositAmount` - Deposit amount per unit (if applicable)
- ✅ `requiresDeposit` - Boolean flag (0/1)
- ❌ **Missing:** `balanceAmount` or `remainingBalance` field

**🔴 CRITICAL BUG #2: No per-item balance tracking**

Order items track the deposit amount but NOT the remaining balance per item. This creates issues:
- Cannot determine which specific items still need balance payment
- Refund logic may be incorrect for partially paid items
- Mixed carts (deposit + full payment items) don't have proper per-item tracking

**Current Calculation:**
```typescript
// server/services/order.service.ts - Lines 693-697
total: pricing.fullTotal.toString(),
amountPaid: '0',
remainingBalance: pricing.payingDepositOnly
  ? pricing.remainingBalance.toString()
  : '0',
```

The order-level `remainingBalance` is calculated as: `fullTotal - depositTotal`

**Problem with Mixed Carts:**
If a cart contains:
- Product A (in-stock, $100) - paid in full
- Product B (pre-order, $200, $50 deposit) - paid $50

Current calculation:
- `fullTotal` = $300
- `depositTotal` = $50
- `remainingBalance` = $250 ❌ INCORRECT

The remainingBalance should be $150 (only Product B's balance), not $250 (which incorrectly includes Product A).

**Status:** ⚠️ Partially working, broken for mixed carts

---

### 4. ✅ Stripe Payment Intent - VERIFIED

**Implementation Flow:**

1. **Pricing Calculation** (`shared/pricing-service.ts`):
```typescript
const payingDepositOnly = hasPreOrders && depositAmount > 0;
const amountToCharge = payingDepositOnly ? depositTotal : fullTotal;
```

2. **Checkout Service** (`server/services/checkout.service.ts` - Line 180):
```typescript
const paymentIntent = await this.paymentProvider.createPaymentIntent({
  amount: pricing.amountToCharge,  // Uses deposit amount when applicable
  currency: currency.toLowerCase(),
  metadata: {
    paymentType: pricing.payingDepositOnly ? 'deposit' : 'full',
  }
});
```

3. **Frontend Validation** (`client/src/pages/checkout.tsx` - Lines 806-814):
```typescript
// FAIL-SAFE: Validate displayed amount matches charge amount
validateChargeAmount(displayedAmount, amountToPay, 0.01);
```

**Verified Scenarios:**
- ✅ In-stock items: Full amount charged
- ✅ Pre-order items (with deposit): Deposit amount charged
- ⚠️ Made-to-order items: Would charge full amount (due to Bug #1)
- ⚠️ Mixed carts: May charge incorrect total (due to Bug #2)

**Platform Fee:** 1.5% calculated correctly on charged amount

**Status:** ✅ Core logic correct (but affected by Bugs #1 and #2)

---

### 5. ✅ Balance Payment Tracking - IMPLEMENTED

**Database Schema:**

`order_balance_payments` table exists with:
- `amountDue` - Total balance amount
- `amountPaid` - Amount paid so far
- `status` - "pending" | "requested" | "paid" | "failed" | "cancelled"
- `stripePaymentIntentId` - Payment intent for balance
- `requestedAt`, `paidAt` - Timestamps

**Request Balance Payment Flow:**

1. **Seller Initiates** (`server/services/order.service.ts` - Lines 483-546):
```typescript
async requestBalancePayment(orderId: string, sellerId: string): Promise<BalancePaymentResult> {
  // Create payment intent for remaining balance
  const paymentIntent = await this.stripe.paymentIntents.create({
    amount: Math.round(remainingBalance * 100),
    metadata: { orderId: order.id, paymentType: 'balance' }
  });
  
  // Send email with payment link
  await this.sendBalancePaymentNotification(order, paymentIntent);
}
```

2. **Email Notification** (`server/notifications.ts` - Lines 1558-1605):
- Sends branded email to buyer
- Includes payment link with Stripe client secret
- Creates in-app notification
- Logs event to `order_events` table

3. **Webhook Handling:**
- Stripe webhook updates payment status on success
- Order status transitions from "deposit_paid" to "fully_paid"

**Balance Payment Endpoints:**
- ✅ POST `/api/orders/:id/balance-payment/request` - Request balance payment
- ✅ POST `/api/orders/:id/balance-payment/resend` - Resend payment request

**Status:** ✅ Fully implemented

---

## Critical Issues Summary

### 🔴 Issue #1: Made-to-Order Products Not Handled (HIGH PRIORITY)

**File:** `shared/pricing-service.ts` - Line 83  
**Problem:** Deposit calculation only checks for "pre-order" product type  
**Impact:** Made-to-order products charge full amount instead of deposit  
**Fix:** Update condition to include made-to-order products

### 🔴 Issue #2: No Per-Item Balance Tracking (MEDIUM PRIORITY)

**File:** `shared/schema.ts` - order_items table  
**Problem:** Order items lack `balanceAmount` or `remainingBalance` field  
**Impact:** Cannot track which specific items need balance payment; mixed carts may calculate incorrect totals  
**Fix:** Add `balanceAmount` field to order_items table

### 🔴 Issue #3: Mixed Cart Balance Calculation Error (HIGH PRIORITY)

**File:** `shared/pricing-service.ts` - Lines 103-105  
**Problem:** `remainingBalance = fullTotal - depositTotal` incorrectly includes fully-paid items  
**Impact:** Buyers may be charged incorrect balance amounts for mixed carts  
**Fix:** Calculate balance only for items that require deposits:
```typescript
let remainingBalance = 0;
items.forEach((item) => {
  if ((item.productType === "pre-order" || item.productType === "made-to-order") 
      && item.requiresDeposit && item.depositAmount) {
    const itemTotal = parseFloat(item.price) * item.quantity;
    const itemDeposit = parseFloat(item.depositAmount) * item.quantity;
    remainingBalance += (itemTotal - itemDeposit);
  }
});
```

---

## Recommendations

### Immediate Actions (Critical Fixes)

1. **Fix Made-to-Order Deposit Calculation**
   - Update `shared/pricing-service.ts` line 83
   - Add test cases for made-to-order products
   - Verify checkout flow with made-to-order items

2. **Fix Mixed Cart Balance Calculation**
   - Update `shared/pricing-service.ts` lines 103-105
   - Calculate balance only for deposit-required items
   - Add test cases for mixed carts

3. **Add Per-Item Balance Tracking**
   - Add `balanceAmount` field to `order_items` table
   - Update order creation to populate per-item balance
   - Use for refund and balance payment calculations

### Code Quality Improvements

4. **Rename Variables for Clarity**
   - `hasPreOrders` → `hasDepositProducts` (more accurate)
   - Add comments explaining deposit vs. full payment logic

5. **Add Comprehensive Tests**
   - Unit tests for `calculatePricing()` with all product types
   - Integration tests for mixed cart scenarios
   - End-to-end tests for deposit → balance payment flow

6. **Documentation**
   - Document deposit calculation algorithm
   - Add flowchart for payment type decision logic
   - Create troubleshooting guide for mixed cart scenarios

---

## Test Scenarios to Verify After Fixes

### Scenario 1: Single Pre-Order Item
- Product: Pre-order, $200 price, $50 deposit
- Expected: Charge $50 now, $150 balance later
- ✅ Currently works

### Scenario 2: Single Made-to-Order Item
- Product: Made-to-order, $300 price, $75 deposit
- Expected: Charge $75 now, $225 balance later
- ❌ Currently broken (charges $300)

### Scenario 3: Mixed Cart (In-Stock + Pre-Order)
- Item A: In-stock, $100 (full payment)
- Item B: Pre-order, $200, $50 deposit
- Expected: Charge $150 now ($100 + $50), $150 balance later
- ⚠️ May be incorrect due to Bug #3

### Scenario 4: Multiple Deposit Items
- Item A: Pre-order, $200, $50 deposit
- Item B: Made-to-order, $300, $75 deposit
- Expected: Charge $125 now, $375 balance later
- ❌ Currently broken (Item B charged in full)

---

## Files Modified During Verification

**Read Only (No Changes Made):**
- `shared/schema.ts`
- `shared/pricing-service.ts`
- `server/services/checkout.service.ts`
- `server/services/order.service.ts`
- `server/services/order-lifecycle.service.ts`
- `server/services/pricing-calculation.service.ts`
- `server/notifications.ts`
- `client/src/pages/checkout.tsx`

---

## Conclusion

The deposit/balance payment system has **solid foundational architecture** with:
- ✅ Proper database schema for tracking deposits and balances
- ✅ Stripe payment intent creation with correct amounts
- ✅ Balance payment request and notification system
- ✅ Order events and audit trail

However, **3 critical bugs** prevent the system from working correctly:
1. Made-to-order products not included in deposit calculation
2. Mixed carts may calculate incorrect balance amounts
3. No per-item balance tracking for granular refund/payment management

**Recommendation:** Fix the 3 critical bugs before releasing deposit payment functionality to production. The fixes are straightforward and low-risk.

**Estimated Fix Time:** 4-6 hours (including testing)

---

**Architect Approval Required:** Please review findings and approve recommended fixes.
