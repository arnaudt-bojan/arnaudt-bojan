# Backend Services Architecture

## Service Validation Status (October 2025)

**Test Phase:** Architecture 3 Regression Testing (Phase 1 - Manual E2E)  
**Last Updated:** October 13, 2025  
**Documentation:** `docs/ARCHITECTURE_3_TEST_RESULTS.md`

### ✅ Validated Services (7/10)
| Service | Status | Coverage | Notes |
|---------|--------|----------|-------|
| **CartService** | ✅ VALIDATED | 100% | Cart persistence bug FIXED, session-based storage working |
| **PricingCalculationService** | ✅ VALIDATED | 100% | All calculations verified (subtotal, shipping, tax, total) |
| **ShippingService** | ✅ VALIDATED | 100% | Shippo integration working, delivery estimates accurate |
| **ProductService** | ✅ VALIDATED | 95% | SKU generation, stock sync, CRUD, bulk import validated |
| **ConfigurationError** | ✅ VALIDATED | 100% | Error handling improved (400 not 500) |
| **CartValidationService** | ✅ VALIDATED | 100% | Server-side price validation working |
| **InventoryService** | ✅ VALIDATED | 100% | Stock reservation and sync working |

### ⏸️ Blocked Services (2/10)
| Service | Status | Blocker | Next Steps |
|---------|--------|---------|------------|
| **OrderLifecycleService** | ⏸️ BLOCKED | Stripe Connect onboarding required | Complete Stripe Connect setup |
| **LegacyStripeCheckoutService** | ⏸️ BLOCKED | Stripe Connect onboarding required | Complete Stripe Connect setup |

### 🔄 Pending Services (1/10)
| Service | Status | Reason | Priority |
|---------|--------|--------|----------|
| **StripeWebhookService** | 🔄 PENDING | Requires Stripe webhook configuration | Medium |

---

## Overview
All business logic has been centralized in backend services. The frontend is purely presentational and makes API calls to these services.

## Architecture Pattern

**Hybrid Cart Storage:**
- Frontend: Stores cart items (product IDs + quantities) in localStorage
- Backend: Validates products, fetches prices from database, calculates totals

This is a secure, scalable pattern used by major e-commerce platforms.

## Services

### 1. CartValidationService (`server/services/cart-validation.service.ts`)
**Purpose:** Validate cart items against database with server-side pricing

**Security:** Never trusts client-supplied prices. Always fetches from database.

**Methods:**
- `validateCart(items)` - Validates cart items, fetches server prices, enforces seller constraint
- `validateProduct(productId, quantity)` - Validates single product

### 2. PricingService (`server/services/pricing.service.ts`)
**Purpose:** All pricing calculations (deposit logic, shipping allocation, tax)

**Methods:**
- `calculatePricing(items, shippingCost, taxAmount)` - Complete pricing breakdown
- `validateChargeAmount(displayed, calculated)` - Ensures UI matches charge
- `estimateTax(amount, rate)` - Tax estimation

### 3. ShippingService (`server/services/shipping.service.ts`)
**Purpose:** Shipping rate calculations

**Security:** Validates all items are from same seller

**Methods:**
- `calculateShipping(items, destination)` - Calculate shipping cost
- `validateAddress(address)` - Validate shipping address

### 4. OrderService (`server/services/order.service.ts`)
**Purpose:** Order creation, payment orchestration, status management

**Methods:**
- `calculateOrderSummary(items, shippingCost, taxAmount)` - Order summary before payment
- `createOrder(data)` - Create order after successful payment
- `updatePaymentStatus(orderId, status)` - Update payment status
- `processRemainingBalance(orderId, paymentIntentId)` - Process balance payment

### 5. TaxService (`server/services/tax.service.ts`)
**Purpose:** Tax calculations using Stripe Tax

**Methods:**
- `calculateTax(params)` - Calculate tax using Stripe Tax
- `estimateTax(amount, rate)` - Estimate tax
- `validateTaxCalculation(calculationId)` - Validate tax calculation

## API Endpoints

### Cart Validation
- `POST /api/cart/validate` - Validate cart items with server-side prices
  - Request: `{ items: [{ productId, quantity }] }`
  - Response: `{ valid, items, total, errors, sellerId }`

### Shipping
- `POST /api/shipping/calculate` - Calculate shipping cost
  - Request: `{ items: [{ id, quantity }], destination: { country, state?, postalCode? } }`
  - Response: `{ cost, method, zone?, estimatedDays?, carrier? }`

### Order
- `POST /api/orders/calculate` - Calculate order summary with server-side shipping & tax
  - Request: `{ items: [{ productId, quantity }], destination: { country, state?, postalCode? } }`
  - Response: `{ subtotal, shippingCost, taxAmount, total, depositAmount?, remainingBalance?, paymentType, shipping, validatedItems }`
  - **Security:** Calculates shipping and tax server-side, never accepts client values

## Security

### Critical Security Features:
1. **Server-Side Price Validation** - All prices fetched from database, never from client
2. **Product Existence Validation** - Ensures products exist before processing
3. **Quantity Validation** - Enforces positive integers only, rejects negative/fractional values
4. **Total Validation** - Rejects orders with zero or negative totals
5. **Seller Constraint Enforcement** - Validates all items from same seller
6. **Discount Calculation** - Server-side calculation of active promotions
7. **Shipping Calculation** - Server-side calculation, client cannot supply shipping cost
8. **Tax Calculation** - Server-side calculation, client cannot supply tax amount
9. **Amount Verification** - Pre-charge validation ensures UI matches charge

### Attack Prevention:
- ❌ Client cannot manipulate prices
- ❌ Client cannot manipulate quantities (negative/fractional blocked)
- ❌ Client cannot create zero/negative total orders
- ❌ Client cannot manipulate shipping costs
- ❌ Client cannot manipulate tax amounts
- ❌ Client cannot add non-existent products
- ❌ Client cannot mix products from different sellers
- ❌ Client cannot bypass business rules

## Data Flow

### Cart Validation Flow:
1. Frontend sends: `[{ productId: "123", quantity: 2 }]`
2. Backend fetches products from database
3. Backend calculates prices with active discounts
4. Backend validates seller constraint
5. Backend returns validated items with server prices

### Order Calculation Flow:
1. Frontend sends cart items + shipping destination
2. Backend validates cart items (server-side prices)
3. Backend calculates shipping cost
4. Backend estimates tax
5. Backend returns complete order summary

### Checkout Flow:
1. Frontend validates cart via `/api/cart/validate`
2. Frontend calculates shipping via `/api/shipping/calculate`
3. Frontend gets order summary via `/api/orders/calculate`
4. Frontend displays totals to customer
5. Backend creates payment intent with validated amounts
6. Backend creates order after successful payment

## Frontend Integration

The frontend should:
1. Store cart items in localStorage (product IDs + quantities only)
2. Call `/api/cart/validate` to get server-validated prices
3. Call `/api/shipping/calculate` for shipping costs
4. Call `/api/orders/calculate` for order totals
5. Display server-calculated values to user
6. Never perform business logic locally

## Future Enhancements

### Cart Persistence:
- Move cart from localStorage to backend sessions
- Implement user-specific cart storage in database
- Enable cart sync across devices

### Shipping:
- Implement Shippo real-time rates
- Implement shipping matrix with zone-based pricing
- Add delivery estimates

### Tax:
- Full Stripe Tax integration
- Seller-specific tax nexus configuration
- Tax exemption handling
