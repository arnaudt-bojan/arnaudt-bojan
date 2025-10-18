/**
 * Shipping Service
 * 
 * Backend shipping calculations - handles rates, matrices, and delivery estimates
 */

import type { IStorage } from "../storage";
import type { Product } from "@shared/schema";
import { requiresState, isValidState } from "@shared/shipping-validation";
import { ConfigurationError } from "../errors";
import { logger } from "../logger";

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
      city?: string;
      state?: string;
      postalCode?: string;
    }
  ): Promise<ShippingCalculation> {
    logger.debug('[ShippingService] calculateShipping called', {
      itemCount: items.length,
      destination: destination.country,
      destinationState: destination.state,
      destinationCity: destination.city
    });

    if (items.length === 0) {
      logger.debug('[ShippingService] No items, returning free shipping');
      return { cost: 0, method: "free" };
    }

    // Get first product to determine seller and shipping method
    const firstProduct = await this.storage.getProduct(items[0].id);
    if (!firstProduct) {
      throw new Error("Product not found");
    }

    logger.debug('[ShippingService] Product shipping configuration', {
      productId: firstProduct.id,
      productName: firstProduct.name,
      shippingType: firstProduct.shippingType,
      flatRate: firstProduct.flatShippingRate,
      matrixId: firstProduct.shippingMatrixId
    });

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
    
    logger.info('[ShippingService] Determined shipping method:', {
      shippingType,
      isDefault: !firstProduct.shippingType
    });

    // Handle different shipping types
    switch (shippingType) {
      case "free":
        logger.info('[ShippingService] Returning FREE shipping', {
          cost: 0,
          country: destination.country
        });
        return { 
          cost: 0, 
          method: "free",
          zone: "All locations",
          carrier: "Free Shipping",
          details: "Free shipping"
        };

      case "flat":
        const flatRate = parseFloat(firstProduct.flatShippingRate || "0");
        logger.info('[ShippingService] Returning FLAT rate shipping', {
          cost: flatRate,
          country: destination.country,
          rawRate: firstProduct.flatShippingRate
        });
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
        logger.info('[ShippingService] Calculating SHIPPO shipping', {
          productId: firstProduct.id,
          destination: destination.country
        });
        const shippoResult = await this.calculateShippoShipping(
          firstProduct,
          destination,
          items
        );
        logger.info('[ShippingService] Shippo result:', {
          cost: shippoResult.cost,
          method: shippoResult.method,
          carrier: shippoResult.carrier,
          zone: shippoResult.zone
        });
        return shippoResult;

      default:
        logger.warn('[ShippingService] Unknown shipping type, defaulting to FREE', {
          shippingType,
          country: destination.country
        });
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
      city?: string;
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
      const stateValue = destination.state.toLowerCase();
      const cityZone = zones.find(z => 
        z.zoneType === 'city' && 
        (z.zoneCode?.toUpperCase() === destination.state?.toUpperCase() ||
         z.zoneName.toLowerCase().includes(stateValue))
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
      city?: string;
      state?: string;
      postalCode?: string;
    },
    items: Array<{ id: string; quantity: number }>
  ): Promise<ShippingCalculation> {
    // Check if Shippo credentials are configured
    if (!process.env.SHIPPO_API_KEY) {
      throw new ConfigurationError("Shippo API key not configured. Please add SHIPPO_API_KEY to environment variables.");
    }

    // Validate package dimensions are configured
    if (!product.shippoWeight || !product.shippoLength || !product.shippoWidth || !product.shippoHeight) {
      throw new ConfigurationError("Package dimensions not configured for Shippo shipping. Please set weight, length, width, and height in product settings.");
    }

    try {
      const { Shippo } = await import('shippo');
      const shippo = new Shippo({
        apiKeyHeader: process.env.SHIPPO_API_KEY
      });

      // Get seller's warehouse address (origin address for shipping)
      const seller = await this.storage.getUser(product.sellerId);
      if (!seller) {
        throw new Error("Seller not found");
      }

      // Validate warehouse address is configured
      if (!seller.warehouseStreet || !seller.warehouseCity || !seller.warehousePostalCode || !seller.warehouseCountry) {
        throw new ConfigurationError("Warehouse address not configured. Please set up your warehouse address in Settings > Warehouse to enable shipping calculations.");
      }

      const addressFrom = {
        name: seller.firstName + ' ' + seller.lastName,
        company: seller.companyName || '',
        street1: seller.warehouseStreet,
        city: seller.warehouseCity,
        state: seller.warehouseState || '',
        zip: seller.warehousePostalCode,
        country: seller.warehouseCountry,
      };

      // Convert country name to ISO code for Shippo
      const countryISO = this.convertCountryToISO(destination.country);
      
      const addressTo = {
        name: 'Customer',
        street1: destination.city || 'Address',  // Use city as street1 for rate calculation
        city: destination.city || '',
        state: destination.state || '',
        zip: destination.postalCode || '',
        country: countryISO,
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
      logger.error('Shippo API error:', error);
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
   * Convert country name to ISO code for Shippo API
   */
  private convertCountryToISO(country: string): string {
    const countryMap: Record<string, string> = {
      // North America
      'United States': 'US',
      'USA': 'US',
      'Canada': 'CA',
      'Mexico': 'MX',
      
      // Europe
      'United Kingdom': 'GB',
      'UK': 'GB',
      'Germany': 'DE',
      'France': 'FR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Switzerland': 'CH',
      'Austria': 'AT',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'Poland': 'PL',
      'Portugal': 'PT',
      'Ireland': 'IE',
      'Greece': 'GR',
      'Czech Republic': 'CZ',
      
      // Asia Pacific
      'Australia': 'AU',
      'New Zealand': 'NZ',
      'Japan': 'JP',
      'China': 'CN',
      'South Korea': 'KR',
      'Singapore': 'SG',
      'Hong Kong': 'HK',
      'India': 'IN',
      'Thailand': 'TH',
      'Malaysia': 'MY',
      'Indonesia': 'ID',
      'Philippines': 'PH',
      'Vietnam': 'VN',
      
      // South America
      'Brazil': 'BR',
      'Argentina': 'AR',
      'Chile': 'CL',
      'Colombia': 'CO',
      
      // Middle East & Africa
      'United Arab Emirates': 'AE',
      'UAE': 'AE',
      'Saudi Arabia': 'SA',
      'Israel': 'IL',
      'South Africa': 'ZA',
      'Egypt': 'EG',
      'Turkey': 'TR',
    };

    // Return ISO code if found, otherwise return country as-is (it might already be ISO)
    return countryMap[country] || country.toUpperCase().substring(0, 2);
  }

  /**
   * Validate shipping address
   */
  validateAddress(address: {
    line1: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  }): { valid: boolean; error?: string } {
    if (!address.line1 || address.line1.length < 5) {
      return { valid: false, error: "Street address is required" };
    }
    if (!address.city || address.city.length < 2) {
      return { valid: false, error: "City is required" };
    }
    
    // State is required for certain countries
    if (requiresState(address.country)) {
      if (!isValidState(address.state)) {
        return { valid: false, error: "State/Province is required for this country" };
      }
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
