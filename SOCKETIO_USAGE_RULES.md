# Socket.IO Usage Rules - Upfirst Platform
**Version**: 1.0  
**Last Updated**: October 20, 2025  
**Status**: ✅ Mandatory for ALL State Changes

---

## 🎯 CORE PRINCIPLE

**Socket.IO MUST be used for ALL user-facing state changes**

Any operation that modifies data visible to users (buyer, seller, or both) MUST emit a Socket.IO event to notify affected parties in real-time.

---

## 📋 MANDATORY CHECKLIST

Before implementing ANY state-changing operation, ask:

- [ ] Does this change affect user-visible data?
- [ ] Should the buyer be notified?
- [ ] Should the seller be notified?
- [ ] Should both parties be notified?
- [ ] Have I emitted Socket.IO to ALL affected parties?
- [ ] Is the emission AFTER the successful database update?
- [ ] Is the emission fire-and-forget (non-blocking)?

---

## 🏗️ ARCHITECTURE PATTERNS

### Pattern 1: NestJS Services (GraphQL API)

**Use**: `AppWebSocketGateway` from `websocket.gateway.ts`

```typescript
// 1. Import and inject gateway
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class MyService {
  constructor(
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly websocketGateway: AppWebSocketGateway,
  ) {}

  // 2. Emit after database operation
  async updateOrder(orderId: string) {
    const order = await this.prisma.orders.update({...});
    
    // Emit to buyer
    this.websocketGateway.emitOrderUpdate(order.user_id, orderData);
    // Emit to seller
    this.websocketGateway.emitOrderUpdate(order.seller_id, orderData);
    
    return order;
  }
}
```

**Module Import**:
```typescript
import { Module, forwardRef } from '@nestjs/common';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [forwardRef(() => WebSocketModule)],
})
export class MyModule {}
```

### Pattern 2: Express Services (Legacy API)

**Use**: `orderWebSocketService` from `server/websocket.ts`

```typescript
import { orderWebSocketService } from '../websocket';

// Emit after database operation
await storage.updateOrder(orderId, {...});

orderWebSocketService.broadcastOrderUpdate(orderId, {
  status: 'shipped',
  trackingNumber: '123456',
});
```

---

## 🎯 WHEN TO USE SOCKET.IO

### ✅ ALWAYS Use Socket.IO For:

1. **Orders**
   - Order created
   - Order status changed (pending → processing → shipped → delivered)
   - Payment status changed (pending → paid → failed → refunded)
   - Fulfillment status updated
   - Tracking number added
   - Refunds issued

2. **Cart**
   - Item added
   - Item removed
   - Quantity updated
   - Cart cleared
   - Shipping address changed

3. **Products**
   - Product created
   - Product updated (name, price, description)
   - Stock changed
   - Price changed
   - Low stock alert (seller only)
   - Out of stock
   - Restocked

4. **Wholesale**
   - Invitation sent
   - Invitation accepted
   - Invitation rejected
   - Wholesale order placed
   - Order status updated

5. **Quotations**
   - Quotation created
   - Quotation updated
   - Quotation sent to buyer
   - Quotation accepted/rejected

6. **Payments** (via Webhooks)
   - Payment succeeded
   - Payment failed
   - Payment canceled
   - Charge refunded

7. **Analytics**
   - Sale completed
   - Revenue metrics updated
   - Product performance changed

### ❌ DO NOT Use Socket.IO For:

- Read-only operations (GET requests)
- Internal system operations with no user impact
- Operations where real-time updates don't add value
- Background jobs that users don't need to know about immediately

---

## 🎯 WHO TO NOTIFY

### Buyer Only
- Cart updates
- Personal order status (when viewing their order)
- Payment confirmation for their order

### Seller Only
- Low stock alerts
- New order notifications
- Revenue analytics updates
- Wholesale invitation responses

### BOTH Buyer and Seller
- Order fulfillment updates
- Order status changes
- Payment status changes
- Refunds
- Quotation status changes
- Wholesale order updates

---

## 🎨 EVENT NAMING CONVENTION

**Pattern**: `{module}:{action}`

**Examples**:
- `product:created`
- `product:updated`
- `product:deleted`
- `order:updated`
- `cart:updated`
- `wholesale:invitation_sent`
- `wholesale:order_placed`
- `quotation:created`
- `quotation:updated`
- `analytics:sale_completed`
- `stock:low`
- `stock:out`
- `stock:restocked`

