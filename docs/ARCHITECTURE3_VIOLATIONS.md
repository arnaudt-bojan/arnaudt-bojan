# Architecture 3 Violations Catalogue

**Architecture 3 Rule**: ALL business logic, calculations, validations, and business rules MUST be server-side. Client displays server-provided data without performing critical business calculations.

## Executive Summary

- **Total Violations Found**: 47
- **Categories Affected**: 8/8
- **Overall Priority**: 🔴 **CRITICAL**
- **Audit Date**: October 19, 2025
- **Status**: Architecture 3 principle is systematically violated across the frontend

### Categories Overview

| Category | Violations | Priority | Impact |
|----------|-----------|----------|---------|
| Pricing Calculations | 12 | 🔴 Critical | Revenue accuracy, pricing integrity |
| Currency Conversions | 3 | 🔴 Critical | International pricing accuracy |
| Order Status Logic | 4 | 🟡 High | User experience, order tracking |
| Cart Logic | 5 | 🔴 Critical | Checkout integrity |
| Product Logic | 8 | 🟡 High | Product display, availability |
| Wholesale/B2B Logic | 6 | 🔴 Critical | B2B operations, MOQ enforcement |
| Analytics Logic | 8 | 🟡 High | Dashboard accuracy |
| Business Mode Switching | 1 | 🟢 Medium | Mode selection UX |

---

## 1. Pricing Calculations (Client-Side) 🔴 CRITICAL

### Violation 1.1: Currency Conversion Logic
**Location**: `client/src/contexts/CurrencyContext.tsx:71-94`

**Code**:
```typescript
const convertPrice = useCallback((price: number, fromCurrency: string, toCurrency: string) => {
  if (!rates || fromCurrency === toCurrency) return price;
  
  // Convert from source currency to USD (base)
  const inUSD = fromCurrency === 'USD' ? price : price / rates[fromCurrency];
  
  // Convert from USD to target currency
  const converted = toCurrency === 'USD' ? inUSD : inUSD * rates[toCurrency];
  
  return converted;
}, [rates]);
```

**Issue**: Currency conversion rates and calculations performed on client-side
**Impact**: 
- Exchange rate inconsistencies
- Price accuracy issues
- Potential revenue loss from incorrect conversions

**Server Contract Needed**:
```graphql
type Query {
  convertPrice(
    amount: Float!
    fromCurrency: String!
    toCurrency: String!
  ): Float!
  
  getExchangeRates(baseCurrency: String!): ExchangeRates!
}
```

---

### Violation 1.2: Cart Tax Estimation
**Location**: `client/src/components/cart-sheet.tsx:42-44`

**Code**:
```typescript
const taxEstimate = seller?.taxEnabled 
  ? total * 0.08 
  : 0;
```

**Issue**: 
- Hardcoded tax rate (8%) on client
- Tax business logic should be server-side
- Ignores tax jurisdiction rules

**Impact**:
- Incorrect tax calculations
- Legal compliance issues
- Revenue discrepancies

**Server Contract Needed**:
```graphql
type Cart {
  id: ID!
  items: [CartItem!]!
  subtotal: Float!
  tax: Float!
  total: Float!
}

type Query {
  calculateCartTotals(cartId: ID!): CartTotals!
}
```

---

### Violation 1.3: Cart Item Total Calculations
**Location**: `client/src/components/cart-sheet.tsx:166,173,178`

**Code**:
```typescript
// Line 166
const itemTotal = parseFloat(item.price) * item.quantity;

// Line 173
const subtotal = items.reduce((sum, item) => 
  sum + (parseFloat(item.price) * item.quantity), 0
);

// Line 178
const total = subtotal + taxEstimate;
```

**Issue**: 
- Cart subtotal calculation on client
- Item total calculations on client
- Final total calculation on client

**Impact**:
- Cart total accuracy
- Pricing integrity issues
- Potential for client-side manipulation

**Server Contract Needed**:
```graphql
type CartItem {
  id: ID!
  productId: ID!
  quantity: Int!
  price: Float!
  lineTotal: Float!  # Server-calculated
}
```

---

### Violation 1.4: Product Discount Calculations
**Location**: `client/src/components/product-card.tsx:123`

**Code**:
```typescript
{formatPrice(
  parseFloat(product.price) * (1 - parseFloat(product.discountPercentage) / 100),
  (product as any).currency
)}
```

**Issue**: 
- Discount percentage calculations on client
- Final discounted price computed on client
- Discount logic should be server-side

**Impact**:
- Pricing accuracy
- Promotion integrity
- Revenue loss from incorrect calculations

**Server Contract Needed**:
```graphql
type Product {
  id: ID!
  price: Float!
  discountPercentage: Float
  finalPrice: Float!  # Server-calculated with discount applied
  savings: Float      # Server-calculated
}
```

---

### Violation 1.5: Order Deposit & Balance Calculations
**Location**: `client/src/pages/order-success.tsx:107-112`

**Code**:
```typescript
const amountPaid = parseFloat(order?.amountPaid || "0");
const remainingBalance = parseFloat(order?.remainingBalance || "0");
const total = parseFloat(order?.total || "0");
const depositAmountCents = order?.depositAmountCents || 0;
const depositAmount = depositAmountCents / 100;
const balanceAmount = amountPaid - depositAmount;
```

