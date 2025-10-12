# Payment Service Provider Architecture

## Executive Summary
This document outlines a robust, provider-agnostic payment architecture designed for Upfirst's multi-seller e-commerce platform. The architecture supports multiple payment providers (Stripe, PayPal, future PSPs) while maintaining security, reliability, and excellent UX.

## Architecture Principles

### 1. Provider Abstraction
**Goal**: Seamlessly support multiple payment providers without code duplication

```typescript
interface IPaymentProvider {
  // Payment Intent Lifecycle
  createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent>;
  confirmPayment(intentId: string, params: ConfirmParams): Promise<PaymentResult>;
  cancelPayment(intentId: string): Promise<void>;
  
  // Refund Operations
  createRefund(params: RefundParams): Promise<Refund>;
  
  // Account Management (for marketplaces)
  createConnectedAccount(params: AccountParams): Promise<Account>;
  getAccountStatus(accountId: string): Promise<AccountStatus>;
  createOnboardingSession(accountId: string): Promise<OnboardingSession>;
  
  // Webhook Processing
  verifyWebhookSignature(payload: string, signature: string): boolean;
  processWebhookEvent(event: WebhookEvent): Promise<void>;
  
  // Provider-specific metadata
  readonly providerName: string;
  readonly supportedCurrencies: string[];
  readonly supportedCountries: string[];
}
```

### 2. Server-Orchestrated Payment Flow
**Problem**: Current client-side confirmation risks double-capture and state desync
**Solution**: Server manages entire payment lifecycle

```
Client Request → Server Creates Intent (Idempotent) → Client Presents UI → 
Client Confirms → Server Processes (Idempotent) → Webhook Reconciles → Order Created
```

### 3. Idempotency & Concurrency
**Critical**: Every payment operation must be idempotent

```typescript
interface IdempotentOperation {
  idempotencyKey: string; // UUID v4
  operationType: 'create_intent' | 'confirm_payment' | 'create_order';
  createdAt: Date;
  completedAt: Date | null;
  result: any;
}
```

### 4. Webhook Architecture
**Requirements**:
- Signature verification (HMAC-SHA256)
- Idempotent event processing
- Event replay protection (event ID tracking)
- Asynchronous processing with retry logic
- Dead letter queue for failed events

```typescript
interface WebhookProcessor {
  // Verify and parse webhook
  verifyAndParse(payload: string, signature: string): WebhookEvent;
  
  // Process with idempotency
  process(event: WebhookEvent): Promise<ProcessResult>;
  
  // Handle failures
  handleFailure(event: WebhookEvent, error: Error): Promise<void>;
}
```

## Implementation Plan

### Phase 1: Foundation (Critical - Week 1)

#### Task 1.1: Payment Provider Interface
**File**: `server/services/payment/payment-provider.interface.ts`

```typescript
export interface CreateIntentParams {
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  connectedAccountId?: string; // For marketplace
  applicationFeeAmount?: number;
  captureMethod?: 'automatic' | 'manual';
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  metadata: Record<string, string>;
}
```

#### Task 1.2: Stripe Provider Implementation
**File**: `server/services/payment/stripe-provider.ts`

```typescript
export class StripePaymentProvider implements IPaymentProvider {
  private stripe: Stripe;
  
  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: "2025-09-30.clover" });
  }
  
  async createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent> {
    // Idempotent creation with key
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency,
      metadata: params.metadata,
      transfer_data: params.connectedAccountId ? {
        destination: params.connectedAccountId,
      } : undefined,
      application_fee_amount: params.applicationFeeAmount,
      capture_method: params.captureMethod || 'automatic',
    }, {
      idempotencyKey: params.metadata.idempotencyKey,
    });
    
    return this.mapToPaymentIntent(intent);
  }
  
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      return true;
    } catch (err) {
      return false;
    }
  }
}
```

#### Task 1.3: Payment Service Layer
**File**: `server/services/payment.service.ts`

