# Backend Testing Infrastructure

## Overview

This directory contains the testing infrastructure for the NestJS backend application. The backend uses Jest for unit and integration testing.

## Directory Structure

```
apps/backend/test/
├── mocks/                  # Mock implementations for external services
│   ├── stripe-mock.ts      # Stripe API mocks
│   ├── paypal-mock.ts      # PayPal API mocks
│   ├── resend-mock.ts      # Resend email mocks
│   └── message-queue.ts    # Message queue mocks
├── setup.ts                # Jest global setup
├── test-utils.ts           # Test utilities and helpers
└── README.md               # This file
```

## Running Tests

### Basic Commands

```bash
# Run all backend tests
npm run test --workspace=@upfirst/backend

# Run tests in watch mode
npm run test:watch --workspace=@upfirst/backend

# Run tests with coverage
npm run test:cov --workspace=@upfirst/backend

# Run E2E tests
npm run test:e2e --workspace=@upfirst/backend
```

## Mock Services

### Stripe Mock

Mock implementation for Stripe payment processing:

```typescript
import { mockStripeAPI, STRIPE_FIXTURES } from './mocks/stripe-mock';

// Setup mocks
mockStripeAPI();

// Use fixtures in tests
const customer = STRIPE_FIXTURES.customer;
const paymentIntent = STRIPE_FIXTURES.paymentIntent;
```

### PayPal Mock

Mock implementation for PayPal payment processing.

### Resend Mock

Mock implementation for Resend email service.

### Message Queue Mock

Mock implementation for event publishing and message queue operations:

```typescript
import { mockQueue } from './mocks/message-queue';

// Publish events
await mockQueue.publish({
  event: 'product.created',
  productId: 'prod_123',
  sellerId: 'seller_456',
  timestamp: new Date().toISOString(),
});

// Consume events
const events = await mockQueue.consume('product.created');
```

## Test Utilities

The `test-utils.ts` file contains helper functions for:
- Database test setup
- Test data factories
- Common test operations

## Writing Tests

### NestJS Module Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Integration Testing with Database

```typescript
import { PrismaService } from '../prisma/prisma.service';

describe('Product Integration Tests', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    // Setup database connection
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should create product', async () => {
    const product = await prisma.product.create({
      data: {
        // Test data
      },
    });
    
    expect(product).toBeDefined();
  });
});
```

## E2E Testing

End-to-end tests test the full application flow from API request to response. They are located in the root `tests/e2e/` directory and use Playwright to test the complete Next.js + NestJS integration.

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on other tests
2. **Use Mocks**: Mock external services to avoid API calls during tests
3. **Clean Up**: Always clean up test data after each test
4. **Descriptive Names**: Use clear, descriptive test names
5. **Test Both Success and Failure**: Test happy paths and error cases

## Environment Variables

Tests require these environment variables:

```bash
DATABASE_URL=postgresql://...
NODE_ENV=test
```

## CI/CD Integration

Tests are run automatically in CI via GitHub Actions. See `.github/workflows/test-suite.yml` for configuration.

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright E2E Tests](../../tests/e2e/README.md)
