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
        return { 
          cost: 0, 
          method: "free",
          zone: "All locations",
          carrier: "Free Shipping",
          details: "Free shipping"
        };

      case "flat":
        const flatRate = parseFloat(firstProduct.flatShippingRate || "0");
        return { 
          cost: flatRate, 
          method: "flat",
          zone: "All locations",
          carrier: "Standard Shipping",
          details: `Flat rate shipping`
        };

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

    // Priority 1: Try to match by city (highest priority) - using state field as city indicator
    // Note: For city-level matching to work properly, destination.state should contain city or zone code
    if (destination.state) {
      const cityZone = zones.find(z => 
        z.zoneType === 'city' && 
        (z.zoneCode?.toUpperCase() === destination.state?.toUpperCase() ||
         z.zoneName.toLowerCase().includes(destination.state.toLowerCase()))
      );
      
      if (cityZone) {
        return {
          cost: parseFloat(cityZone.rate),
          method: "matrix",
          zone: cityZone.zoneName,
          estimatedDays: cityZone.estimatedDays?.toString(),
          carrier: "Matrix Shipping",
          details: this.formatShippingDetails(
            cityZone.zoneName,
            cityZone.estimatedDays?.toString()
          )
        };
      }
    }

    // Priority 2: Try to match by country (most common)
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
        carrier: "Matrix Shipping",
        details: this.formatShippingDetails(
          countryZone.zoneName,
          countryZone.estimatedDays?.toString()
        )
      };
    }

    // Priority 3: Try to match by continent using country-to-continent mapping
    const continentMap: Record<string, string[]> = {
      'North America': ['US', 'CA', 'MX'],
      'Europe': ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'IE'],
      'Asia': ['JP', 'CN', 'KR', 'IN', 'SG', 'TH', 'MY', 'ID', 'PH', 'VN'],
      'Oceania': ['AU', 'NZ'],
      'South America': ['BR', 'AR', 'CL', 'CO', 'PE'],
      'Africa': ['ZA', 'NG', 'EG', 'KE']
    };
    
    // Find the continent for this country
    const destinationContinent = Object.entries(continentMap).find(([_, countries]) =>
      countries.includes(destination.country.toUpperCase())
    )?.[0];
    
    if (destinationContinent) {
      const continentZone = zones.find(z => 
        z.zoneType === 'continent' && 
        z.zoneName.toLowerCase() === destinationContinent.toLowerCase()
      );
      
      if (continentZone) {
        return {
          cost: parseFloat(continentZone.rate),
          method: "matrix",
          zone: continentZone.zoneName,
          estimatedDays: continentZone.estimatedDays?.toString(),
          carrier: "Matrix Shipping",
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
      carrier: "Matrix Shipping",
      details: this.formatShippingDetails(
        fallbackZone.zoneName,
        fallbackZone.estimatedDays?.toString()
      )
    };
  }

  /**
   * Calculate shipping using Shippo real-time rates
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

    // Validate package dimensions are configured
    if (!product.shippoWeight || !product.shippoLength || !product.shippoWidth || !product.shippoHeight) {
      throw new Error("Package dimensions not configured for Shippo shipping. Please set weight, length, width, and height in product settings.");
    }

    try {
      const { Shippo } = await import('shippo');
      const shippo = new Shippo({
        apiKeyHeader: process.env.SHIPPO_API_KEY
      });

      // Get seller's address (as origin address)
      const seller = await this.storage.getUser(product.sellerId);
      if (!seller) {
        throw new Error("Seller not found");
      }

      // For now, we'll use a default origin address
      // TODO: Add seller's warehouse/origin address to user settings
      const addressFrom = {
        name: seller.firstName + ' ' + seller.lastName,
        company: seller.companyName || '',
        street1: '215 Clayton St.',
        city: 'San Francisco',
        state: 'CA',
        zip: '94117',
        country: 'US',
      };

      const addressTo = {
        name: 'Customer',
        street1: 'Shipping Address',
        city: destination.state || 'City',
        state: destination.state || 'State',
        zip: destination.postalCode || '00000',
        country: destination.country,
      };

      // Create parcel object
      const parcel = {
        length: product.shippoLength.toString(),
        width: product.shippoWidth.toString(),
        height: product.shippoHeight.toString(),
        distanceUnit: 'in' as const,
        weight: product.shippoWeight.toString(),
        massUnit: 'lb' as const,
      };

      // Create shipment to get rates
      const shipment = await shippo.shipments.create({
        addressFrom: addressFrom,
        addressTo: addressTo,
        parcels: [parcel],
        async: false,
      });

      // Get the rates
      const rates = shipment.rates || [];
      
      if (rates.length === 0) {
        throw new Error("No shipping rates available for this destination");
      }

      // Find the cheapest rate (or use template if specified)
      let selectedRate = rates[0];
      
      if (product.shippoTemplate) {
        // Try to find rate matching the template
        const templateRate = rates.find(r => 
          r.servicelevel?.token === product.shippoTemplate
        );
        if (templateRate) {
          selectedRate = templateRate;
        }
      } else {
        // Use cheapest rate
        selectedRate = rates.reduce((cheapest, rate) => 
          parseFloat(rate.amount) < parseFloat(cheapest.amount) ? rate : cheapest
        , rates[0]);
      }

      return {
        cost: parseFloat(selectedRate.amount),
        method: "shippo",
        zone: selectedRate.servicelevel?.name || "International",
        carrier: selectedRate.provider,
        estimatedDays: selectedRate.estimatedDays?.toString(),
        details: this.formatShippingDetails(
          selectedRate.servicelevel?.name,
          selectedRate.estimatedDays?.toString()
        )
      };
    } catch (error: any) {
      console.error('Shippo API error:', error);
      throw new Error(`Shippo shipping calculation failed: ${error.message}`);
    }
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
