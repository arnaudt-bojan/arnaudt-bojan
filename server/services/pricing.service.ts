/**
 * Pricing Service
 * 
 * Backend-only pricing calculations to ensure consistency between:
 * - Stripe charges
 * - Order records
 * - Database totals
 * 
 * CRITICAL: All monetary calculations MUST go through this backend service
 * Frontend should only display values returned from these APIs.
 */

import type { Product } from "@shared/schema";

export interface CartItem {
  id: string;
  price: string;
  quantity: number;
  productType: string;
  depositAmount?: string;
  requiresDeposit?: number;
  sellerId?: string;
}

export interface PricingBreakdown {
  // Product totals
  subtotal: number;
  
  // Shipping
  shippingCost: number;
  shippingInDeposit: number;
  shippingInBalance: number;
  
  // Deposit calculations (for pre-orders)
  depositAmount: number;
  depositTotal: number;
  
  // Full payment calculations
  fullTotal: number;
  remainingBalance: number;
  
  // Payment flow
  payingDepositOnly: boolean;
  amountToCharge: number;
  
  // Tax
  taxableAmount: number;
  taxAmount: number;
  totalWithTax: number;
  
  // Flags
  hasPreOrders: boolean;
}

/**
 * Calculate complete pricing breakdown for a cart
 * Backend-only - never expose this logic to frontend
 * 
 * BEST PRACTICE FOR PRE-ORDERS:
 * - Shipping is charged with BALANCE payment (when item ships), NOT with deposit
 * - This prevents customers from paying shipping months before delivery
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
  
  // Tax calculations
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
 * Validate charge amount
 */
export function validateChargeAmount(
  displayedAmount: number,
  calculatedAmount: number,
  tolerance: number = 0.01
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
 * Calculate tax estimate (8% default)
 * Note: Actual tax calculated by Stripe Tax based on seller settings
 */
export function estimateTax(amount: number, rate: number = 0.08): number {
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