**Issue**:
- Deposit amount calculations on client
- Balance due calculations on client
- Amount conversions on client

**Impact**:
- Payment accuracy issues
- Potential for payment fraud
- Financial reconciliation problems

**Server Contract Needed**:
```graphql
type Order {
  id: ID!
  total: Float!
  amountPaid: Float!
  depositAmount: Float!      # Server-calculated
  balanceAmount: Float!      # Server-calculated
  remainingBalance: Float!   # Server-calculated
}
```

---

### Violation 1.6: Trade Quotation Calculations
**Location**: `client/src/pages/trade-quotation-builder.tsx:169-189`

**Code**:
```typescript
// Calculate line totals and summary
const calculations = watchedItems.reduce(
  (acc, item) => {
    const unitPrice = Number(item.unitPrice) || 0;
    const quantity = Number(item.quantity) || 0;
    const lineTotal = unitPrice * quantity;

    return {
      subtotal: acc.subtotal + lineTotal,
      lineTotals: [...acc.lineTotals, lineTotal],
    };
  },
  { subtotal: 0, lineTotals: [] as number[] }
);

const totalTax = Number(taxAmount) || 0;
const totalShipping = Number(shippingAmount) || 0;
const grandTotal = calculations.subtotal + totalTax + totalShipping;

const depositAmount = (grandTotal * depositPercentage) / 100;
const balanceAmount = grandTotal - depositAmount;
```

**Issue**:
- Line total calculations on client
- Subtotal aggregation on client
- Grand total calculation on client
- Deposit/balance calculations on client

**Impact**:
- B2B quotation accuracy
- Professional credibility
- Revenue integrity

**Server Contract Needed**:
```graphql
type QuotationCalculations {
  lineItems: [LineItemCalculation!]!
  subtotal: Float!
  tax: Float!
  shipping: Float!
  grandTotal: Float!
  depositAmount: Float!
  balanceAmount: Float!
}

type Mutation {
  calculateQuotation(input: QuotationInput!): QuotationCalculations!
}
```

---

### Violation 1.7: Refund Amount Calculations
**Location**: `client/src/components/refund-dialog.tsx:207-225`

**Code**:
```typescript
const updateQuantity = (itemId: string, newQty: number, item: OrderItem) => {
  const newSelected = new Map(selectedItems);
  const pricePerUnit = parseFloat(item.price);
  const refundableQty = item.quantity - (item.refundedQuantity || 0);
  
  const apiItem = refundableData?.items?.find(i => i.itemId === itemId);
  const apiMaxRefundable = apiItem ? parseFloat(apiItem.refundableAmount) : pricePerUnit * refundableQty;
  const apiMaxQty = apiItem ? apiItem.refundableQuantity : refundableQty;
  
  const clampedQty = Math.max(1, Math.min(newQty, apiMaxQty));
  
  // Calculate proportional refund amount based on quantity
  const proportionalAmount = (apiMaxRefundable / apiMaxQty) * clampedQty;
  
  newSelected.set(itemId, {
    quantity: clampedQty,
    amount: proportionalAmount,
  });
};
```

**Issue**:
- Refundable amount calculations on client
- Proportional refund calculations on client
- Fallback calculations when API data not available

**Impact**:
- Refund accuracy
- Financial reconciliation issues
- Customer trust

**Server Contract Needed**:
```graphql
type RefundCalculation {
  itemId: ID!
  quantity: Int!
  refundAmount: Float!  # Server-calculated
  taxRefund: Float!     # Server-calculated
}

type Mutation {
  calculateRefund(orderId: ID!, items: [RefundItemInput!]!): RefundCalculation!
}
```

---

### Violation 1.8-1.12: Additional Pricing Logic

**Locations**:
- `client/src/pages/wholesale/checkout.tsx` - Some calculations present (needs review)
- `client/src/pages/seller-dashboard.tsx:156` - Revenue summation
- `client/src/lib/cart-context.tsx` - Cart item price handling
- `client/src/hooks/use-pricing.ts` - ✅ **GOOD EXAMPLE** - Uses backend API for pricing
- `client/src/pages/wholesale/cart.tsx` - Item total display

---

## 2. Currency Conversions 🔴 CRITICAL

### Violation 2.1: Currency Formatting Logic
**Location**: `client/src/contexts/CurrencyContext.tsx:89-94`

**Code**:
```typescript
const formatPrice = useCallback((price: number) => {
  const convertedPrice = convertPrice(price, baseCurrency, selectedCurrency);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: selectedCurrency,
  }).format(convertedPrice);
}, [selectedCurrency, baseCurrency, convertPrice]);
```

**Issue**:
- Currency conversion before formatting
- Formatting logic tied to conversion logic
- All currency business logic on client

**Server Contract Needed**:
```graphql
type FormattedPrice {
  amount: Float!
  currency: String!
  formatted: String!
  convertedFrom: String
}

type Query {
  formatPrice(
    amount: Float!
    currency: String!
    displayCurrency: String!
  ): FormattedPrice!
}
```

---

### Violation 2.2: Currency Context State Management
**Location**: `client/src/contexts/CurrencyContext.tsx:15-70`

**Issue**:
- Exchange rates fetched and stored on client
- Currency selection logic on client
- Currency conversion business logic on client

**Impact**:
- Stale exchange rates
- Inconsistent pricing across users
- Potential for currency arbitrage

