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
  details?: string; // Human-readable shipping description for checkout
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
        // Matrix shipping with zone matching
        if (!firstProduct.shippingMatrixId) {
          throw new Error("Shipping matrix ID not configured for this product");
        }
        
        const matrixResult = await this.calculateMatrixShipping(
          firstProduct.shippingMatrixId,
          destination
        );
        return matrixResult;

      case "shippo":
        // Shippo real-time rates
        const shippoResult = await this.calculateShippoShipping(
          firstProduct,
          destination,
          items
        );
        return shippoResult;

      default:
        return { cost: 0, method: "free" };
    }
  }


  /**
   * Calculate shipping using matrix with zone matching
   * Priority: city > country > continent
   */
  private async calculateMatrixShipping(
    matrixId: string,
    destination: {
      country: string;
      state?: string;
      postalCode?: string;
    }
  ): Promise<ShippingCalculation> {
    // Get all zones for this matrix
    const zones = await this.storage.getShippingZonesByMatrixId(matrixId);
    
    if (zones.length === 0) {
      throw new Error("No shipping zones configured for this matrix");
    }

    // Try to match by country first (most common)
    const countryZone = zones.find(z => 
      z.zoneType === 'country' && 
      z.zoneCode?.toUpperCase() === destination.country.toUpperCase()
    );
    
    if (countryZone) {
      return {
        cost: parseFloat(countryZone.rate),
        method: "matrix",
        zone: countryZone.zoneName,
        estimatedDays: countryZone.estimatedDays?.toString(),
        details: this.formatShippingDetails(
          countryZone.zoneName,
          countryZone.estimatedDays?.toString()
        )
      };
    }

    // Try to match by continent as fallback
    const continentMap: Record<string, string> = {
      'US': 'North America', 'CA': 'North America', 'MX': 'North America',
      'GB': 'Europe', 'FR': 'Europe', 'DE': 'Europe', 'IT': 'Europe', 'ES': 'Europe',
      'AU': 'Oceania', 'NZ': 'Oceania',
      'JP': 'Asia', 'CN': 'Asia', 'KR': 'Asia', 'IN': 'Asia',
      'BR': 'South America', 'AR': 'South America', 'CL': 'South America'
    };
    
    const continent = continentMap[destination.country.toUpperCase()];
    if (continent) {
      const continentZone = zones.find(z => 
        z.zoneType === 'continent' && 
        z.zoneName.toLowerCase() === continent.toLowerCase()
      );
      
      if (continentZone) {
        return {
          cost: parseFloat(continentZone.rate),
          method: "matrix",
          zone: continentZone.zoneName,
          estimatedDays: continentZone.estimatedDays?.toString(),
          details: this.formatShippingDetails(
            continentZone.zoneName,
            continentZone.estimatedDays?.toString()
          )
        };
      }
    }

    // Use first zone as ultimate fallback
    const fallbackZone = zones[0];
    return {
      cost: parseFloat(fallbackZone.rate),
      method: "matrix",
      zone: fallbackZone.zoneName,
      estimatedDays: fallbackZone.estimatedDays?.toString(),
      details: this.formatShippingDetails(
        fallbackZone.zoneName,
        fallbackZone.estimatedDays?.toString()
      )
    };
  }

  /**
   * Calculate shipping using Shippo real-time rates
   * TODO: Implement when Shippo API key is available
   */
  private async calculateShippoShipping(
    product: Product,
    destination: {
      country: string;
      state?: string;
      postalCode?: string;
    },
    items: Array<{ id: string; quantity: number }>
  ): Promise<ShippingCalculation> {
    // Check if Shippo credentials are configured
    if (!process.env.SHIPPO_API_KEY) {
      throw new Error("Shippo API key not configured. Please add SHIPPO_API_KEY to environment variables.");
    }

    // TODO: Implement Shippo API integration
    // For now, return a placeholder
    throw new Error("Shippo integration coming soon. Please use flat, matrix, or free shipping.");
  }

  /**
   * Format shipping details for display
   */
  private formatShippingDetails(
    zone?: string,
    estimatedDays?: string
  ): string {
    const parts: string[] = [];
    
    if (zone) parts.push(zone);
    if (estimatedDays) parts.push(`${estimatedDays} days`);
    
    return parts.length > 0 ? parts.join(' - ') : 'Standard shipping';
  }

  /**
   * Get available shipping zones for a seller
   */
  async getShippingZones(sellerId: string): Promise<any[]> {
    const matrices = await this.storage.getShippingMatricesBySellerId(sellerId);
    const allZones = [];
    
    for (const matrix of matrices) {
      const zones = await this.storage.getShippingZonesByMatrixId(matrix.id);
      allZones.push(...zones);
    }
    
    return allZones;
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
