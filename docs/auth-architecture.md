# Authentication & Authorization Architecture

## Overview
This document defines the authentication and authorization system for Upfirst's multi-seller D2C platform. The system uses a capability-based permission model with clear user types and extensible design.

## User Types

### 1. Seller
- **Purpose**: Store owner who sells products
- **Signup Context**: Main domain (upfirst.io) or explicit seller signup
- **user_type**: `'seller'`
- **Restrictions**: CANNOT purchase from ANY store (including their own or others)
- **Key Attributes**:
  - Has their own store with subdomain
  - Can manage products, orders, team
  - Can invite collaborators and wholesale buyers

### 2. Buyer  
- **Purpose**: Regular customer
- **Signup Context**: Any seller subdomain (username.upfirst.io) or guest checkout
- **user_type**: `'buyer'`
- **Access**: Can purchase retail products from any seller
- **Restrictions**: Cannot create/manage products or stores
- **Key Attributes**:
  - Has order history
  - Can save payment methods and addresses
  - No store management capabilities
  - **Can have wholesale access**: If invited by seller, gains wholesale_access_grants (additional access, still user_type='buyer')

### 3. Collaborator
- **Purpose**: Additional seller email working on same store
- **Invitation**: Invited by store owner (seller)
- **user_type**: `'collaborator'`
- **Access**: Limited to specific store they're invited to
- **Restrictions**: 
  - Cannot invite other collaborators
  - Cannot change critical store settings (payment, subscriptions)
  - CANNOT purchase (same as seller)
- **Key Attributes**:
  - Linked to specific seller's store via user_store_memberships
  - Can manage products and orders for that store only
  - Simplified role (no editor/viewer/admin distinction)

---

## Capability Matrix

| Capability | Seller | Buyer | Buyer + Wholesale Access | Collaborator |
|-----------|--------|-------|--------------------------|--------------|
| **Storefront Management** |
| View own storefront | ✅ | ❌ | ❌ | ✅ (linked store) |
| Edit store settings | ✅ | ❌ | ❌ | ⚠️ (limited) |
| Upload store logo/banner | ✅ | ❌ | ❌ | ✅ |
| Manage about/contact info | ✅ | ❌ | ❌ | ✅ |
| **Product Management** |
| Create products | ✅ | ❌ | ❌ | ✅ (linked store) |
| Edit products | ✅ | ❌ | ❌ | ✅ (linked store) |
| Delete products | ✅ | ❌ | ❌ | ✅ (linked store) |
| Import products (CSV) | ✅ | ❌ | ❌ | ✅ |
| **Order Management** |
| View orders | ✅ (own store) | ✅ (own orders) | ✅ (own orders) | ✅ (linked store) |
| Fulfill orders | ✅ | ❌ | ❌ | ✅ (linked store) |
| Process refunds | ✅ | ❌ | ❌ | ✅ (linked store) |
| Update tracking | ✅ | ❌ | ❌ | ✅ (linked store) |
| **Purchasing** |
| Purchase retail products | ❌ | ✅ | ✅ | ❌ |
| Purchase wholesale products | ❌ | ❌ | ✅ (invited sellers) | ❌ |
| Guest checkout | ❌ | ✅ | ✅ | ❌ |
| **Team Management** |
| Invite collaborators | ✅ | ❌ | ❌ | ❌ |
| Remove collaborators | ✅ | ❌ | ❌ | ❌ |
| **Wholesale Management** |
| Create wholesale products | ✅ | ❌ | ❌ | ✅ (linked store) |
| Invite wholesale buyers | ✅ | ❌ | ❌ | ❌ |
| Manage wholesale invites | ✅ | ❌ | ❌ | ❌ |
| **Payment & Financial** |
| Connect Stripe | ✅ | ❌ | ❌ | ❌ |
| Manage subscription | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ❌ | ❌ | ⚠️ (view only) |
| **Platform Admin** |
| View all sellers | 🔒 | ❌ | ❌ | ❌ |
| Platform analytics | 🔒 | ❌ | ❌ | ❌ |

**Legend:**
- ✅ Full access
- ❌ No access  
- ⚠️ Limited access (restrictions noted)
- 🔒 Platform admin only (special isPlatformAdmin flag)

