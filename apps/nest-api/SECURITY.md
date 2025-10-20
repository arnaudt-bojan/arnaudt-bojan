# GraphQL/WebSocket Security Documentation

This document outlines the security measures implemented in the NestJS GraphQL API.

## GraphQL Query/Mutation Authentication

### Public Queries (No Authentication Required)

The following queries are intentionally public to support storefront browsing:

#### Products Module
- `getProduct(id)` - Public product details
- `getProductBySlug(sellerId, slug)` - Public product lookup
- `listProducts(filter, sort, first, after)` - Public product listing (rate limited: 20/min)

**Rationale**: These queries are public to allow anonymous browsing of storefronts.

#### Identity Module
- `getUser(id)` - Public user profile
- `getSeller(id)` - Public seller profile  
- `getStore(slug)` - Public storefront information
- `getBuyerProfile(userId)` - Public buyer profile

**Rationale**: Public profiles enable store discovery and trust building.

#### Pricing Module
- `getExchangeRate(from, to)` - Public currency conversion
- `calculatePrice(amount, fromCurrency, toCurrency)` - Public price calculation

**Rationale**: Utility functions for displaying prices to anonymous users.

#### Cart Module
- `getCart(id)` - Session-based cart retrieval
- `getCartBySession(sessionId)` - Session-based cart retrieval
- `addToCart(input)` - Add to anonymous cart
- `updateCartItem(cartId, input)` - Update anonymous cart
- `removeFromCart(cartId, productId, variantId)` - Remove from anonymous cart
- `clearCart(cartId)` - Clear anonymous cart

**Rationale**: Shopping cart must work for anonymous users before checkout.

#### Cart Validation Module
- `validateCart(cartId)` - Validate cart contents
- `validateWholesaleCart(cartId)` - Validate wholesale cart

**Rationale**: Pre-checkout validation for anonymous users.

#### Wholesale Rules Module
- `calculateWholesaleDeposit(orderValue, depositPercentage)` - Utility calculation
- `calculateWholesaleBalance(orderValue, depositPaid)` - Utility calculation
- `validateWholesaleOrder(invitationId, items, paymentTerms)` - Order validation
- `calculatePaymentDueDate(orderDate, paymentTerms)` - Utility calculation

**Rationale**: Helper functions for pricing calculations.

#### Quotations Module
- `getQuotationByToken(token)` - Public quotation viewing via secure token

**Rationale**: Token-based access for buyers who may not have accounts.

#### Wholesale Module
- `getWholesaleInvitation(token)` - Public invitation viewing via secure token

**Rationale**: Token-based access for buyers who may not have accounts.

---

### Authenticated Queries (Authentication Required)

All other queries and mutations require authentication with `@UseGuards(GqlAuthGuard)`.

#### Identity Module (Authenticated)
- `whoami()` - Get current user ID
- `getCurrentUser()` - Get current user details
- `updateProfile(input)` - Update user profile
- `updateSellerAccount(input)` - Update seller account (seller only)

#### Orders Module (Authenticated)
- `getOrder(id)` - View order details
- `listOrders(filter, sort, first, after)` - List orders (seller only, rate limited: 50/min)
- `getOrdersByBuyer()` - List buyer orders (buyer only)
- `getOrdersBySeller()` - List seller orders (seller only)
- `createOrder(input)` - Create new order (buyer only)
- `updateFulfillment(input)` - Update order fulfillment (seller only)
- `issueRefund(input)` - Issue refund (seller only)

#### Products Module (Authenticated Mutations)
- `createProduct(input)` - Create product (seller only)
- `updateProduct(id, input)` - Update product (seller only)
- `deleteProduct(id)` - Delete product (seller only)

#### Quotations Module (Authenticated)
- `getQuotation(id)` - Get quotation (seller only)
- `listQuotations()` - List quotations (seller only)
- `createQuotation(input)` - Create quotation (seller only)
- `updateQuotation(id, input)` - Update quotation (seller only)
- `sendQuotation(id)` - Send quotation (seller only)

