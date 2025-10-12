# Payment Service Storage Requirements

## New IStorage Methods Needed

The PaymentService requires these additional storage methods to be added to `IStorage`:

### 1. createPaymentIntent
```typescript
createPaymentIntent(data: {
  providerName: string;
  providerIntentId: string;
  amount: string;
  currency: string;
  status: string;
  clientSecret: string;
  metadata: string;
}): Promise<PaymentIntent>;
```

**Purpose**: Store payment intent in database for 3DS authentication flows and confirmation tracking

**Used in**:
- `PaymentService.createPaymentIntent()` - stores intent after Stripe creation (line 183)

### 2. getReservationsByCheckoutSession
```typescript
getReservationsByCheckoutSession(checkoutSessionId: string): Promise<StockReservation[]>;
```

**Purpose**: Retrieve all inventory reservations for a checkout session to enable batch release

**Used in**:
- `PaymentService.createPaymentIntent()` - rollback on failure (line 215)
- `PaymentService.cancelPayment()` - release inventory on cancellation (line 311)

### 3. deleteOrder
```typescript
deleteOrder(orderId: string): Promise<void>;
```

**Purpose**: Delete pending order during rollback when payment intent creation fails

**Used in**:
- `PaymentService.createPaymentIntent()` - rollback cleanup (line 228)

## Implementation Priority

1. **High Priority** - `createPaymentIntent`: Required for 3DS flows to work
2. **High Priority** - `getReservationsByCheckoutSession`: Required for proper inventory cleanup
3. **Medium Priority** - `deleteOrder`: Rollback works without it but leaves orphaned orders

## Alternative Approaches

If immediate storage implementation is blocked:

1. **For 3DS**: Payment intent is stored in Stripe and webhooks can handle status updates
2. **For inventory release**: Cleanup job can expire reservations after 15 minutes
3. **For order cleanup**: Keep orphaned orders but mark them as 'failed' instead of deleting

The current implementation includes try/catch blocks to gracefully handle missing methods while logging errors.