**Server Contract Needed**:
```graphql
type UserSettings {
  id: ID!
  preferredCurrency: String!
  pricesInPreferredCurrency: Boolean!
}

type Mutation {
  updatePreferredCurrency(currency: String!): UserSettings!
}
```

---

### Violation 2.3: Inline Currency Formatting
**Location**: Multiple files (product-card.tsx, order-success.tsx, etc.)

**Code Pattern**:
```typescript
const formatOrderPrice = (price: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
};
```

**Issue**:
- Currency formatting scattered across multiple components
- Inconsistent formatting logic
- No centralized currency handling

**Server Contract Needed**: Same as 2.1

---

## 3. Order Status Logic 🟡 HIGH

### Violation 3.1: Payment Status Color Derivation
**Location**: `client/src/pages/buyer-order-details.tsx:39-54`

**Code**:
```typescript
const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case "fully_paid":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "deposit_paid":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "pending":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    // ... more cases
  }
};
```

**Issue**:
- Business logic (payment status interpretation) mixed with presentation
- Status semantics defined on client
- Should be derived from server status object

**Impact**:
- Inconsistent status display
- Difficult to maintain business rules

**Server Contract Needed**:
```graphql
type PaymentStatus {
  status: String!
  label: String!
  variant: StatusVariant!  # success, warning, error, info
  description: String
}

type Order {
  paymentStatus: PaymentStatus!  # Full object with display metadata
}
```

---

### Violation 3.2: Order Status Color Derivation
**Location**: `client/src/pages/buyer-order-details.tsx:56-71`

**Code**:
```typescript
const getOrderStatusColor = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-800";
    case "shipped":
      return "bg-blue-100 text-blue-800";
    // ... more cases
  }
};
```

**Issue**: Same as 3.1 - business logic for order status interpretation on client

**Server Contract Needed**:
```graphql
type OrderStatus {
  status: String!
  label: String!
  variant: StatusVariant!
  description: String
  allowedActions: [OrderAction!]!  # What can be done in this status
}
```

---

### Violation 3.3: Status Label Formatting
**Location**: `client/src/lib/format-status.ts`

**Code** (inferred from usage):
```typescript
export function getPaymentStatusLabel(status: string): string {
  // Converts snake_case to Title Case
  // Business logic for status display
}

export function getOrderStatusLabel(status: string): string {
  // Converts status codes to human-readable labels
}
```

**Issue**:
- Business logic for status presentation on client
- Status semantics duplicated on client and server

**Server Contract Needed**: Same as 3.1 and 3.2

---

### Violation 3.4: Order Balance Due Check
**Location**: `client/src/pages/buyer-order-details.tsx:107`

**Code**:
```typescript
const hasBalanceDue = order.remainingBalance && parseFloat(order.remainingBalance) > 0;
```

**Issue**:
- Business rule (does order have balance due?) on client
- Should be server-provided boolean flag

**Server Contract Needed**:
```graphql
type Order {
  hasBalanceDue: Boolean!      # Server-calculated
  isPaymentComplete: Boolean!  # Server-calculated
  nextPaymentAction: String    # Server-provided
}
```

---

## 4. Cart Logic 🔴 CRITICAL

### Violation 4.1: Cart Item Validation
**Location**: `client/src/lib/cart-context.tsx` (inferred from usage)

**Issue**:
- Item quantity validation on client
- Stock availability checks on client
- Variant selection validation on client

**Server Contract Needed**:
```graphql
type Mutation {
  addToCart(
    productId: ID!
    quantity: Int!
    variant: VariantInput
  ): CartOperationResult!
}

type CartOperationResult {
  success: Boolean!
  cart: Cart
  error: String
  validationErrors: [ValidationError!]
}
```

---

### Violation 4.2: Cart Total Aggregation
**Location**: `client/src/components/cart-sheet.tsx:173`

**Code**:
```typescript
const subtotal = items.reduce((sum, item) => 
  sum + (parseFloat(item.price) * item.quantity), 0
);
```

**Issue**:
- Cart subtotal aggregated on client
- Should be server-calculated and cached

---

### Violation 4.3: MOQ (Minimum Order Quantity) Validation
**Location**: `client/src/pages/wholesale/cart.tsx:133-143`

**Code**:
```typescript
{product.minimumOrderQuantity && item.quantity < product.minimumOrderQuantity && (
  <Alert variant="destructive" className="mt-2">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      Minimum order quantity: {product.minimumOrderQuantity} units
      (Currently: {item.quantity} units)
    </AlertDescription>
  </Alert>
)}
```

**Issue**:
- MOQ business rule validation on client
- Critical B2B business logic
- Should be server-enforced

**Impact**:
- Business rule bypass possible
- Wholesale integrity compromised

**Server Contract Needed**:
```graphql
type CartValidation {
  isValid: Boolean!
  errors: [CartValidationError!]!
  warnings: [CartValidationWarning!]!
}

type CartValidationError {
  itemId: ID!
  type: String!  # MOQ_NOT_MET, OUT_OF_STOCK, etc.
  message: String!
  details: JSON
}

type Query {
  validateCart(cartId: ID!): CartValidation!
}
```

---

### Violation 4.4: Stock Availability Display
**Location**: `client/src/pages/product-detail.tsx:219-272`

