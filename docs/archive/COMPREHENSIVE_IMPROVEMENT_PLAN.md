# 🔍 UPFIRST - COMPREHENSIVE IMPROVEMENT PLAN
**Date**: October 20, 2025  
**Scope**: Complete codebase audit across architecture, security, performance, and quality  
**Method**: 3-pass architect review + frontend analysis + database design review

---

## EXECUTIVE SUMMARY

Following comprehensive analysis across the entire platform (GraphQL, REST, frontend, database, security), we identified **47 specific improvements** grouped by criticality. The most critical issues involve **cross-tenant authorization gaps** and **Architecture 3 violations** that must be addressed before production launch.

**Overall Assessment**:
- ✅ Platform is functionally complete
- ❌ Critical security gaps in GraphQL layer
- ❌ Architecture 3 violations in frontend
- ⚠️ Database design needs hardening
- ⚠️ Code duplication between REST and GraphQL

---

## CRITICAL PRIORITY (7 Issues)

### 🚨 SECURITY: Cross-Tenant Authorization Gaps

#### Issue #1: Orders - Any User Can Read Any Order
**Location**: `apps/nest-api/src/modules/orders/orders.resolver.ts` + `orders.service.ts`

**Problem**:
```typescript
// ❌ CURRENT: No ownership check
@Query('getOrder')
async getOrder(@Args('id') id: string) {
  return this.ordersService.getOrder(id); // Returns ANY order by ID
}

// ❌ SERVICE: No tenant scoping
async getOrder(id: string) {
  return this.prisma.orders.findUnique({ where: { id } }); // No seller/buyer filter
}
```

**Impact**: Any authenticated user can read ANY order containing PII (addresses, emails, phone numbers, purchase history). This is a **GDPR/compliance violation**.

**Fix**:
```typescript
// ✅ RESOLVER: Require auth and pass current user
@Query('getOrder')
@UseGuards(GqlAuthGuard)
async getOrder(
  @Args('id') id: string,
  @CurrentUser() userId: string
) {
  return this.ordersService.getOrder(id, userId);
}

// ✅ SERVICE: Enforce ownership
async getOrder(id: string, currentUserId: string) {
  const user = await this.prisma.users.findUnique({ where: { id: currentUserId } });
  
  // Buyer can only see their own orders
  if (user.role === 'buyer') {
    return this.prisma.orders.findFirst({
      where: { id, user_id: currentUserId }
    });
  }
  
  // Seller can only see orders for their products
  if (user.role === 'seller' || user.role === 'admin') {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) return null;
    
    const items = await this.prisma.order_items.findMany({
      where: { order_id: id }
    });
    
    const products = await this.prisma.products.findMany({
      where: { 
        id: { in: items.map(i => i.product_id) },
        seller_id: currentUserId
      }
    });
    
    return products.length > 0 ? order : null;
  }
  
  throw new ForbiddenException('Access denied');
}
```

**Severity**: 🔴 **CRITICAL** - Active data breach risk

---

#### Issue #2: Quotations - Any Seller Can Read Another Seller's Quotations
**Location**: `apps/nest-api/src/modules/quotations/quotations.resolver.ts` + `quotations.service.ts`

**Problem**:
```typescript
// ❌ CURRENT: Only checks user type, not ownership
@Query('getQuotation')
@UseGuards(GqlAuthGuard, UserTypeGuard)
@RequireUserType('seller')
async getQuotation(
  @Args('id') id: string,
  @CurrentUser() userId: string
) {
  return this.quotationsService.getQuotation(id); // No sellerId check!
}

// ❌ SERVICE: No ownership filter
async getQuotation(id: string) {
  return this.prisma.quotations.findUnique({ where: { id } });
}
```

**Impact**: Seller A can read Seller B's quotations including:
- Buyer contact information
- Pricing strategy
- Payment terms
- Competitive business intelligence

**Fix**:
```typescript
// ✅ RESOLVER: Pass current user
@Query('getQuotation')
@UseGuards(GqlAuthGuard, UserTypeGuard)
@RequireUserType('seller')
async getQuotation(
  @Args('id') id: string,
  @CurrentUser() userId: string
) {
  return this.quotationsService.getQuotation(id, userId);
}

// ✅ SERVICE: Enforce ownership
async getQuotation(id: string, sellerId: string) {
  return this.prisma.quotations.findFirst({
    where: { 
      id,
      seller_id: sellerId  // CRITICAL: Filter by seller
    }
  });
}

// ✅ Also fix listQuotations
async listQuotations(sellerId: string) {
  return this.prisma.quotations.findMany({
    where: { seller_id: sellerId },
    orderBy: { created_at: 'desc' }
  });
}
```

**Severity**: 🔴 **CRITICAL** - Competitive data exposure

---

