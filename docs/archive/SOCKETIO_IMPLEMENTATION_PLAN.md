# 🔌 SOCKET.IO COMPREHENSIVE IMPLEMENTATION PLAN
**Date**: October 20, 2025  
**Scope**: Systematic Real-Time Updates for ALL Features  
**Standard**: Socket.IO Best Practices, No Missed Opportunities

---

## EXECUTIVE SUMMARY

**Current Coverage**: Only 20% of features have real-time updates  
**Goal**: 100% coverage for all user-facing state changes  
**Approach**: Systematic implementation across all modules

### Current Implementation (Completed)
✅ **Orders** (3 events)
- `order:updated` - Create, fulfillment, refund

✅ **Cart** (4 events)
- `cart:updated` - Add, update, remove, clear items

✅ **Basic Infrastructure**
- User rooms (`user:{userId}`)
- Seller broadcast room (`sellers`)
- Connection/disconnection handling

### Missing Implementation (To Do)
❌ **Products** - 0 events (should have 6+)
❌ **Wholesale** - 0 events (should have 8+)
❌ **Quotations** - 0 events (should have 7+)
❌ **Analytics** - 0 events (should have 5+)
❌ **Notifications** - 1 basic event (should have 8+)
❌ **Stock Alerts** - 0 events (should have 3+)

---

## 📊 COMPREHENSIVE SOCKET.IO EVENT MAPPING

### 1. PRODUCTS MODULE (6 Events)

| Event Name | Trigger | Emit To | Priority |
|------------|---------|---------|----------|
| `product:created` | `createProduct()` | Seller + storefront visitors | P0 |
| `product:updated` | `updateProduct()` | Seller + users viewing product | P0 |
| `product:deleted` | `deleteProduct()` | Seller + users with product in cart | P0 |
| `product:stock_changed` | Inventory update | Users viewing product + cart users | P0 |
| `product:price_changed` | Price update | Users viewing product + cart users | P0 |
| `product:low_stock` | Stock < threshold | Seller only | P1 |

**Current Code** (`product.service.ts`):
```typescript
// ❌ Lines 138-142: NO Socket.IO emission
const product = await this.prisma.products.create({
  data: productData,
});
return product; // Just returns, no event
```

**Should Be**:
```typescript
// ✅ Emit to seller and storefront visitors
const product = await this.prisma.products.create({
  data: productData,
});

this.websocketGateway.emitProductCreated(sellerId, product);
this.websocketGateway.broadcastToStorefront(sellerId, 'product:created', product);

return product;
```

---

### 2. WHOLESALE MODULE (8 Events)

| Event Name | Trigger | Emit To | Priority |
|------------|---------|---------|----------|
| `wholesale:invitation_sent` | `createWholesaleInvitation()` | Seller | P0 |
| `wholesale:invitation_accepted` | `acceptWholesaleInvitation()` | Seller + Buyer | P0 |
| `wholesale:invitation_rejected` | `rejectWholesaleInvitation()` | Seller | P0 |
| `wholesale:order_placed` | `placeWholesaleOrder()` | Seller + Buyer | P0 |
| `wholesale:order_updated` | Order status change | Seller + Buyer | P0 |
| `wholesale:deposit_paid` | Deposit payment | Seller + Buyer | P0 |
| `wholesale:balance_paid` | Balance payment | Seller + Buyer | P0 |
| `wholesale:order_shipped` | Shipping update | Buyer | P1 |

**Current Code** (`wholesale.service.ts`):
```typescript
// ❌ Lines 20-32: NO Socket.IO emission
const invitation = await this.prisma.wholesale_invitations.create({
  data: {
    seller_id: sellerId,
    buyer_email: input.buyerEmail,
    // ...
  },
});
return this.mapInvitationToGraphQL(invitation); // No event
```

**Should Be**:
```typescript
// ✅ Emit to seller
const invitation = await this.prisma.wholesale_invitations.create({
  data: {
    seller_id: sellerId,
    buyer_email: input.buyerEmail,
    // ...
  },
});

this.websocketGateway.emitWholesaleInvitationSent(sellerId, invitation);

return this.mapInvitationToGraphQL(invitation);
```

---

### 3. QUOTATIONS MODULE (7 Events)

