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

    // Step 2: Fetch products and calculate subtotal (with discount support)
    let subtotal = 0;
    const itemDetails = [];

    for (const item of items) {
      const product = await this.storage.getProduct(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      // Calculate price with active discount (Architecture 3: respect validated prices)
      let itemPrice = parseFloat(product.price);
      
      if (
        product.promotionActive === 1 &&
        product.discountPercentage &&
        (!product.promotionEndDate || new Date(product.promotionEndDate) > new Date())
      ) {
        const discount = parseFloat(product.discountPercentage);
        itemPrice = itemPrice * (1 - discount / 100);
      }

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

  /**
   * Calculate shipping cost for items (helper method for code reuse)
   * 
   * @param items - Cart items with product IDs and quantities
   * @param destination - Shipping destination address
   * @param sellerId - Optional seller ID for fallback shipping rate
   * @returns Shipping cost in dollars (or seller's currency)
   */
  async calculateShippingCostOnly(
    items: Array<{ id: string; quantity: number }>,
    destination?: {
      country: string;
      city?: string;
      state?: string;
      postalCode?: string;
    },
    sellerId?: string
  ): Promise<number> {
    let shippingCost = 0;
    
    if (destination) {
      try {
        const shippingCalculation = await this.shippingService.calculateShipping(
          items,
          {
            country: destination.country,
            city: destination.city,
            state: destination.state,
            postalCode: destination.postalCode,
          }
        );
        shippingCost = shippingCalculation.cost;
        
        logger.info(`[PricingCalculationService] Shipping calculated: ${shippingCost}`, {
          method: shippingCalculation.method,
          zone: shippingCalculation.zone
        });
      } catch (shippingError: any) {
        logger.error(`[PricingCalculationService] Shipping calculation failed:`, shippingError);
        
        // Use seller's flat shipping as fallback if sellerId provided
        if (sellerId) {
          const seller = await this.storage.getUser(sellerId);
          shippingCost = seller?.shippingPrice ? parseFloat(seller.shippingPrice.toString()) : 0;
          logger.info(`[PricingCalculationService] Using fallback shipping: ${shippingCost}`);
        }
      }
    } else if (sellerId) {
      // No destination provided, use seller's default shipping
      const seller = await this.storage.getUser(sellerId);
      shippingCost = seller?.shippingPrice ? parseFloat(seller.shippingPrice.toString()) : 0;
      logger.info(`[PricingCalculationService] No destination - using default shipping: ${shippingCost}`);
    }
    
    return shippingCost;
  }

  /**
   * Calculate tax for a given subtotal and shipping (helper method for code reuse)
   * 
   * @param params - Tax calculation parameters
   * @returns Tax amount in dollars and calculation ID (if successful)
   */
  async calculateTaxOnly(params: {
    subtotalCents: number;
    shippingCents: number;
    destination: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    sellerId: string;
    items?: Array<{
      productId: string;
      quantity: number;
      unitPriceCents: number;
    }>;
    currency?: string;
  }): Promise<{
    taxCents: number;
    taxCalculationId?: string;
    taxRate?: number;
  }> {
    const { subtotalCents, shippingCents, destination, sellerId, items, currency = 'USD' } = params;
    
    let taxCents = 0;
    let taxCalculationId: string | undefined = undefined;
    let taxRate: number | undefined = undefined;

    // Check if seller has tax enabled
    const seller = await this.storage.getUser(sellerId);
    
    if (!seller) {
      logger.warn(`[PricingCalculationService] Seller ${sellerId} not found for tax calculation`);
      return { taxCents, taxCalculationId, taxRate };
    }

    if (seller.taxEnabled !== 1) {
      logger.info(`[PricingCalculationService] Tax disabled for seller: ${sellerId}`);
      return { taxCents, taxCalculationId, taxRate };
    }

    if (!this.stripe) {
      logger.warn(`[PricingCalculationService] Stripe not configured - skipping tax calculation`);
      return { taxCents, taxCalculationId, taxRate };
    }

    // Check if we have complete address for tax calculation
    const hasCompleteAddress = destination.line1 && destination.city && destination.country;
    
    if (!hasCompleteAddress) {
      logger.info(`[PricingCalculationService] Incomplete address - skipping tax calculation`);
      return { taxCents, taxCalculationId, taxRate };
    }

    try {
      logger.info(`[PricingCalculationService] Calculating tax for seller ${sellerId}`, {
        subtotalCents,
        shippingCents,
        currency,
        destination: `${destination.city}, ${destination.state || ''}`
      });

      // Convert cents to dollars for TaxService
      const subtotalDollars = subtotalCents / 100;
      const shippingDollars = shippingCents / 100;

      const taxCalculation = await this.taxService.calculateTax({
        amount: subtotalDollars,
        currency: currency,
        shippingAddress: destination,
        sellerId: sellerId,
        items: items?.map(item => ({
          id: item.productId,
          price: (item.unitPriceCents / 100).toString(),
          quantity: item.quantity,
        })) || [],
        shippingCost: shippingDollars,
      });

      taxCents = Math.round(taxCalculation.taxAmount * 100);
      taxCalculationId = taxCalculation.calculationId;
      
      // Calculate effective tax rate for transparency
      if (subtotalCents > 0) {
        taxRate = (taxCents / subtotalCents) * 100;
      }

      logger.info(`[PricingCalculationService] Tax calculated: ${taxCents} cents`, {
        taxRate,
        calculationId: taxCalculationId
      });
    } catch (taxError: any) {
      logger.error(`[PricingCalculationService] Tax calculation failed:`, taxError);
      // Continue without tax if calculation fails
    }

    return { taxCents, taxCalculationId, taxRate };
  }
}
