# Comprehensive Notification System Design

## Overview
This document outlines the complete notification system for Upfirst, covering all seller and buyer lifecycle events.

## Notification Types

### 1. Order Notifications

#### 1.1 New Order (Seller)
- **Type**: `order_placed` ✅ EXISTS
- **Trigger**: Order created with payment confirmed
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Order details, customer info, items, total

#### 1.2 Order Payment Failed (Seller)
- **Type**: `order_payment_failed` 🆕
- **Trigger**: Payment intent fails during checkout
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Order ID, amount, reason for failure

#### 1.3 Order Shipped (Buyer)
- **Type**: `order_shipped` ✅ EXISTS
- **Trigger**: Seller marks order as shipped
- **Recipient**: Buyer
- **Email**: Seller → Buyer (branded)
- **In-app**: Yes (if buyer has account)
- **Content**: Tracking number, estimated delivery

#### 1.4 Order Delivered (Buyer)
- **Type**: `order_delivered` ✅ EXISTS
- **Trigger**: Seller marks order as delivered OR tracking shows delivered
- **Recipient**: Buyer
- **Email**: Seller → Buyer (branded)
- **In-app**: Yes (if buyer has account)
- **Content**: Order summary, review request

#### 1.5 Order Cancelled (Both)
- **Type**: `order_cancelled` 🆕
- **Trigger**: Order cancelled by seller or system
- **Recipient**: Both seller and buyer
- **Email**: Upfirst → Seller, Upfirst → Buyer (Reply-To: seller)
- **In-app**: Yes
- **Content**: Cancellation reason, refund info

#### 1.6 Order Refunded (Both)
- **Type**: `order_refunded` 🆕
- **Trigger**: Refund processed (full or partial)
- **Recipient**: Both seller and buyer
- **Email**: Upfirst → Seller, Upfirst → Buyer (Reply-To: seller)
- **In-app**: Yes
- **Content**: Refund amount, reason, expected arrival in bank account

#### 1.7 Payment Dispute/Chargeback (Seller)
- **Type**: `payment_dispute` 🆕
- **Trigger**: Stripe reports chargeback or dispute
- **Recipient**: Seller
- **Email**: Upfirst → Seller
- **In-app**: Yes
- **Content**: Dispute details, order info, response deadline, dispute resolution link

#### 1.8 Buyer Payment Failed (Buyer)
- **Type**: `buyer_payment_failed` 🆕
- **Trigger**: Payment fails at checkout
- **Recipient**: Buyer
- **Email**: Upfirst → Buyer
- **In-app**: Yes (if buyer has account)
- **Content**: Failure reason, retry link, alternative payment methods

#### 1.9 Pre-order Deposit Received (Seller)
- **Type**: `preorder_deposit_received` 🆕
- **Trigger**: Pre-order deposit payment successful
- **Recipient**: Seller
- **Email**: Upfirst → Seller
- **In-app**: Yes
- **Content**: Order ID, deposit amount, balance due

#### 1.10 Pre-order Balance Due (Buyer)
- **Type**: `preorder_balance_due` 🆕
- **Trigger**: Product ready for shipping, balance payment needed
- **Recipient**: Buyer
- **Email**: Upfirst → Buyer (Reply-To: seller)
- **In-app**: Yes (if buyer has account)
- **Content**: Balance amount, payment link, due date

### 2. Subscription Notifications

#### 2.1 Welcome Email (Seller)
- **Type**: `seller_welcome` 🆕
- **Trigger**: Seller completes signup
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: No
- **Content**: Getting started guide, trial info, setup steps

#### 2.2 Trial Ending Soon (Seller)
- **Type**: `trial_ending_soon` 🆕
- **Trigger**: 7 days before trial ends
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Trial end date, subscription plans, payment setup

#### 2.3 Trial Ended (Seller)
- **Type**: `trial_ended` 🆕
- **Trigger**: Trial period expires
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Account limitations, upgrade prompt

#### 2.4 Subscription Activated (Seller)
- **Type**: `subscription_activated` 🆕
- **Trigger**: First successful subscription payment
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Plan details, billing date, receipt

#### 2.5 Subscription Payment Success (Seller)
- **Type**: `subscription_payment_success` 🆕
- **Trigger**: Recurring subscription payment successful
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Amount charged, next billing date, receipt

#### 2.6 Subscription Payment Failed (Seller)
- **Type**: `subscription_payment_failed` 🆕
- **Trigger**: Subscription payment fails
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Failure reason, retry info, update payment method link

#### 2.7 Subscription Cancelled (Seller)
- **Type**: `subscription_cancelled` 🆕
- **Trigger**: Seller cancels subscription
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Cancellation confirmation, access end date, data retention

#### 2.8 Payment Method Expiring (Seller)
- **Type**: `payment_method_expiring` 🆕
- **Trigger**: 30 days before card expires
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Expiration date, update payment method link