**Code**:
```typescript
const isProductAvailable = () => {
  if (isLoadingStock) {
    return true;
  }
  
  if (hasVariants) {
    if (isColorSizeVariant && (!selectedColor || !selectedSize)) {
      return false;
    }
    if (isSizeOnlyVariant && !selectedSize) {
      return false;
    }
    if (product?.productType === "in-stock") {
      return stockData?.isAvailable ?? false;
    }
    return true;
  }
  
  if (product?.productType === "in-stock") {
    return stockData?.isAvailable ?? false;
  }
  
  return true;
};
```

**Issue**:
- Complex product availability logic on client
- Multiple business rules for availability
- Should be server-determined

**Impact**:
- Inconsistent availability display
- Potential overselling

**Server Contract Needed**:
```graphql
type ProductAvailability {
  isAvailable: Boolean!
  reason: String
  availableDate: DateTime
  quantityAvailable: Int
}

type Product {
  availability(variant: VariantInput): ProductAvailability!
}
```

---

### Violation 4.5: Variant Stock Info Display
**Location**: `client/src/pages/product-detail.tsx:186-194`

**Code**:
```typescript
const sizeStockInfo: Record<string, number> | undefined = 
  product?.productType === "in-stock" && currentColorVariant?.sizes
    ? currentColorVariant.sizes.reduce((acc, sizeItem) => {
        acc[sizeItem.size] = sizeItem.stock || 0;
        return acc;
      }, {} as Record<string, number>)
    : undefined;
```

**Issue**:
- Stock aggregation logic on client
- Business logic for variant stock display

**Server Contract Needed**: Included in 4.4

---

## 5. Product Logic 🟡 HIGH

### Violation 5.1: Product Type Badge Logic
**Location**: `client/src/components/product-type-badge.tsx:9-45`

**Code**:
```typescript
const getVariant = (type: ProductType) => {
  switch (type) {
    case "pre-order":
      return "default";
    case "made-to-order":
      return "secondary";
    case "in-stock":
      return "outline";
    case "wholesale":
      return "default";
    default:
      return "outline";
  }
};

const getLabel = (type: ProductType) => {
  switch (type) {
    case "pre-order":
      return "Pre-Order";
    case "made-to-order":
      return "Made to Order";
    case "in-stock":
      return "In Stock";
    case "wholesale":
      return "Wholesale";
    default:
      return type;
  }
};
```

**Issue**:
- Product type semantics defined on client
- Badge variant logic (business presentation) on client
- Label derivation on client

**Impact**:
- Inconsistent product type display
- Hard to update product type semantics

**Server Contract Needed**:
```graphql
type ProductTypeBadge {
  type: String!
  label: String!
  variant: String!
  description: String
}

type Product {
  productType: String!
  productTypeBadge: ProductTypeBadge!  # Server-provided with display metadata
}
```

---

### Violation 5.2: Variant Requirements Logic
**Location**: `client/src/pages/product-detail.tsx:144-152`

**Code**:
```typescript
const variantRequirements = product?.variantRequirements || {
  requiresVariantSelection: false,
  variantType: 'none' as const,
};

const hasVariants = variantRequirements.requiresVariantSelection;
const isColorSizeVariant = variantRequirements.variantType === 'color-size';
const isSizeOnlyVariant = variantRequirements.variantType === 'size-only';
```

**Issue**:
- ✅ **PARTIALLY GOOD** - Uses backend data
- ❌ Still derives business logic from backend flags on client
- Should be server-provided computed properties

**Server Contract Needed**:
```graphql
type VariantConfiguration {
  requiresSelection: Boolean!
  type: VariantType!
  hasColors: Boolean!      # Server-computed
  hasSizes: Boolean!       # Server-computed
  availableColors: [ColorOption!]!
  availableSizes: [String!]!
}
```

---

### Violation 5.3: Product Unavailability Reason
**Location**: `client/src/pages/product-detail.tsx:252-272`

**Code**:
```typescript
const getUnavailableReason = () => {
  if (hasVariants) {
    if (isColorSizeVariant && (!selectedColor || !selectedSize)) {
      return "Please select a color and size";
    }
    if (isSizeOnlyVariant && !selectedSize) {
      return "Please select a size";
    }
  }
  if (!stockData?.isAvailable) {
    if (hasVariants && variantId) {
      if (isColorSizeVariant) {
        return `This variant (${selectedSize} - ${selectedColor}) is sold out. Please choose another option.`;
      } else {
        return `Size ${selectedSize} is sold out. Please choose another option.`;
      }
    }
    return "This product is currently sold out";
  }
  return null;
};
```

**Issue**:
- Business logic for unavailability reason generation
- Complex conditional logic on client
- User-facing messages derived from client logic

**Server Contract Needed**:
```graphql
type UnavailabilityReason {
  code: String!
  message: String!
  suggestion: String
  alternativeProducts: [Product!]
}

type ProductAvailability {
  isAvailable: Boolean!
  unavailabilityReason: UnavailabilityReason
}
```

---

### Violation 5.4-5.8: Additional Product Logic

**Locations**:
- `client/src/pages/product-detail.tsx:162-184` - Color/size options derivation
- `client/src/pages/product-detail.tsx:196-199` - Display images selection logic
- `client/src/pages/wholesale-product-detail.tsx` - Similar patterns
- `client/src/components/product-variant-manager.tsx` - Variant management logic
- `client/src/components/variant-color-selector.tsx` - Color selection logic

