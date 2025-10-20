# Database & Events Testing - Phase 2

Comprehensive database integrity and event testing system for the commerce platform.

## Overview

This testing suite provides extensive coverage for:
- Database schema migrations
- Constraint validation (FK, unique, check)
- Write idempotency
- Concurrency and race conditions
- Event queue validation

## Setup

### Prerequisites

1. **Database Connection**: Ensure `DATABASE_URL` environment variable is set
2. **Test Audit Log**: Apply the audit trigger migration:

```bash
psql $DATABASE_URL -f prisma/migrations/add_test_audit_log.sql
```

### Running Tests

```bash
# Run all database tests
npm run test tests/db/

# Run specific test suites
npm run test tests/db/migration.spec.ts
npm run test tests/db/constraints.spec.ts
npm run test tests/db/idempotency.spec.ts
npm run test tests/db/concurrency.spec.ts

# Run event tests
npm run test tests/events/

# Run with SQL logging
VITEST_LOG_SQL=true npm run test tests/db/
```

## Test Structure

### Migration Tests (`migration.spec.ts`)

Validates database schema integrity and migration safety:

- ✅ Migrations don't cause data loss
- ✅ Foreign key constraints exist
- ✅ Critical tables are present
- ✅ Indexes on foreign keys for performance

**Tags**: `@db`

### Constraint Tests (`constraints.spec.ts`)

Validates database constraint enforcement:

**Foreign Key Constraints**:
- ✅ Prevents orphaned records
- ✅ Allows cascade operations
- ✅ Maintains referential integrity

**Unique Constraints**:
- ✅ Prevents duplicate emails
- ✅ Allows same SKU for different sellers
- ✅ Prevents duplicate usernames

**Check Constraints**:
- ✅ Enforces non-negative stock
- ✅ Validates price formats
- ✅ Handles edge cases

**Tags**: `@db`

### Idempotency Tests (`idempotency.spec.ts`)

Validates write operations are idempotent:

- ✅ Duplicate product creation fails gracefully
- ✅ Cart item updates are idempotent
- ✅ Order state transitions are idempotent
- ✅ User creation prevents duplicates
- ✅ Inventory operations maintain consistency

**Tags**: `@db`

### Concurrency Tests (`concurrency.spec.ts`)

Validates system behavior under concurrent load:

- ✅ Prevents double inventory reservation
- ✅ Handles concurrent cart modifications
- ✅ Limits concurrent orders based on inventory
- ✅ Maintains data consistency under concurrent writes
- ✅ Prevents race conditions in status updates

**Tags**: `@db`, `@slow`

### Event Queue Tests (`events/message-queue.spec.ts`)

Validates event publishing and schema validation:

- ✅ Validates product created events
- ✅ Validates order placed events
- ✅ Validates inventory reserved events
- ✅ Validates cart updated events
- ✅ Rejects invalid schemas
- ✅ Rejects unknown event types
- ✅ Enforces positive values for totals/quantities

**Tags**: `@events`

## Audit Logging

### Setup

The audit logging system tracks all INSERT, UPDATE, DELETE operations on critical tables:

```sql
-- Tables with audit triggers:
- products
- orders  
- carts
- cart_items
```

### Usage

```typescript
import { getAuditLog, clearAuditLog } from '../setup/db-test-utils';

// Get all audit logs
const logs = await getAuditLog();

// Get audit logs for specific table
const productLogs = await getAuditLog('products');

// Clear audit logs (before each test)
await clearAuditLog();

// Analyze changes
const changes = logs.filter(log => log.operation === 'UPDATE');
```

### Audit Log Schema

```typescript
interface AuditLogEntry {
  id: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  row_id: string;
  old_data: any;  // JSONB
  new_data: any;  // JSONB
  changed_at: Date;
}
```

## Test Fixtures

### Available Fixtures

```typescript
import { createFixtures } from '../setup/fixtures';
import { createTestPrisma } from '../setup/db-test-utils';

const prisma = createTestPrisma();
const fixtures = createFixtures(prisma);

// User creation
await fixtures.createUser({ email: 'test@example.com' });
await fixtures.createSeller();
await fixtures.createBuyer();

// Product creation
await fixtures.createProduct(sellerId, { name: 'Test Product' });

// Cart operations
const cart = await fixtures.createCart(sellerId);
await fixtures.addToCart(cartId, productId, quantity);
await fixtures.createCartItem(cartId, productId, quantity);

// Order operations
await fixtures.createOrder(buyerEmail, sellerId);
await fixtures.updateOrderStatus(orderId, 'paid');

// Inventory operations
await fixtures.reserveInventory(productId, quantity);
```

## Mock Message Queue

### Usage

```typescript
import { mockQueue } from '../mocks/message-queue';

// Publish events
await mockQueue.publish({
  event: 'product.created',
  productId: 'prod_123',
  sellerId: 'seller_456',
  timestamp: new Date().toISOString(),
});

// Consume events by type
const productEvents = await mockQueue.consume('product.created');

// Get all events
const allEvents = mockQueue.getAll();

// Get event count
const count = mockQueue.getCount('order.placed');

// Clear queue
await mockQueue.clear();
```

### Supported Events

- `product.created`
- `order.placed`
- `inventory.reserved`
- `cart.updated`

## Best Practices

### Test Isolation

All tests use transactions that automatically rollback:

```typescript
beforeEach(async () => {
  await cleanDatabase();
  await clearAuditLog();
});
```

### Concurrent Testing

For concurrency tests, use `Promise.allSettled()`:

```typescript
const results = await Promise.allSettled([
  operation1(),
  operation2(),
]);

const succeeded = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');
```

### Error Assertions

Test for specific error patterns:

```typescript
await expect(
  fixtures.createUser({ email: 'duplicate@example.com' })
).rejects.toThrow(/unique/);
```

## Performance

### Slow Tests

Tests tagged with `@slow` may take longer to execute:

```bash
# Skip slow tests
npm run test -- --exclude="@slow"

# Run only slow tests  
npm run test -- --include="@slow"
```

### Optimization Tips

1. Use `beforeEach` for data cleanup, not `afterEach`
2. Minimize database queries in test setup
3. Use fixtures for consistent test data
4. Batch operations when possible
5. Use indexes on foreign keys (already configured)

## Troubleshooting

### Connection Issues

```bash
# Verify database connection
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Migration Issues

```bash
# Reapply audit trigger
psql $DATABASE_URL -f prisma/migrations/add_test_audit_log.sql

# Verify trigger exists
psql $DATABASE_URL -c "SELECT * FROM pg_trigger WHERE tgname LIKE '%audit%'"
```

### Test Failures

```bash
# Enable SQL logging
VITEST_LOG_SQL=true npm run test tests/db/

# Check audit logs
psql $DATABASE_URL -c "SELECT * FROM test_audit_log ORDER BY changed_at DESC LIMIT 10"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Database Tests
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    npm run test tests/db/ tests/events/
```

### Pre-commit Hook

```bash
#!/bin/bash
npm run test tests/db/ tests/events/
```

## Coverage

Target coverage metrics:
- Migration safety: 100%
- Constraint validation: 95%+
- Idempotency: 90%+
- Concurrency: 85%+
- Event validation: 95%+

## Contributing

When adding new tests:

1. Tag appropriately (`@db`, `@events`, `@slow`)
2. Use existing fixtures
3. Clean up in `beforeEach`
4. Test both success and failure cases
5. Document new event schemas in mock queue

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
