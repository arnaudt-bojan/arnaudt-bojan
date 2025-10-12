# Webhook Infrastructure

## Overview
Comprehensive webhook handling system with signature verification, idempotency, dead letter queue, and automatic retry.

## Architecture

### WebhookHandler Service
Located: `server/services/payment/webhook-handler.ts`

**Features:**
- ✅ Signature verification via payment provider
- ✅ Idempotent event processing (deduplication)
- ✅ Dead letter queue for failed events
- ✅ Automatic retry mechanism with exponential backoff
- ✅ Currency-aware payment processing
- ✅ Inventory commitment on payment success
- ✅ Inventory release on payment failure

**Dependencies:**
- `IStorage` - Database operations
- `IPaymentProvider` - Payment gateway integration (e.g., StripePaymentProvider)
- `InventoryService` - Stock management

### Supported Events

#### Payment Events (Implemented)
1. **payment_intent.succeeded**
   - Updates payment intent status to 'succeeded'
   - Converts amount from minor units to major units (currency-aware)
   - Updates order to 'fully_paid' and 'processing'
   - Commits inventory reservations (decrements stock)
   - Deletes reservations after commit

2. **payment_intent.payment_failed**
   - Updates payment intent status to 'failed'
   - Logs failure for monitoring

3. **payment_intent.canceled**
   - Updates payment intent status to 'canceled'
   - Releases inventory reservations

4. **charge.refunded**
   - Logs refund for tracking
   - (Additional logic can be added)

5. **account.updated** (Stripe Connect)
   - Logs account status changes
   - (Can update seller's account status in database)

#### Subscription Events (Legacy - in routes.ts)
Currently handled in old webhook route:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded

## Infrastructure Components

### 1. RAW Body Parsing
**Location:** `server/index.ts:36`
```typescript
app.use('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '10mb' }));
```
- Stripe requires raw body for signature verification
- Applied ONLY to webhook route (other routes use JSON parsing)

### 2. Signature Verification
**Method:** `StripePaymentProvider.verifyWebhookSignature()`
- Uses Stripe SDK's `constructEvent()` method
- Verifies HMAC signature with webhook secret
- Returns validated event or throws error

### 3. Idempotency System
**Tables:** `webhook_events`, `failed_webhook_events`

**Deduplication Logic:**
1. Check if event.id already exists in `webhook_events`
2. If exists, return success without processing (skip)
3. If new, process event and store in `webhook_events`

**Schema:**
```sql
CREATE TABLE webhook_events (
  id VARCHAR PRIMARY KEY (UUID),
  event_id VARCHAR NOT NULL UNIQUE, -- Stripe event ID
  provider_name VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  event_data JSONB,
  processed_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Dead Letter Queue (DLQ)
**Table:** `failed_webhook_events`

**Purpose:** Store failed webhook events for manual retry

**Schema:**
```sql
CREATE TABLE failed_webhook_events (
  id VARCHAR PRIMARY KEY (UUID),
  event_id VARCHAR NOT NULL,
  provider_name VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  payload TEXT NOT NULL, -- Original raw body for signature re-verification
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Retry Logic:**
- Automatic retry via `WebhookHandler.retryFailedWebhooks()`
- Fetches up to 10 unprocessed failed events
- Parses original payload and reconstructs event
- Re-processes event
- On success: marks as processed, deletes from DLQ
- On failure: increments retry_count

### 5. Currency Conversion
**Zero-decimal currencies (divisor = 1):**
BIF, CLP, DJF, GNF, JPY, KMF, KRW, MGA, PYG, RWF, UGX, VND, VUV, XAF, XOF, XPF

**Two-decimal currencies (divisor = 100):**
USD, GBP, EUR, CAD, AUD, and most others

**Three-decimal currencies (divisor = 1000):**
BHD, JOD, KWD, OMR, TND

**Conversion Formula:**
```typescript
amountPaid = (amountInMinorUnits / divisor).toString()
```

## Usage

### Initialization
```typescript
// routes.ts
import { StripePaymentProvider } from "./services/payment/stripe-provider";
import { WebhookHandler } from "./services/payment/webhook-handler";

const stripeProvider = new StripePaymentProvider(stripe, webhookSecret);
const webhookHandler = new WebhookHandler(storage, stripeProvider, inventoryService);
```

### Webhook Route
```typescript
app.post("/api/stripe/webhook", async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  const rawBody = req.body.toString('utf8'); // Convert raw buffer to string
  
  const result = await webhookHandler.handleWebhook(rawBody, signature);
  
  if (result.success) {
    res.status(200).json({ received: true });
  } else {
    res.status(400).json({ error: result.error });
  }
});
```

### Manual Retry
```typescript
// Run periodically (cron job, background task)
await webhookHandler.retryFailedWebhooks();
```

## Migration Status

### Current State (Hybrid)
- ✅ WebhookHandler implemented with full infrastructure
- ✅ Handles all payment_intent.* events
- ⚠️ Old webhook route still active for subscription events
- ⚠️ Duplicate code exists for payment events

### Migration Path
1. **Phase 1 (Current):** WebhookHandler ready, old route still active
2. **Phase 2 (Next):** Add subscription event handling to WebhookHandler
3. **Phase 3 (Final):** Replace entire webhook route with WebhookHandler

### Action Items
- [ ] Add subscription event handlers to WebhookHandler:
  - checkout.session.completed
  - customer.subscription.*
  - invoice.payment_succeeded
- [ ] Replace old webhook route entirely
- [ ] Remove duplicate payment event handling from routes.ts

## Monitoring & Debugging

### Log Events
```typescript
logger.info(`[Webhook] Received event: ${event.type}`);
logger.info(`[Webhook] Event ${event.id} already processed, skipping`);
logger.info(`[Webhook] Updated order ${orderId} to fully_paid`);
logger.error(`[Webhook] Failed to commit inventory:`, error);
```

### Check Failed Events
```sql
SELECT * FROM failed_webhook_events 
WHERE retry_count < 5 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Event History
```sql
SELECT event_id, event_type, processed_at 
FROM webhook_events 
WHERE event_type = 'payment_intent.succeeded'
ORDER BY processed_at DESC;
```

## Security Best Practices

### 1. Signature Verification (REQUIRED)
- NEVER process webhooks without signature verification
- Use `stripe.webhooks.constructEvent()` for automatic verification
- Store webhook secret in environment variable
- Rotate webhook secret periodically

### 2. Idempotency (REQUIRED)
- Always check event.id before processing
- Store processed events to prevent double-processing
- Return 200 OK for already-processed events

### 3. Error Handling
- Return 200 OK even if processing fails (after storing in DLQ)
- Don't throw errors that cause 5xx responses (Stripe will retry forever)
- Log all errors with context for debugging

### 4. Timeout Protection
- Process webhooks quickly (< 10 seconds)
- For long operations, use background jobs
- Stripe has 30-second timeout for webhook responses

## Configuration

### Environment Variables
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Dashboard Setup
1. Go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - payment_intent.canceled
   - charge.refunded
   - account.updated (for Connect)
4. Copy webhook secret to STRIPE_WEBHOOK_SECRET
