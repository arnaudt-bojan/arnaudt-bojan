/**
 * Pricing Calculation Service
 * 
 * Centralized pricing logic extracted from routes.ts
 * Handles cart pricing calculations including subtotal, shipping, tax, and total
 * 
 * Architecture: Plan C - Service-based pricing with ShippingService and TaxService integration
 */

import Stripe from "stripe";
import type { IStorage } from "../storage";
import { ShippingService } from "./shipping.service";
import { TaxService } from "./tax.service";
import { logger } from "../logger";

export interface PricingBreakdownResponse {
  currency: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  taxCalculationId?: string;
  total: number;
  subtotalWithShipping: number;
  
  // Deposit/Balance information for pre-orders
  hasPreOrders: boolean;
  depositTotal: number;
  remainingBalance: number;
  payingDepositOnly: boolean;
  amountToCharge: number;
  
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
    productType?: string;
    depositAmount?: number | null;
  }>;
}

export interface CalculateCartPricingParams {
  sellerId: string;
  items: Array<{ productId: string; quantity: number }>;
  destination?: {
    country: string;
    city?: string;
    state?: string;
    postalCode?: string;
    line1?: string;
    line2?: string;
  };
  includeShippingInDeposit?: boolean;
}

export class PricingCalculationService {
  constructor(
    private storage: IStorage,
    private shippingService: ShippingService,
    private taxService: TaxService,
    private stripe?: Stripe
  ) {}

