# Stripe Test Mode Setup Guide
**Date:** October 13, 2025  
**Status:** Production Ready  
**Purpose:** Enable payment testing for Architecture 3 services

---

## 🎯 Overview

This guide explains how to enable Stripe test mode for payment service validation and Architecture 3 regression testing. It addresses the `STRIPE_CHARGES_DISABLED` error that blocks checkout testing.

### Problem Statement

**Current Issue:**
- Test sellers cannot process payments
- Error: `STRIPE_CHARGES_DISABLED`
- Blocks testing of: OrderLifecycleService, LegacyStripeCheckoutService, StripeWebhookService
- Architecture 3 validation incomplete

**Root Cause:**
- Test sellers lack Stripe Connect accounts (`stripeConnectedAccountId`)
- `stripeChargesEnabled` flag is not set (must be `1`)
- Even in test mode, Stripe Connect onboarding is required

### ⚠️ Important Discovery (Oct 13, 2025)

**Investigation Conclusion:** Programmatic onboarding is **NOT possible** for Stripe Express test accounts.

- ❌ Cannot accept TOS programmatically (Stripe blocks for Express accounts)
- ❌ Cannot bypass Stripe-controlled onboarding requirements (`controller[requirement_collection]=stripe`)
- ✅ Manual onboarding (2-3 minutes) is **required and unavoidable**

**Why?** Express accounts require the account holder to complete onboarding through Stripe's hosted UI. The platform cannot accept Terms of Service or complete verification on behalf of Express accounts, even in test mode.

📖 **Full investigation details:** `docs/STRIPE_PROGRAMMATIC_ONBOARDING_INVESTIGATION.md`

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Test Keys

1. Go to **Replit Secrets** (Tools → Secrets)
2. Check that these exist:
   - ✅ `TESTING_STRIPE_SECRET_KEY` (starts with `sk_test_...`)
   - ✅ `TESTING_VITE_STRIPE_PUBLIC_KEY` (starts with `pk_test_...`)
   - ✅ `STRIPE_SECRET_KEY` (should be test key: `sk_test_...`)
   - ✅ `VITE_STRIPE_PUBLIC_KEY` (should be test key: `pk_test_...`)

**⚠️ Important:** 
- Current keys MUST be TEST keys (prefix `sk_test_` / `pk_test_`)
- NEVER use live keys (`sk_live_` / `pk_live_`) in development
- Get test keys from: https://dashboard.stripe.com/test/apikeys

### Step 2: Run Automated Setup Script

```bash
# Run the automated test seller setup
NODE_ENV=test tsx server/scripts/setup-test-stripe.ts
```

**What this does:**
- Creates Stripe Express test accounts for test sellers
- Updates user records with Stripe account IDs
- Requests card_payments and transfers capabilities
- Sets initial account status

**Expected Output:**
```
✅ Using Stripe TEST key: sk_test_...
🔧 Setting up Stripe for: testseller@test.com
   Found user: local-testseller@test.com
   🎯 Creating Stripe Express TEST account...
   ✅ Created Stripe account: acct_xxxxxxxxxxxxx
   📊 Status: charges=false, payouts=false
   ✅ Updated user with Stripe account details

✅ Test seller Stripe setup complete!
```

### Step 3: Add Webhook Secret

1. **Option A: Generate with Stripe CLI** (Recommended)
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login to Stripe
   stripe login
   
   # Generate webhook secret
   stripe listen --print-secret
   ```
   
   Copy the webhook secret (starts with `whsec_...`)

2. **Option B: Use Dashboard** (Alternative)
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click "Add endpoint"
   - URL: `https://your-app.replit.app/api/stripe/webhook`
   - Events: Select "payment_intent.succeeded", "charge.refunded"
   - Copy the signing secret

3. **Add to Replit Secrets:**
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (your webhook secret)

### Step 4: Complete Test Seller Onboarding

**For immediate testing (bypasses full verification):**

1. Login as test seller:
   - Email: `testseller@test.com`
   - Password: `123456`

2. Navigate to **Settings → Payment**

3. Click **"Connect Stripe Account"** or **"Complete Setup"**

4. Fill out onboarding with **TEST data:**
   - Business type: Individual
   - First name: Test
   - Last name: Seller
   - DOB: 01/01/1990
   - Address: Any US test address
   - SSN (for test): `000-00-0000`
   - Bank: Use Stripe test routing: `110000000`, Account: `000123456789`

5. Submit onboarding

6. Verify charges enabled:
   ```
   Settings → Payment should show:
   ✅ Stripe Connected
   ✅ Charges Enabled
   ```

---

## 🔍 Verification & Testing

### Verify Setup is Complete

1. **Check User Status:**
   ```bash
   # Query database
   SELECT 
     email, 
     "stripeConnectedAccountId", 
     "stripeChargesEnabled",
     "stripePayoutsEnabled"
   FROM users 
   WHERE email = 'testseller@test.com';
   ```
   
   **Expected:**
   - `stripeConnectedAccountId`: `acct_xxxxxxxxxxxxx`
   - `stripeChargesEnabled`: `1`
   - `stripePayoutsEnabled`: `1`

2. **Check API Response:**
   ```bash
   # Login as test seller, then:
   curl http://localhost:5000/api/seller/payment-setup \
     -H "Cookie: connect.sid=..." \
     -H "Content-Type: application/json"
   ```
   
   **Expected Response:**
   ```json
   {
     "hasStripeConnected": true,
     "currency": "USD",
     "stripeChargesEnabled": true
   }
   ```

### Test Payment Flow