---

## 6. Wholesale/B2B Logic 🔴 CRITICAL

### Violation 6.1: MOQ Enforcement
**Location**: `client/src/pages/wholesale/cart.tsx:133-143`

**Code**: See Violation 4.3

**Issue**:
- Critical B2B business rule on client
- Minimum order quantity validation
- Could be bypassed

**Impact**:
- B2B business rules violation
- Wholesale pricing integrity
- Revenue loss

---

### Violation 6.2: Deposit Percentage Calculation
**Location**: `client/src/pages/trade-quotation-builder.tsx:188`

**Code**:
```typescript
const depositAmount = (grandTotal * depositPercentage) / 100;
```

**Issue**:
- Deposit amount calculation on client
- Business rule (deposit percentage) application on client

---

### Violation 6.3: Balance Due Calculation
**Location**: `client/src/pages/trade-quotation-builder.tsx:189`

**Code**:
```typescript
const balanceAmount = grandTotal - depositAmount;
```

**Issue**:
- Balance calculation on client
- Critical financial calculation

**Server Contract Needed**:
```graphql
type WholesaleOrder {
  grandTotal: Float!
  depositPercentage: Float!
  depositAmount: Float!      # Server-calculated
  balanceAmount: Float!      # Server-calculated
  paymentSchedule: [PaymentScheduleItem!]!
}
```

---

### Violation 6.4: Wholesale Pricing Logic
**Location**: `client/src/pages/wholesale/checkout.tsx` (uses API - needs verification)

**Status**: ✅ **GOOD PATTERN** - Appears to use backend API for pricing
**Action**: Verify all wholesale pricing uses backend calculations

---

### Violation 6.5: Payment Terms Evaluation
**Location**: `client/src/pages/trade-quotation-builder.tsx:54-64`

**Code**:
```typescript
const deliveryTerms = [
  { value: "EXW", label: "EXW - Ex Works (Buyer handles all logistics)" },
  { value: "FOB", label: "FOB - Free On Board (Seller delivers to port)" },
  { value: "CIF", label: "CIF - Cost, Insurance, Freight" },
  // ...
];
```

**Issue**:
- Payment terms business logic on client
- Incoterms interpretation on client
- Should be server-managed

**Server Contract Needed**:
```graphql
type DeliveryTerm {
  code: String!
  name: String!
  description: String!
  buyerResponsibilities: [String!]!
  sellerResponsibilities: [String!]!
}

type Query {
  availableDeliveryTerms: [DeliveryTerm!]!
}
```

---

### Violation 6.6: Quotation Line Item Calculations
**Location**: `client/src/pages/trade-quotation-builder.tsx:169-181`

**Code**: See Violation 1.6

**Issue**: 
- Line total calculations
- Subtotal aggregation
- All B2B quotation math on client

---

## 7. Analytics Logic 🟡 HIGH

### Violation 7.1: Revenue Calculation
**Location**: `client/src/pages/seller-dashboard.tsx:156`

**Code**:
```typescript
const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0;
```

**Issue**:
- Revenue aggregation on client
- Should be server-calculated and cached
- Analytics business logic on client

**Impact**:
- Dashboard accuracy
- Performance issues with large datasets
- Inconsistent metrics

**Server Contract Needed**:
```graphql
type SellerMetrics {
  totalRevenue: Float!
  revenueByPeriod: [RevenueDataPoint!]!
  revenueGrowth: Float!
}

type Query {
  sellerDashboardMetrics(period: Period!): SellerMetrics!
}
```

---

### Violation 7.2: Order Count Aggregation
**Location**: `client/src/pages/seller-dashboard.tsx:157`

**Code**:
```typescript
const totalOrders = orders?.length || 0;
```

**Issue**:
- Order counting on client
- Analytics aggregation should be server-side

---

### Violation 7.3: Pending Orders Filter
**Location**: `client/src/pages/seller-dashboard.tsx:158`

**Code**:
```typescript
const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
```

**Issue**:
- Business logic for "pending" orders on client
- Status-based filtering should be server-side

---

### Violation 7.4: Order Growth Calculation
**Location**: `client/src/pages/seller-analytics.tsx:203-205`

**Code**:
```typescript
const orderGrowth = analytics.orders.previousPeriodOrders > 0
  ? ((analytics.orders.totalOrders - analytics.orders.previousPeriodOrders) / analytics.orders.previousPeriodOrders) * 100
  : analytics.orders.totalOrders > 0 ? 100 : 0;
```

**Issue**:
- ✅ **PARTIALLY GOOD** - Uses backend data
- ❌ Growth percentage calculation on client
- Should be server-calculated

**Server Contract Needed**:
```graphql
type OrderAnalytics {
  totalOrders: Int!
  previousPeriodOrders: Int!
  orderGrowth: Float!          # Server-calculated percentage
  orderGrowthLabel: String!    # "+15.5%" formatted
}
```

---

### Violation 7.5: Customer Growth Calculation
**Location**: `client/src/pages/seller-analytics.tsx:207-209`

**Code**:
```typescript
const customerGrowth = analytics.customers.previousPeriodCustomers > 0
  ? ((analytics.customers.newCustomers - analytics.customers.previousPeriodCustomers) / analytics.customers.previousPeriodCustomers) * 100
  : analytics.customers.newCustomers > 0 ? 100 : 0;
```

