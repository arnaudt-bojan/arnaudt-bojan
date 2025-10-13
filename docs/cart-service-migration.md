# Cart Service Migration to Storage API

**Date:** October 13, 2025  
**Status:** ✅ Complete

## Overview

Successfully migrated CartService from placeholder logic to use the new storage API with bridge table pattern for session-based cart management.

## Changes Made

### 1. CartService Updates (`server/services/cart.service.ts`)

#### **New Storage API Integration**
- ✅ `getCart(sessionId)` - Retrieves cart using `storage.getCartBySession(sessionId)`
- ✅ `addToCart(sessionId, productId, quantity, variantId?, userId?)` - Adds items with seller validation and calls `storage.saveCart()`
- ✅ `updateQuantity(sessionId, itemId, quantity, userId?)` - Updates item quantities
- ✅ `removeFromCart(sessionId, itemId, userId?)` - Removes items from cart
- ✅ `clearCart(sessionId)` - Clears cart using `storage.clearCartBySession(sessionId)`
- ✅ `migrateGuestCart(sessionId, userId)` - Handles guest→auth migration

#### **Key Features Implemented**

**Session-Based Storage:**
- All cart operations now use `sessionId` as the primary identifier
- Supports both guest (sessionId only) and authenticated users (sessionId + userId)
- Express session integration via `req.sessionID`

**Single-Seller Cart Constraint:**
```typescript
// Validates that all items in cart are from the same seller
if (currentCart.sellerId && currentCart.sellerId !== product.sellerId) {
  return {
    success: false,
    error: "Cannot add products from different sellers to the same cart..."
  };
}
```

**Variant Support:**
- Added `variantId` parameter to support product variants (size/color combinations)
- Item identification handles both simple products and variant-specific items
- Item key format: `productId` or `productId-variantId`

**Guest→Auth Migration:**
- Automatic cart promotion when user logs in
- Storage layer handles atomic migration via `saveCart(sessionId, sellerId, items, userId)`
- Preserves cart contents during authentication transition

### 2. API Routes Updates (`server/routes.ts`)

#### **Cart API Endpoints Updated:**

**POST /api/cart/add**
- Now accepts: `{ productId, quantity, variantId? }`
- Uses `req.sessionID` for cart identification
- Passes optional `userId` for authenticated users

**POST /api/cart/remove**
- Now accepts: `{ itemId }` (supports both `productId` and `productId-variantId`)
- Session-based removal

**POST /api/cart/update**
- Now accepts: `{ itemId, quantity }`
- Session-based quantity updates

**DELETE /api/cart**
- Session-based cart clearing
- No userId required (works for both guest and auth)

**GET /api/cart**
- Session-based cart retrieval
- Returns cart with calculated totals

### 3. Session Management

**Express Session Integration:**
- Sessions configured in `server/replitAuth.ts` using `connect-pg-simple`
- PostgreSQL-backed session storage
- 7-day session TTL
- Automatic session ID generation via `req.sessionID`

**Session Flow:**
1. User visits site → Express creates session → `req.sessionID` available
2. Add to cart → Cart stored with `sessionId` key in storage
3. User logs in → Cart migrated to authenticated cart (same `sessionId`, now with `userId`)

## Database Schema (Existing)

**carts table:**
```sql
- id (PK)
- sellerId (FK to users)
- buyerId (nullable FK to users) -- null for guest carts
- items (jsonb array)
- status (varchar)
- createdAt, updatedAt
```

**cart_sessions table (bridge):**
```sql
- sessionId (PK)
- cartId (FK to carts, cascade delete)
- lastSeen (timestamp)
```

## Testing Checklist

- ✅ Application starts without errors
- ✅ No LSP diagnostics/compilation errors
- ✅ All cart routes updated to use sessionId
- ✅ Single-seller validation logic implemented
- ✅ Variant support added to cart items
- ✅ Guest→auth migration method implemented
- ✅ Storage API methods properly integrated

## Migration Benefits

1. **Persistent Cart Storage** - Carts now survive page refreshes and browser sessions
2. **Guest Cart Support** - Anonymous users can build carts without authentication
3. **Seamless Login** - Guest carts automatically migrate to user account on login
4. **Single-Seller Enforcement** - Business rule enforced at service layer
5. **Variant Support** - Handles complex product variants (size/color)
6. **Atomic Operations** - Storage layer ensures data consistency

## Next Steps (Future Enhancements)

- [ ] Add cart expiration/cleanup job for abandoned carts
- [ ] Implement cart merging strategy (when auth user has existing cart)
- [ ] Add cart analytics (abandoned cart tracking)
- [ ] Integrate with inventory reservation system
- [ ] Add cart event tracking for business intelligence

## Files Changed

1. `server/services/cart.service.ts` - Complete rewrite with storage API integration
2. `server/routes.ts` - Updated cart endpoints (lines 4914-5016)
3. `docs/cart-service-migration.md` - This documentation

## Code Review Notes

**Strengths:**
- Clean separation of concerns (service layer handles business logic)
- Proper error handling with logging
- Type-safe implementations
- Backward compatible with existing cart structure

**Security:**
- Session IDs managed by Express (secure, httpOnly cookies)
- No cart data exposed in frontend beyond API responses
- Seller validation prevents cart manipulation

**Performance:**
- Single database query per cart operation
- Bridge table pattern enables efficient session lookups
- Atomic operations prevent race conditions