---

## Database Schema (ERD)

### Core Tables

#### 1. `users` (Updated)
```typescript
{
  id: varchar (PK, UUID)
  email: varchar (unique)
  username: varchar (unique) // For sellers: subdomain name
  user_type: enum('seller', 'buyer', 'collaborator')
  
  // Profile
  firstName: varchar
  lastName: varchar
  profileImageUrl: varchar
  
  // Store settings (for sellers only)
  storeBanner: text
  storeLogo: text
  storeActive: integer
  
  // Payment integration (for sellers only)
  stripeConnectedAccountId: varchar
  stripeChargesEnabled: integer
  listingCurrency: varchar(3)
  
  // Subscription (for sellers only)
  stripeCustomerId: varchar
  stripeSubscriptionId: varchar
  subscriptionStatus: varchar
  
  // Platform admin flag
  isPlatformAdmin: integer (0=no, 1=yes)
  
  // Legacy fields (deprecated, keep for migration)
  role: varchar // Will be removed after migration
  sellerId: varchar // Will be removed after migration
  
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 2. `user_store_memberships` (New)
**Purpose**: Track which collaborators belong to which seller stores

```typescript
{
  id: varchar (PK, UUID)
  userId: varchar (FK -> users.id) // The collaborator
  storeOwnerId: varchar (FK -> users.id) // The seller who owns the store
  capabilities: jsonb // { manageProducts: true, manageOrders: true, viewAnalytics: true, ... }
  invitedBy: varchar (FK -> users.id) // Who sent the invitation
  status: enum('active', 'suspended')
  createdAt: timestamp
  updatedAt: timestamp
  
  UNIQUE(userId, storeOwnerId) // One membership per user per store
}
```

#### 3. `wholesale_access_grants` (New)
**Purpose**: Track which wholesale buyers have access to which seller's wholesale catalog

```typescript
{
  id: varchar (PK, UUID)
  buyerId: varchar (FK -> users.id) // The wholesale buyer
  sellerId: varchar (FK -> users.id) // The seller granting access
  status: enum('active', 'revoked', 'expired')
  discountPercentage: decimal // Optional: custom discount for this buyer
  minimumOrderValue: decimal // Optional: minimum order requirement
  invitedBy: varchar (FK -> users.id) // Who sent the invitation
  expiresAt: timestamp // Optional: time-limited access
  createdAt: timestamp
  updatedAt: timestamp
  
  UNIQUE(buyerId, sellerId) // One grant per buyer per seller
}
```

#### 4. `team_invitations` (New)
**Purpose**: Track pending collaborator invitations

```typescript
{
  id: varchar (PK, UUID)
  email: varchar // Invitee email
  storeOwnerId: varchar (FK -> users.id) // Seller sending invite
  invitedBy: varchar (FK -> users.id) // Same as storeOwnerId usually
  token: varchar (unique) // Secure invitation token
  capabilities: jsonb // What they'll be able to do
  status: enum('pending', 'accepted', 'expired', 'cancelled')
  expiresAt: timestamp
  createdAt: timestamp
  acceptedAt: timestamp
}
```

#### 5. `wholesale_invitations` (New)
**Purpose**: Track pending wholesale buyer invitations

```typescript
{
  id: varchar (PK, UUID)
  email: varchar // Invitee email
  sellerId: varchar (FK -> users.id) // Seller sending invite
  invitedBy: varchar (FK -> users.id) // Same as sellerId usually
  token: varchar (unique) // Secure invitation token
  terms: jsonb // { discountPercentage, minimumOrderValue, expiresAt, ... }
  status: enum('pending', 'accepted', 'expired', 'cancelled')
  expiresAt: timestamp
  createdAt: timestamp
  acceptedAt: timestamp
}
```

---

## Service Architecture

### 1. AuthService
**Purpose**: Manage identity lifecycle, signups, and invitations

**Responsibilities:**
- User creation with correct user_type based on context
- Handle signup flows (seller, buyer, collaborator, wholesale buyer)
- Manage team invitations (send, accept, cancel)
- Manage wholesale invitations (send, accept, revoke)
- Context detection (main domain vs seller subdomain)

**Key Methods:**
```typescript
interface IAuthService {
  // User creation
  createSeller(email: string, username?: string): Promise<User>
  createBuyer(email: string, sellerContext?: string): Promise<User>
  createCollaborator(email: string, invitation: TeamInvitation): Promise<User>
  