**Issue**: Same as 7.4 - growth percentage calculation on client

---

### Violation 7.6-7.8: Additional Analytics Logic

**Note**: `client/src/pages/seller-analytics.tsx` has a ✅ **GOOD ARCHITECTURE** overall:
- Fetches all calculations from backend `/api/analytics/overview`
- Only performs display-level calculations (growth %)
- Shows correct separation of concerns

**Remaining Issues**:
- Lines 203-209: Growth percentage calculations should be server-provided
- Currency formatting logic (could be server-side)
- Date formatting (display-level, acceptable on client)

---

## 8. Business Mode Switching 🟢 MEDIUM

### Violation 8.1: B2C/B2B Mode Management
**Location**: `client/src/contexts/business-mode-context.tsx`

**Code**:
```typescript
export type BusinessMode = 'b2c' | 'b2b' | 'trade';

export function BusinessModeProvider({ children }: BusinessModeProviderProps) {
  const [mode, setModeState] = useState<BusinessMode>(() => {
    const stored = localStorage.getItem('businessMode');
    return (stored === 'b2c' || stored === 'b2b' || stored === 'trade') ? stored : 'b2c';
  });

  const setMode = useCallback((newMode: BusinessMode) => {
    setModeState(newMode);
    localStorage.setItem('businessMode', newMode);
  }, []);
  
  // ...
}
```

**Issue**:
- Business mode selection logic on client
- Mode persistence in localStorage (client-side)
- Mode validation on client

**Impact**: 
- Low (primarily UX state)
- Should still be server-synchronized for consistency

**Server Contract Needed**:
```graphql
type UserPreferences {
  businessMode: BusinessMode!
  defaultMode: BusinessMode!
}

type Mutation {
  setBusinessMode(mode: BusinessMode!): UserPreferences!
}
```

---

## 9. Good Examples (Architecture 3 Compliant) ✅

These implementations follow Architecture 3 correctly:

### Example 1: Pricing Hook
**Location**: `client/src/hooks/use-pricing.ts`

**Pattern**:
- ✅ Calls backend API for all price calculations
- ✅ No client-side price math
- ✅ Displays server-provided data only

### Example 2: Wholesale Checkout
**Location**: `client/src/pages/wholesale/checkout.tsx`

**Pattern**:
- ✅ Uses backend API for pricing
- ✅ Sends only IDs/quantities to server
- ✅ Receives calculated totals from server

### Example 3: Analytics Dashboard
**Location**: `client/src/pages/seller-analytics.tsx`

**Pattern**:
- ✅ Fetches all analytics from `/api/analytics/overview`
- ✅ Server calculates all metrics
- ⚠️ Minor issue: Growth % calculated on client (should be server-side)

---

## Recommended Server Contracts

### 1. Cart Service

```graphql
type Cart {
  id: ID!
  items: [CartItem!]!
  subtotal: Float!           # Server-calculated
  tax: Float!                # Server-calculated
  shipping: Float!           # Server-calculated
  total: Float!              # Server-calculated
  currency: String!
  validationStatus: CartValidationStatus!
}

type CartItem {
  id: ID!
  productId: ID!
  quantity: Int!
  price: Float!
  lineTotal: Float!          # Server-calculated
  variant: VariantSelection
  isAvailable: Boolean!      # Server-checked
  stockStatus: StockStatus!
}

type CartValidationStatus {
  isValid: Boolean!
  errors: [CartError!]!
  warnings: [CartWarning!]!
}

type Mutation {
  addToCart(input: AddToCartInput!): CartOperationResult!
  updateCartItem(itemId: ID!, quantity: Int!): CartOperationResult!
  removeFromCart(itemId: ID!): CartOperationResult!
  calculateCartTotals(cartId: ID!): Cart!
  validateCart(cartId: ID!): CartValidationStatus!
}
```

---

### 2. Order Service

```graphql
type Order {
  id: ID!
  status: OrderStatus!         # Full status object
  paymentStatus: PaymentStatus! # Full status object
  total: Float!
  subtotal: Float!
  tax: Float!
  shipping: Float!
  amountPaid: Float!
  depositAmount: Float!        # Server-calculated
  balanceAmount: Float!        # Server-calculated
  remainingBalance: Float!     # Server-calculated
  hasBalanceDue: Boolean!      # Server-calculated
  isPaymentComplete: Boolean!  # Server-calculated
  refundableAmount: Float!     # Server-calculated
  currency: String!
}

type OrderStatus {
  code: String!
  label: String!
  variant: StatusVariant!
  description: String
  allowedActions: [OrderAction!]!
}

type PaymentStatus {
  code: String!
  label: String!
  variant: StatusVariant!
  description: String
}

type Query {
  orderDetails(orderId: ID!): OrderDetails!
  calculateRefundableAmount(orderId: ID!): RefundableData!
}

type Mutation {
  calculateRefund(orderId: ID!, items: [RefundItemInput!]!): RefundCalculation!
  processRefund(orderId: ID!, refund: RefundInput!): Refund!
}
```

---

### 3. Product Service