```typescript
export class PaymentService {
  constructor(
    private provider: IPaymentProvider,
    private storage: IStorage
  ) {}
  
  async createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent> {
    // Check for existing intent with same idempotency key
    const existing = await this.storage.getPaymentIntentByIdempotencyKey(
      params.metadata.idempotencyKey
    );
    
    if (existing) {
      return existing;
    }
    
    // Create new intent
    const intent = await this.provider.createPaymentIntent(params);
    
    // Store in database for idempotency
    await this.storage.storePaymentIntent({
      ...intent,
      idempotencyKey: params.metadata.idempotencyKey,
      createdAt: new Date(),
    });
    
    return intent;
  }
  
  async confirmPaymentAndCreateOrder(
    intentId: string,
    orderData: CreateOrderParams
  ): Promise<Order> {
    // Get intent status
    const intent = await this.storage.getPaymentIntent(intentId);
    
    if (intent.status === 'succeeded') {
      // Payment already succeeded, check if order exists
      const existingOrder = await this.storage.getOrderByPaymentIntent(intentId);
      if (existingOrder) {
        return existingOrder;
      }
    }
    
    // Confirm payment
    const result = await this.provider.confirmPayment(intentId, {});
    
    if (result.status === 'succeeded') {
      // Create order atomically
      const order = await this.storage.db.transaction(async (tx) => {
        // Reserve inventory
        await this.inventoryService.commitReservation(
          orderData.checkoutSessionId,
          tx
        );
        
        // Create order
        const newOrder = await this.storage.createOrder({
          ...orderData,
          paymentIntentId: intentId,
          paymentStatus: 'paid',
        }, tx);
        
        return newOrder;
      });
      
      return order;
    }
    
    throw new Error(`Payment failed: ${result.status}`);
  }
}
```

### Phase 2: Webhook Infrastructure (Critical - Week 1)

#### Task 2.1: Webhook Handler
**File**: `server/routes/webhooks.ts`

```typescript
export function registerWebhookRoutes(app: Express, paymentService: PaymentService) {
  // Stripe webhooks - RAW body needed for signature verification
  app.post('/api/webhooks/stripe', 
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body.toString();
      
      try {
        // Verify signature
        if (!paymentService.provider.verifyWebhookSignature(payload, signature)) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
        
        const event = JSON.parse(payload);
        
        // Check if already processed (idempotency)
        const processed = await storage.isWebhookEventProcessed(event.id);
        if (processed) {
          return res.status(200).json({ received: true, status: 'already_processed' });
        }
        
        // Process event asynchronously
        await paymentService.processWebhookEvent(event);
        
        // Mark as processed
        await storage.markWebhookEventProcessed(event.id);
        
        res.status(200).json({ received: true });
      } catch (error) {
        logger.error('Webhook processing failed', error);
        
        // Store failed event for retry
        await storage.storeFailedWebhookEvent({
          eventId: event?.id,
          payload,
          error: error.message,
          retryCount: 0,
        });
        
        res.status(500).json({ error: 'Processing failed' });
      }
    }
  );
}
```

#### Task 2.2: Event Processing
```typescript
async processWebhookEvent(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.handlePaymentSucceeded(event.data.object);
      break;
      
    case 'payment_intent.payment_failed':
      await this.handlePaymentFailed(event.data.object);
      break;
      
    case 'account.updated':
      await this.handleAccountUpdated(event.data.object);
      break;
      
    case 'charge.refunded':
      await this.handleRefundProcessed(event.data.object);
      break;
  }
}

private async handlePaymentSucceeded(intent: any): Promise<void> {
  // Update payment intent status
  await this.storage.updatePaymentIntentStatus(intent.id, 'succeeded');
  
  // Check if order already created
  const order = await this.storage.getOrderByPaymentIntent(intent.id);
  if (order) {
    // Order already exists, update status
    await this.storage.updateOrderPaymentStatus(order.id, 'paid');
  }
  
  // Send confirmation email
  await this.notificationService.sendPaymentConfirmation(order);
}
```

### Phase 3: Enhanced UX & Error Handling (Week 2)

#### Task 3.1: Loading States
```typescript
// Checkout with proper loading states
export function EnhancedCheckout() {
  const [isLoadingIntent, setIsLoadingIntent] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  return (
    <>
      {isLoadingIntent && <PaymentFormSkeleton />}
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button onClick={retry} className="mt-2">
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Processing your payment...</p>
            <p className="text-sm text-muted-foreground">Please don't close this window</p>
          </div>
        </div>
      )}
    </>
  );
}
```

#### Task 3.2: Recovery Flows
```typescript
// Handle Stripe account restrictions
async function checkAccountHealth(accountId: string): Promise<AccountHealth> {
  const account = await stripe.accounts.retrieve(accountId);
  
  return {
    canAcceptPayments: account.charges_enabled,
    canReceivePayouts: account.payouts_enabled,
    requirementsStatus: {
      currentlyDue: account.requirements?.currently_due || [],
      pastDue: account.requirements?.past_due || [],
      eventuallyDue: account.requirements?.eventually_due || [],
    },
    restrictions: {
      isRestricted: !!account.requirements?.disabled_reason,
      reason: account.requirements?.disabled_reason,
    },
  };
}
```