| Event Name | Trigger | Emit To | Priority |
|------------|---------|---------|----------|
| `quotation:created` | `createQuotation()` | Seller | P0 |
| `quotation:updated` | `updateQuotation()` | Seller + Buyer (if sent) | P0 |
| `quotation:sent` | Status → sent | Buyer | P0 |
| `quotation:viewed` | Buyer views | Seller | P0 |
| `quotation:accepted` | Buyer accepts | Seller | P0 |
| `quotation:rejected` | Buyer rejects | Seller | P0 |
| `quotation:expired` | Expires | Seller + Buyer | P1 |

**Current Code** (`quotations.service.ts`):
```typescript
// ❌ Lines 42-70: NO Socket.IO emission
const quotation = await this.prisma.trade_quotations.create({
  data: quotationData,
});

// Creates items, creates event, but NO Socket.IO
await this.prisma.trade_quotation_events.create({
  data: {
    quotation_id: quotation.id,
    event_type: 'created',
    performed_by: sellerId,
  },
});

return this.mapQuotationToGraphQL(quotation); // No Socket.IO
```

**Should Be**:
```typescript
// ✅ Emit to seller
const quotation = await this.prisma.trade_quotations.create({
  data: quotationData,
});

await this.prisma.trade_quotation_events.create({
  data: {
    quotation_id: quotation.id,
    event_type: 'created',
    performed_by: sellerId,
  },
});

this.websocketGateway.emitQuotationCreated(sellerId, quotation);

return this.mapQuotationToGraphQL(quotation);
```

---

### 4. ANALYTICS MODULE (5 Events)

| Event Name | Trigger | Emit To | Priority |
|------------|---------|---------|----------|
| `analytics:sale_completed` | Order completed | Seller dashboard | P0 |
| `analytics:product_viewed` | Product view | Seller dashboard (aggregated) | P1 |
| `analytics:revenue_updated` | Payment received | Seller dashboard | P0 |
| `analytics:inventory_alert` | Low stock | Seller dashboard | P0 |
| `analytics:metrics_updated` | Periodic refresh | Seller dashboard | P1 |

**Current Status**: No analytics service with Socket.IO

**Should Have**:
```typescript
// When order is completed
this.websocketGateway.emitAnalyticsUpdate(sellerId, {
  type: 'sale_completed',
  amount: order.total,
  productId: order.items[0].productId,
  timestamp: new Date(),
});
```

---

### 5. NOTIFICATION SYSTEM (8 Events)

| Event Name | Trigger | Emit To | Priority |
|------------|---------|---------|----------|
| `notification:order` | Order events | Buyer + Seller | P0 |
| `notification:payment` | Payment events | Buyer + Seller | P0 |
| `notification:shipping` | Shipping events | Buyer | P0 |
| `notification:wholesale` | Wholesale events | Buyer + Seller | P0 |
| `notification:quotation` | Quotation events | Buyer + Seller | P0 |
| `notification:system` | System announcements | All users | P1 |
| `notification:read` | Notification marked read | User | P1 |
| `notification:deleted` | Notification deleted | User | P1 |

**Current Code**: Only basic `emitNotification()` exists

**Should Have**: Typed notification events for each category

---

### 6. STOCK ALERTS (3 Events)

| Event Name | Trigger | Emit To | Priority |
|------------|---------|---------|----------|
| `stock:low` | Stock < 10 | Seller | P0 |
| `stock:out` | Stock = 0 | Seller + users viewing | P0 |
| `stock:restocked` | Stock updated > 0 | Users who viewed OOS product | P1 |

**Current Status**: No stock alert system

---

## 🏗️ IMPLEMENTATION ARCHITECTURE

### Best Practices to Follow

#### 1. Room Strategy
```typescript
// User-specific rooms
`user:{userId}` → Individual user updates

// Seller-specific rooms
`seller:{sellerId}` → Seller dashboard updates
`storefront:{sellerId}` → Storefront visitors

// Product-specific rooms
`product:{productId}` → Users viewing specific product

// Global rooms
`sellers` → All sellers (system announcements)
`buyers` → All buyers (system announcements)
```

#### 2. Event Naming Convention
```
{module}:{action}
Examples:
- product:created
- product:updated
- wholesale:invitation_sent
- quotation:accepted
```