1. **Create Test Product** (as test seller)
   - Navigate to `/seller/create-product`
   - Create a simple product ($10.00)
   - Publish it (status: active)

2. **Add to Cart** (as buyer/guest)
   - Navigate to `/s/testseller`
   - Add product to cart
   - Go to checkout

3. **Complete Payment**
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

4. **Verify Order Created**
   - Check order appears in `/seller/orders`
   - Status should be "Confirmed" or "Paid"
   - Payment intent captured successfully

5. **Test Webhook Processing**
   - Order should auto-update when payment succeeds
   - Email notifications sent (check logs)
   - Inventory decremented

---

## 📋 Architecture 3 Service Validation

With test mode enabled, you can now validate:

### ✅ LegacyStripeCheckoutService
**Test:** Create payment intent
```bash
POST /api/create-payment-intent
{
  "amount": 10.00,
  "items": [{"productId": "xxx"}],
  "paymentType": "full"
}
```
**Expected:** Returns `clientSecret` and `paymentIntentId`

### ✅ OrderLifecycleService
**Test:** Process refund
```bash
POST /api/orders/{orderId}/refund
{
  "items": [{
    "id": "xxx",
    "refundQuantity": 1,
    "refundReason": "Test refund"
  }]
}
```
**Expected:** Creates refund, updates order status, sends notifications

### ✅ StripeWebhookService
**Test:** Webhook processing
```bash
# Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:5000/api/stripe/webhook

# In another terminal, create test payment
stripe payment_intents create --amount=1000 --currency=usd --confirm
```
**Expected:** Webhook received, order updated, logs show processing

---

## 🔧 Troubleshooting

### Error: "STRIPE_CHARGES_DISABLED"

**Symptom:** Payment intent creation fails with 400 error  
**Cause:** Test seller's `stripeChargesEnabled` is `0` or `null`

**Solution:**
1. Re-run setup script: `NODE_ENV=test tsx server/scripts/setup-test-stripe.ts`
2. Complete onboarding: Settings → Payment → Complete Setup
3. Check Stripe dashboard: https://dashboard.stripe.com/test/connect/accounts

### Error: "Stripe is not configured"

**Symptom:** All Stripe operations fail  
**Cause:** Missing or invalid `STRIPE_SECRET_KEY`

**Solution:**
1. Verify secret exists: Check Replit Secrets
2. Verify it's a TEST key: Should start with `sk_test_`
3. Get new test key: https://dashboard.stripe.com/test/apikeys

### Error: "Webhook signature verification failed"

**Symptom:** Webhooks return 400 Bad Request  
**Cause:** Missing or invalid `STRIPE_WEBHOOK_SECRET`

**Solution:**
1. Generate webhook secret: `stripe listen --print-secret`
2. Add to Replit Secrets: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Restart application

### Charges Still Disabled After Setup

**Symptom:** Setup script ran but charges still disabled  
**Cause:** Stripe requires additional account information

**Solution:**
1. Login as test seller
2. Settings → Payment → "Complete Stripe Setup"
3. Fill out required fields in embedded onboarding
4. Check Stripe dashboard for account status

---

## 🎓 Understanding Test Mode

### Test vs Live Mode

| Aspect | Test Mode | Live Mode |
|--------|-----------|-----------|
| API Keys | `sk_test_...` / `pk_test_...` | `sk_live_...` / `pk_live_...` |
| Money | No real charges | Real money |
| Cards | Test cards only (4242...) | Real cards |
| Verification | Minimal/simulated | Full KYC required |
| Webhooks | Local or test endpoints | Production endpoints |
| Data | Separate test data | Production data |

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 0002` | ❌ Card declined |
| `4000 0000 0000 9995` | ❌ Insufficient funds |
| `4000 0025 0000 3155` | ⏰ Requires authentication |

### Test Bank Accounts

- **Routing Number:** `110000000`
- **Account Number:** `000123456789` (success)
- **Account Number:** `000111111113` (account closed)

---

## 📚 Additional Resources

### Stripe Documentation
- Test Mode Guide: https://stripe.com/docs/testing
- Connect Testing: https://stripe.com/docs/connect/testing
- Test Cards: https://stripe.com/docs/testing#cards
- Webhook Testing: https://stripe.com/docs/webhooks/test

### Project Documentation
- `STRIPE_SETUP_GUIDE.md` - Production Stripe setup
- `STRIPE_CONNECT_ISSUE_RESOLUTION.md` - Common issues
- `docs/ARCHITECTURE_3_TEST_RESULTS.md` - Test results
- `docs/TESTING_STRATEGY_REPORT.md` - Testing strategy

### Scripts
- `server/scripts/setup-test-stripe.ts` - Automated setup
- `npm run db:push` - Apply database changes

---

## ✅ Success Checklist

Before claiming test mode is ready:

- [ ] `STRIPE_SECRET_KEY` is a TEST key (`sk_test_...`)
- [ ] `VITE_STRIPE_PUBLIC_KEY` is a TEST key (`pk_test_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` is configured
- [ ] Setup script ran successfully
- [ ] Test seller has `stripeConnectedAccountId`
- [ ] Test seller has `stripeChargesEnabled = 1`
- [ ] Payment intent creation works (returns clientSecret)
- [ ] Checkout flow completes with test card
- [ ] Order created successfully
- [ ] Webhooks received and processed
- [ ] Refund flow works
- [ ] Architecture 3 services validated

---

**Last Updated:** October 13, 2025  
**Maintained By:** Engineering Team  
**Related Issues:** Architecture 3 Regression Testing
