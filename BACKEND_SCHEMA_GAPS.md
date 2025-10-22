# Backend GraphQL Schema Gaps

This document tracks GraphQL queries/mutations that exist in the frontend code but are not yet implemented in the backend schema.

## Status: Code Generation Working ✅
- GraphQL Code Generator runs successfully with no errors
- Invalid queries/mutations are commented out in shared GraphQL files
- Pages using these queries still have TypeScript errors that need fixing

## Commented Out Queries/Mutations

### Order Mutations (`lib/graphql/mutations/orders.ts`)
- ❌ `CANCEL_ORDER` - Cancel an order
- ❌ `REORDER_ITEMS` - Reorder items from a previous order

**Used by:**
- `app/buyer/orders/[id]/page.tsx` - Order detail page with cancel/reorder buttons

### Wholesale Mutations (`lib/graphql/mutations/wholesale.ts`)
- ❌ `CANCEL_INVITATION` - Cancel a wholesale invitation

**Used by:**
- `app/wholesale/invitations/page.tsx` - Invitations management page

### Wholesale Queries (`lib/graphql/queries/wholesale.ts`)
- ❌ `GET_SELLER_BY_USERNAME` - Get seller profile by username
- ❌ `LIST_WHOLESALE_BUYERS` - List all approved wholesale buyers

**Used by:**
- `app/s/[username]/page.tsx` - Public seller storefront
- `app/wholesale/buyers/page.tsx` - Wholesale buyers management

### Trade Quotation Queries/Mutations (`lib/graphql/trade-quotations.ts`)
- ❌ `SEND_QUOTATION` - Send quotation to buyer via email
- ❌ `GET_QUOTATION_BY_TOKEN` - Get quotation by secure token (for buyer view)
- ❌ `CALCULATE_QUOTATION_TOTALS` - Server-side calculation of quotation totals
- ❌ `CalculateQuotationTotalsInput` - Input type for totals calculation

**Used by:**
- `app/trade/quotations/page.tsx` - Quotations list with send button
- `app/trade/quotations/new/page.tsx` - New quotation form with live totals
- `app/trade/quotations/[id]/edit/page.tsx` - Edit quotation with live totals
- `app/trade/view/[token]/page.tsx` - Public buyer view of quotation

### Wholesale Buyer Cart (`lib/graphql/wholesale-buyer.ts`)
- ❌ `GET_WHOLESALE_CART` - Get wholesale cart for buyer
- ❌ `UPDATE_WHOLESALE_CART_ITEM` - Update quantity in wholesale cart
- ❌ `REMOVE_FROM_WHOLESALE_CART` - Remove item from wholesale cart
- ❌ `UpdateWholesaleCartItemInput` - Input type for cart updates

**Used by:**
- `app/wholesale/cart/page.tsx` - Wholesale cart page (currently using mock data)

## Next Steps

### Option 1: Implement Backend Queries (Recommended)
Implement these missing queries/mutations in the NestJS backend GraphQL schema to match the frontend expectations.

### Option 2: Refactor Frontend (Temporary)
Comment out or stub the functionality in the pages using these queries. This allows the build to pass but disables the features.

### Option 3: Hybrid Approach
- Implement critical queries first (e.g., quotation calculations, cart operations)
- Stub out nice-to-have features (e.g., cancel order, reorder)
- Document the missing features clearly in the UI

## Impact Analysis

### Critical (Breaks core features)
- **Wholesale cart operations** - Buyers cannot add items to cart
- **Quotation calculations** - Cannot create/edit quotations with accurate totals
- **Quotation buyer view** - Buyers cannot view quotations sent to them

### High (Reduces functionality)
- **Send quotation** - Cannot email quotations to buyers
- **List wholesale buyers** - Cannot see approved buyers
- **Seller storefronts** - Public seller pages don't work

### Medium (Nice to have)
- **Cancel order** - Users cannot cancel their orders
- **Reorder items** - Users cannot quickly reorder
- **Cancel invitation** - Cannot revoke wholesale invitations

## Files Modified

### Commented out invalid queries in shared files:
1. `apps/frontend/lib/graphql/mutations/orders.ts`
2. `apps/frontend/lib/graphql/mutations/wholesale.ts`
3. `apps/frontend/lib/graphql/queries/wholesale.ts`
4. `apps/frontend/lib/graphql/trade-quotations.ts`
5. `apps/frontend/lib/graphql/wholesale-buyer.ts`

### Pages needing fixes (9 files):
1. `apps/frontend/app/buyer/orders/[id]/page.tsx` - ✅ Fixed
2. `apps/frontend/app/s/[username]/page.tsx` - ⏳ Needs fixing
3. `apps/frontend/app/trade/quotations/[id]/edit/page.tsx` - ⏳ Needs fixing
4. `apps/frontend/app/trade/quotations/new/page.tsx` - ⏳ Needs fixing
5. `apps/frontend/app/trade/quotations/page.tsx` - ⏳ Needs fixing
6. `apps/frontend/app/trade/view/[token]/page.tsx` - ⏳ Needs fixing
7. `apps/frontend/app/wholesale/buyers/page.tsx` - ⏳ Needs fixing
8. `apps/frontend/app/wholesale/cart/page.tsx` - ⏳ Needs fixing
9. `apps/frontend/app/wholesale/invitations/page.tsx` - ⏳ Needs fixing

## Code Generation Config

Updated `apps/frontend/codegen.ts` to:
- ✅ Include all shared GraphQL files (invalid queries are commented out)
- ✅ Exclude pages with schema validation errors:
  - `meta-ads/**` - Uses non-existent campaign fields
  - `wholesale/products/**` - Uses non-existent wholesale product fields
  - `wholesale/preview/**` - Uses non-existent wholesale product fields
  - `wholesale/dashboard/**` - Uses non-existent wholesale stats fields