#### 3. Event Payload Structure
```typescript
interface SocketEvent<T> {
  type: string;          // Event type
  data: T;               // Event data
  timestamp: Date;       // Event timestamp
  userId?: string;       // User who triggered (optional)
  metadata?: any;        // Additional context
}
```

#### 4. Error Handling
```typescript
try {
  // Business logic
  const result = await this.prisma.products.create({ ... });
  
  // Emit event (non-blocking)
  this.websocketGateway.emitProductCreated(sellerId, result);
  
  return result;
} catch (error) {
  // Don't fail business logic if Socket.IO fails
  this.logger.error(`Socket.IO emission failed: ${error.message}`);
  throw error; // Re-throw original error
}
```

---

## 📅 IMPLEMENTATION PLAN (5-Week Timeline)

### Week 1: Infrastructure Enhancement (8h)
- [ ] Add new room types (storefront, product-specific)
- [ ] Create comprehensive event interfaces
- [ ] Add room joining/leaving methods
- [ ] Add broadcast helpers

### Week 2: Product Real-Time (12h)
- [ ] `product:created` event
- [ ] `product:updated` event  
- [ ] `product:deleted` event
- [ ] `product:stock_changed` event
- [ ] `product:price_changed` event
- [ ] Test product events end-to-end

### Week 3: Wholesale Real-Time (12h)
- [ ] `wholesale:invitation_sent` event
- [ ] `wholesale:invitation_accepted` event
- [ ] `wholesale:invitation_rejected` event
- [ ] `wholesale:order_placed` event
- [ ] `wholesale:order_updated` event
- [ ] Test wholesale events end-to-end

### Week 4: Quotations Real-Time (10h)
- [ ] `quotation:created` event
- [ ] `quotation:updated` event
- [ ] `quotation:sent` event
- [ ] `quotation:accepted` event
- [ ] `quotation:rejected` event
- [ ] Test quotation events end-to-end

### Week 5: Analytics & Notifications (12h)
- [ ] Analytics real-time dashboard
- [ ] Comprehensive notification system
- [ ] Stock alert system
- [ ] System-wide testing
- [ ] Performance optimization

---

## 🎯 SUCCESS METRICS

### Coverage Target
- **Current**: 2/10 modules (20%)
- **Target**: 10/10 modules (100%)

### Event Count Target
- **Current**: 7 events
- **Target**: 44+ events

### Performance Target
- Socket.IO latency: < 50ms
- Event delivery rate: > 99.9%
- Server CPU overhead: < 5%

---

## 📋 PRIORITY MATRIX

### P0 (Critical - Must Have)
1. Product updates (affects users viewing/buying)
2. Wholesale invitations (business critical)
3. Wholesale orders (business critical)
4. Quotation status changes (business critical)
5. Stock changes (affects purchasing)

### P1 (Important - Should Have)
6. Analytics real-time
7. Low stock alerts
8. Comprehensive notifications
9. System announcements

### P2 (Nice to Have)
10. Product view tracking
11. User presence indicators
12. Typing indicators (chat)

---

## 🔧 TECHNICAL REQUIREMENTS

### Dependencies (Already Installed)
✅ `socket.io` v4.8.0
✅ `@nestjs/websockets` v11.1.6
✅ `@nestjs/platform-socket.io` v11.1.6

### Frontend Integration Needed
```typescript
// apps/nextjs/lib/socket-client.ts
import { io, Socket } from 'socket.io-client';

export const socket: Socket = io('http://localhost:4000', {
  auth: {
    userId: getCurrentUserId(),
  },
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Listen for events
socket.on('product:updated', (data) => {
  // Update product UI
  queryClient.invalidateQueries(['product', data.productId]);
});

socket.on('order:updated', (data) => {
  // Update order UI
  queryClient.invalidateQueries(['order', data.orderId]);
});
```

---

## 🚀 NEXT STEPS

1. **Review & Approve** this plan
2. **Start Week 1** - Enhance infrastructure
3. **Implement systematically** - One module per week
4. **Test thoroughly** - E2E tests for each event
5. **Monitor performance** - Track latency and delivery rates

---

**Estimated Total Effort**: 54 hours (5-6 weeks part-time)  
**Risk Level**: Low (non-breaking, additive changes)  
**Business Impact**: High (improved user experience, real-time updates)
