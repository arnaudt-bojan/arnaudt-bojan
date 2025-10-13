/**
 * Pricing Service
 * 
 * Centralized pricing calculations to ensure consistency between:
 * - Frontend display
 * - Stripe charges
 * - Order records
 * 
 * CRITICAL: All monetary calculations MUST go through this service
 * to prevent discrepancies between what's shown and what's charged.
 */

export interface CartItem {
  id: string;
  price: string;
  quantity: number;
  productType: string;
  depositAmount?: string;
  requiresDeposit?: number;
  currency?: string; // Seller's currency from product API response
}

export interface PricingBreakdown {
  // Product totals
  subtotal: number;           // Sum of all product prices
  
  // Shipping
  shippingCost: number;        // Shipping cost
  shippingInDeposit: number;   // Shipping included in deposit (for pre-orders)
  shippingInBalance: number;   // Shipping included in remaining balance
  
  // Deposit calculations (for pre-orders)
  depositAmount: number;       // Deposit for products only
  depositTotal: number;        // Deposit + proportional shipping
  
  // Full payment calculations
  fullTotal: number;           // Subtotal + shipping (before tax)
  remainingBalance: number;    // Amount due after deposit
  
  // Payment flow
  payingDepositOnly: boolean;  // True if this is a deposit payment
  amountToCharge: number;      // Exact amount to charge Stripe (deposit or full)
  
  // Tax
  taxableAmount: number;       // Amount that tax will be calculated on
  taxAmount: number;           // Actual tax amount
  totalWithTax: number;        // Final total including tax
  
  // Flags
  hasPreOrders: boolean;
}

/**
 * Calculate complete pricing breakdown for a cart
 * 
 * BEST PRACTICE FOR PRE-ORDERS:
 * - Shipping is charged with BALANCE payment (when item ships), NOT with deposit
 * - This prevents customers from paying shipping months before delivery
 * - Initial invoice shows full breakdown for transparency
 * 
 * @param items - Cart items
 * @param shippingCost - Calculated shipping cost
 * @param taxAmount - Tax amount to include in calculations (default: 0)
 * @param includeShippingInDeposit - Whether to include shipping in deposit payments (default: false)
 * @returns Complete pricing breakdown
 */
export function calculatePricing(
  items: CartItem[],
  shippingCost: number,
  taxAmount: number = 0,
  includeShippingInDeposit: boolean = false
): PricingBreakdown {
  let subtotal = 0;
  let depositAmount = 0;
  let hasPreOrders = false;
  
  // Calculate per-item totals (FIX: BUG #1 and BUG #2)
  // BUG #1: Include made-to-order in deposit check
  // BUG #2: Calculate balance per item to handle mixed carts correctly
  let depositTotal = 0;
  let remainingBalance = 0;
  
  for (const item of items) {
    const itemPrice = parseFloat(item.price);
    const fullItemPrice = itemPrice * item.quantity;
    subtotal += fullItemPrice;
    
    // Check if this is a pre-order or made-to-order requiring deposit
    if ((item.productType === "pre-order" || item.productType === "made-to-order") && item.depositAmount) {
      hasPreOrders = true;
      const depositPerItem = parseFloat(item.depositAmount);
      const itemDeposit = depositPerItem * item.quantity;
      
      depositAmount += itemDeposit;
      depositTotal += itemDeposit;
      
      // Balance = full price - deposit (only for deposit-eligible items)
      remainingBalance += fullItemPrice - itemDeposit;
    } else {
      // In-stock items: fully paid upfront (no balance)
      depositTotal += fullItemPrice;
    }
  }
  
  // Calculate shipping distribution
  // BEST PRACTICE: Charge shipping when item ships (with balance), not with deposit
  let shippingInDeposit = 0;
  let shippingInBalance = shippingCost;
  
  if (hasPreOrders && depositAmount > 0 && includeShippingInDeposit) {
    // Only include shipping in deposit if explicitly requested
    // Most pre-orders should NOT charge shipping until ready to ship
    shippingInDeposit = shippingCost;
    shippingInBalance = 0;
  }
  
  // Add shipping to deposit total
  depositTotal += shippingInDeposit;
  const fullTotal = subtotal + shippingCost;
  
  // CRITICAL FIX: Recalculate remainingBalance to include shipping (only for pre-orders)
  // For pure in-stock carts, remainingBalance should stay 0
  if (hasPreOrders && depositAmount > 0) {
    remainingBalance = fullTotal - depositTotal;
  }
  
  // Determine payment flow
  const payingDepositOnly = hasPreOrders && depositAmount > 0;
  const amountToCharge = payingDepositOnly ? depositTotal : fullTotal;
  
  // Tax calculation:
  // - For deposit payments: Tax on deposit amount only (shipping/balance tax charged later)
  // - For full payments: Tax on full total (subtotal + shipping)
  const taxableAmount = amountToCharge;
  const totalWithTax = amountToCharge + taxAmount;
  
  return {
    subtotal,
    shippingCost,
    shippingInDeposit,
    shippingInBalance,
    depositAmount,
    depositTotal,
    fullTotal,
    remainingBalance,
    payingDepositOnly,
    amountToCharge,
    taxableAmount,
    taxAmount,
    totalWithTax,
    hasPreOrders,
  };
}

/**
 * Validate that the amount to charge matches what's displayed
 * 
 * @param displayedAmount - Amount shown to customer
 * @param calculatedAmount - Amount calculated by pricing service
 * @param tolerance - Acceptable difference in cents (default: 0)
 * @throws Error if amounts don't match
 */
export function validateChargeAmount(
  displayedAmount: number,
  calculatedAmount: number,
  tolerance: number = 0
): void {
  const difference = Math.abs(displayedAmount - calculatedAmount);
  
  if (difference > tolerance) {
    throw new Error(
      `PRICING MISMATCH: Displayed amount ($${displayedAmount.toFixed(2)}) ` +
      `does not match calculated amount ($${calculatedAmount.toFixed(2)}). ` +
      `Difference: $${difference.toFixed(2)}`
    );
  }
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Calculate tax estimate (8% default)
 * Note: Actual tax is calculated by Stripe Tax based on shipping address
 */
export function estimateTax(amount: number, rate: number = 0.08): number {
  return amount * rate;
}