### Phase 4: PayPal Integration Preparation (Week 3)

#### Task 4.1: PayPal Provider
```typescript
export class PayPalPaymentProvider implements IPaymentProvider {
  async createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent> {
    // PayPal's "Orders API" equivalent
    const order = await this.paypal.orders.create({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: params.currency,
          value: params.amount.toString(),
        },
      }],
    });
    
    return {
      id: order.id,
      clientSecret: order.id, // PayPal uses order ID differently
      amount: params.amount,
      currency: params.currency,
      status: 'requires_payment_method',
      metadata: params.metadata,
    };
  }
}
```

#### Task 4.2: Provider Factory
```typescript
export class PaymentProviderFactory {
  static create(providerType: 'stripe' | 'paypal'): IPaymentProvider {
    switch (providerType) {
      case 'stripe':
        return new StripePaymentProvider(process.env.STRIPE_SECRET_KEY!);
      case 'paypal':
        return new PayPalPaymentProvider(
          process.env.PAYPAL_CLIENT_ID!,
          process.env.PAYPAL_SECRET!
        );
      default:
        throw new Error(`Unknown provider: ${providerType}`);
    }
  }
}
```

## Database Schema Updates

### Payment Intents Table
```typescript
export const paymentIntents = pgTable("payment_intents", {
  id: varchar("id").primaryKey(),
  providerName: varchar("provider_name").notNull(), // 'stripe' | 'paypal'
  providerIntentId: varchar("provider_intent_id").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status").notNull(),
  clientSecret: text("client_secret"),
  metadata: jsonb("metadata"),
  idempotencyKey: varchar("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

### Webhook Events Table
export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey(),
  providerName: varchar("provider_name").notNull(),
  eventType: varchar("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

### Failed Webhooks Table
export const failedWebhookEvents = pgTable("failed_webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id"),
  providerName: varchar("provider_name").notNull(),
  payload: text("payload").notNull(),
  error: text("error").notNull(),
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

## Security Checklist

- [x] Webhook signature verification (HMAC-SHA256)
- [x] Idempotency keys for all mutations
- [x] Rate limiting on payment endpoints
- [x] CSRF tokens on payment forms
- [x] PCI compliance via provider SDKs (never touch card data)
- [x] SQL injection prevention (parameterized queries)
- [x] Secret key rotation strategy
- [ ] Fraud detection integration
- [ ] 3D Secure support

## Performance Optimizations

1. **Stripe Elements Optimization**
   - Preload Stripe.js on checkout page load
   - Cache stripe instance globally
   - Use appearance API to avoid custom CSS overhead

2. **Webhook Processing**
   - Async processing with job queue
   - Batch similar events
   - Exponential backoff for retries

3. **Database Queries**
   - Index on idempotency_key
   - Index on payment_intent_id for orders
   - Index on webhook event_id

## Testing Strategy

### Unit Tests
- Payment provider interface compliance
- Idempotency key generation and validation
- Webhook signature verification
- Error handling paths

### Integration Tests
- Complete payment flow (intent → confirmation → order)
- Webhook event processing
- Concurrent payment attempts
- Refund scenarios

### E2E Tests
- Full checkout experience
- Account onboarding flow
- Payment failure recovery
- Multi-currency payments

## Migration Strategy

### Phase 1: Infrastructure (No Breaking Changes)
1. Add new tables (payment_intents, webhook_events, failed_webhooks)
2. Create payment service abstraction
3. Deploy webhook endpoints
4. Start logging all payment operations

### Phase 2: Gradual Migration
1. Route new payments through PaymentService
2. Keep old flow as fallback
3. Monitor for issues
4. Gradually increase traffic to new flow

### Phase 3: Cleanup
1. Remove old payment code
2. Archive legacy payment data
3. Update documentation

## Monitoring & Alerts

### Key Metrics
- Payment success rate (target: >99%)
- Webhook processing time (target: <1s p95)
- Failed payment rate (alert if >1%)
- Webhook retry rate (alert if >5%)

### Dashboards
- Real-time payment volume
- Provider comparison (Stripe vs PayPal)
- Error rates by type
- Refund trends

## Conclusion

This architecture provides:
✅ Multi-provider support (extensible)
✅ Robust error handling and recovery
✅ Idempotent operations (no double-charging)
✅ Secure webhook processing
✅ Excellent UX with loading states
✅ Comprehensive testing strategy
✅ Clear migration path

**Estimated Timeline**: 3-4 weeks for full implementation
**Risk Level**: Medium (requires careful testing)
**Impact**: High (enables PayPal + future providers)