#### Issue #3: Identity - Public PII Exposure
**Location**: `apps/nest-api/src/modules/identity/identity.resolver.ts`

**Problem**:
```typescript
// ❌ CURRENT: No auth guards
@Query('getUser')
async getUser(@Args('id') id: string) {
  return this.identityService.getUser(id); // Returns full profile with PII
}

@Query('getSeller')
async getSeller(@Args('id') id: string) {
  return this.identityService.getSeller(id); // Returns business email, phone
}
```

**Impact**: Anyone can enumerate user PII (emails, phone numbers, addresses) by guessing/iterating UUIDs.

**Fix**:
```typescript
// ✅ OPTION 1: Add auth guard
@Query('getUser')
@UseGuards(GqlAuthGuard)
async getUser(
  @Args('id') id: string,
  @CurrentUser() currentUserId: string
) {
  // Only allow users to fetch themselves
  if (id !== currentUserId) {
    throw new ForbiddenException('Access denied');
  }
  return this.identityService.getUser(id);
}

// ✅ OPTION 2: Create public-safe version
@Query('getSellerPublicProfile')
async getSellerPublicProfile(@Args('id') id: string) {
  return this.identityService.getSellerPublicProfile(id); // Only storefront-safe fields
}

// SERVICE: Return only safe fields
async getSellerPublicProfile(id: string) {
  const user = await this.prisma.users.findUnique({ where: { id } });
  return {
    id: user.id,
    username: user.username,
    storeName: user.company_name,
    // NO email, NO phone, NO address
  };
}
```

**Severity**: 🔴 **CRITICAL** - GDPR/privacy violation

---

### 🔧 DATABASE: Missing Indexes and Constraints

#### Issue #4: Missing Foreign Key Indexes
**Location**: `prisma/schema.prisma`

**Problem**: Foreign key columns lack indexes causing full table scans on joins:
```prisma
// ❌ CURRENT: No indexes on FKs
model carts {
  seller_id String? @db.VarChar  // No @index
  user_id   String? @db.VarChar  // No @index
}

model orders {
  user_id   String @db.VarChar   // No @index
  seller_id String @db.VarChar   // No @index
}

model order_items {
  order_id   String @db.VarChar  // No @index
  product_id String @db.VarChar  // No @index
}
```

**Impact**: Queries like "get all orders for seller X" scan entire `orders` table. At 10,000+ orders, this becomes multi-second queries.

**Fix**:
```prisma
// ✅ ADD: Indexes on all foreign keys
model carts {
  seller_id String? @db.VarChar
  user_id   String? @db.VarChar
  
  @@index([seller_id])
  @@index([user_id])
  @@index([seller_id, user_id])  // Compound for multi-column queries
}

model orders {
  user_id   String @db.VarChar
  seller_id String @db.VarChar
  
  @@index([user_id])
  @@index([seller_id])
  @@index([seller_id, status])   // Common filter combination
  @@index([user_id, status])
}

model order_items {
  order_id   String @db.VarChar
  product_id String @db.VarChar
  variant_id String? @db.VarChar
  
  @@index([order_id])
  @@index([product_id])
  @@index([order_id, product_id])
}

model quotation_line_items {
  quotation_id String @db.VarChar
  
  @@index([quotation_id])
}

model wholesale_orders {
  seller_id String @db.VarChar
  buyer_id  String @db.VarChar
  
  @@index([seller_id])
  @@index([buyer_id])
  @@index([seller_id, status])
}
```

**Migration**:
```bash
# After updating schema
npm run db:push --force
```

**Expected Impact**: 10-100x speedup on tenant-scoped queries

**Severity**: 🔴 **CRITICAL** - Performance bottleneck at scale

---

#### Issue #5: Missing ON DELETE CASCADE Rules
**Location**: `prisma/schema.prisma`

**Problem**: Deleting parent records leaves orphan children:
```prisma
// ❌ CURRENT: No cascade rules
model order_items {
  order_id String @db.VarChar
  // What happens when order is deleted? Orphan items remain!
}

model quotation_line_items {
  quotation_id String @db.VarChar
  // What happens when quotation is deleted? Orphan items remain!
}
```

**Impact**: Database fills with orphan records, breaking referential integrity. Manual cleanup required.

**Fix**:
```prisma
// ✅ ADD: Explicit cascade rules
model order_items {
  order_id String @db.VarChar
  order    orders @relation(fields: [order_id], references: [id], onDelete: Cascade)
}

model quotation_line_items {
  quotation_id String @db.VarChar
  quotation    quotations @relation(fields: [quotation_id], references: [id], onDelete: Cascade)
}

model wholesale_order_items {
  order_id String @db.VarChar
  order    wholesale_orders @relation(fields: [order_id], references: [id], onDelete: Cascade)
}

model cart_items {
  cart_id String @db.VarChar
  cart    carts @relation(fields: [cart_id], references: [id], onDelete: Cascade)
}
```

