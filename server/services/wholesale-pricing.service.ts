/**
 * Wholesale Pricing Service
 * 
 * Centralized wholesale B2B pricing logic extracted from WholesaleCheckoutService
 * Handles MOQ validation, unit pricing, deposit/balance calculations
 * 
 * Architecture: Service Layer Pattern (Architecture 3) with dependency injection
 */

import type { IStorage } from '../storage';
import { logger } from '../logger';
import { getExchangeRates, convertPrice, formatCurrency } from '../currencyService';
import { PricingCalculationService } from './pricing-calculation.service';
import type Stripe from 'stripe';

export interface CartItem {
  productId: string;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
    variantId?: string;
  };
}

export interface CalculateWholesalePricingParams {
  cartItems: CartItem[];
  sellerId: string;
  depositPercentage?: number;
  depositAmountCents?: number;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingMethod?: 'freight_collect' | 'buyer_pickup' | 'seller_shipping';
}

export interface WholesalePricingBreakdown {
  success: boolean;
  subtotalCents: number;
  depositCents: number;
  balanceCents: number;
  taxCents: number;
  taxRate?: number;
  taxCalculationId?: string;
  shippingCents: number;
  shippingMethod?: string;
  totalCents: number;
  currency: string;
  exchangeRate?: number;
  validatedItems: Array<{
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
    moq: number;
    variant?: any;
  }>;
  moqErrors?: string[];
  error?: string;
}

export class WholesalePricingService {
  constructor(
    private storage: IStorage,
    private pricingCalculationService: PricingCalculationService
  ) {}

  /**
   * Calculate complete wholesale pricing breakdown including:
   * - MOQ validation
   * - Unit price calculation (with variant override support)
   * - Subtotal aggregation
   * - Shipping calculation (freight collect, buyer pickup, or seller shipping)
   * - Tax calculation via Stripe Tax API (B2B tax rules)
   * - Deposit calculation (fixed amount OR percentage)
   * - Balance calculation
   * - Multi-currency conversion
   * 
   * Steps:
   * 1. Validate cart items against MOQ requirements
   * 2. Calculate unit prices (product-level or variant-level) in USD
   * 3. Calculate subtotal in USD
   * 4. Calculate shipping cost via ShippingService (if seller_shipping)
   * 5. Calculate tax via TaxService (if enabled and address provided)
   * 6. Fetch exchange rates and convert to target currency
   * 7. Calculate deposit (fixed amount OR percentage)
   * 8. Calculate balance (total - deposit)
   * 9. Assemble pricing breakdown response
   */
  async calculateWholesalePricing(
    params: CalculateWholesalePricingParams & { currency?: string }
  ): Promise<WholesalePricingBreakdown> {
    const { cartItems, sellerId, depositPercentage, depositAmountCents, currency = 'USD' } = params;

    logger.info('[WholesalePricingService] Calculating wholesale pricing', {
      sellerId,
      itemCount: cartItems?.length,
      depositPercentage,
      depositAmountCents,
      currency,
    });

    try {
      // Fetch exchange rates for currency conversion
      const exchangeData = await getExchangeRates();
      const exchangeRate = exchangeData.rates[currency] || 1;

      // Step 1-3: Validate cart and calculate subtotal in USD
      const moqErrors: string[] = [];
      const validatedItems: any[] = [];
      let subtotalCents = 0;

      for (const item of cartItems) {
        const product = await this.storage.getWholesaleProduct(item.productId);

        if (!product) {
          moqErrors.push(`Product ${item.productId} not found`);
          continue;
        }

        if (product.sellerId !== sellerId) {
          moqErrors.push(`Product ${product.name} belongs to different seller`);
          continue;
        }

        // Calculate unit price and MOQ (product-level or variant-level)
        let moq = product.moq;
        let unitPriceCents = Math.round(parseFloat(product.wholesalePrice) * 100);
        let matchingVariant: any = null;

        // Enhanced variant matching with variantId support
        if (item.variant && product.variants) {
          const variants = Array.isArray(product.variants) ? product.variants : [];
          
          // Try to match by variantId first if available
          if (item.variant.variantId) {
            matchingVariant = variants.find((v: any) => 
              v.variantId === item.variant?.variantId
            );
          }
          
          // Fallback to size/color matching if variantId not found
          if (!matchingVariant && (item.variant.size || item.variant.color)) {
            matchingVariant = variants.find((v: any) => 
              v.size === item.variant?.size && v.color === item.variant?.color
            );
          }

          if (matchingVariant) {
            // Use variant-level MOQ and price if available
            moq = matchingVariant.moq || moq;
            if (matchingVariant.wholesalePrice) {
              unitPriceCents = Math.round(parseFloat(matchingVariant.wholesalePrice) * 100);
            }
          } else if (item.variant.size || item.variant.color || item.variant.variantId) {
            // Variant specified but not found in product
            const variantDesc = item.variant.variantId 
              ? `variantId: ${item.variant.variantId}`
              : `${item.variant.size || 'any size'}/${item.variant.color || 'any color'}`;
            moqErrors.push(`${product.name}: variant (${variantDesc}) not found`);
            continue;
          }
        }

        // Validate MOQ
        if (item.quantity < moq) {
          const variantInfo = matchingVariant 
            ? ` (variant: ${matchingVariant.variantId || `${matchingVariant.size}/${matchingVariant.color}`})`
            : '';
          moqErrors.push(`${product.name}${variantInfo}: quantity ${item.quantity} is below MOQ of ${moq}`);
          continue;
        }

        // Calculate item subtotal
        const itemSubtotal = unitPriceCents * item.quantity;
        subtotalCents += itemSubtotal;

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          quantity: item.quantity,
          moq,
          unitPriceCents,
          subtotalCents: itemSubtotal,
          variant: item.variant,
        });
      }