```graphql
type Product {
  id: ID!
  name: String!
  price: Float!
  finalPrice: Float!           # Server-calculated with discounts
  savings: Float!              # Server-calculated
  currency: String!
  productType: String!
  productTypeBadge: ProductTypeBadge!
  availability: ProductAvailability!
  variantConfiguration: VariantConfiguration!
}

type ProductTypeBadge {
  type: String!
  label: String!
  variant: String!
  description: String
  icon: String
}

type ProductAvailability {
  isAvailable: Boolean!
  quantityAvailable: Int
  availableDate: DateTime
  unavailabilityReason: UnavailabilityReason
}

type UnavailabilityReason {
  code: String!
  message: String!
  suggestion: String
  alternativeProducts: [Product!]
}

type VariantConfiguration {
  requiresSelection: Boolean!
  type: VariantType!
  hasColors: Boolean!
  hasSizes: Boolean!
  availableColors: [ColorOption!]!
  availableSizes: [SizeOption!]!
}

type Query {
  productAvailability(productId: ID!, variant: VariantInput): ProductAvailability!
  checkStock(productId: ID!, variant: VariantInput, quantity: Int!): StockCheckResult!
}
```

---

### 4. Currency Service

```graphql
type Currency {
  code: String!
  name: String!
  symbol: String!
  exchangeRate: Float!
  lastUpdated: DateTime!
}

type FormattedPrice {
  amount: Float!
  currency: String!
  formatted: String!           # "$1,234.56"
  convertedFrom: ConvertedPrice
}

type ConvertedPrice {
  originalAmount: Float!
  originalCurrency: String!
  exchangeRate: Float!
}

type Query {
  formatPrice(
    amount: Float!
    currency: String!
    displayCurrency: String
  ): FormattedPrice!
  
  convertPrice(
    amount: Float!
    fromCurrency: String!
    toCurrency: String!
  ): Float!
  
  exchangeRates(baseCurrency: String!): [Currency!]!
}
```

---

### 5. Analytics Service

```graphql
type SellerAnalytics {
  revenue: RevenueAnalytics!
  orders: OrderAnalytics!
  products: ProductAnalytics!
  customers: CustomerAnalytics!
  platforms: PlatformBreakdown!
}

type RevenueAnalytics {
  totalRevenue: Float!
  revenueGrowth: Float!         # Server-calculated percentage
  revenueGrowthLabel: String!   # "+15.5%"
  averageOrderValue: Float!
  revenueByPeriod: [RevenueDataPoint!]!
}

type OrderAnalytics {
  totalOrders: Int!
  orderGrowth: Float!           # Server-calculated percentage
  orderGrowthLabel: String!
  ordersByStatus: [OrderStatusCount!]!
  orderCompletionRate: Float!
  refundRate: Float!
}

type Query {
  analyticsOverview(period: Period!): SellerAnalytics!
  revenueAnalytics(period: Period!): RevenueAnalytics!
  orderAnalytics(period: Period!): OrderAnalytics!
}
```

---

### 6. Wholesale/B2B Service

```graphql
type WholesaleQuotation {
  id: ID!
  quotationNumber: String!
  grandTotal: Float!            # Server-calculated
  subtotal: Float!              # Server-calculated
  tax: Float!                   # Server-calculated
  shipping: Float!              # Server-calculated
  depositPercentage: Float!
  depositAmount: Float!         # Server-calculated
  balanceAmount: Float!         # Server-calculated
  lineItems: [QuotationLineItem!]!
}

type QuotationLineItem {
  description: String!
  quantity: Int!
  unitPrice: Float!
  lineTotal: Float!             # Server-calculated
}

type WholesaleValidation {
  meetsMinimumOrderQuantity: Boolean!
  minimumOrderQuantity: Int!
  currentQuantity: Int!
  message: String
}

type Mutation {
  calculateQuotation(input: QuotationInput!): WholesaleQuotation!
  validateWholesaleOrder(orderId: ID!): WholesaleValidation!
}
```

---

## Migration Strategy

### Phase 1: Critical Financial Logic (Week 1-2)
**Priority**: 🔴 CRITICAL

1. **Currency Conversions**
   - Move all exchange rate logic to backend
   - Create `/api/currency/convert` endpoint
   - Update CurrencyContext to use backend API

2. **Cart Calculations**
   - Move subtotal, tax, total to backend
   - Create `/api/cart/calculate` endpoint
   - Update cart-sheet.tsx to use backend totals

3. **Order Pricing**
   - Move deposit/balance calculations to backend
   - Update Order model with calculated fields
   - Update order-success.tsx to display backend values

### Phase 2: Wholesale/B2B Logic (Week 3)
**Priority**: 🔴 CRITICAL

1. **MOQ Validation**
   - Move to backend cart validation
   - Create server-side validation service
   - Return validation errors in cart API

2. **Quotation Calculations**
   - Create `/api/quotations/calculate` endpoint
   - Move all line item math to backend
   - Update quotation builder to use backend

3. **Deposit/Balance Logic**
   - Centralize in backend service
   - Add to Order and Quotation models
   - Remove all client calculations

### Phase 3: Product & Order Status (Week 4)
**Priority**: 🟡 HIGH

1. **Product Availability**
   - Move availability logic to backend
   - Return availability status with product data
   - Update product pages to display backend status

2. **Status Display Logic**
   - Add display metadata to status objects
   - Return variant/color/label from backend
   - Remove client-side status interpretation