#### Wholesale Module (Authenticated)
- `listWholesaleInvitations(sellerId, status, first, after)` - List invitations (seller only)
- `listWholesaleOrders(filter, first, after)` - List orders
- `getWholesaleOrder(id)` - Get order details
- `createWholesaleInvitation(input)` - Create invitation (seller only)
- `acceptInvitation(token)` - Accept invitation (buyer only)
- `placeWholesaleOrder(input)` - Place order (buyer only)

---

## Input Validation

All mutations use typed DTOs with `class-validator` decorators:

- `CreateProductInput`, `UpdateProductInput`
- `CreateOrderInput`, `UpdateFulfillmentInput`, `IssueRefundInput`
- `AddToCartInput`, `UpdateCartItemInput`
- `CreateQuotationInput`, `UpdateQuotationInput`
- `CreateWholesaleInvitationInput`, `PlaceWholesaleOrderInput`
- `UpdateProfileInput`, `UpdateSellerAccountInput`

**No `any` types** are used in GraphQL resolvers.

---

## Rate Limiting

### GraphQL Rate Limits

**Tiered Limits:**
- Anonymous: 10 requests/minute
- Authenticated: 100 requests/minute
- Premium: 1000 requests/minute

**Custom Limits on Expensive Queries:**
- `listProducts`: 20/min
- `listOrders`: 50/min

### WebSocket Rate Limits

- Maximum 100 events/minute per authenticated user
- 3 violations allowed before automatic disconnection
- Authentication required for all WebSocket connections

---

## WebSocket Security

### Authentication Enforcement

All WebSocket connections MUST be authenticated:
- User ID must be present in `client.handshake.auth.userId`
- Session must have authenticated user (`session.passport.user`)
- Unauthenticated connections are immediately disconnected

### Throttling

Each user is limited to:
- 100 events per 60-second window
- Maximum 3 violations before disconnection
- Rate limit applies to all `@SubscribeMessage` handlers

---

## Field Resolvers

Field resolvers do **NOT** have authentication guards because:

1. They only resolve data for parent objects already retrieved through authenticated queries
2. Adding guards would create N+1 authentication checks
3. DataLoaders handle batching efficiently
4. Parent query authentication is sufficient

**Example**: If `getOrder(id)` requires authentication, the `seller`, `buyer`, and `items` field resolvers inherit that protection.

---

## Logging Security

The Winston logger only logs:
- `requestId` (correlation ID)
- `userId` (UUID only)

**Never logged:**
- Email addresses
- Phone numbers
- Payment information
- Personal identifiable information (PII)

---

## Testing Security

To verify security measures:

```bash
# Test unauthenticated access (should fail)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { listOrders { edges { node { id } } } }"}'

# Test rate limiting (send 11+ requests within 60 seconds)
for i in {1..15}; do
  curl -X POST http://localhost:4000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query": "query { listProducts { edges { node { id } } } }"}' &
done

# Test DTO validation (should fail with invalid data)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createProduct(input: { price: -100 }) { id } }"}'
```

---

## Security Checklist

- [x] All mutations use typed DTOs with validation
- [x] Zero `any` types in GraphQL resolvers
- [x] Authentication guards on all sensitive queries/mutations
- [x] Rate limiting on expensive queries
- [x] WebSocket authentication enforcement
- [x] WebSocket throttling (100 events/min)
- [x] No PII in logs (only userId)
- [x] Public queries documented and justified
- [x] Role-based access control (buyer/seller guards)
- [x] Token-based access for quotations and wholesale invitations

---

## Future Enhancements

- Add Redis-backed rate limiting for multi-instance deployments
- Implement API key authentication for programmatic access
- Add query complexity analysis to prevent expensive queries
- Implement field-level permissions for granular access control
- Add audit logging for sensitive operations