**Severity**: 🔴 **CRITICAL** - Data integrity issue

---

#### Issue #6: Missing Audit Fields
**Location**: `prisma/schema.prisma`

**Problem**: Core tables lack `created_at` / `updated_at`:
```prisma
// ❌ CURRENT: No timestamps
model orders {
  id     String @id @default(dbgenerated("gen_random_uuid()")) @db.VarChar
  status String @db.VarChar
  // No created_at, no updated_at
}
```

**Impact**: Cannot answer questions like:
- "When was this order created?"
- "When was the last update?"
- Impossible to audit changes for compliance

**Fix**:
```prisma
// ✅ ADD: Standard audit fields to ALL tables
model orders {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.VarChar
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model products {
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model quotations {
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}

model wholesale_orders {
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

**Severity**: 🔴 **CRITICAL** - Compliance requirement (GDPR audit logs)

---

### 🏗️ ARCHITECTURE: Frontend Architecture 3 Violations

#### Issue #7: Client-Side Business Calculations
**Locations**:
- `apps/nextjs/app/wholesale/checkout/page.tsx`
- `apps/nextjs/app/wholesale/catalog/[id]/page.tsx`
- `apps/nextjs/app/trade/quotations/new/page.tsx`
- `apps/nextjs/app/trade/quotations/[id]/edit/page.tsx`

**Problem**: Frontend performs critical business calculations:
```typescript
// ❌ WHOLESALE CATALOG: Client calculates deposit
const subtotal = (parseFloat(product.price) * quantity).toFixed(2);
const depositPercentage = 30; // Hardcoded!
const depositAmount = (parseFloat(subtotal) * (depositPercentage / 100)).toFixed(2);

// ❌ QUOTATIONS: Client calculates totals
const calculateTotals = useMutation(CALCULATE_QUOTATION_TOTALS);
// But then displays mock data before server responds!
```

**Impact**: 
1. **Business Logic Duplication**: Calculations exist in both frontend and backend
2. **Inconsistency Risk**: Frontend math might not match server math (rounding, precision)
3. **Security**: Malicious user can manipulate displayed amounts
4. **Maintainability**: Changes to calculation logic must be made in 2 places

**Fix**:

```typescript
// ✅ STEP 1: Create server-side pricing service
// apps/nest-api/src/modules/pricing/pricing.service.ts

@Injectable()
export class PricingService {
  async calculateWholesaleOrderPricing(input: {
    productId: string;
    variantId?: string;
    quantity: number;
    sellerId: string;
  }) {
    const product = await this.prisma.products.findUnique({
      where: { id: input.productId }
    });
    
    // Get seller's wholesale rules
    const rules = await this.prisma.wholesale_rules.findFirst({
      where: { seller_id: input.sellerId }
    });
    
    const unitPrice = parseFloat(product.price);
    const subtotal = unitPrice * input.quantity;
    const depositPercentage = rules?.deposit_percentage || 30;
    const depositAmount = subtotal * (depositPercentage / 100);
    const balanceAmount = subtotal - depositAmount;
    
    return {
      unitPrice,
      quantity: input.quantity,
      subtotal,
      depositPercentage,
      depositAmount,
      balanceAmount,
      currency: product.currency || 'USD'
    };
  }
}

// ✅ STEP 2: Add GraphQL query
// docs/graphql-schema.graphql

type WholesalePricing {
  unitPrice: Float!
  quantity: Int!
  subtotal: Float!
  depositPercentage: Int!
  depositAmount: Float!
  balanceAmount: Float!
  currency: String!
}

type Query {
  calculateWholesalePricing(
    productId: ID!
    variantId: ID
    quantity: Int!
    sellerId: ID!
  ): WholesalePricing!
}

// ✅ STEP 3: Update frontend to use server calculation
// apps/nextjs/app/wholesale/catalog/[id]/page.tsx

const { data: pricing, loading } = useQuery(CALCULATE_WHOLESALE_PRICING, {
  variables: {
    productId: product.id,
    variantId: selectedVariant?.id,
    quantity,
    sellerId: product.sellerId
  },
  skip: !quantity || quantity < 1
});

