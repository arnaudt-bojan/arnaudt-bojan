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
 */
export function calculatePricing(
  items: CartItem[],
  shippingCost: number,
  taxAmount: number = 0,
  includeShippingInDeposit: boolean = true
): PricingBreakdown {
  let subtotal = 0;
  let depositAmount = 0;
  let hasPreOrders = false;
  
  // Calculate subtotal and deposit amounts
  items.forEach((item) => {
    const itemTotal = parseFloat(item.price) * item.quantity;
    subtotal += itemTotal;
    
    if (item.productType === "pre-order" && item.requiresDeposit && item.depositAmount) {
      hasPreOrders = true;
      const depositPerItem = parseFloat(item.depositAmount);
      depositAmount += depositPerItem * item.quantity;
    }
  });
  
  // Calculate shipping distribution
  let shippingInDeposit = 0;
  let shippingInBalance = shippingCost;
  
  if (hasPreOrders && depositAmount > 0 && includeShippingInDeposit) {
    shippingInDeposit = shippingCost;
    shippingInBalance = 0;
  }
  
  // Calculate totals
  const depositTotal = depositAmount + shippingInDeposit;
  const fullTotal = subtotal + shippingCost;
  const remainingBalance = fullTotal - depositTotal;
  
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