### 3. Stripe Connect Notifications

#### 3.1 Onboarding Incomplete Reminder (Seller)
- **Type**: `stripe_onboarding_incomplete` 🆕
- **Trigger**: 3 days after account created, not completed
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Onboarding link, benefits of completion

#### 3.2 Onboarding Complete (Seller)
- **Type**: `stripe_onboarding_complete` 🆕
- **Trigger**: Stripe account fully verified
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Congratulations, next steps, payment capabilities

#### 3.3 Payout Received (Seller)
- **Type**: `payout_received` 🆕
- **Trigger**: Stripe payout completes
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Payout amount, arrival date, bank account

#### 3.4 Payout Failed/Blocked (Seller)
- **Type**: `payout_failed` 🆕
- **Trigger**: Stripe payout fails or payouts_enabled becomes false
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Failure reason, held amount, resolution steps, bank account verification

#### 3.5 Verification Required (Seller)
- **Type**: `stripe_verification_required` 🆕
- **Trigger**: Stripe requires additional verification
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Required documents, deadline, consequences

#### 3.6 Account Restricted (Seller)
- **Type**: `stripe_account_restricted` 🆕
- **Trigger**: Stripe restricts account capabilities
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Restriction reason, resolution steps, support contact

### 4. Product Notifications

#### 4.1 Product Listed (Seller)
- **Type**: `product_listed` ✅ EXISTS
- **Trigger**: Product successfully created
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Product details, storefront link

#### 4.2 Product Updated (Seller)
- **Type**: `product_updated` ✅ EXISTS
- **Trigger**: Product successfully updated
- **Recipient**: Seller
- **Email**: No (too frequent)
- **In-app**: Yes
- **Content**: Updated fields summary

#### 4.3 Low Inventory Warning (Seller)
- **Type**: `inventory_low` 🆕
- **Trigger**: Stock falls below 5 units (configurable)
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Product name, current stock, restock reminder

#### 4.4 Out of Stock (Seller)
- **Type**: `inventory_out_of_stock` 🆕
- **Trigger**: Stock reaches 0
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Product name, auto-hide status, restock action

### 5. Wholesale Notifications

#### 5.1 Wholesale Invitation (Buyer)
- **Type**: `wholesale_invitation` ✅ EXISTS
- **Trigger**: Seller invites buyer to wholesale
- **Recipient**: Buyer
- **Email**: Seller → Buyer (branded)
- **In-app**: Yes (if buyer has account)
- **Content**: Invitation details, access link, pricing benefits

#### 5.2 Wholesale Application (Seller)
- **Type**: `wholesale_application` 🆕
- **Trigger**: Buyer requests wholesale access
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Applicant details, approval link

#### 5.3 Wholesale Order (Seller)
- **Type**: `wholesale_order_placed` 🆕
- **Trigger**: Wholesale order created
- **Recipient**: Seller
- **Email**: Upfirst → Seller (non-branded)
- **In-app**: Yes
- **Content**: Order details, wholesale pricing, buyer info

### 6. System Notifications

#### 6.1 System Alert (All)
- **Type**: `system_alert` ✅ EXISTS
- **Trigger**: Admin creates system alert
- **Recipient**: All users or specific roles
- **Email**: Upfirst → User (non-branded)
- **In-app**: Yes
- **Content**: Alert message, severity, action required

## Email Branding Rules

**IMPORTANT**: Due to Resend domain verification requirements, ALL emails must use `Upfirst <noreply@upfirst.io>` as the From address. Seller branding is achieved through Reply-To and email content.

### Seller-Branded Emails (to Buyers)
- **From**: `Upfirst <noreply@upfirst.io>` (required for delivery)
- **Reply-To**: Seller email (allows buyer to respond directly to seller)
- **Design**: Can include seller branding in email body (logo, colors, store name)
- **Subject**: Includes seller/store name
- **Types**: order_shipped, order_delivered, order_confirmation, preorder_balance_due, wholesale_invitation

### Upfirst-Branded Emails (to Sellers)
- **From**: `Upfirst <noreply@upfirst.io>`
- **Reply-To**: `support@upfirst.io`
- **Design**: Upfirst brand (platform communications)
- **Types**: All seller notifications (subscription, stripe, product alerts, order alerts)

### Upfirst-Branded Emails (to Buyers - System)
- **From**: `Upfirst <noreply@upfirst.io>`
- **Reply-To**: `support@upfirst.io` or seller email (context-dependent)
- **Design**: Upfirst brand
- **Types**: system_alert, buyer_payment_failed

**Future Enhancement**: When sellers verify their own domains with Resend, enable true From-address branding.

## Implementation Priority