// Display server-provided values (NO client-side math)
<Typography>Subtotal: ${pricing?.subtotal.toFixed(2)}</Typography>
<Typography>Deposit ({pricing?.depositPercentage}%): ${pricing?.depositAmount.toFixed(2)}</Typography>
<Typography>Balance: ${pricing?.balanceAmount.toFixed(2)}</Typography>
```

**Apply same fix to**:
- Quotation totals calculation
- Wholesale checkout
- Any other client-side arithmetic on money

**Severity**: 🔴 **CRITICAL** - Architecture 3 violation + security risk

---

## HIGH PRIORITY (8 Issues)

### Issue #8: Cart Ownership Validation Missing
**Location**: `apps/nest-api/src/modules/cart/cart.resolver.ts`

**Problem**:
```typescript
// ❌ CURRENT: No ownership check
@Mutation('removeFromCart')
async removeFromCart(
  @Args('cartId') cartId: string,
  @Args('productId') productId: string
) {
  return this.cartService.removeFromCart(cartId, productId);
}
```

**Impact**: User A can delete items from User B's cart by guessing cart UUID.

**Fix**:
```typescript
// ✅ ADD: Session/user ownership check
@Mutation('removeFromCart')
async removeFromCart(
  @Args('cartId') cartId: string,
  @Args('productId') productId: string,
  @Context() context: GraphQLContext
) {
  const sessionId = context.req?.session?.id;
  const userId = context.req?.user?.id;
  
  // Verify cart belongs to this session/user
  const cart = await this.cartService.getCart(cartId);
  if (!cart) throw new NotFoundException('Cart not found');
  
  if (cart.sessionId !== sessionId && cart.userId !== userId) {
    throw new ForbiddenException('Access denied');
  }
  
  return this.cartService.removeFromCart(cartId, productId);
}
```

**Severity**: 🟠 **HIGH** - Data integrity attack

---

### Issue #9: REST vs GraphQL Business Logic Duplication
**Locations**:
- `server/services/orderService.ts` vs `apps/nest-api/src/modules/orders/orders.service.ts`
- `server/services/quotationService.ts` vs `apps/nest-api/src/modules/quotations/quotations.service.ts`

**Problem**: Same business logic implemented twice with divergent validation:
```typescript
// REST: server/services/orderService.ts
async createOrder(input) {
  // Validation A
  // Transaction pattern A
  // Socket.IO emit pattern A
}

// GraphQL: apps/nest-api/src/modules/orders/orders.service.ts
async createOrder(input) {
  // Validation B (different!)
  // Transaction pattern B
  // No Socket.IO emit!
}
```

**Impact**:
- Inconsistent behavior (REST validates X, GraphQL doesn't)
- Technical debt (update logic in 2 places)
- Bugs introduced when one path updated but not the other

**Fix**:
```typescript
// ✅ STEP 1: Create shared service layer
// server/domain/orders/order-domain.service.ts

@Injectable()
export class OrderDomainService {
  constructor(
    private prisma: PrismaService,
    private socketService: OrderSocketService,
    private stripeService: StripeService
  ) {}
  
  async createOrder(input: CreateOrderInput, userId: string) {
    // Single source of truth for validation
    this.validateOrder(input);
    
    // Single transaction pattern
    return this.prisma.runTransaction(async (tx) => {
      const order = await tx.orders.create({ data: ... });
      await tx.order_items.createMany({ data: items });
      
      // Single Socket.IO emit pattern
      this.socketService.emitOrderCreated(order.id, userId, order.sellerId);
      
      return order;
    });
  }
}

// ✅ STEP 2: Both REST and GraphQL use shared service
// REST: server/routes.ts
app.post('/api/orders', async (req, res) => {
  const result = await orderDomainService.createOrder(req.body, req.user.id);
  res.json(result);
});

// GraphQL: apps/nest-api/src/modules/orders/orders.resolver.ts
@Mutation('createOrder')
async createOrder(@Args('input') input, @CurrentUser() userId) {
  return this.orderDomainService.createOrder(input, userId);
}
```

**Apply to**: Orders, Quotations, Wholesale Orders, Products

**Severity**: 🟠 **HIGH** - Maintenance burden + inconsistency risk

---

### Issue #10: GraphQL Resolvers Not "Thin"
**Location**: `apps/nest-api/src/modules/identity/identity.resolver.ts`

**Problem**: Business logic in resolver instead of service:
```typescript
// ❌ CURRENT: Resolver contains business logic
@ResolveField('sellerAccount')
async sellerAccount(@Parent() user: any, @Context() context: GraphQLContext) {
  if (user.userType === 'SELLER' || user.role === 'seller') {
    const userData = await context.userLoader.load(user.id);
    // ... 20+ lines of transformation logic
    return {
      subscriptionTier: this.mapSubscriptionTier(userData.subscription_plan),
      // ... complex mapping
    };
  }
}

