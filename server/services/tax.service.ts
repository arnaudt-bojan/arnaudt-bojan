/**
 * Tax Service
 * 
 * Backend tax calculations using Stripe Tax
 * Handles US Sales Tax calculation based on seller's tax nexus configuration
 */

import Stripe from "stripe";
import type { IStorage } from "../storage";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

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
  constructor(private storage: IStorage) {}

  /**
   * Calculate tax using Stripe Tax API
   * Stripe Tax automatically determines the correct rate based on:
   * - Customer's shipping address
   * - Seller's tax nexus (states/countries where they collect tax)
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

      // Call Stripe Tax API
      const calculation = await stripe.tax.calculations.create({
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
          address_source: 'shipping', // Use shipping address for tax calculation
        },
        // Expand tax breakdown for detailed information
        expand: ['line_items.data.tax_breakdown'],
      });

      // Convert from cents to dollars
      const taxAmount = calculation.tax_amount_exclusive / 100;

      console.log(`[TaxService] Calculated tax: $${taxAmount.toFixed(2)} for ${params.shippingAddress.city}, ${params.shippingAddress.state}`);

      return {
        taxAmount,
        taxBreakdown: calculation.tax_breakdown || null,
        calculationId: calculation.id,
      };
    } catch (error: any) {
      console.error("[TaxService] Error calculating tax:", error.message || error);
      // Return zero tax on error to allow checkout to proceed
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

    try {
      // Retrieve the calculation from Stripe to validate it
      const calculation = await stripe.tax.calculations.retrieve(calculationId);
      return { valid: !!calculation.id };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}