      // If there are MOQ errors, return early
      if (moqErrors.length > 0) {
        logger.warn('[WholesalePricingService] MOQ validation failed', {
          errorCount: moqErrors.length,
          errorsList: moqErrors.join('; '),
        });

        return {
          success: false,
          subtotalCents: 0,
          depositCents: 0,
          balanceCents: 0,
          taxCents: 0,
          shippingCents: 0,
          totalCents: 0,
          currency,
          validatedItems: [],
          moqErrors,
          error: 'MOQ validation failed',
        };
      }

      // Step 4: Calculate shipping cost via PricingCalculationService (delegated to shared service)
      // Default to freight_collect if not specified (common B2B practice)
      const shippingMethod = params.shippingMethod || 'freight_collect';
      let shippingCents = 0;

      if (shippingMethod === 'seller_shipping' && params.shippingAddress) {
        logger.info('[WholesalePricingService] Calculating seller shipping via PricingCalculationService', {
          sellerId,
          destination: `${params.shippingAddress.city}, ${params.shippingAddress.country}`
        });

        // Delegate shipping calculation to PricingCalculationService
        const shippingCostDollars = await this.pricingCalculationService.calculateShippingCostOnly(
          cartItems.map(item => ({ id: item.productId, quantity: item.quantity })),
          {
            country: params.shippingAddress.country,
            city: params.shippingAddress.city,
            state: params.shippingAddress.state,
            postalCode: params.shippingAddress.postalCode,
          },
          sellerId
        );
        
        // Convert shipping cost from dollars to cents
        shippingCents = Math.round(shippingCostDollars * 100);
        
        logger.info('[WholesalePricingService] Shipping calculated', {
          shippingCents
        });
      } else if (shippingMethod === 'freight_collect') {
        logger.info('[WholesalePricingService] Using freight collect - buyer pays carrier directly');
      } else if (shippingMethod === 'buyer_pickup') {
        logger.info('[WholesalePricingService] Using buyer pickup - no shipping cost');
      }

      // Step 5: Calculate tax via PricingCalculationService (delegated to shared service)
      let taxCents = 0;
      let taxRate: number | undefined = undefined;
      let taxCalculationId: string | undefined = undefined;