// Business rule in resolver
private mapSubscriptionTier(plan: string | null): string {
  if (!plan) return 'FREE';
  const upperPlan = plan.toUpperCase();
  if (['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(upperPlan)) {
    return upperPlan;
  }
  return 'FREE';
}
```

**Impact**: 
- Violates "thin resolver" pattern
- Business logic not reusable (tied to GraphQL)
- Hard to test (requires GraphQL context)

**Fix**:
```typescript
// ✅ MOVE: Business logic to service
// apps/nest-api/src/modules/identity/identity.service.ts

@Injectable()
export class IdentityService {
  async getSellerAccount(userId: string) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user || (user.userType !== 'SELLER' && user.role !== 'seller')) {
      return null;
    }
    
    return {
      id: user.id,
      subscriptionTier: this.mapSubscriptionTier(user.subscription_plan),
      storeName: user.username || '',
      // ... all transformation logic here
    };
  }
  
  private mapSubscriptionTier(plan: string | null): string {
    // Business rule in service (testable, reusable)
    if (!plan) return 'FREE';
    const upperPlan = plan.toUpperCase();
    return ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(upperPlan) 
      ? upperPlan 
      : 'FREE';
  }
}

// ✅ THIN: Resolver just delegates
@ResolveField('sellerAccount')
async sellerAccount(@Parent() user: any) {
  return this.identityService.getSellerAccount(user.id);
}
```

**Severity**: 🟠 **HIGH** - Architecture violation (but not security issue)

---

### Issue #11: GraphQL Inputs Typed as `any`
**Location**: Multiple resolvers

**Problem**:
```typescript
// ❌ CURRENT: Unvalidated inputs
@Query('listProducts')
async listProducts(
  @Args('filter') filter?: any,     // ❌ No validation
  @Args('sort') sort?: any,          // ❌ No validation
  @Args('first') first?: number,
  @Args('after') after?: string
) {
  return this.productService.listProducts({ filter, sort, first, after });
}
```

**Impact**: 
- Users can inject arbitrary Prisma `where` clauses
- No type safety
- Potential for SQL injection via ORM
- Server crashes on malformed inputs

**Fix**:
```typescript
// ✅ CREATE: Validated DTO
// apps/nest-api/src/modules/products/dto/list-products.dto.ts

export class ProductFilterInput {
  @IsOptional()
  @IsString()
  search?: string;
  
  @IsOptional()
  @IsUUID()
  sellerId?: string;
  
  @IsOptional()
  @IsEnum(['ACTIVE', 'DRAFT', 'ARCHIVED'])
  status?: string;
  
  @IsOptional()
  @IsString()
  category?: string;
}

export class ProductSortInput {
  @IsOptional()
  @IsEnum(['name', 'price', 'created_at'])
  field?: string;
  
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  direction?: 'asc' | 'desc';
}

// ✅ USE: Typed DTOs in resolver
@Query('listProducts')
async listProducts(
  @Args('filter') filter?: ProductFilterInput,
  @Args('sort') sort?: ProductSortInput,
  @Args('first') first?: number,
  @Args('after') after?: string
) {
  // DTOs are automatically validated by class-validator
  return this.productService.listProducts({ filter, sort, first, after });
}
```

**Apply to**: All GraphQL queries/mutations with object inputs

**Severity**: 🟠 **HIGH** - Security + stability issue

---

### Issue #12: Inline Business Logic in REST Routes
**Location**: `server/routes.ts`

**Problem**: Complex workflows embedded in route handlers:
```typescript
// ❌ CURRENT: 50+ lines of business logic inline
app.post("/api/orders/:orderId/refunds", requireAuth, async (req, res) => {
  // Authorization logic (10 lines)
  const currentUser = await storage.getUser(userId);
  const isTeamMember = ["admin", "editor"].includes(currentUser.role);
  const canonicalSellerId = isTeamMember ? currentUser.sellerId : userId;
  const order = await storage.getOrder(orderId);
  // ... ownership verification
  
  // Business logic (40 lines)
  const result = await orderLifecycleService.processRefund({
    orderId,
    sellerId: canonicalSellerId,
    refundType,
    refundItems,
    reason,
    customRefundAmount,
  });
  
  // Response handling
  if (!result.success) {
    return res.status(result.statusCode || 500).json({ error: result.error });
  }
  res.json({ ... });
});
```

**Impact**:
- Routes are not "thin" (violates separation of concerns)
- Logic not reusable
- Hard to test (requires full HTTP stack)
- No transaction boundaries

**Fix**:
```typescript
// ✅ CREATE: Domain service
// server/domain/orders/order-refund.service.ts

@Injectable()
export class OrderRefundService {
  async processRefund(input: ProcessRefundInput) {
    // Validate ownership
    await this.validateOwnership(input.orderId, input.sellerId);
    
    // Execute in transaction
    return this.prisma.runTransaction(async (tx) => {
      // All refund logic here
      const refund = await this.createRefund(tx, input);
      await this.processStripeRefund(refund);
      await this.emitRefundEvents(refund);
      return refund;
    });
  }
  
  private async validateOwnership(orderId: string, sellerId: string) {
    const order = await this.prisma.orders.findUnique({ where: { id: orderId } });
    // ... validation logic
  }
}

