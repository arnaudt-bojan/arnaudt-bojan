# Testing Infrastructure Guide

This directory contains the foundational testing infrastructure for the Vitest-based test harness.

## Overview

The testing infrastructure provides:

1. **Database Transaction Utilities** - Automatic rollback after each test
2. **Test Fixtures** - Factory helpers for creating test data
3. **Global Setup/Teardown** - Database connection management
4. **Vitest Configuration** - Optimized for speed and monorepo support

## Directory Structure

```
tests/
├── setup/
│   ├── db-test-utils.ts      # Prisma transaction utilities
│   ├── fixtures.ts             # Test data factories
│   ├── vitest-setup.ts         # Global test hooks
│   └── README.md               # This file
├── e2e/                        # End-to-end Playwright tests
└── ...

server/__tests__/               # Server/Express unit tests
client/__tests__/               # Frontend component tests
apps/nest-api/test/             # NestJS module tests
contracts/                      # API contract schemas
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only fast tests (<1s each)
npm run test:fast

# Run only integration tests
npm run test:integration

# Run tests for changed files only
npm run test:changed

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { withTransaction } from '@tests/setup/db-test-utils';
import { createFixtures } from '@tests/setup/fixtures';

describe('My Feature - @fast', () => {
  it('should do something', async () => {
    await withTransaction(async (tx) => {
      const fixtures = createFixtures(tx);
      
      // Create test data
      const user = await fixtures.createUser({
        email: 'test@example.com',
      });
      
      // Run your test logic
      expect(user.email).toBe('test@example.com');
      
      // No cleanup needed - transaction auto-rolls back!
    });
  });
});
```

### Using Test Tags

Tests can be tagged for categorization:

- `@fast` - Unit tests that should complete in <1s
- `@integration` - Integration tests that may take 1-5s

Add tags in the describe block name:

```typescript
describe('User Service - @fast', () => {
  // Fast unit tests
});

describe('Order Workflow - @integration', () => {
  // Integration tests
});
```

### Database Transaction Pattern

All tests should use the `withTransaction` helper to ensure isolation:

```typescript
import { withTransaction } from '@tests/setup/db-test-utils';

it('should create and query data', async () => {
  await withTransaction(async (tx) => {
    // Use tx (transaction client) for all database operations
    const result = await tx.users.create({
      data: { email: 'test@example.com' }
    });
    
    expect(result).toBeDefined();
    
    // Data automatically rolled back after this block
  });
});
```

### Using Fixtures

Fixtures provide factory helpers for common entities:

```typescript
import { createFixtures } from '@tests/setup/fixtures';

await withTransaction(async (tx) => {
  const fixtures = createFixtures(tx);
  
  // Create a seller with account
  const { user, seller } = await fixtures.createSeller();
  
  // Create a product
  const product = await fixtures.createProduct(user.id, {
    title: 'Test Product',
    price: '99.99',
  });
  
  // Create a buyer
  const { user: buyer } = await fixtures.createBuyer();
  
  // Create a full order (seller + buyer + product + order)
  const { seller, buyer, product, order } = await fixtures.createFullOrder();
});
```

### Available Fixture Methods

- `createUser(overrides?)` - Create a user
- `createSellerAccount(userId, overrides?)` - Create seller account
- `createProduct(sellerId, overrides?)` - Create product
- `createOrder(buyerEmail, sellerId, overrides?)` - Create order
- `createCart(sellerId, buyerId?, overrides?)` - Create shopping cart
- `createWholesaleProduct(sellerId, overrides?)` - Create wholesale product
- `createWholesaleBuyer(sellerId, buyerId, overrides?)` - Create wholesale buyer relationship
- `createQuotation(sellerId, buyerId, overrides?)` - Create quotation
- `createNotification(userId, overrides?)` - Create notification
- `createSeller()` - Create user + seller account
- `createBuyer()` - Create buyer user
- `createFullOrder()` - Create complete order with all relationships

## Test Database Utilities

### TestDatabase Class

```typescript
import { TestDatabase } from '@tests/setup/db-test-utils';

const testDb = TestDatabase.getInstance();

// Get Prisma client
const prisma = testDb.getPrisma();

// Execute in transaction with auto-rollback
await testDb.executeInTransaction(async (tx) => {
  // Use tx for database operations
});

// Clean all tables (use sparingly)
await testDb.cleanup();

// Reset sequences
await testDb.resetSequences();
```

### Helper Functions