  // Invitations
  sendTeamInvitation(storeOwnerId: string, email: string, capabilities: Capabilities): Promise<TeamInvitation>
  acceptTeamInvitation(token: string, userId: string): Promise<UserStoreMembership>
  sendWholesaleInvitation(sellerId: string, email: string, terms: WholesaleTerms): Promise<WholesaleInvitation>
  acceptWholesaleInvitation(token: string, userId: string): Promise<WholesaleAccessGrant>
  
  // Context detection
  determineSignupContext(req: Request): Promise<'seller' | 'buyer'>
  getSellerContextFromDomain(hostname: string): Promise<string | null>
}
```

### 2. AuthorizationService
**Purpose**: Policy-driven permission engine

**Responsibilities:**
- Check if user has specific capability
- Determine resource access (can user access this store/order/product?)
- Enforce permission rules across the platform
- Provide permission data for frontend gating

**Key Methods:**
```typescript
interface IAuthorizationService {
  // Capability checks
  hasCapability(userId: string, capability: Capability): Promise<boolean>
  canAccessStore(userId: string, storeOwnerId: string): Promise<boolean>
  canManageProduct(userId: string, productId: string): Promise<boolean>
  canViewOrder(userId: string, orderId: string): Promise<boolean>
  canPurchase(userId: string, productType: 'retail' | 'wholesale'): Promise<boolean>
  
  // Get user capabilities
  getUserCapabilities(userId: string): Promise<Capability[]>
  getStoreMemberships(userId: string): Promise<UserStoreMembership[]>
  getWholesaleAccess(userId: string): Promise<WholesaleAccessGrant[]>
  
  // Policy evaluation
  evaluatePolicy(subject: User, action: string, resource: any): Promise<boolean>
}
```

### 3. Middleware

#### requireAuth
```typescript
// Basic authentication check
export const requireAuth: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

#### requireCapability
```typescript
// Capability-based permission check
export function requireCapability(capability: Capability): RequestHandler {
  return async (req: any, res, next) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const hasCapability = await authorizationService.hasCapability(userId, capability);
    if (!hasCapability) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}
```

#### requireUserType
```typescript
// User type check
export function requireUserType(...types: UserType[]): RequestHandler {
  return async (req: any, res, next) => {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);
    
    if (!user || !types.includes(user.user_type)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}
```

---

## Signup & Invitation Flows

### Seller Signup Flow
1. User visits main domain (upfirst.io)
2. Enters email → receives auth code
3. Verifies email → AuthService.createSeller()
4. user_type = 'seller', generates unique username
5. Redirects to seller onboarding

### Buyer Signup Flow
1. User visits seller subdomain (username.upfirst.io)
2. Enters email → receives auth code with sellerContext
3. Verifies email → AuthService.createBuyer(email, sellerContext)
4. user_type = 'buyer'
5. Can immediately purchase from that seller

### Collaborator Invitation Flow
1. Seller sends team invitation → AuthService.sendTeamInvitation()
2. Creates team_invitations record with token
3. Invitee receives email with invitation link
4. Clicks link → if no account, creates buyer account first
5. Accepts invitation → AuthService.acceptTeamInvitation()
6. Creates user_store_memberships record
7. User's user_type changes to 'collaborator'

### Wholesale Buyer Invitation Flow
1. Seller sends wholesale invitation → AuthService.sendWholesaleInvitation()
2. Creates wholesale_invitations record with token and terms
3. Invitee receives email with invitation link
4. Clicks link → if no account, creates buyer account first (user_type='buyer')
5. Accepts invitation → AuthService.acceptWholesaleInvitation()
6. Creates wholesale_access_grants record (buyer gains wholesale access to this seller)
7. User remains user_type='buyer' but now has wholesale purchasing capability for invited seller's catalog

---

## Migration Strategy

### Phase 1: Schema Changes
1. Add user_type column to users table
2. Create new tables: user_store_memberships, wholesale_access_grants, team_invitations, wholesale_invitations
3. Keep legacy role and sellerId fields for safety

