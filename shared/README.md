# @upfirst/shared

Shared utilities and types used across the Upfirst monorepo.

## Contents

- **schema.ts** - Database schema definitions
- **validation-schemas.ts** - Zod validation schemas
- **pricing-service.ts** - Pricing calculation utilities
- **order-utils.ts** - Order processing helpers
- **shipping-validation.ts** - Shipping validation logic
- **sku-generator.ts** - SKU generation utilities
- **variant-formatter.ts** - Product variant formatting
- **bulk-upload-schema.ts** - Bulk upload schemas
- **newsletter-types.ts** - Newsletter type definitions
- **countries.ts** - Country data
- **continents.ts** - Continent data
- **prisma-types.ts** - Prisma type utilities

## Usage

Import from this package using the workspace name:

```typescript
import { schema, validationSchemas } from '@upfirst/shared';
```

## Dependencies

- **zod** - Schema validation
- **date-fns** - Date utilities
- **@prisma/client** (peer dependency) - Database types