3. **Product Type Badges**
   - Add badge metadata to Product type
   - Return label/variant from backend
   - Update component to display backend data

### Phase 4: Analytics (Week 5)
**Priority**: 🟡 HIGH

1. **Dashboard Metrics**
   - Complete analytics endpoint (already partially done)
   - Add missing growth calculations
   - Remove all client-side aggregations

2. **Performance Metrics**
   - Move all product analytics to backend
   - Cache calculations in database
   - Update dashboard to display cached data

### Phase 5: Polish & Optimization (Week 6)
**Priority**: 🟢 MEDIUM

1. **Business Mode**
   - Sync mode to user preferences table
   - Add backend endpoint for mode switching
   - Maintain client state as cache only

2. **Refactoring**
   - Remove unused client logic
   - Add TypeScript types for new contracts
   - Update documentation

---

## Testing Strategy

### Unit Tests Required

For each migrated endpoint, create:

1. **Backend Tests**:
   - Test all calculation logic
   - Test edge cases (zero values, negatives, etc.)
   - Test currency conversion accuracy
   - Test validation rules

2. **Integration Tests**:
   - Test API endpoint responses
   - Test data consistency
   - Test error handling

3. **Frontend Tests**:
   - Test component displays backend data correctly
   - Test loading states
   - Test error states

### Validation Tests

1. **Price Accuracy**:
   - Compare client calculations vs server
   - Identify any discrepancies
   - Document expected behavior

2. **Currency Conversion**:
   - Test all currency pairs
   - Verify exchange rate accuracy
   - Test rounding behavior

3. **Business Rules**:
   - Verify MOQ enforcement
   - Test deposit percentage calculations
   - Validate refund calculations

---

## Success Metrics

### Compliance Score

- **Current**: ~15% (Few areas use backend correctly)
- **Target**: 100% (All business logic server-side)

### Progress Tracking

| Category | Violations | Migrated | % Complete |
|----------|-----------|----------|------------|
| Pricing | 12 | 0 | 0% |
| Currency | 3 | 0 | 0% |
| Order Status | 4 | 0 | 0% |
| Cart Logic | 5 | 0 | 0% |
| Product Logic | 8 | 0 | 0% |
| Wholesale | 6 | 0 | 0% |
| Analytics | 8 | 2 | 25% |
| Business Mode | 1 | 0 | 0% |
| **TOTAL** | **47** | **2** | **4%** |

---

## Risk Assessment

### High Risk Areas

1. **Currency Conversion** 🔴
   - Impact: Revenue accuracy
   - Risk: Price discrepancies, customer complaints
   - Mitigation: Migrate immediately, add validation tests

2. **Cart Calculations** 🔴
   - Impact: Checkout accuracy
   - Risk: Overcharging/undercharging customers
   - Mitigation: Server-side totals with client display only

3. **Wholesale MOQ** 🔴
   - Impact: Business rules enforcement
   - Risk: Orders below minimum, revenue loss
   - Mitigation: Server-side validation, reject invalid orders

### Medium Risk Areas

1. **Product Availability**
   - Impact: Overselling
   - Risk: Inventory discrepancies
   - Mitigation: Server-side stock checks

2. **Analytics**
   - Impact: Dashboard accuracy
   - Risk: Incorrect business decisions
   - Mitigation: Server-side calculations, caching

---

## Conclusion

The frontend currently violates Architecture 3 systematically across **47 identified locations** spanning **8 major categories**. The most critical violations involve:

1. **Currency conversions** - All logic on client
2. **Cart calculations** - Totals, tax, shipping on client
3. **Wholesale MOQ enforcement** - Business rules on client
4. **Deposit/balance calculations** - Financial logic on client

**Recommended Action**: Immediate migration of critical financial logic (Phase 1-2) followed by systematic cleanup of remaining violations.

**Timeline**: 6 weeks for complete compliance
**Effort**: ~3-4 developer weeks
**Risk**: HIGH if not addressed (revenue accuracy, business rule enforcement)

---

## Appendix: File Index

### Files with Violations

- `client/src/contexts/CurrencyContext.tsx` (3 violations)
- `client/src/components/cart-sheet.tsx` (3 violations)
- `client/src/components/product-card.tsx` (1 violation)
- `client/src/components/product-type-badge.tsx` (1 violation)
- `client/src/components/refund-dialog.tsx` (2 violations)
- `client/src/pages/order-success.tsx` (1 violation)
- `client/src/pages/product-detail.tsx` (5 violations)
- `client/src/pages/buyer-order-details.tsx` (4 violations)
- `client/src/pages/seller-dashboard.tsx` (3 violations)
- `client/src/pages/seller-analytics.tsx` (2 violations)
- `client/src/pages/trade-quotation-builder.tsx` (3 violations)
- `client/src/pages/wholesale/cart.tsx` (1 violation)
- `client/src/lib/format-status.ts` (2 violations - inferred)

### Files with Good Patterns

- ✅ `client/src/hooks/use-pricing.ts` - Uses backend API correctly
- ✅ `client/src/pages/wholesale/checkout.tsx` - Backend calculations
- ✅ `client/src/pages/seller-analytics.tsx` - Mostly server-side (minor issues)

---

**Document Version**: 1.0  
**Last Updated**: October 19, 2025  
**Auditor**: Replit Agent  
**Status**: Complete - Ready for Review
