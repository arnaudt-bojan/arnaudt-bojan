# API Contract Testing - Usage Guide

This guide explains how to use the contract testing system to prevent breaking changes in your APIs.

## 🎯 What is Contract Testing?

Contract testing ensures that your APIs don't accidentally introduce breaking changes. It works by:
1. **Generating** OpenAPI and GraphQL schemas from your code
2. **Comparing** current schemas with baseline versions
3. **Detecting** breaking vs non-breaking changes
4. **Preventing** accidental API breakage in production

## 📋 Quick Start

### 1. Add Scripts to package.json

Since `package.json` is system-protected in Replit, you need to manually add these scripts:

```json
{
  "scripts": {
    "contracts:generate": "tsx scripts/generate-openapi-nestjs.ts && tsx scripts/generate-graphql-schema.ts",
    "contracts:diff": "npm run contracts:generate && tsx scripts/contract-diff.ts",
    "contracts:update-baseline": "npm run contracts:generate && mkdir -p contracts/baseline && cp contracts/openapi-nestjs.json contracts/baseline/ && cp contracts/graphql-schema.graphql contracts/baseline/"
  }
}
```

**Manual Steps:**
1. Open `package.json` in Replit editor
2. Find the `"scripts"` section
3. Add the three contract commands above (after the existing scripts like `db:reset`)
4. Save the file

### 2. Initial Setup (First Time Only)

The baseline contracts have already been created for you! You can verify them:

```bash
ls -la contracts/baseline/
# Should show: openapi-nestjs.json, graphql-schema.graphql
```

If baselines are missing, run:
```bash
npm run contracts:update-baseline
```

### 3. Daily Workflow

Before merging code or deploying:

```bash
# Check for breaking changes
npm run contracts:diff
```

**Possible outcomes:**

✅ **No changes detected**
```
✅ All API contracts match baseline - no changes detected!
```
→ You're good to merge/deploy!

✅ **Non-breaking changes only**
```
✅ Non-breaking changes:
   - Added: new endpoint /api/products/search
   - Added: optional field 'description'
```
→ Safe to merge! Consider updating baseline: `npm run contracts:update-baseline`

❌ **Breaking changes detected**
```
❌ BREAKING CHANGES DETECTED!
   - Removed: /api/products endpoint
   - Changed: field 'price' type from string to number
```
→ **STOP!** Review the changes carefully:
   1. Are these changes intentional?
   2. Will they break existing API clients?
   3. Do you need API versioning (e.g., /api/v2)?

If changes are intentional:
```bash
npm run contracts:update-baseline
```

## 🔧 Available Commands

### Generate Contracts

Generate both contract files from your current code:

```bash
npm run contracts:generate
```

**Generates:**
- `contracts/openapi-nestjs.json` - NestJS REST API specification (health endpoints)
- `contracts/graphql-schema.graphql` - GraphQL schema (3100+ lines, primary API)

### Check for Breaking Changes

Generate contracts and compare with baselines:

```bash
npm run contracts:diff
```

**Exits with:**
- Code 0 - No breaking changes (safe to proceed)
- Code 1 - Breaking changes detected (review required)

### Update Baselines

After reviewing and approving breaking changes:

```bash
npm run contracts:update-baseline
```

This copies current contracts to `contracts/baseline/` directory.

## 🚨 What are Breaking Changes?

### ❌ Breaking Changes (Will Fail CI)

These changes **break existing API clients**:

- Removing endpoints: `DELETE /api/products` → ❌
- Removing required fields: `{ name, price }` → `{ name }` ❌
- Changing field types: `price: string` → `price: number` ❌
- Removing enum values: `['draft', 'published']` → `['published']` ❌
- Making optional field required: `description?` → `description` ❌

### ✅ Non-Breaking Changes (Will Pass)

These changes are **backward compatible**:

- Adding new endpoints: `GET /api/products/search` → ✅
- Adding optional fields: `{ name }` → `{ name, description? }` ✅
- Adding enum values: `['draft']` → `['draft', 'archived']` ✅
- Making required field optional: `description` → `description?` ✅
- Deprecating (but not removing) fields ✅

## 🔄 CI/CD Integration

Add to your CI pipeline (`.github/workflows/ci.yml`):

```yaml
name: CI Pipeline

on: [push, pull_request]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Check API contracts
        run: npm run contracts:diff
```

This ensures:
- ✅ No accidental breaking changes
- ✅ All API changes are intentional and reviewed
- ✅ Contracts stay in sync with implementation

## 📝 Best Practices

### 1. Run Before Every Merge

Always check contracts before merging:
```bash
npm run contracts:diff
```

### 2. Review Breaking Changes Carefully

If breaking changes are detected:
1. **Review the diff** - Understand what's changing
2. **Check impact** - Will this break production clients?
3. **Consider versioning** - Maybe create `/api/v2` instead
4. **Document changes** - Update CHANGELOG.md
5. **Update baselines** - Only after review

### 3. Commit Baselines to Git

Always commit baseline contracts:
```bash
git add contracts/baseline/
git commit -m "Update API contract baselines"
```

### 4. Use Semantic Versioning

When making breaking changes:
- Major version bump: `1.0.0` → `2.0.0`
- Consider API versioning: `/api/v1` vs `/api/v2`
- Document migration guide for clients

## 🛠️ Troubleshooting

### "No baseline found" error

**Solution:** Create initial baselines
```bash
npm run contracts:update-baseline
```

### False positives (safe changes flagged as breaking)

**Solution:** Review the diff output carefully. If the change is actually safe, update baselines:
```bash
npm run contracts:update-baseline
```

### Contract generation fails

**Check:**
1. NestJS server compiles without errors: `npm run build:backend`
2. GraphQL schema is generated: Check `docs/graphql-schema.graphql`
3. TypeScript types are correct: `npm run check`

### Scripts not found in package.json

**Solution:** Manually add the scripts (see Quick Start section above)

## 📊 Contract Files Explained

### contracts/openapi-nestjs.json

NestJS API specification with:
- Health check endpoints
- GraphQL endpoint specification
- Session-based authentication

**Generated from:** Static OpenAPI document in `scripts/generate-openapi-nestjs.ts`

### contracts/graphql-schema.graphql

Full GraphQL schema (3100+ lines) with:
- 10 domain modules (Products, Orders, Cart, Wholesale, etc.)
- All queries, mutations, and subscriptions
- Complete type definitions

**Generated from:** `docs/graphql-schema.graphql` (auto-generated when NestJS server starts)

## 🎓 Learn More

- [OpenAPI Specification](https://swagger.io/specification/)
- [GraphQL Schema Language](https://graphql.org/learn/schema/)
- [API Versioning Best Practices](https://www.postman.com/api-platform/api-versioning/)
- [Semantic Versioning](https://semver.org/)

## 🆘 Need Help?

**Common questions:**

**Q: How often should I check contracts?**
A: Before every merge or deployment.

**Q: Can I skip contract testing?**
A: Not recommended! Breaking changes can crash production.

**Q: What if I need to make breaking changes?**
A: Review impact, consider API versioning, update baselines, and document migration.

**Q: How do I add more endpoints to the contracts?**
A: Add NestJS REST controllers (for OpenAPI) or GraphQL resolvers (for GraphQL schema), then regenerate.

---

**Ready to use contract testing?** Start with: `npm run contracts:diff`
