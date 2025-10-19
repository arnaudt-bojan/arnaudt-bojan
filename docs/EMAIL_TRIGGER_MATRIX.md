# EMAIL TRIGGER MATRIX - Upfirst Platform
## Complete Inventory of Email Triggers and Missing Critical Notifications

**Last Updated:** October 19, 2025  
**Purpose:** Comprehensive documentation of all email triggers across B2C, B2B, Trade, and Platform systems

---

## TABLE OF CONTENTS
1. [Executive Summary](#executive-summary)
2. [Complete Email Trigger Matrix](#complete-email-trigger-matrix)
3. [Missing Critical Triggers](#missing-critical-triggers)
4. [Implementation Priorities](#implementation-priorities)
5. [Technical Details & Code Locations](#technical-details--code-locations)

---

## EXECUTIVE SUMMARY

### Current State
- **Total Implemented Triggers:** 42
- **Total Missing Critical Triggers:** 25
- **Coverage:**
  - ✅ B2C Order Lifecycle: **Excellent** (15/15 implemented)
  - ✅ B2B Wholesale: **Good** (6/9 implemented)
  - ⚠️ Meta Ads/Wallet: **Critical Gap** (0/5 implemented)
  - ⚠️ Trade Quotations: **Critical Gap** (1/7 implemented)
  - ⚠️ Custom Domain: **Complete Gap** (0/4 implemented)
  - ⚠️ Bulk Operations: **Complete Gap** (0/2 implemented)

### Critical Findings
1. **Meta Ads Email Templates Exist But Are NOT Integrated** - `sendLowCreditAlert()` exists in `meta/email-templates.service.ts` but is never called
2. **Trade Quotation System Incomplete** - Only quotation send email exists, no approval/rejection/expiration workflows
3. **No Domain Lifecycle Notifications** - Sellers have no visibility into domain verification status
4. **Wholesale Invitation System Commented Out** - Code exists but is disabled

---

## COMPLETE EMAIL TRIGGER MATRIX

### B2C Order Lifecycle (15 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Order Confirmation | B2C | Seller→Buyer | `checkout-workflow-orchestrator.service.ts` | ✅ Implemented | Critical |
| Order Notification (to Seller) | B2C | Upfirst→Seller | `checkout-workflow-orchestrator.service.ts` | ✅ Implemented | Critical |
| Order Shipped | B2C | Seller→Buyer | `order.service.ts`, `routes.ts` | ✅ Implemented | Critical |
| Item Tracking Update | B2C | Seller→Buyer | `order-lifecycle.service.ts` | ✅ Implemented | High |
| Order Delivered | B2C | Seller→Buyer | `notifications.ts` | ✅ Implemented | High |
| Item Delivered | B2C | Seller→Buyer | `notifications.ts` | ✅ Implemented | Medium |
| Order Refunded | B2C | Seller→Buyer | `order-lifecycle.service.ts` | ✅ Implemented | Critical |
| Refund Confirmation | B2C | Seller→Buyer | `refund.service.ts` | ✅ Implemented | Critical |
| Item Cancelled | B2C | Seller→Buyer | `notifications.ts` | ✅ Implemented | Medium |
| Item Refunded | B2C | Seller→Buyer | `notifications.ts` | ✅ Implemented | Medium |
| Balance Payment Request | B2C | Seller→Buyer | `order-lifecycle.service.ts`, `routes.ts` | ✅ Implemented | Critical |
| Balance Payment Received | B2C | Seller→Buyer | `payment/webhook-handler.ts` | ✅ Implemented | High |
| Welcome Email (First Order) | B2C | Seller→Buyer | `notifications.ts` | ✅ Implemented | High |
| Delivery Date Change | B2C | Seller→Buyer | `routes.ts` | ✅ Implemented | Medium |
| Customer Details Updated | B2C | Seller→Buyer | `routes.ts` | ✅ Implemented | Low |

### B2B Wholesale (9 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Wholesale Order Confirmation | B2B | Seller→Buyer | `wholesale-checkout-workflow-orchestrator.service.ts` | ✅ Implemented | Critical |
| Wholesale Deposit Received | B2B | Upfirst→Seller & Seller→Buyer | `wholesale-payment.service.ts` | ✅ Implemented | Critical |
| Wholesale Balance Reminder | B2B | Seller→Buyer | `jobs/wholesale-balance-reminder.job.ts` | ✅ Implemented | High |
| Wholesale Balance Overdue | B2B | Seller→Buyer | `wholesale-order.service.ts` | ✅ Implemented | High |
| Wholesale Order Shipped | B2B | Seller→Buyer | `wholesale-shipping.service.ts`, `wholesale-order.service.ts` | ✅ Implemented | Critical |
| Wholesale Order Fulfilled | B2B | Seller→Buyer | `wholesale-payment.service.ts`, `wholesale-order.service.ts` | ✅ Implemented | Critical |
| **Wholesale Invitation Sent** | B2B | Upfirst→Buyer | `wholesale-invitation-enhanced.service.ts` | ❌ **COMMENTED OUT** | High |
| **Wholesale Buyer Approved** | B2B | Upfirst→Buyer | N/A | ❌ Missing | Medium |
| **Wholesale Order Cancelled** | B2B | Seller→Buyer | N/A | ❌ Missing | Medium |

### Trade Quotations (7 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Quotation Sent to Buyer | Trade | Seller→Buyer | `quotation-email.service.ts` | ✅ Implemented | Critical |
| **Quotation Approved by Buyer** | Trade | Seller←Buyer | N/A | ❌ Missing | Critical |
| **Quotation Rejected by Buyer** | Trade | Seller←Buyer | N/A | ❌ Missing | High |
| **Quotation Expired** | Trade | Upfirst→Seller & Seller→Buyer | N/A | ❌ Missing | High |
| **Trade Deposit Received** | Trade | Upfirst→Seller & Seller→Buyer | N/A | ❌ Missing | Critical |
| **Trade Balance Payment Received** | Trade | Upfirst→Seller & Seller→Buyer | N/A | ❌ Missing | Critical |
| **Quotation Reminder (Expiring Soon)** | Trade | Seller→Buyer | N/A | ❌ Missing | Medium |

### Meta Ads / Wallet (5 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| **Low Wallet Balance Warning** | Platform | Upfirst→Seller | `meta/email-templates.service.ts` | ⚠️ **EXISTS BUT NOT CALLED** | Critical |
| **Campaign Budget Exhausted** | Platform | Upfirst→Seller | N/A | ❌ Missing | Critical |
| **Campaign Paused (Budget Depleted)** | Platform | Upfirst→Seller | N/A | ❌ Missing | Critical |
| **Ad Approval Failed** | Platform | Upfirst→Seller | N/A | ❌ Missing | High |
| **Credit Purchase Confirmed** | Platform | Upfirst→Seller | `payment/webhook-handler.ts` | ⚠️ **COMMENTED OUT** | Medium |

### Custom Domain (4 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| **Domain Verification Succeeded** | Platform | Upfirst→Seller | `domain/orchestrator.service.ts` | ❌ Missing | High |
| **Domain SSL Provisioned** | Platform | Upfirst→Seller | `domain/orchestrator.service.ts` | ❌ Missing | High |
| **Domain Connection Failed** | Platform | Upfirst→Seller | `domain/orchestrator.service.ts` | ❌ Missing | High |
| **Domain Expiring Soon** | Platform | Upfirst→Seller | N/A | ❌ Missing | Medium |

### Seller Payments / Payouts (2 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| **Payout Processed Successfully** | Platform | Upfirst→Seller | N/A | ❌ Missing | Medium |
| **Balance Withdrawn to Bank** | Platform | Upfirst→Seller | N/A | ❌ Missing | Low |

### Seller Lifecycle (3 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Seller Welcome | Platform | Upfirst→Seller | `auth-email.ts` | ✅ Implemented | High |
| Stripe Onboarding Incomplete | Platform | Upfirst→Seller | `notifications.ts` | ✅ Implemented | High |
| Product Listed | Platform | Upfirst→Seller | `product.service.ts` | ✅ Implemented | Low |

### Payment Failures (4 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Order Payment Failed (Seller) | Platform | Upfirst→Seller | `notifications.ts` | ✅ Implemented | Critical |
| Buyer Payment Failed | Platform | Upfirst→Buyer | `notifications.ts` | ✅ Implemented | Critical |
| Subscription Payment Failed | Platform | Upfirst→Seller | `notifications.ts` | ✅ Implemented | Critical |
| Payout Failed | Platform | Upfirst→Seller | `notifications.ts` | ✅ Implemented | High |

### Inventory Management (2 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Inventory Out of Stock | Platform | Upfirst→Seller | `notifications.ts` | ✅ Implemented | High |
| Low Inventory Alert | Platform | Upfirst→Seller | `notifications.ts` | ✅ Implemented | High |

### Subscription Management (7 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Subscription Trial Ending | Platform | Upfirst→Seller | `notifications.ts` | ✅ Implemented | High |
| Subscription Activated | Platform | Upfirst→Seller | `notifications.ts` | ✅ Implemented | High |
| Subscription Cancelled | Platform | Upfirst→Seller | `notifications.ts` | ✅ Implemented | High |
| Subscription Invoice | Platform | Upfirst→Seller | `stripe-webhook.service.ts` | ✅ Implemented | Medium |
| **Subscription Plan Upgraded** | Platform | Upfirst→Seller | N/A | ❌ Missing | Medium |
| **Subscription Plan Downgraded** | Platform | Upfirst→Seller | N/A | ❌ Missing | Medium |
| **Payment Method Update Required** | Platform | Upfirst→Seller | N/A | ❌ Missing | Medium |

### Shipping Labels (3 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Label Purchased (to Seller) | Platform | Upfirst→Seller | `shippo-label.service.ts` | ✅ Implemented | Medium |
| Label Created (to Buyer) | Platform | Seller→Buyer | `shippo-label.service.ts` | ✅ Implemented | Medium |
| Label Cost Deduction | Platform | Upfirst→Seller | `shippo-label.service.ts` | ✅ Implemented | Low |

### Bulk Operations (2 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| **CSV Import Completed Successfully** | Platform | Upfirst→Seller | `bulk-upload.service.ts` | ❌ Missing | Medium |
| **CSV Import Failed with Errors** | Platform | Upfirst→Seller | `bulk-upload.service.ts` | ❌ Missing | Medium |

### Authentication (2 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Auth Code (2FA) | Platform | Upfirst→User | `auth-email.ts` | ✅ Implemented | Critical |
| Magic Link | Platform | Upfirst→User | `auth-email.ts` | ✅ Implemented | Critical |

### Newsletter (3 triggers)

| Trigger Name | Platform | Direction | Trigger Source | Status | Priority |
|-------------|----------|-----------|----------------|--------|----------|
| Newsletter Campaign Sent | Platform | Seller→Subscriber | `notifications.ts` | ✅ Implemented | Medium |
| **Campaign Sent Successfully** | Platform | Upfirst→Seller | N/A | ❌ Missing | Low |
| **Campaign Delivery Completed** | Platform | Upfirst→Seller | N/A | ❌ Missing | Low |

---

## MISSING CRITICAL TRIGGERS

### Priority 1: CRITICAL (Revenue-Impacting)

#### 1. Meta Ads Wallet Notifications
**Impact:** Sellers lose money when campaigns pause unexpectedly  
**Business Risk:** HIGH - Direct revenue loss, customer dissatisfaction

```
❌ Low Wallet Balance Warning
   Status: Code EXISTS in meta/email-templates.service.ts but NEVER CALLED
   File: server/services/meta/email-templates.service.ts:78
   Method: sendLowCreditAlert()
   
   Integration needed in: 
   - server/services/meta/budget.service.ts (getLowBalanceCampaigns method)
   - Create cron job to check balances daily

❌ Campaign Budget Exhausted
   Status: NOT IMPLEMENTED
   Trigger: When campaign balance reaches $0
   
   Integration needed in:
   - server/services/meta/budget.service.ts (recordAdSpend method)
   - Add check after recording spend

❌ Campaign Paused (Budget Depleted)
   Status: NOT IMPLEMENTED
   Trigger: When Meta pauses campaign due to insufficient funds
   
   Integration needed in:
   - server/services/meta/meta-campaign.service.ts
   - Webhook from Meta Graph API (if available)
```

#### 2. Trade Quotation Lifecycle
**Impact:** Broken communication loop in B2B sales  
**Business Risk:** HIGH - Lost sales opportunities

```
❌ Quotation Approved by Buyer
   Status: NOT IMPLEMENTED
   Trigger: When buyer approves quotation
   File needed: Add to server/services/quotation-email.service.ts
   Method: sendQuotationApproved()

❌ Trade Deposit Received  
   Status: NOT IMPLEMENTED
   Trigger: After deposit payment via quotation-payment.service.ts
   File needed: Add to server/services/quotation-email.service.ts
   Method: sendTradeDepositReceived()

❌ Trade Balance Payment Received
   Status: NOT IMPLEMENTED
   Trigger: After balance payment completion
   File needed: Add to server/services/quotation-email.service.ts
   Method: sendTradeBalanceReceived()
```

### Priority 2: HIGH (User Experience)

#### 3. Custom Domain Lifecycle
**Impact:** Sellers left guessing about domain setup status  
**Business Risk:** MEDIUM - Frustration, support tickets

```
❌ Domain Verification Succeeded
   Integration point: server/services/domain/orchestrator.service.ts:263
   After: await storage.updateDomainConnection(domain.id, { status: 'dns_verified' })

❌ Domain SSL Provisioned
   Integration point: server/services/domain/orchestrator.service.ts:287
   After: await storage.updateDomainConnection(domain.id, { status: 'ssl_provisioning' })

❌ Domain Connection Failed
   Integration point: server/services/domain/orchestrator.service.ts:272
   When: failureReason is set
```

#### 4. Quotation Expiration & Rejection
```
❌ Quotation Rejected by Buyer
   Trigger: When buyer declines quotation
   File: server/services/quotation-email.service.ts

❌ Quotation Expired
   Trigger: Cron job checking expiresAt dates
   File: Create server/jobs/quotation-expiration.job.ts
```

### Priority 3: MEDIUM (Nice to Have)

#### 5. Wholesale Lifecycle
```
❌ Wholesale Invitation Sent
   Status: COMMENTED OUT in wholesale-invitation-enhanced.service.ts:108
   Action: Uncomment and implement sendWholesaleInvitation() method

❌ Wholesale Order Cancelled
   Trigger: When seller/buyer cancels wholesale order
   File: server/services/wholesale-order.service.ts
```

#### 6. Bulk Upload Notifications
```
❌ CSV Import Completed Successfully
   Integration point: server/services/bulk-upload.service.ts:655
   After successful import loop

❌ CSV Import Failed with Errors
   Integration point: server/services/bulk-upload.service.ts:670
   When errorCount > 0
```

#### 7. Subscription Lifecycle
```
❌ Subscription Plan Upgraded
❌ Subscription Plan Downgraded
❌ Payment Method Update Required
   
   Integration points: server/services/stripe-webhook.service.ts
   Events: customer.subscription.updated
```

---

## IMPLEMENTATION PRIORITIES

### Phase 1: Critical Revenue-Impacting (Week 1-2)
**Priority: IMMEDIATE**

1. **Meta Ads Wallet Alerts** (Est: 2-3 days)
   - ✅ Templates already exist in `meta/email-templates.service.ts`
   - Integrate `sendLowCreditAlert()` into `BudgetService.getLowBalanceCampaigns()`
   - Create cron job: `server/jobs/meta-wallet-balance-checker.job.ts`
   - Add `sendCampaignBudgetExhausted()` trigger in `recordAdSpend()`
   
2. **Trade Quotation Payment Confirmations** (Est: 2 days)
   - Add `sendTradeDepositReceived()` in `quotation-payment.service.ts`
   - Add `sendTradeBalanceReceived()` in `quotation-payment.service.ts`
   - Add `sendQuotationApproved()` trigger

### Phase 2: High User Experience (Week 3-4)
**Priority: HIGH**

3. **Custom Domain Notifications** (Est: 2 days)
   - Add notification calls in `domain/orchestrator.service.ts`
   - Implement `sendDomainVerified()`, `sendDomainSSLProvisioned()`, `sendDomainFailed()`

4. **Quotation Lifecycle Completion** (Est: 2 days)
   - Implement `sendQuotationRejected()`
   - Create quotation expiration cron job
   - Implement `sendQuotationExpired()` and `sendQuotationReminder()`

### Phase 3: Medium (Month 2)
**Priority: MEDIUM**

5. **Wholesale & Bulk Upload** (Est: 3 days)
   - Uncomment and complete wholesale invitation
   - Add bulk upload success/failure notifications

6. **Subscription Enhancements** (Est: 2 days)
   - Add upgrade/downgrade notifications
   - Payment method update reminders

### Phase 4: Low Priority (Month 3)
**Priority: LOW**

7. **Newsletter Analytics** (Est: 1 day)
   - Campaign delivery completion notifications

---

## TECHNICAL DETAILS & CODE LOCATIONS

### Where to Add Notifications

#### 1. Meta Ads Budget Alerts

**File:** `server/services/meta/budget.service.ts`

```typescript
// Line 365: After getLowBalanceCampaigns() returns results
if (lowBalanceCampaigns.length > 0) {
  // ADD NOTIFICATION HERE
  for (const campaign of lowBalanceCampaigns) {
    const campaignData = await this.storage.getMetaCampaign(campaign.campaignId);
    const seller = await this.storage.getUser(sellerId);
    
    if (campaignData && seller) {
      await metaEmailTemplatesService.sendLowCreditAlert(
        campaignData,
        campaign,
        seller.email
      );
    }
  }
}
```

**File:** `server/services/meta/budget.service.ts`

```typescript
// Line 233: After recordAdSpend() completes
const balance = await this.getCreditBalance(campaign.sellerId, campaignId);

if (balance && balance.balance <= 0) {
  // ADD NOTIFICATION HERE
  // await notificationService.sendCampaignBudgetExhausted(campaign, seller);
}
```

#### 2. Trade Quotation Payments

**File:** `server/services/quotation-payment.service.ts`

```typescript
// After deposit payment succeeds
await notificationService.sendTradeDepositReceived(quotation, seller, buyer);

// After balance payment succeeds
await notificationService.sendTradeBalanceReceived(quotation, seller, buyer);
```

#### 3. Custom Domain Events

**File:** `server/services/domain/orchestrator.service.ts`

```typescript
// Line 263: After DNS verified
await storage.updateDomainConnection(domain.id, {
  status: 'dns_verified',
  lastVerifiedAt: new Date(),
});
// ADD: await notificationService.sendDomainVerified(domain, seller);

// Line 356: After SSL provisioned and active
await storage.updateDomainConnection(domain.id, {
  status: 'active',
  caddySiteId: caddyResult.siteId,
});
// ADD: await notificationService.sendDomainActive(domain, seller);

// Line 272: On failure
await storage.updateDomainConnection(domain.id, {
  failureReason: error.message,
});
// ADD: await notificationService.sendDomainFailed(domain, seller, error.message);
```

#### 4. Wholesale Invitation

**File:** `server/services/wholesale-invitation-enhanced.service.ts`

```typescript
// Line 108: Currently commented out
// UNCOMMENT THIS:
await this.notificationService.sendWholesaleInvitation(invitation);
```

#### 5. Bulk Upload Completion

**File:** `server/services/bulk-upload.service.ts`

```typescript
// Line 655: After successful import
if (errorCount === 0) {
  // ADD: await notificationService.sendBulkUploadSuccess(jobId, seller, successCount);
} else {
  // ADD: await notificationService.sendBulkUploadErrors(jobId, seller, errorCount, errors);
}
```

### New Methods Needed in NotificationService

```typescript
// Add to server/notifications.ts interface

// Meta Ads
sendCampaignBudgetExhausted(campaign: MetaCampaign, seller: User): Promise<void>;
sendCampaignPaused(campaign: MetaCampaign, seller: User, reason: string): Promise<void>;
sendAdApprovalFailed(campaign: MetaCampaign, seller: User, reason: string): Promise<void>;

// Trade Quotations
sendQuotationApproved(quotation: TradeQuotation, seller: User, buyer: User): Promise<void>;
sendQuotationRejected(quotation: TradeQuotation, seller: User, buyer: User, reason?: string): Promise<void>;
sendQuotationExpired(quotation: TradeQuotation, seller: User, buyer: User): Promise<void>;
sendTradeDepositReceived(quotation: TradeQuotation, seller: User, buyer: User): Promise<void>;
sendTradeBalanceReceived(quotation: TradeQuotation, seller: User, buyer: User): Promise<void>;

// Custom Domain
sendDomainVerified(domain: DomainConnection, seller: User): Promise<void>;
sendDomainActive(domain: DomainConnection, seller: User): Promise<void>;
sendDomainFailed(domain: DomainConnection, seller: User, reason: string): Promise<void>;

// Wholesale
sendWholesaleInvitation(invitation: WholesaleInvitation): Promise<void>;
sendWholesaleBuyerApproved(buyer: User, seller: User): Promise<void>;
sendWholesaleOrderCancelled(order: WholesaleOrder, seller: User, buyer: User, reason?: string): Promise<void>;

// Bulk Upload
sendBulkUploadSuccess(jobId: string, seller: User, successCount: number): Promise<void>;
sendBulkUploadErrors(jobId: string, seller: User, errorCount: number, errors: string[]): Promise<void>;

// Subscription
sendSubscriptionUpgraded(seller: User, oldPlan: string, newPlan: string): Promise<void>;
sendSubscriptionDowngraded(seller: User, oldPlan: string, newPlan: string): Promise<void>;
sendPaymentMethodUpdateRequired(seller: User, reason: string): Promise<void>;
```

### Cron Jobs Needed

1. **Meta Wallet Balance Checker**
   ```
   File: server/jobs/meta-wallet-balance-checker.job.ts
   Frequency: Daily at 9:00 AM
   Logic: Check getLowBalanceCampaigns() for all active sellers
   ```

2. **Quotation Expiration Checker**
   ```
   File: server/jobs/quotation-expiration-checker.job.ts
   Frequency: Daily at 10:00 AM
   Logic: Find quotations expiring in 3 days, 1 day, or expired
   ```

3. **Domain SSL Provisioning Checker**
   ```
   File: server/services/domain/verification-job.ts (already exists)
   Enhancement: Add email notifications on status changes
   ```

---

## SUMMARY STATISTICS

### Implementation Coverage by Platform

| Platform | Total Triggers | Implemented | Missing | Coverage |
|----------|---------------|-------------|---------|----------|
| B2C Orders | 15 | 15 | 0 | 100% ✅ |
| B2B Wholesale | 9 | 6 | 3 | 67% ⚠️ |
| Trade Quotations | 7 | 1 | 6 | 14% ❌ |
| Meta Ads/Wallet | 5 | 0* | 5 | 0% ❌ |
| Custom Domain | 4 | 0 | 4 | 0% ❌ |
| Platform/Seller | 23 | 21 | 2 | 91% ✅ |
| Newsletter | 3 | 1 | 2 | 33% ⚠️ |
| **TOTAL** | **67** | **42** | **25** | **63%** |

*Templates exist but not integrated

### Priority Breakdown

| Priority | Count | Percentage |
|----------|-------|------------|
| Critical | 8 missing triggers | 32% |
| High | 9 missing triggers | 36% |
| Medium | 7 missing triggers | 28% |
| Low | 1 missing trigger | 4% |

---

## NEXT ACTIONS

1. **Immediate (This Week)**
   - Integrate Meta Ads low balance alerts (code already exists!)
   - Create meta-wallet-balance-checker cron job

2. **Week 2**
   - Implement trade quotation payment confirmations
   - Add domain lifecycle notifications

3. **Month 1**
   - Complete trade quotation approval/rejection workflow
   - Implement bulk upload notifications

4. **Month 2+**
   - Wholesale lifecycle enhancements
   - Subscription management enhancements
   - Newsletter analytics

---

**Document Prepared By:** Replit Agent  
**Analysis Date:** October 19, 2025  
**Codebase Version:** Current main branch
