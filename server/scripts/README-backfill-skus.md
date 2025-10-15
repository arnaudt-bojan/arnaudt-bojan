# SKU Backfill Migration Script

## Overview
This script generates SKUs for all products and variants that don't have them, using the SKU format: `UPF-{SELLER}-{COUNTER}`

## Usage

### Direct Execution (Recommended)
```bash
tsx server/scripts/backfill-skus.ts
```

### Alternative (if npm script is added to package.json)
```bash
npm run migrate:sku
```

## Features

✅ **Idempotent**: Safe to run multiple times - only updates products without SKUs  
✅ **Error Handling**: Gracefully handles errors, continues processing remaining products  
✅ **Progress Logging**: Clear output showing what's being updated  
✅ **Variant Support**: Automatically generates SKUs for product variants  
✅ **Verification**: Confirms all products have SKUs after completion  

## Example Output

### First Run (with products needing SKUs)
```
🏷️  Starting SKU backfill...

📦 Found 45 total products
🔍 16 products need SKU generation

Products to update:
  - Classic Tee (6b22c38d-d7b5-4fbb-814a-409e2063d58c) (2 variants)
  - Designer Hoodie (cd1b5d7a-cd72-46d3-8efc-2e62f950e62c) (2 variants)
  ...

⚙️  Generating SKUs...

📊 Backfill Summary:
   ✅ Successfully updated: 17 products
   ❌ Errors: 0 products

🔍 Verifying results...
✨ All products now have SKUs!

🎉 SKU backfill completed successfully!
```

### Subsequent Runs (all products have SKUs)
```
🏷️  Starting SKU backfill...

📦 Found 45 total products
🔍 0 products need SKU generation

✨ All products already have SKUs!

🎉 SKU backfill completed successfully!
```

## How It Works

1. **Fetches all products** from the database
2. **Identifies products without SKUs** (where `sku` is null or empty)
3. **For each product:**
   - Generates product SKU using seller ID
   - If product has variants, generates unique SKU for each variant
   - Updates the product in the database
4. **Logs progress** with success/error counts
5. **Verifies results** to ensure all products now have SKUs

## SKU Format

- **Product SKU**: `UPF-{SELLER_CODE}-{COUNTER}`  
  Example: `UPF-TEST-001`

- **Variant SKU**: `{PRODUCT_SKU}-{VARIANT_SUFFIX}`  
  Example: `UPF-TEST-001-A`, `UPF-TEST-001-B`

## Safety

- ✅ Only modifies products without SKUs
- ✅ Never overwrites existing SKUs
- ✅ Continues processing even if individual product fails
- ✅ Provides detailed error messages for troubleshooting

## Testing Checklist

- [x] Script runs without errors
- [x] Generates SKUs for products without them
- [x] Skips products that already have SKU
- [x] Generates variant SKUs correctly
- [x] Logs progress clearly
- [x] Can be run multiple times safely (idempotent)
- [x] Successfully tested with 17 products