  /**
   * Calculate complete cart pricing including subtotal, shipping, tax, and total
   * 
   * Steps:
   * 1. Load seller and enforce currency/tax settings
   * 2. Fetch product data to enrich cart items
   * 3. Determine shipping cost via ShippingService
   * 4. Compute tax via TaxService (if enabled and address provided)
   * 5. Calculate totals
   * 6. Assemble response with currency metadata
   */
  async calculateCartPricing(
    params: CalculateCartPricingParams
  ): Promise<PricingBreakdownResponse> {
    const { sellerId, items, destination } = params;

    logger.info(`[PricingCalculationService] Calculating pricing for seller ${sellerId}`, {
      itemCount: items?.length,
      hasDestination: !!destination
    });

    // Step 1: Load seller and get currency/tax settings
    const seller = await this.storage.getUser(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    const currency = seller.listingCurrency || 'USD';
    logger.info(`[PricingCalculationService] Using seller's currency: ${currency}`);

    // Step 2: Fetch products and calculate subtotal
    let subtotal = 0;
    const itemDetails = [];

    for (const item of items) {
      const product = await this.storage.getProduct(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const itemPrice = parseFloat(product.price);
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      itemDetails.push({
        productId: item.productId,
        name: product.name,
        price: itemPrice,
        quantity: item.quantity,
        total: itemTotal,
        productType: product.productType,
        depositAmount: product.depositAmount ? parseFloat(product.depositAmount) : null,
      });
    }

    // Step 3: Calculate shipping cost via ShippingService
    let shippingCost = 0;
    
    if (destination) {
      try {
        const shippingCalculation = await this.shippingService.calculateShipping(
          items.map(item => ({ id: item.productId, quantity: item.quantity })),
          {
            country: destination.country,
            city: destination.city,
            state: destination.state,
            postalCode: destination.postalCode,
          }
        );
        shippingCost = shippingCalculation.cost;
        
        logger.info(`[PricingCalculationService] Shipping calculated: ${currency} ${shippingCost}`, {
          method: shippingCalculation.method,
          zone: shippingCalculation.zone
        });
      } catch (shippingError: any) {
        logger.error(`[PricingCalculationService] Shipping calculation failed:`, shippingError);
        // Use seller's flat shipping as fallback
        shippingCost = seller.shippingPrice ? parseFloat(seller.shippingPrice.toString()) : 0;
        logger.info(`[PricingCalculationService] Using fallback shipping: ${currency} ${shippingCost}`);
      }
    } else {
      // No destination provided, use seller's default shipping
      shippingCost = seller.shippingPrice ? parseFloat(seller.shippingPrice.toString()) : 0;
      logger.info(`[PricingCalculationService] No destination - using default shipping: ${currency} ${shippingCost}`);
    }

    // Step 4: Calculate tax via TaxService (if enabled and address provided)
    let taxAmount = 0;
    let taxCalculationId: string | undefined = undefined;

    if (destination && seller.taxEnabled && this.stripe) {
      // Check if we have complete address for tax calculation
      const hasCompleteAddress = destination.line1 && destination.city && destination.country;
      
      if (hasCompleteAddress) {
        try {
          const taxCalculation = await this.taxService.calculateTax({
            amount: subtotal + shippingCost,
            currency: currency,
            shippingAddress: {
              line1: destination.line1!,
              line2: destination.line2,
              city: destination.city!,
              state: destination.state || '',
              postalCode: destination.postalCode || '',
              country: destination.country,
            },
            sellerId: sellerId,
            items: itemDetails.map(item => ({
              id: item.productId,
              price: item.price.toString(),
              quantity: item.quantity,
            })),
            shippingCost: shippingCost,
          });

          taxAmount = taxCalculation.taxAmount;
          taxCalculationId = taxCalculation.calculationId;

          logger.info(`[PricingCalculationService] Tax calculated: ${currency} ${taxAmount}`, {
            calculationId: taxCalculationId
          });
        } catch (taxError: any) {
          logger.error(`[PricingCalculationService] Tax calculation failed:`, taxError);
          // Continue without tax if calculation fails
        }
      } else {
        logger.info(`[PricingCalculationService] Incomplete address - skipping tax calculation`);
      }
    }

    // Step 5: Calculate deposit/balance for pre-orders
    let hasPreOrders = false;
    let depositTotal = 0;
    let remainingBalance = 0;
    
    for (const item of itemDetails) {
      if ((item.productType === "pre-order" || item.productType === "made-to-order") && item.depositAmount) {
        // Validate deposit is positive
        if (item.depositAmount > 0) {
          hasPreOrders = true;
          // Clamp deposit to line total to prevent deposit exceeding item total
          const itemTotal = item.price * item.quantity;
          const itemDeposit = Math.min(item.depositAmount * item.quantity, itemTotal);
          depositTotal += itemDeposit;
        } else {
          // Invalid deposit amount - treat as in-stock
          depositTotal += item.total;
        }
      } else {
        // In-stock items are fully paid upfront
        depositTotal += item.total;
      }
    }
    
    // Honor includeShippingInDeposit parameter
    if (params.includeShippingInDeposit && hasPreOrders) {
      depositTotal += shippingCost;
    }
    
    // Best practice: Shipping is charged with balance payment (not deposit) unless includeShippingInDeposit is true
    const subtotalWithShipping = subtotal + shippingCost;
    const total = subtotalWithShipping + taxAmount;
    
    if (hasPreOrders) {
      // Remaining balance = full total - deposit (ensure it's never negative)
      remainingBalance = Math.max(total - depositTotal, 0);
    }
    
    const payingDepositOnly = hasPreOrders && depositTotal > 0;
    // Ensure amountToCharge never exceeds total
    const amountToCharge = Math.min(payingDepositOnly ? depositTotal : total, total);

    // Step 6: Assemble response
    const pricingBreakdown: PricingBreakdownResponse = {
      currency,
      subtotal,
      shippingCost,
      subtotalWithShipping,
      taxAmount,
      taxCalculationId,
      total,
      hasPreOrders,
      depositTotal,
      remainingBalance,
      payingDepositOnly,
      amountToCharge,
      items: itemDetails,
    };

    logger.info(`[PricingCalculationService] Pricing calculated successfully`, {
      currency,
      subtotal,
      shippingCost,
      taxAmount,
      total
    });

    return pricingBreakdown;
  }
}