---

## 🎯 ROOM TARGETING

### User-Specific Rooms
```typescript
// Target individual user
`user:{userId}` → this.websocketGateway.emitToUser(userId, event, data)
```

### Seller Dashboard Rooms
```typescript
// Target seller dashboard
`storefront:{sellerId}` → this.websocketGateway.emitToStorefront(sellerId, event, data)
```

### Product Page Rooms
```typescript
// Target users viewing specific product
`product:{productId}` → this.websocketGateway.emitToProduct(productId, event, data)
```

### Broadcast Rooms (Use Sparingly)
```typescript
// Target all sellers (system announcements only)
`sellers` → this.websocketGateway.emitToSellers(event, data)
```

---

## ⚠️ CRITICAL RULES

### 1. Emit AFTER Database Success
```typescript
// ✅ CORRECT
const order = await this.prisma.orders.update({...});
this.websocketGateway.emitOrderUpdate(userId, order);

// ❌ WRONG - Don't emit before DB update
this.websocketGateway.emitOrderUpdate(userId, order);
const order = await this.prisma.orders.update({...});
```

### 2. Fire-and-Forget (Non-Blocking)
```typescript
// ✅ CORRECT - No await, no error handling
this.websocketGateway.emitOrderUpdate(userId, order);
return order;

// ❌ WRONG - Don't await Socket.IO emissions
await this.websocketGateway.emitOrderUpdate(userId, order);
```

### 3. Notify ALL Affected Parties
```typescript
// ✅ CORRECT - Notify both buyer and seller
this.websocketGateway.emitOrderUpdate(order.user_id, orderData);
this.websocketGateway.emitOrderUpdate(order.seller_id, orderData);

// ❌ WRONG - Only notifying buyer
this.websocketGateway.emitOrderUpdate(order.user_id, orderData);
// Forgot seller!
```

### 4. Use Proper Typed Payloads
```typescript
// ✅ CORRECT - Use typed event interfaces
this.websocketGateway.emitProductCreated(sellerId, {
  productId: product.id,
  sellerId: product.seller_id,
  name: product.name,
  price: product.price.toString(),
});

// ❌ WRONG - Arbitrary payload
this.websocketGateway.emitProductCreated(sellerId, {
  randomField: 'value',
});
```

---

## 🛠️ IMPLEMENTATION CHECKLIST

When adding a new feature:

1. **Identify State Changes**
   - [ ] List all database mutations (create, update, delete)
   - [ ] Identify who should be notified (buyer/seller/both)

2. **Add Socket.IO Emissions**
   - [ ] Import gateway/websocket service
   - [ ] Emit after EACH successful database operation
   - [ ] Use correct method for target audience
   - [ ] Use typed event payloads

3. **Update Module Imports**
   - [ ] Add `forwardRef(() => WebSocketModule)` to imports
   - [ ] Inject gateway with `forwardRef` in constructor

4. **Create Event Interfaces** (if new event type)
   - [ ] Add to `apps/nest-api/src/modules/websocket/events/`
   - [ ] Define typed interface for payload
   - [ ] Export from event file

5. **Add Gateway Methods** (if new event type)
   - [ ] Add emission method to `websocket.gateway.ts`
   - [ ] Use proper room targeting
   - [ ] Follow naming convention

6. **Test**
   - [ ] Verify event is emitted after operation
   - [ ] Verify correct users receive event
   - [ ] Verify payload structure
   - [ ] Check logs for emission confirmations

---

## 🔍 CODE REVIEW CHECKLIST

When reviewing code, check:

- [ ] Are ALL database mutations followed by Socket.IO?
- [ ] Are emissions AFTER successful database updates?
- [ ] Are ALL affected parties notified?
- [ ] Is the emission method correct (NestJS vs Express)?
- [ ] Are typed event interfaces used?
- [ ] Is the event name following convention?
- [ ] Are emissions fire-and-forget?

---

## 📊 CURRENT COVERAGE

### ✅ Fully Implemented (100% Coverage)
- Cart (add, update, remove, clear)
- Products (create, update, delete, stock, price)
- Wholesale (invitations, orders)
- Quotations (full lifecycle)
- Orders (create, fulfillment, refund, payment webhooks)
- Analytics (sale completed)