### Phase 1: Critical Revenue-Impacting (Immediate)
1. ✅ order_placed (existing)
2. 🆕 **stripe_onboarding_incomplete** - Sellers can't accept payments without this
3. 🆕 **order_payment_failed** - Sellers need to know about failed revenue
4. 🆕 **buyer_payment_failed** - Buyers need help completing checkout
5. 🆕 **subscription_payment_failed** - Critical for platform revenue
6. 🆕 **inventory_out_of_stock** - Auto-hide products, prevent failed orders
7. 🆕 **payout_failed** - Sellers need to fix bank issues immediately
8. 🆕 **seller_welcome** - First impression, guides setup

### Phase 2: Important Operations (Week 1)
9. ✅ order_shipped (existing)
10. ✅ product_listed (existing)
11. 🆕 **stripe_onboarding_complete** - Celebrate success, guide next steps
12. 🆕 **payout_received** - Build trust, confirm payments working
13. 🆕 **trial_ending_soon** - Convert to paid before access loss
14. 🆕 **inventory_low** - Prevent stockouts
15. 🆕 **payment_dispute** - Time-sensitive, requires immediate action
16. 🆕 **order_refunded** - Keep both parties informed

### Phase 3: Enhanced Experience (Week 2)
17. ✅ order_delivered (existing)
18. 🆕 order_cancelled
19. 🆕 preorder_deposit_received
20. 🆕 preorder_balance_due
21. 🆕 wholesale_application
22. 🆕 wholesale_order_placed
23. 🆕 subscription_activated
24. 🆕 subscription_payment_success
25. 🆕 trial_ended
26. 🆕 subscription_cancelled
27. 🆕 payment_method_expiring
28. 🆕 stripe_verification_required
29. 🆕 stripe_account_restricted

## Technical Implementation

### Database Schema
```typescript
// Existing notification types to extend
export const notificationTypeEnum = z.enum([
  // Existing
  "order_placed", 
  "order_shipped", 
  "order_delivered",
  "payment_received",
  "product_listed",
  "product_updated",
  "wholesale_invitation",
  "system_alert",
  
  // Phase 1 additions
  "seller_welcome",
  "trial_ending_soon",
  "subscription_payment_failed",
  
  // Phase 2 additions
  "stripe_onboarding_incomplete",
  "stripe_onboarding_complete",
  "payout_received",
  "order_payment_failed",
  "inventory_low",
  "inventory_out_of_stock",
  
  // Phase 3 additions
  "order_cancelled",
  "preorder_deposit_received",
  "preorder_balance_due",
  "wholesale_application",
  "wholesale_order_placed",
  "subscription_activated",
  "subscription_payment_success",
  "trial_ended",
  "subscription_cancelled",
  "payment_method_expiring",
  "stripe_verification_required",
  "stripe_account_restricted",
]);
```

### Notification Service Methods
Each notification type needs:
1. `send{NotificationType}()` method in NotificationService
2. Email HTML template generator
3. Trigger point in relevant route/service
4. In-app notification creation
5. Email sending with proper branding

### Trigger Points
- **Orders**: `/api/orders` routes, payment webhooks
- **Subscriptions**: Stripe webhooks, cron jobs
- **Stripe Connect**: Stripe webhooks, account status checks
- **Products**: `/api/products` routes, inventory checks
- **Wholesale**: `/api/wholesale` routes
- **System**: Admin dashboard

### Cron Jobs / Background Tasks

**Implementation Options:**
1. **Simple Node.js Scheduler** (Recommended for MVP)
   - Use `node-cron` package
   - Run in main Express process
   - Pros: Simple, no additional infrastructure
   - Cons: Stops when server restarts

2. **Replit Scheduled Tasks** (Future)
   - Configure in `.replit` file
   - Separate worker process
   - Pros: Independent of main server
   - Cons: Requires Replit deployment configuration

3. **Stripe Webhooks** (For Stripe events)
   - Use webhooks instead of polling
   - Pros: Real-time, no polling needed
   - Cons: Requires webhook endpoint setup

**Recommended Schedule:**
- **Trial ending check**: Daily at 9 AM UTC (catch sellers 7 days before trial ends)
- **Payment method expiring**: Daily at 9 AM UTC (alert 30 days before expiration)
- **Low inventory check**: Daily at 6 AM UTC (before business hours)
- **Incomplete onboarding reminder**: Daily at 10 AM UTC (send if >3 days since account creation)
- **Subscription status sync**: Every 6 hours (sync with Stripe subscription status)

**MVP Implementation:**
```javascript
// server/scheduler.ts
import cron from 'node-cron';
import { notificationService } from './notifications';

// Daily at 9 AM UTC - Check trials ending
cron.schedule('0 9 * * *', async () => {
  await notificationService.checkTrialsEndingSoon();
});

// Daily at 6 AM UTC - Check inventory
cron.schedule('0 6 * * *', async () => {
  await notificationService.checkLowInventory();
});
```

## Success Metrics
- Email open rates
- Click-through rates
- Notification read rates
- User engagement with actions
- Reduction in support tickets