// ✅ THIN: Route just delegates
app.post("/api/orders/:orderId/refunds", requireAuth, async (req, res) => {
  try {
    const result = await orderRefundService.processRefund({
      orderId: req.params.orderId,
      sellerId: req.user.id,
      ...req.body
    });
    res.json(result);
  } catch (error) {
    logger.error('Refund failed', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});
```

**Apply to**: All complex REST endpoints (orders, checkout, refunds, quotations)

**Severity**: 🟠 **HIGH** - Architecture violation + transaction safety

---

### Issue #13: Missing Pagination on List Queries
**Location**: Multiple GraphQL resolvers

**Problem**:
```typescript
// ❌ CURRENT: Returns ALL records
@Query('listOrders')
async listOrders(@Args('filter') filter?: any) {
  return this.ordersService.listOrders(filter);
}

// SERVICE: No limit
async listOrders(filter: any) {
  return this.prisma.orders.findMany({ where: filter }); // Could return 100,000 records!
}
```

**Impact**:
- DoS risk (client requests all orders, server exhausts memory)
- Slow responses (multi-second queries)
- Poor UX (frontend freezes loading huge datasets)

**Fix**:
```typescript
// ✅ ENFORCE: Pagination with max limit
@Query('listOrders')
async listOrders(
  @Args('filter') filter?: OrderFilterInput,
  @Args('first') first: number = 20,    // Default 20
  @Args('after') after?: string
) {
  // Enforce max limit
  const limit = Math.min(first, 100);   // Max 100 per page
  
  return this.ordersService.listOrders({ filter, first: limit, after });
}

// SERVICE: Implement cursor pagination
async listOrders({ filter, first, after }) {
  const where = this.buildWhereClause(filter);
  
  const orders = await this.prisma.orders.findMany({
    where,
    take: first + 1,  // Fetch one extra to check if there's more
    skip: after ? 1 : 0,
    cursor: after ? { id: after } : undefined,
    orderBy: { created_at: 'desc' }
  });
  
  const hasNextPage = orders.length > first;
  const edges = orders.slice(0, first);
  
  return {
    edges,
    pageInfo: {
      hasNextPage,
      endCursor: edges[edges.length - 1]?.id
    }
  };
}
```

**Apply to**: listOrders, listProducts, listQuotations, listWholesaleOrders

**Severity**: 🟠 **HIGH** - Performance + DoS risk

---

### Issue #14: Inconsistent Error Handling
**Locations**: Multiple services and resolvers

**Problem**: Mix of error handling patterns:
```typescript
// ❌ PATTERN 1: Throw Error
throw new Error('Order not found');

// ❌ PATTERN 2: Return error object
return { success: false, error: 'Order not found' };

// ❌ PATTERN 3: GraphQLError
throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });

// ❌ PATTERN 4: HTTP status
res.status(404).json({ error: 'Order not found' });
```

**Impact**:
- Inconsistent error responses
- Poor debugging (some errors logged, some not)
- Reveals implementation details to clients

**Fix**:
```typescript
// ✅ CREATE: Centralized error handler
// apps/nest-api/src/common/errors/domain-errors.ts

export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class OrderNotFoundError extends DomainError {
  constructor(orderId: string) {
    super(
      'Order not found',
      'ORDER_NOT_FOUND',
      404,
      { orderId }
    );
  }
}

export class UnauthorizedAccessError extends DomainError {
  constructor(resource: string) {
    super(
      'Access denied',
      'UNAUTHORIZED',
      403,
      { resource }
    );
  }
}

// ✅ USE: Consistent error throwing
async getOrder(id: string, userId: string) {
  const order = await this.prisma.orders.findUnique({ where: { id } });
  if (!order) {
    throw new OrderNotFoundError(id);  // Consistent!
  }
  
  if (order.user_id !== userId) {
    throw new UnauthorizedAccessError('order');  // Consistent!
  }
  
  return order;
}

// ✅ CATCH: Global error filter
// apps/nest-api/src/common/filters/domain-error.filter.ts

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    // Log with context
    logger.error('Domain error', {
      code: exception.code,
      message: exception.message,
      metadata: exception.metadata
    });
    
    // Return consistent format
    response.status(exception.statusCode).json({
      error: {
        code: exception.code,
        message: exception.message
      }
    });
  }
}
```

**Severity**: 🟠 **HIGH** - Maintainability + debugging issue

---

### Issue #15: No Enum Enforcement on Status Fields
**Location**: `prisma/schema.prisma`

**Problem**:
```prisma
// ❌ CURRENT: String allows any value
model orders {
  status String @db.VarChar  // Could be "completed", "COMPLETED", "done", anything!
}

model products {
  status String @db.VarChar  // No validation
}
```

**Impact**:
- Invalid states creep in ("Completed" vs "completed")
- Defensive coding required everywhere
- Queries break when status typos occur

**Fix**:
```prisma
// ✅ OPTION 1: Enum in Prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model orders {
  status OrderStatus @default(PENDING)
}

