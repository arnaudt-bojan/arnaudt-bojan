# Manual E2E Test Checklist - Architecture 3 Regression Testing
**Purpose:** Verify Architecture 3 services function correctly and catch regressions  
**Date Created:** October 13, 2025  
**Test Environment:** Development (`/s/username` routing)  
**Tester:** [Your Name]

---

## Test Account Setup

**Test Seller Account:**
- Email: `testseller@test.com`
- Username: `testseller`
- Auth Code: `111111` (fixed, no email check needed)
- Storefront: `/s/testseller`

**Test Buyer Account:**
- Email: `testbuyer@test.com`
- Auth Code: `111111`

⚠️ **IMPORTANT:** Always logout from seller before testing as buyer (sellers can't see cart on their own products)

---

## Test Suite 1: Cart & Checkout Flow
**Services Tested:** CartValidationService, PricingCalculationService, OrderService  
**Addresses Known Bug:** #1 (Cart persistence issue)

### Setup
- [ ] Login as seller (`testseller@test.com`)
- [ ] Create test product if not exists:
  - Name: "Test Product - In Stock"
  - Price: $25.00
  - Stock: 100
  - Product Type: In-stock
- [ ] Note product ID: `__________`
- [ ] **Logout from seller**

### Test: Add to Cart & Verify Persistence
- [ ] Navigate to `/s/testseller` (storefront)
- [ ] Click on test product
- [ ] Click "Add to Cart"
- [ ] **VERIFY:** Cart icon shows "1 item"
- [ ] Open cart sheet/modal
- [ ] **VERIFY:** Product appears with correct:
  - [ ] Product name
  - [ ] Price ($25.00)
  - [ ] Quantity (1)
  - [ ] Subtotal ($25.00)

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

### Test: Shipping & Tax Calculation
- [ ] In cart, click "Checkout" or "Continue to Checkout"
- [ ] Enter shipping address:
  - Country: United States
  - State: California
  - City: Los Angeles
  - Postal Code: 90001
  - Street: 123 Test St
- [ ] **VERIFY:** Shipping cost calculated and displayed
- [ ] **VERIFY:** Tax calculated (if seller has tax enabled)
- [ ] **VERIFY:** Total = Subtotal + Shipping + Tax

**Shipping Cost:** $_________  
**Tax Amount:** $_________  
**Total:** $_________  
**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

### Test: Complete Checkout
- [ ] Continue to payment
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Expiry: Any future date
- [ ] CVC: Any 3 digits
- [ ] Complete payment
- [ ] **VERIFY:** Order confirmation page displayed
- [ ] **VERIFY:** Order ID shown
- [ ] Note Order ID: `__________`

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 2: Product Management Flow
**Services Tested:** ProductService  
**Addresses Known Bug:** #2 (Dashboard products route 404)

### Test: Navigate to Products Page
- [ ] Login as seller (`testseller@test.com`)
- [ ] Click "Dashboard" in navigation
- [ ] Click "Products" in sidebar/menu
- [ ] **VERIFY:** Page loads successfully (not 404)
- [ ] **VERIFY:** URL is `/dashboard/products` or `/seller/products`
- [ ] **VERIFY:** Product list displays

**Result:** ✅ PASS / ❌ FAIL  
**If FAIL:** Note actual URL: _______________  
**Error message:** _______________________________________________

### Test: Create Product
- [ ] Click "Create Product" or "Add Product"
- [ ] Fill in product details:
  - Name: "Regression Test Product [timestamp]"
  - Description: "Testing Architecture 3"
  - Price: $50.00
  - Stock: 10
  - Product Type: In-stock
  - Category: Test
- [ ] Upload product image (optional)
- [ ] Click "Create" or "Save"
- [ ] **VERIFY:** Success message shown
- [ ] **VERIFY:** Product appears in products list
- [ ] Note Product ID: `__________`

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

### Test: Update Product Stock
- [ ] Click on newly created product
- [ ] Update stock to: 25
- [ ] Click "Save" or "Update"
- [ ] **VERIFY:** Success message
- [ ] **VERIFY:** Stock shows as 25 in product list

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

### Test: Product with Variants (Stock Sync)
- [ ] Create new product with variants:
  - Name: "Variant Test Product"
  - Base Price: $30.00
  - Add variants:
    - Small, Red: Stock 5, Price $30
    - Medium, Blue: Stock 10, Price $32
- [ ] Save product
- [ ] **VERIFY:** Product stock = 15 (sum of variants)
- [ ] Edit product, change variant stock:
  - Small, Red: 8 (was 5)
- [ ] Save
- [ ] **VERIFY:** Product stock updated to 18 (8+10)

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 3: Order Lifecycle & Refunds
**Services Tested:** OrderLifecycleService, OrderService  
**Critical:** Tests refund calculation security

### Setup: Create Order
- [ ] **Logout from seller**
- [ ] Navigate to `/s/testseller`
- [ ] Add product to cart (use "Test Product - In Stock" from earlier)
- [ ] Set quantity: 2 (Total: $50.00)
- [ ] Complete checkout (use test card)
- [ ] Note Order ID: `__________`
- [ ] **Login as seller** (`testseller@test.com`)

### Test: View Order Details
- [ ] Navigate to Orders page
- [ ] Click on the order just created
- [ ] **VERIFY:** Order details displayed:
  - [ ] Customer info
  - [ ] Order items (2 units)
  - [ ] Order total ($50.00 + shipping + tax)
  - [ ] Order status

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

### Test: Update Order Status
- [ ] In order details, update status to "Processing"
- [ ] Click "Update Status"
- [ ] **VERIFY:** Status changed to "Processing"
- [ ] **VERIFY:** Status history/timeline updated

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

### Test: Item-Level Partial Refund
- [ ] In order details, find refund section
- [ ] Select "Partial Refund" or "Refund Items"
- [ ] Select 1 unit of the product (out of 2)
- [ ] **VERIFY:** Calculated refund amount = $25.00 (1 unit price)
- [ ] Add refund reason: "Testing partial refund"
- [ ] Submit refund
- [ ] **VERIFY:** Success message
- [ ] **VERIFY:** Refund appears in refund history
- [ ] **VERIFY:** Order payment status = "Partially Refunded"

**Refund Amount:** $_________  
**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

### Test: Full Refund Remaining Balance
- [ ] Click "Refund" again
- [ ] Select "Full Refund" or remaining items
- [ ] **VERIFY:** Calculated amount = $25.00 (remaining balance)
- [ ] Submit refund
- [ ] **VERIFY:** Order payment status = "Refunded"
- [ ] **VERIFY:** Total refunded = $50.00 (both refunds combined)

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 4: Shipping Service
**Services Tested:** ShippingService, PricingCalculationService  
**Addresses Known Bug:** #3 (Shipping API error handling)

### Test: Shipping Without Warehouse Configuration
- [ ] Login as NEW seller (or clear warehouse settings)
- [ ] Ensure warehouse address is NOT configured
- [ ] Create product with shipping required
- [ ] **Logout, navigate to storefront as buyer**
- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Enter shipping address
- [ ] **VERIFY:** Error message is clear and helpful (NOT 500 error)
- [ ] **EXPECTED:** "Warehouse address not configured" or similar
- [ ] **NOT EXPECTED:** Generic 500 error

**Actual Response Code:** _______  
**Error Message:** _______________________________________________  
**Result:** ✅ PASS / ❌ FAIL  

### Test: Shipping With Warehouse Configured
- [ ] Login as seller (`testseller@test.com`)
- [ ] Navigate to Settings > Warehouse
- [ ] Configure warehouse address:
  - Street: 123 Warehouse St
  - City: Los Angeles
  - State: CA
  - Postal Code: 90001
  - Country: US
- [ ] Save warehouse settings
- [ ] **Logout, test checkout again**
- [ ] **VERIFY:** Shipping cost calculated successfully

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 5: Deposit & Balance Payment
**Services Tested:** PricingCalculationService, OrderLifecycleService

### Test: Create Deposit Product
- [ ] Login as seller
- [ ] Create product with deposit:
  - Name: "Made-to-Order Test"
  - Price: $200.00
  - Product Type: Made-to-order
  - Deposit Amount: $50.00
  - Readiness Days: 14
- [ ] Save product

### Test: Deposit Payment Flow
- [ ] **Logout, navigate to storefront**
- [ ] Add deposit product to cart
- [ ] Proceed to checkout
- [ ] **VERIFY:** Deposit section shows:
  - [ ] Deposit due today: $50.00
  - [ ] Remaining balance: $150.00
  - [ ] Readiness estimate: ~14 days
- [ ] Complete checkout with test card
- [ ] **VERIFY:** Order created with:
  - [ ] Payment Type: "deposit"
  - [ ] Amount Paid: $50.00
  - [ ] Balance Remaining: $150.00

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

### Test: Balance Payment Request
- [ ] Login as seller
- [ ] Navigate to order
- [ ] Click "Request Balance Payment"
- [ ] **VERIFY:** Email sent to customer (check logs)
- [ ] **VERIFY:** Balance payment link generated
- [ ] Note balance payment ID: `__________`

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 6: Bulk Product Import
**Services Tested:** ProductService (bulk operations)

### Test: CSV Bulk Import
- [ ] Login as seller
- [ ] Navigate to Products > Bulk Import
- [ ] Prepare CSV with 3 products:
```csv
Name,Description,Price,Stock,Product Type,Category
Bulk Test 1,Description 1,10.00,5,in-stock,Test
Bulk Test 2,Description 2,20.00,10,in-stock,Test  
Bulk Test 3,Description 3,30.00,15,in-stock,Test
```
- [ ] Upload CSV
- [ ] **VERIFY:** Import summary shows:
  - [ ] 3 successful imports
  - [ ] 0 failed imports
- [ ] **VERIFY:** All 3 products appear in product list
- [ ] **VERIFY:** Each product has auto-generated SKU

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

---

## Test Suite 7: Subscription & Webhooks
**Services Tested:** SubscriptionService, StripeWebhookService

### Test: Subscription Creation (Trial)
- [ ] Login as seller
- [ ] Navigate to Settings > Subscription
- [ ] Click "Subscribe" (Monthly or Annual)
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Complete checkout
- [ ] **VERIFY:** Subscription status = "trial" (if 30-day trial)
- [ ] **VERIFY:** Trial end date displayed
- [ ] **VERIFY:** Payment method saved

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

### Test: Webhook Event Processing (if Stripe configured)
- [ ] Trigger test webhook via Stripe Dashboard
- [ ] Event: `invoice.payment_succeeded`
- [ ] **VERIFY:** Check logs for webhook receipt
- [ ] **VERIFY:** Subscription status updated
- [ ] **VERIFY:** Email sent to user (check logs)

**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _______________________________________________

---

## Bug Tracking

### Known Bugs Regression Testing

**Bug #1: Cart Persistence Issue**
- Test Suite: 1 (Cart & Checkout)
- Status: ☐ Still Exists / ☐ Fixed / ☐ Not Reproducible
- Notes: _______________________________________________

**Bug #2: Dashboard Products Route 404**
- Test Suite: 2 (Product Management)
- Status: ☐ Still Exists / ☐ Fixed / ☐ Not Reproducible
- Notes: _______________________________________________

**Bug #3: Shipping API Error Handling**
- Test Suite: 4 (Shipping Service)
- Status: ☐ Still Exists / ☐ Fixed / ☐ Not Reproducible
- Notes: _______________________________________________

### New Bugs Found

**Bug #4:** _______________________________________________
- Test Suite: _______
- Severity: ☐ Critical / ☐ High / ☐ Medium / ☐ Low
- Steps to Reproduce:
  1. 
  2. 
  3. 

**Bug #5:** _______________________________________________
- Test Suite: _______
- Severity: ☐ Critical / ☐ High / ☐ Medium / ☐ Low
- Steps to Reproduce:
  1. 
  2. 
  3. 

---

## Test Summary

**Date Tested:** _______________  
**Tester:** _______________  
**Environment:** Development  

| Test Suite | Total Tests | Passed | Failed | Skipped |
|-----------|-------------|--------|--------|---------|
| 1. Cart & Checkout | 3 | ___ | ___ | ___ |
| 2. Product Management | 4 | ___ | ___ | ___ |
| 3. Order Lifecycle | 5 | ___ | ___ | ___ |
| 4. Shipping Service | 2 | ___ | ___ | ___ |
| 5. Deposit & Balance | 3 | ___ | ___ | ___ |
| 6. Bulk Import | 1 | ___ | ___ | ___ |
| 7. Subscription | 2 | ___ | ___ | ___ |
| **TOTAL** | **20** | ___ | ___ | ___ |

**Pass Rate:** ______%

**Critical Issues Found:** _______  
**Regressions Detected:** _______  
**New Bugs Discovered:** _______

---

## Next Steps

### If All Tests Pass:
- [ ] Update Architecture 3 documentation with test results
- [ ] Consider this regression testing complete
- [ ] Plan for automated test implementation (future)

### If Tests Fail:
- [ ] Document all failures in bug tracker
- [ ] Prioritize critical bugs (checkout, payments, refunds)
- [ ] Create fix tasks for development team
- [ ] Re-test after fixes applied

### Recommendations:
- [ ] Run this checklist weekly during active development
- [ ] Update checklist as new features are added
- [ ] Consider automating these tests with Vitest (future sprint)

---

**Sign-off:**

Tester: ___________________ Date: ___________  
Reviewer: _________________ Date: ___________  