### 🎯 Future Enhancements
- Subscription lifecycle events
- User profile updates
- Notification creation events
- Newsletter campaign events

---

## 🚫 COMMON MISTAKES

### Mistake 1: Only Notifying Buyer
```typescript
// ❌ WRONG
this.websocketGateway.emitOrderUpdate(order.user_id, orderData);
// Seller not notified!

// ✅ CORRECT
this.websocketGateway.emitOrderUpdate(order.user_id, orderData);
this.websocketGateway.emitOrderUpdate(order.seller_id, orderData);
```

### Mistake 2: Emitting Before Database Success
```typescript
// ❌ WRONG
this.websocketGateway.emitProductCreated(sellerId, data);
await this.prisma.products.create({...});

// ✅ CORRECT
const product = await this.prisma.products.create({...});
this.websocketGateway.emitProductCreated(sellerId, data);
```

### Mistake 3: Using Wrong Service
```typescript
// ❌ WRONG - Using NestJS gateway in Express
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

// ✅ CORRECT - Use orderWebSocketService in Express
import { orderWebSocketService } from '../websocket';
```

### Mistake 4: Awaiting Socket.IO
```typescript
// ❌ WRONG - Awaiting makes it blocking
await this.websocketGateway.emitOrderUpdate(userId, order);

// ✅ CORRECT - Fire and forget
this.websocketGateway.emitOrderUpdate(userId, order);
```

---

## 📚 EXAMPLES

### Example 1: Order Fulfillment Update
```typescript
async updateOrderFulfillment(orderId: string, status: string) {
  // 1. Update database
  const updatedOrder = await this.prisma.orders.update({
    where: { id: orderId },
    data: { fulfillment_status: status },
  });

  // 2. Map to GraphQL format
  const graphqlOrder = this.mapOrderToGraphQL(updatedOrder);

  // 3. Emit to BOTH buyer and seller
  this.websocketGateway.emitOrderUpdate(updatedOrder.user_id, graphqlOrder);
  this.websocketGateway.emitOrderUpdate(updatedOrder.seller_id, graphqlOrder);

  return graphqlOrder;
}
```

### Example 2: Product Stock Update
```typescript
async updateProductStock(productId: string, newStock: number) {
  // 1. Get current product
  const product = await this.prisma.products.findUnique({
    where: { id: productId },
  });

  // 2. Update stock
  const updated = await this.prisma.products.update({
    where: { id: productId },
    data: { stock: newStock },
  });

  // 3. Emit stock change to seller and product viewers
  this.websocketGateway.emitProductStockChanged(
    product.seller_id,
    productId,
    {
      productId,
      oldStock: product.stock,
      newStock,
    }
  );

  // 4. Check for low stock alert
  if (newStock <= 10 && product.stock > 10) {
    this.websocketGateway.emitStockLow(product.seller_id, {
      productId,
      stock: newStock,
      threshold: 10,
    });
  }

  return updated;
}
```

### Example 3: Payment Webhook
```typescript
async handlePaymentIntentFailed(event: WebhookEvent) {
  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata?.orderId;

  if (orderId) {
    // 1. Update database
    await this.storage.updateOrderPaymentStatus(orderId, 'failed');
    await this.storage.updateOrderStatus(orderId, 'cancelled');

    // 2. Emit Socket.IO to both parties
    orderWebSocketService.broadcastOrderUpdate(orderId, {
      status: 'cancelled',
      paymentStatus: 'failed',
    });

    logger.info(`Payment failed and Socket.IO broadcasted for order ${orderId}`);
  }
}
```

---

## 🎓 TRAINING & ONBOARDING

For new developers:

1. Read this document completely
2. Review `SOCKETIO_IMPLEMENTATION_SUMMARY.md`
3. Study existing implementations in:
   - `apps/nest-api/src/modules/orders/orders.service.ts`
   - `apps/nest-api/src/modules/products/product.service.ts`
   - `apps/nest-api/src/modules/cart/cart.service.ts`
4. Check the event interfaces in `apps/nest-api/src/modules/websocket/events/`
5. Before implementing, verify with senior developer

---

**Remember**: When in doubt, emit Socket.IO. Real-time updates are a core feature of Upfirst, not an optional enhancement.
