/**
 * Tax Service
 * 
 * Backend tax calculations using Stripe Tax
 * Handles US Sales Tax calculation based on seller's tax nexus configuration
 * 
 * IMPORTANT: For multi-seller platforms using Stripe Connect:
 * - Tax calculations are performed on behalf of the seller's connected account
 * - Each seller must configure their own tax registrations in their Stripe account
 * - The seller's warehouse address is used as ship_from_details for origin-based tax
 */

import Stripe from "stripe";
import type { IStorage } from "../storage";

export interface TaxCalculationParams {
  amount: number;
  currency: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  sellerId: string;
  items: Array<{
    id: string;
    price: string;
    quantity: number;
  }>;
  shippingCost?: number; // Shipping is also taxable in some states
}

export interface TaxCalculation {
  taxAmount: number;
  taxBreakdown: Stripe.Tax.Calculation.TaxBreakdown[] | null;
  calculationId: string;
}

export class TaxService {
  constructor(private storage: IStorage, private stripe?: Stripe) {}

  /**
   * Calculate tax using Stripe Tax API on behalf of the seller's connected account
   * 
   * Tax calculation uses:
   * - Seller's tax registrations (configured in their Stripe Connect dashboard)
   * - Customer's shipping address
   * - Seller's warehouse address (ship_from_details origin)
   * - Product tax codes
   */
  async calculateTax(params: TaxCalculationParams): Promise<TaxCalculation> {
    try {
      // Get seller tax settings
      const seller = await this.storage.getUser(params.sellerId);
      
      if (!seller) {
        console.error("[TaxService] Seller not found:", params.sellerId);
        return this.getZeroTax();
      }

      // Check if tax is enabled for this seller
      const taxEnabled = seller.taxEnabled === 1;
      if (!taxEnabled) {
        console.log("[TaxService] Tax disabled for seller:", params.sellerId);
        return this.getZeroTax();
      }

      // Get seller's connected account for Stripe Tax (uses their tax registrations)
      const connectedAccountId = seller.stripeConnectedAccountId;
      if (!connectedAccountId) {
        const error = `Seller must connect Stripe account to collect tax. Seller ID: ${params.sellerId}`;
        console.error("[TaxService]", error);
        throw new Error(error);
      }

      // Build line items for Stripe Tax
      const lineItems: Stripe.Tax.CalculationCreateParams.LineItem[] = params.items.map((item) => ({
        amount: Math.round(parseFloat(item.price) * item.quantity * 100), // Convert to cents
        reference: item.id,
        tax_code: seller.taxProductCode || 'txcd_99999999', // Default: General - Tangible Goods
      }));

      // Add shipping as a line item if present (shipping is taxable in many states)
      if (params.shippingCost && params.shippingCost > 0) {
        lineItems.push({
          amount: Math.round(params.shippingCost * 100), // Convert to cents
          reference: 'shipping',
          tax_code: 'txcd_92010001', // Shipping - General
        });
      }

      // Build ship_from_details address using seller's warehouse (required for origin-based tax)
      // Check new fields first, fallback to old fields (backward compatibility)
      const warehouseStreet = seller.warehouseAddressLine1 || seller.warehouseStreet;
      const warehouseCity = seller.warehouseAddressCity || seller.warehouseCity;
      const warehouseState = seller.warehouseAddressState || seller.warehouseState;
      const warehousePostalCode = seller.warehouseAddressPostalCode || seller.warehousePostalCode;
      const warehouseCountry = seller.warehouseAddressCountryCode || seller.warehouseCountry;
      
      const shipFromDetails: Stripe.Tax.CalculationCreateParams.ShipFromDetails | undefined = 
        warehouseStreet && warehouseCity && warehouseCountry
          ? {
              address: {
                line1: warehouseStreet,
                city: warehouseCity,
                state: warehouseState || undefined,
                postal_code: warehousePostalCode || undefined,
                country: warehouseCountry,
              },
            }
          : undefined;

      // Call Stripe Tax API on behalf of the seller's connected account
      // This ensures we use THEIR tax registrations, not the platform's
      const calculationParams: Stripe.Tax.CalculationCreateParams = {
        currency: params.currency.toLowerCase(),
        line_items: lineItems,
        customer_details: {
          address: {
            line1: params.shippingAddress.line1,
            line2: params.shippingAddress.line2 || undefined,
            city: params.shippingAddress.city,
            state: params.shippingAddress.state,
            postal_code: params.shippingAddress.postalCode,
            country: params.shippingAddress.country,
          },
          address_source: 'shipping',
        },
        // Expand tax breakdown for detailed information
        expand: ['line_items.data.tax_breakdown'],
      };

      // Add ship_from_details if warehouse address is configured
      if (shipFromDetails) {
        calculationParams.ship_from_details = shipFromDetails;
      }

      if (!this.stripe) {
        const error = "Stripe not configured - cannot calculate tax";
        console.error("[TaxService]", error);
        throw new Error(error);
      }

      // Call Tax API on behalf of connected account (uses their registrations)
      const calculation = await this.stripe.tax.calculations.create(
        calculationParams,
        { stripeAccount: connectedAccountId }
      );

      // Convert from cents to dollars
      const taxAmount = calculation.tax_amount_exclusive / 100;

      console.log(`[TaxService] Calculated tax: $${taxAmount.toFixed(2)} for ${params.shippingAddress.city}, ${params.shippingAddress.state} (seller: ${params.sellerId})`);

      return {
        taxAmount,
        taxBreakdown: calculation.tax_breakdown || null,
        calculationId: calculation.id || "",
      };
    } catch (error: any) {
      console.error("[TaxService] Error calculating tax:", error.message || error);
      
      // Re-throw critical errors that should block checkout
      // (e.g., missing connected account, tax enabled but can't calculate)
      if (error.message?.includes('must connect Stripe account') || 
          error.message?.includes('Stripe not configured')) {
        throw error; // Propagate to caller to block checkout
      }
      
      // For other errors (network issues, Stripe API errors), return zero tax
      // to allow checkout to proceed (better than blocking all purchases)
      return this.getZeroTax();
    }
  }

  /**
   * Helper: Return zero tax (used when tax is disabled or on error)
   */
  private getZeroTax(): TaxCalculation {
    return {
      taxAmount: 0,
      taxBreakdown: null,
      calculationId: "",
    };
  }

  /**
   * Estimate tax (8% default) - Legacy method for backward compatibility
   * @deprecated Use calculateTax() for real Stripe Tax calculations
   */
  estimateTax(amount: number, rate: number = 0.08): number {
    return Math.round(amount * rate * 100) / 100;
  }

  /**
   * Validate tax calculation using Stripe Tax API
   */
  async validateTaxCalculation(
    calculationId: string
  ): Promise<{ valid: boolean; error?: string }> {
    if (!calculationId) {
      return { valid: false, error: "No calculation ID provided" };
    }

    if (!this.stripe) {
      return { valid: false, error: "Stripe not configured" };
    }

    try {
      // Retrieve the calculation from Stripe to validate it
      const calculation = await this.stripe.tax.calculations.retrieve(calculationId);
      return { valid: !!calculation.id };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}
