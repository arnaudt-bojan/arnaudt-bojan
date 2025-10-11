/**
 * Shipping Service
 * 
 * Backend shipping calculations - handles rates, matrices, and delivery estimates
 */

import type { IStorage } from "../storage";
import type { Product } from "@shared/schema";

export interface ShippingRate {
  zone: string;
  cost: number;
  estimatedDays?: string;
  carrier?: string;
}

export interface ShippingCalculation {
  cost: number;
  method: "flat" | "matrix" | "shippo" | "free";
  zone?: string;
  estimatedDays?: string;
  carrier?: string;
}

export class ShippingService {
  constructor(private storage: IStorage) {}

  /**
   * Calculate shipping cost for cart items
   */
  async calculateShipping(
    items: Array<{ id: string; quantity: number }>,
    destination: {
      country: string;
      state?: string;
      postalCode?: string;
    }
  ): Promise<ShippingCalculation> {
    if (items.length === 0) {
      return { cost: 0, method: "free" };
    }

    // Get first product to determine seller and shipping method
    const firstProduct = await this.storage.getProduct(items[0].id);
    if (!firstProduct) {
      throw new Error("Product not found");
    }

    // Validate all items are from the same seller
    const sellerId = firstProduct.sellerId;
    for (const item of items) {
      const product = await this.storage.getProduct(item.id);
      if (!product) {
        throw new Error(`Product ${item.id} not found`);
      }
      if (product.sellerId !== sellerId) {
        throw new Error("All cart items must be from the same seller");
      }
    }

    // Get shipping configuration from product (or seller in future enhancement)
    const shippingType = firstProduct.shippingType || "flat";

    // Handle different shipping types
    switch (shippingType) {
      case "free":
        return { cost: 0, method: "free" };

      case "flat":
        const flatRate = parseFloat(firstProduct.flatShippingRate || "0");
        return { cost: flatRate, method: "flat" };

      case "matrix":
        // TODO: Implement matrix shipping with shipping matrix lookup
        return { cost: 0, method: "matrix" };

      case "shippo":
        // TODO: Implement Shippo real-time rates
        return { cost: 0, method: "shippo" };

      default:
        return { cost: 0, method: "free" };
    }
  }


  /**
   * Get available shipping zones for a seller
   * TODO: Implement when shipping matrices are added to seller settings
   */
  async getShippingZones(sellerId: string): Promise<any[]> {
    return [];
  }

  /**
   * Validate shipping address
   */
  validateAddress(address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }): { valid: boolean; error?: string } {
    if (!address.line1 || address.line1.length < 5) {
      return { valid: false, error: "Street address is required" };
    }
    if (!address.city || address.city.length < 2) {
      return { valid: false, error: "City is required" };
    }
    if (!address.state || address.state.length < 2) {
      return { valid: false, error: "State/Province is required" };
    }
    if (!address.postalCode || address.postalCode.length < 3) {
      return { valid: false, error: "ZIP/Postal code is required" };
    }
    if (!address.country || address.country.length < 2) {
      return { valid: false, error: "Country is required" };
    }
    return { valid: true };
  }
}