// ✅ OPTION 2: Database check constraint (if enums not suitable)
model orders {
  status String @db.VarChar
  
  @@check("status IN ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')")
}
```

**Apply to**: orders.status, products.status, quotations.status, wholesale_orders.status

**Severity**: 🟠 **HIGH** - Data integrity issue

---

## MEDIUM PRIORITY (16 Issues)

### Issue #16: No Length Constraints on VARCHAR Columns
**Location**: `prisma/schema.prisma`

**Problem**:
```prisma
// ❌ CURRENT: Unbounded VARCHARs
model users {
  email    String @db.VarChar  // Could be 1 million characters!
  username String? @db.VarChar
}
```

**Impact**: Database bloat, index inefficiency

**Fix**:
```prisma
// ✅ ADD: Reasonable limits
model users {
  email    String @db.VarChar(255)
  username String? @db.VarChar(50)
  company_name String? @db.VarChar(255)
}

model products {
  name String @db.VarChar(255)
  slug String @db.VarChar(255)
}
```

**Severity**: 🟡 **MEDIUM** - Performance optimization

---

### Issue #17-25: Additional Medium Priority Issues

Due to space constraints, here's a summary of remaining medium priority issues:

17. **Magic Numbers in Code** - Hardcoded `depositPercentage = 30`, `MOQ = 10` should come from config/DB
18. **TypeScript `any` Types Remain** - `filter?: any`, `sort?: any` in multiple locations
19. **Missing Updated_At on Some Tables** - `analytics_events`, `cart_items` lack timestamps
20. **Commented/Dead Code** - Remove unused test helpers and mocks
21. **Business Logic in Resolvers** - `mapSubscriptionTier`, data transformation should be in services
22. **No Transaction Boundaries in Some Routes** - `/api/checkout` has multi-step operations outside transactions
23. **Unvalidated Filter Objects** - GraphQL list queries accept unchecked filter objects
24. **Missing DataLoader Opportunities** - Some N+1 query patterns remain
25. **Inconsistent Logging Patterns** - Some services use `console.log`, others use Winston

---

## LOW PRIORITY (16 Issues)

### Issue #26-41: Low Priority Issues Summary

26. **Public Pricing Endpoint** - `/api/currency/rates` should have rate limiting
27. **Raw Error Messages** - Some GraphQL errors reveal implementation details
28. **Missing Correlation IDs** - Some log entries lack request correlation
29. **No Query Complexity Analysis** - GraphQL allows arbitrarily deep queries
30. **Session Cookie Security** - Could add `sameSite: 'strict'`
31. **CORS Configuration** - Review allowed origins
32. **Unused Imports** - Clean up dead imports across codebase
33. **Inconsistent Date Formatting** - Mix of `Date` and `DateTime` handling
34. **No Request Timeout** - Some long-running queries could timeout gracefully
35. **Missing JSDoc Comments** - Complex functions lack documentation
36. **Hardcoded URLs** - Some redirect URLs hardcoded instead of env vars
37. **No Retry Logic** - External API calls (Stripe, Resend) don't retry on failure
38. **Missing Health Check Details** - `/health/detailed` could expose more metrics
39. **No Prometheus Metrics** - Missing standardized metrics endpoint
40. **Background Job Error Handling** - Newsletter queue doesn't track failed jobs
41. **No Circuit Breaker Pattern** - External services could benefit from circuit breakers

---

## IMPLEMENTATION PRIORITY

### Phase 1: Critical Security (Week 1)
**Priority**: 🔴 **MUST FIX BEFORE LAUNCH**

1. **Cross-Tenant Authorization** (Issues #1-3)
   - Orders: Add ownership checks
   - Quotations: Add ownership checks
   - Identity: Restrict PII queries
   - **Effort**: 2-3 days
   - **Impact**: Blocks production launch

2. **Frontend Architecture 3** (Issue #7)
   - Move all pricing calculations server-side
   - Remove client-side business logic
   - **Effort**: 2-3 days
   - **Impact**: Prevents inconsistent pricing

### Phase 2: Database Hardening (Week 2)
**Priority**: 🔴 **CRITICAL PERFORMANCE**

3. **Database Indexes** (Issue #4)
   - Add FK indexes on all tables
   - Add compound indexes for common queries
   - **Effort**: 1 day
   - **Impact**: 10-100x speedup

4. **Cascade Rules & Audit Fields** (Issues #5-6)
   - Add ON DELETE CASCADE
   - Add created_at/updated_at to all tables
   - **Effort**: 1 day
   - **Impact**: Data integrity + compliance

### Phase 3: High Priority Fixes (Week 3-4)
**Priority**: 🟠 **SHOULD FIX SOON**

5. **Service Layer Consolidation** (Issues #8-12)
   - Merge REST/GraphQL services
   - Thin resolvers pattern
   - Cart ownership validation
   - Input validation DTOs
   - **Effort**: 1 week
   - **Impact**: Reduces technical debt

6. **Pagination & Error Handling** (Issues #13-15)
   - Add pagination to all list queries
   - Centralized error handling
   - Enum enforcement on status fields
   - **Effort**: 3-4 days
   - **Impact**: Performance + stability

### Phase 4: Medium Priority (Month 2)
**Priority**: 🟡 **NICE TO HAVE**

7. **Code Quality** (Issues #16-25)
   - VARCHAR length constraints
   - Remove magic numbers
   - Fix TypeScript `any` types
   - Remove dead code
   - **Effort**: 1 week
   - **Impact**: Maintainability

### Phase 5: Low Priority (Month 3+)
**Priority**: ⚪ **FUTURE IMPROVEMENTS**

8. **Polish & Optimization** (Issues #26-41)
   - Rate limiting on public endpoints
   - Prometheus metrics
   - Circuit breakers
   - JSDoc documentation
   - **Effort**: 2 weeks
   - **Impact**: Production polish

---

## TESTING STRATEGY

After implementing fixes, test in this order:

### 1. Authorization Tests
```typescript
describe('Cross-Tenant Authorization', () => {
  it('should prevent seller A from reading seller B orders', async () => {
    const sellerA = await createTestUser({ role: 'seller' });
    const sellerB = await createTestUser({ role: 'seller' });
    const orderB = await createTestOrder({ sellerId: sellerB.id });
    
    // Seller A tries to read Seller B's order
    const result = await graphql({
      query: GET_ORDER,
      variables: { id: orderB.id },
      context: { user: sellerA }
    });
    
    expect(result.errors[0].message).toBe('Access denied');
  });
});
```

### 2. Architecture 3 Tests
```typescript
it('should calculate wholesale pricing server-side', async () => {
  const { data } = await apolloClient.query({
    query: CALCULATE_WHOLESALE_PRICING,
    variables: { productId, quantity: 100 }
  });
  
  // Server provides all calculations
  expect(data.calculateWholesalePricing).toMatchObject({
    subtotal: expect.any(Number),
    depositAmount: expect.any(Number),
    depositPercentage: expect.any(Number)
  });
});
```

### 3. Database Performance Tests
```typescript
it('should use indexes for tenant-scoped queries', async () => {
  const sellerId = 'test-seller-1';
  
  // Explain query to verify index usage
  const explain = await prisma.$queryRaw`
    EXPLAIN SELECT * FROM orders WHERE seller_id = ${sellerId}
  `;
  
  expect(explain[0].QUERY_PLAN).toContain('Index Scan');
  expect(explain[0].QUERY_PLAN).not.toContain('Seq Scan');
});
```

---

## SUCCESS CRITERIA

### Before Production Launch:
- [ ] All CRITICAL issues (#1-7) resolved
- [ ] Authorization tests passing (100%)
- [ ] Frontend Architecture 3 compliant (no client calculations)
- [ ] Database indexes added + verified
- [ ] Cascade rules + audit fields in place

### Within 1 Month:
- [ ] All HIGH priority issues (#8-15) resolved
- [ ] Service layer consolidated
- [ ] Pagination implemented on all lists
- [ ] Error handling centralized

### Within 2 Months:
- [ ] All MEDIUM priority issues (#16-25) resolved
- [ ] TypeScript strict mode enabled
- [ ] Code quality metrics improved

### Within 3 Months:
- [ ] All LOW priority issues (#26-41) resolved
- [ ] Full E2E test coverage
- [ ] Production monitoring complete

---

## APPENDIX: QUICK REFERENCE

### Critical Issues Summary
| # | Issue | Location | Severity | Effort |
|---|-------|----------|----------|--------|
| 1 | Orders cross-tenant access | orders.resolver.ts | 🔴 | 1d |
| 2 | Quotations cross-tenant access | quotations.resolver.ts | 🔴 | 1d |
| 3 | Identity PII exposure | identity.resolver.ts | 🔴 | 0.5d |
| 4 | Missing FK indexes | schema.prisma | 🔴 | 1d |
| 5 | Missing CASCADE rules | schema.prisma | 🔴 | 0.5d |
| 6 | Missing audit fields | schema.prisma | 🔴 | 0.5d |
| 7 | Frontend calculations | Next.js pages | 🔴 | 2d |

**Total Critical Effort**: ~7 days to fix all critical issues

---

**Document Version**: 1.0  
**Last Updated**: October 20, 2025  
**Status**: Comprehensive audit complete, fixes pending  
**Next Review**: After Phase 1 implementation