```typescript
import {
  createTestPrisma,
  withTransaction,
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from '@tests/setup/db-test-utils';

// Get Prisma client
const prisma = createTestPrisma();

// Execute in transaction
await withTransaction(async (tx) => {
  // Your test code
});

// Setup/teardown (handled automatically in vitest-setup.ts)
await setupTestDatabase();
await teardownTestDatabase();

// Clean database (use carefully)
await cleanDatabase();
```

## Best Practices

### 1. Transaction Isolation

✅ **DO**: Use `withTransaction` for all database tests

```typescript
it('should create user', async () => {
  await withTransaction(async (tx) => {
    const fixtures = createFixtures(tx);
    const user = await fixtures.createUser();
    expect(user).toBeDefined();
  });
});
```

❌ **DON'T**: Manipulate database without transaction

```typescript
it('should create user', async () => {
  const prisma = createTestPrisma();
  const user = await prisma.users.create({ /* ... */ });
  // Data persists and pollutes other tests!
});
```

### 2. Test Independence

✅ **DO**: Make tests independent and isolated

```typescript
describe('User Tests', () => {
  it('test 1', async () => {
    await withTransaction(async (tx) => {
      // Completely isolated
    });
  });
  
  it('test 2', async () => {
    await withTransaction(async (tx) => {
      // Completely isolated
    });
  });
});
```

❌ **DON'T**: Share state between tests

```typescript
let sharedUser; // DON'T DO THIS

it('create user', async () => {
  sharedUser = await createUser();
});

it('update user', async () => {
  await updateUser(sharedUser); // Test order dependency!
});
```

### 3. Use Fixtures

✅ **DO**: Use fixtures for test data

```typescript
await withTransaction(async (tx) => {
  const fixtures = createFixtures(tx);
  const user = await fixtures.createUser({
    email: 'specific@example.com',
  });
});
```

❌ **DON'T**: Manually create test data everywhere

```typescript
const user = await tx.users.create({
  data: {
    id: 'some-id',
    email: 'test@example.com',
    user_type: 'seller',
    username: 'test',
    profile_complete: 1,
    // ... many fields
  },
});
```

### 4. Descriptive Test Names

✅ **DO**: Use clear, descriptive test names

```typescript
describe('Order Service - @fast', () => {
  it('should calculate total with tax and shipping', async () => {
    // Clear what is being tested
  });
  
  it('should throw error when product is out of stock', async () => {
    // Clear expected behavior
  });
});
```

❌ **DON'T**: Use vague test names

```typescript
describe('Tests', () => {
  it('works', async () => {
    // What works?
  });
  
  it('test 1', async () => {
    // What is test 1?
  });
});
```

### 5. Tag Your Tests

```typescript
// Fast unit test
describe('Price Calculator - @fast', () => {
  it('should calculate price', () => {
    // <1s execution
  });
});

// Integration test
describe('Order Workflow - @integration', () => {
  it('should process complete order', async () => {
    // 1-5s execution with database
  });
});
```

## Performance Targets

- **Unit Tests (@fast)**: <1 second per test
- **Integration Tests (@integration)**: <5 seconds per test
- **Full Test Suite**: <60 seconds total

## Troubleshooting

### Tests Not Rolling Back

Make sure you're using `withTransaction`:

```typescript
await withTransaction(async (tx) => {
  // Use tx, not prisma
  const user = await tx.users.create({ /* ... */ });
});
```

### Transaction Timeout

Increase timeout for slow tests:

```typescript
it('slow test', async () => {
  await withTransaction(async (tx) => {
    // Test code
  });
}, 10000); // 10 second timeout
```

### Database Connection Issues

Ensure `DATABASE_URL` is set in `.env`:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
```

### Fixtures Not Working

Make sure to pass the transaction client:

```typescript
await withTransaction(async (tx) => {
  const fixtures = createFixtures(tx); // Pass tx!
  // ...
});
```

## Environment Variables

Tests require these environment variables:

```bash
DATABASE_URL=postgresql://...
NODE_ENV=test
```

Optional:

```bash
VITEST_LOG_SQL=true  # Enable SQL query logging
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run tests
  run: npm test
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    NODE_ENV: test

- name: Run fast tests only
  run: npm run test:fast
```

## Examples

See `server/__tests__/sample.spec.ts` for complete working examples of:

- Transaction rollback
- Fixture usage
- Test isolation
- Fast vs integration tests
- Complex entity relationships

## Support

For questions or issues:
1. Check existing tests in `server/__tests__/`
2. Review this documentation
3. Check Vitest documentation: https://vitest.dev/
4. Check Prisma documentation: https://www.prisma.io/docs/
