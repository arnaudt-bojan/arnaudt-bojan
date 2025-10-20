# Database Constraint Tests

This directory contains comprehensive database constraint tests for the Upfirst platform.

## Test File

- **`database-constraints.test.ts`** - Comprehensive test suite validating all database constraints, foreign keys, unique constraints, required fields, and data integrity rules.

## Running the Tests

### Option 1: Using npx (Recommended)
```bash
NODE_ENV=test npx jest server/__tests__/database-constraints.test.ts
```

### Option 2: Using node with experimental modules
```bash
NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js server/__tests__/database-constraints.test.ts
```

### Option 3: Run all tests
```bash
NODE_ENV=test npx jest
```

### Watch mode
```bash
NODE_ENV=test npx jest --watch
```

### With coverage
```bash
NODE_ENV=test npx jest --coverage
```

## Test Coverage

The test suite covers the following areas:

### 1. Unique Constraints
- User email uniqueness
- Product SKU uniqueness (per seller)
- Auth token uniqueness
- Invitation token uniqueness
- Wholesale order number uniqueness
- Document number uniqueness

### 2. Required Fields
- User: email, role
- Product: name, price, seller_id
- Order: customer_name, customer_email, total
- Wholesale Order: all required fields

### 3. Foreign Key Constraints
- Product → Seller relationship
- Order → Seller relationship
- Wholesale Order → Buyer/Seller relationships
- Quotation → Seller relationship
- Newsletter relationships (subscribers, workflows, executions)

### 4. Data Integrity
- **Default Values**: role, status, currency, stock, etc.
- **Cascade Deletes**: 
  - Deleting seller cascades products
  - Deleting source cascades import jobs
  - Deleting cart cascades cart sessions
  - Deleting subscriber cascades automation executions
- **Enum Constraints**: wholesale order status, payment types
- **Numeric Validations**: positive prices, quantities
- **Timestamp Defaults**: automatic created_at timestamps
- **JSON Field Integrity**: variants, cart items

### 5. Composite Constraints
- Subscriber uniqueness (user_id + email)

## Prerequisites

- PostgreSQL database must be running and accessible via `DATABASE_URL` environment variable
- Prisma client must be generated: `npx prisma generate`
- Database schema must be up to date: `npm run db:push`

## Test Data Management

All tests follow these principles:
- Clean up test data before each test
- Clean up test data after each test
- Use unique identifiers (timestamps, random strings) to avoid collisions
- Test data is prefixed with `test-constraint-` for easy identification

## Configuration

Jest configuration is in `jest.config.js` at the project root.

Key settings:
- Uses `ts-jest` for TypeScript support
- ESM modules enabled
- Test timeout: 30 seconds
- Max workers: 1 (to avoid database conflicts)

## Troubleshooting

### Database connection errors
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` environment variable is set
- Check database permissions

### Test timeouts
- Increase timeout in jest.config.js if needed
- Check database performance
- Verify no long-running transactions

### Constraint violations not caught
- Ensure Prisma schema is synced with database
- Run `npm run db:push` to update database schema
- Check Prisma client is regenerated

## Adding New Tests

When adding new constraint tests:

1. Add to appropriate `describe` block
2. Follow the naming pattern: "should [expected behavior]"
3. Clean up test data in `beforeEach` and `afterEach`
4. Use helper functions (`createTestUser`, `createTestProduct`, etc.)
5. Test both positive and negative cases
6. Use descriptive test names and comments