      if (params.shippingAddress) {
        logger.info('[WholesalePricingService] Calculating tax via PricingCalculationService', {
          sellerId,
          subtotalCents,
          shippingCents,
          currency
        });

        // Delegate tax calculation to PricingCalculationService
        const taxResult = await this.pricingCalculationService.calculateTaxOnly({
          subtotalCents,
          shippingCents,
          destination: params.shippingAddress,
          sellerId,
          items: validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
          })),
          currency: 'USD', // Tax calculation always in USD for wholesale
        });

        taxCents = taxResult.taxCents;
        taxCalculationId = taxResult.taxCalculationId;
        taxRate = taxResult.taxRate;

        logger.info('[WholesalePricingService] Tax calculated', {
          taxCents,
          taxRate,
          calculationId: taxCalculationId
        });
      }

      // Step 5: Calculate deposit
      const depositResult = this.calculateDeposit(
        subtotalCents,
        depositPercentage,
        depositAmountCents
      );

      if (!depositResult.success) {
        logger.error('[WholesalePricingService] Deposit calculation failed', {
          error: depositResult.error,
        });

        return {
          success: false,
          subtotalCents,
          depositCents: 0,
          balanceCents: 0,
          taxCents,
          shippingCents,
          shippingMethod,
          totalCents: subtotalCents + shippingCents + taxCents,
          currency,
          validatedItems,
          error: depositResult.error,
        };
      }

      const depositCents = depositResult.depositCents!;

      // Step 6: Calculate total and balance
      // Total = subtotal + shipping + tax
      const totalCents = subtotalCents + shippingCents + taxCents;
      const balanceResult = this.calculateBalance(totalCents, depositCents);

      if (!balanceResult.success) {
        logger.error('[WholesalePricingService] Balance calculation failed', {
          error: balanceResult.error,
        });

        return {
          success: false,
          subtotalCents,
          depositCents,
          balanceCents: 0,
          taxCents,
          shippingCents,
          shippingMethod,
          totalCents,
          currency,
          validatedItems,
          error: balanceResult.error,
        };
      }

      let finalDepositCents = balanceResult.balanceCents !== undefined ? depositCents : 0;
      let finalBalanceCents = balanceResult.balanceCents!;

      // Final validation: Ensure deposit doesn't exceed total
      if (finalDepositCents > totalCents) {
        finalDepositCents = totalCents;
        finalBalanceCents = 0;
      }

      // Ensure no negative values
      if (finalDepositCents < 0) finalDepositCents = 0;
      if (finalBalanceCents < 0) finalBalanceCents = 0;

      // Step 7: Convert to target currency if needed
      let convertedSubtotalCents = subtotalCents;
      let convertedDepositCents = finalDepositCents;
      let convertedBalanceCents = finalBalanceCents;
      let convertedTaxCents = taxCents;
      let convertedShippingCents = shippingCents;
      let convertedTotalCents = totalCents;
      let convertedValidatedItems = validatedItems;

      if (currency !== 'USD') {
        // Convert all USD cent amounts to target currency cents
        convertedSubtotalCents = Math.round(subtotalCents * exchangeRate);
        convertedDepositCents = Math.round(finalDepositCents * exchangeRate);
        convertedBalanceCents = Math.round(finalBalanceCents * exchangeRate);
        convertedTaxCents = Math.round(taxCents * exchangeRate);
        convertedShippingCents = Math.round(shippingCents * exchangeRate);
        convertedTotalCents = Math.round(totalCents * exchangeRate);
        
        // Convert validated items
        convertedValidatedItems = validatedItems.map(item => ({
          ...item,
          unitPriceCents: Math.round(item.unitPriceCents * exchangeRate),
          subtotalCents: Math.round(item.subtotalCents * exchangeRate),
        }));
      }

      // Step 8: Assemble pricing breakdown response
      const pricingBreakdown: WholesalePricingBreakdown = {
        success: true,
        subtotalCents: convertedSubtotalCents,
        depositCents: convertedDepositCents,
        balanceCents: convertedBalanceCents,
        taxCents: convertedTaxCents,
        taxRate,
        taxCalculationId,
        shippingCents: convertedShippingCents,
        shippingMethod,
        totalCents: convertedTotalCents,
        currency,
        exchangeRate: currency !== 'USD' ? exchangeRate : undefined,
        validatedItems: convertedValidatedItems,
      };

      logger.info('[WholesalePricingService] Pricing calculated successfully', {
        currency,
        subtotalCents: convertedSubtotalCents,
        depositCents: convertedDepositCents,
        balanceCents: convertedBalanceCents,
        taxCents: convertedTaxCents,
        shippingCents: convertedShippingCents,
        shippingMethod,
        totalCents: convertedTotalCents,
        exchangeRate: currency !== 'USD' ? exchangeRate : undefined,
        itemCount: convertedValidatedItems.length,
      });

      return pricingBreakdown;
    } catch (error: any) {
      logger.error('[WholesalePricingService] Failed to calculate pricing', error);
      
      return {
        success: false,
        subtotalCents: 0,
        depositCents: 0,
        balanceCents: 0,
        taxCents: 0,
        shippingCents: 0,
        totalCents: 0,
        currency: params.currency || 'USD',
        validatedItems: [],
        error: error.message || 'Failed to calculate wholesale pricing',
      };
    }
  }

  /**
   * Calculate deposit amount
   * - Fixed deposit amount takes precedence over percentage
   * - Validates deposit doesn't exceed total
   * - Validates inputs are non-negative
   * - Clamps deposit percentage to 0-100 range
   */
  private calculateDeposit(
    totalCents: number,
    depositPercentage?: number,
    depositAmountCents?: number
  ): { success: boolean; depositCents?: number; error?: string } {
    try {
      // Validate inputs are non-negative
      if (depositPercentage !== undefined && depositPercentage < 0) {
        return { success: false, error: 'Deposit percentage cannot be negative' };
      }
      if (depositAmountCents !== undefined && depositAmountCents < 0) {
        return { success: false, error: 'Deposit amount cannot be negative' };
      }

      // Fixed deposit amount takes precedence (accept >= 0)
      if (depositAmountCents !== undefined && depositAmountCents >= 0) {
        // Validate deposit doesn't exceed total
        if (depositAmountCents > totalCents) {
          logger.error('[WholesalePricingService] Deposit amount exceeds total', {
            depositAmountCents,
            totalCents,
          });
          return {
            success: false,
            error: `Deposit amount (${depositAmountCents}) cannot exceed total (${totalCents})`,
          };
        }
        return {
          success: true,
          depositCents: depositAmountCents,
        };
      }

      // Calculate from percentage (accept >= 0)
      if (depositPercentage !== undefined && depositPercentage >= 0) {
        // Clamp deposit percentage to 0-100 range
        const clampedPercentage = Math.max(0, Math.min(100, depositPercentage));
        const depositCents = Math.round(totalCents * (clampedPercentage / 100));
        return {
          success: true,
          depositCents,
        };
      }

      // Default: only used when NO deposit params provided (full payment)
      return {
        success: true,
        depositCents: totalCents,
      };
    } catch (error: any) {
      logger.error('[WholesalePricingService] Failed to calculate deposit', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate deposit',
      };
    }
  }

  /**
   * Calculate balance amount
   * - Ensures depositCents + balanceCents = totalCents
   * - Validates balance is not negative
   */
  private calculateBalance(
    totalCents: number,
    depositCents: number
  ): { success: boolean; balanceCents?: number; error?: string } {
    try {
      const balanceCents = totalCents - depositCents;

      if (balanceCents < 0) {
        logger.error('[WholesalePricingService] Deposit exceeds total amount', {
          totalCents,
          depositCents,
          balanceCents,
        });
        return {
          success: false,
          error: `Deposit (${depositCents}) exceeds total amount (${totalCents})`,
        };
      }

      // Verify calculation consistency
      const calculatedTotal = depositCents + balanceCents;
      if (calculatedTotal !== totalCents) {
        logger.error('[WholesalePricingService] Calculation inconsistency detected', {
          totalCents,
          depositCents,
          balanceCents,
          calculatedTotal,
        });
        return {
          success: false,
          error: `Calculation error: deposit (${depositCents}) + balance (${balanceCents}) = ${calculatedTotal} ≠ total (${totalCents})`,
        };
      }

      return {
        success: true,
        balanceCents,
      };
    } catch (error: any) {
      logger.error('[WholesalePricingService] Failed to calculate balance', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate balance',
      };
    }
  }
}
