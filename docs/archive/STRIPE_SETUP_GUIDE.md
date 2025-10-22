# Stripe Connect Setup Guide for Uppfirst

## ⚠️ CRITICAL: Enable Stripe Connect First

Before you can connect Stripe to Uppfirst, you **MUST** enable Stripe Connect in your Stripe dashboard.

## Step 1: Enable Stripe Connect

1. Go to **[Stripe Connect Settings](https://dashboard.stripe.com/connect/accounts/overview)**
2. Click **"Get Started"** or **"Enable Connect"** button
3. Complete the quick setup form:
   - **Platform Name**: Uppfirst (or your platform name)
   - **Platform Type**: Marketplace
   - **Business Model**: Multi-seller marketplace
4. Accept Stripe Connect Terms of Service
5. Click **"Submit"** or **"Enable Connect"**

**✅ That's it!** Stripe Connect is now enabled for your account.

## Step 2: Get Your Stripe API Keys

1. Go to **[Stripe API Keys](https://dashboard.stripe.com/apikeys)**
2. Copy your **Publishable key** (starts with `pk_`) → This is your `VITE_STRIPE_PUBLIC_KEY`
3. Copy your **Secret key** (starts with `sk_`) → This is your `STRIPE_SECRET_KEY`

## Step 3: Add Keys to Replit

In your Replit environment:

1. Click on **Tools** → **Secrets**
2. Add two secrets:
   - Key: `VITE_STRIPE_PUBLIC_KEY`, Value: `pk_...` (your publishable key)
   - Key: `STRIPE_SECRET_KEY`, Value: `sk_...` (your secret key)

## Step 4: Connect Stripe in Uppfirst

1. Log in to Uppfirst as a seller
2. Go to **Settings** → **Payment** tab
3. Click **"Connect Stripe Account"**
4. Complete Stripe onboarding (minimal KYC required to start)
5. Done! You can now accept payments

## How Stripe Connect Works in Uppfirst

### Payment Flow
```
Buyer pays → Stripe processes → 
Uppfirst takes 1.5% fee → 
98.5% goes to Seller's Stripe account
```

### Account Types
- **Express Accounts**: Quick setup, minimal KYC upfront, full verification can be deferred until first payout
- **Country**: Defaults to US (can change during onboarding)
- **Business Type**: Starts as Individual (can upgrade later)

### Features Enabled
✅ Card payments (Visa, Mastercard, Amex, etc.)
✅ Apple Pay & Google Pay  
✅ 135+ currencies  
✅ Direct payouts to seller bank accounts  
✅ Platform fee (1.5% to Uppfirst)  
✅ Seller name on buyer statements (not Uppfirst)

## Common Issues & Solutions

### Error: "Stripe Connect Not Enabled"
**Problem**: Your Stripe account hasn't enabled Connect  
**Solution**: Follow Step 1 above to enable Stripe Connect

### Error: "Stripe is not configured"
**Problem**: API keys are missing  
**Solution**: Follow Steps 2 & 3 to add your API keys

### Express Account Can't Accept Payments
**Problem**: Account not fully verified  
**Solution**: Complete Stripe onboarding verification steps

## Testing Stripe Connect

### Test Mode (Recommended for Development)
1. Use Stripe **Test API keys** (start with `pk_test_` and `sk_test_`)
2. Test cards: `4242 4242 4242 4242` (any future date, any CVC)
3. All test transactions are free (no actual charges)

### Live Mode (Production Only)
1. Use Stripe **Live API keys** (start with `pk_live_` and `sk_live_`)
2. Real money transactions
3. Requires completed business verification

## Stripe Dashboard Links

- **Connect Settings**: https://dashboard.stripe.com/connect/accounts/overview
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Connected Accounts**: https://dashboard.stripe.com/connect/accounts
- **Payments**: https://dashboard.stripe.com/payments
- **Payouts**: https://dashboard.stripe.com/payouts

## Need Help?

- Stripe Connect Docs: https://stripe.com/docs/connect
- Stripe Support: https://support.stripe.com
- Uppfirst Support: Contact your platform administrator

---

**Last Updated**: October 9, 2025