### Phase 2: Data Backfill
```sql
-- Backfill user_type based on current role
UPDATE users 
SET user_type = CASE
  WHEN role IN ('admin', 'seller', 'owner') THEN 'seller'
  WHEN role IN ('editor', 'viewer') THEN 'collaborator'
  ELSE 'buyer' -- All other users including existing buyers
END;

-- Create memberships for existing team members (collaborators)
INSERT INTO user_store_memberships (userId, storeOwnerId, capabilities, status)
SELECT 
  id as userId,
  sellerId as storeOwnerId,
  '{"manageProducts": true, "manageOrders": true}'::jsonb as capabilities,
  'active' as status
FROM users
WHERE sellerId IS NOT NULL AND role IN ('editor', 'viewer');

-- Migrate existing wholesale relationships (if any exist in invitations table)
-- Wholesale buyers remain as user_type='buyer' but get wholesale_access_grants
INSERT INTO wholesale_access_grants (buyerId, sellerId, status)
SELECT DISTINCT
  u.id as buyerId,
  i.sellerId,
  'active' as status
FROM users u
JOIN invitations i ON i.email = u.email
WHERE i.role = 'wholesale'
AND i.status = 'accepted';
```

### Phase 3: Update Services
1. Implement AuthService and AuthorizationService
2. Update storage layer with new methods
3. Add feature flag to toggle between old/new systems
4. Test both systems in parallel

### Phase 4: Update Routes
1. Replace isAuthenticated/isSeller with requireAuth/requireCapability
2. Use AuthorizationService for all permission checks
3. Remove scattered role checks

### Phase 5: Update Frontend
1. Add user capability context
2. Update UI components to use capability checks
3. Add guards to prevent sellers from accessing purchase flows
4. Show/hide features based on user capabilities

### Phase 6: Cleanup
1. Remove feature flag
2. Drop legacy role and sellerId columns
3. Remove old middleware (isAuthenticated, isSeller)
4. Archive old auth code

---

## Key Architectural Decisions

### 1. Capability-Based vs Role-Based
**Decision**: Use capability-based permissions
**Rationale**: More flexible and extensible than fixed roles. Easy to add new capabilities without restructuring entire permission system.

### 2. Service Architecture Pattern
**Decision**: Follow same DI pattern as NotificationService
**Rationale**: Consistency across codebase, testability, clear separation of concerns

### 3. User Type as Single Source of Truth
**Decision**: user_type column is authoritative, not role
**Rationale**: Eliminates confusion from overlapping role systems, makes user type explicit

### 4. Store Membership Model
**Decision**: Separate membership table instead of sellerId field
**Rationale**: 
- Allows multiple collaborators per store
- Tracks capabilities per membership
- Cleaner than overloading sellerId field

### 5. Wholesale as Scoped Access
**Decision**: wholesale_access_grants tied to specific seller
**Rationale**: Prevents cross-seller access leakage, allows per-seller terms

### 6. Invitation Tokens
**Decision**: Separate tables for team vs wholesale invitations
**Rationale**: Different invitation types have different data requirements, cleaner separation

---

## Security Considerations

1. **Seller Purchase Prevention**: Frontend AND backend checks to prevent sellers from adding items to cart
2. **Membership Validation**: Always verify user has active membership before allowing store access
3. **Wholesale Scope**: Verify wholesale buyer only sees products from sellers who granted access
4. **Invitation Token Security**: Use cryptographically secure tokens, implement expiration
5. **Permission Caching**: Cache capabilities per request, not globally (avoid stale permissions)
6. **Audit Trail**: Log all permission-sensitive operations (membership changes, access grants)

---

## Extension Points

### Adding New User Types
1. Add to user_type enum
2. Define capabilities in capability matrix
3. Update AuthorizationService policy rules
4. Add signup flow to AuthService
5. Update frontend guards

### Adding New Capabilities
1. Add to Capability type
2. Update capability matrix documentation
3. Implement check in AuthorizationService
4. Add middleware if needed for routes
5. Update frontend to use new capability

### Adding New Permission Scopes
1. Create new grant/membership table if needed
2. Add methods to AuthService
3. Update AuthorizationService to check new scope
4. Add migration for existing data
