# Frontend Shared Utilities

Shared utilities and types used within the Next.js frontend service.

## Overview

This directory contains frontend-specific shared code copied from the original workspace setup. The frontend is now an independent service with its own dependencies.

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

Import from this directory using relative paths:

```typescript
import { schema } from '@/lib/shared/schema';
import { validationSchemas } from '@/lib/shared/validation-schemas';
```

## Dependencies

All dependencies are declared in `frontend/package.json`:
- **zod** - Schema validation
- **date-fns** - Date utilities
- **@prisma/client** - Database types
