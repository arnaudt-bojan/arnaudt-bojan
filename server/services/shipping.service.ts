/**
 * Shipping Service
 * 
 * Backend shipping calculations - handles rates, matrices, and delivery estimates
 */

import type { IStorage } from "../storage";
import type { Product, ShippingZone, Address } from "@shared/schema";
import { requiresState, isValidState } from "@shared/shipping-validation";
import { ConfigurationError } from "../errors";
import { logger } from "../logger";
import { getContinentFromCountry } from "@shared/continents";

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
      line1?: string;
      line2?: string;
    }
  ): Promise<ShippingCalculation> {
    logger.debug('[ShippingService] calculateShipping called', {
      itemCount: items.length,
      destination: destination.country,
      destinationState: destination.state || 'none',
      destinationCity: destination.city || 'none'
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
      shippingType: firstProduct.shippingType || 'none',
      flatRate: firstProduct.flatShippingRate || 'none',
      matrixId: firstProduct.shippingMatrixId || 'none'
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
          rawRate: firstProduct.flatShippingRate || 'none'
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
   * Task 8: Zone Matching Algorithm
   * 
   * Matches buyer's address to shipping zones with precedence: city > country > continent
   * 
   * @param zones - Available shipping zones for the matrix
   * @param destination - Buyer's destination address
   * @returns Matched shipping zone or null if no match found
   */
  private matchShippingZone(
    zones: ShippingZone[],
    destination: {
      country: string;
      city?: string;
      state?: string;
      postalCode?: string;
    }
  ): ShippingZone | null {
    logger.info('[ZoneMatching] Starting zone match algorithm', {
      totalZones: zones.length,
      destinationCountry: destination.country,
      destinationCity: destination.city || 'none',
      destinationState: destination.state || 'none'
    });

    // Extract buyer location data
    const buyerCountryISO = destination.country.toUpperCase().trim();
    const buyerContinent = getContinentFromCountry(buyerCountryISO);
    const buyerCity = destination.city?.toLowerCase().trim();

    logger.debug('[ZoneMatching] Extracted buyer location data', {
      buyerCountryISO,
      buyerContinent: buyerContinent || 'unknown',
      buyerCity: buyerCity || 'none'
    });

    // Priority 1: City matching (highest priority)
    // Match by zoneIdentifier (placeId format) OR fallback to city name + country match
    if (buyerCity) {
      logger.debug('[ZoneMatching] Attempting city-level match', {
        buyerCity,
        cityZonesCount: zones.filter(z => z.zoneType === 'city').length
      });

      const cityZone = zones.find(z => {
        if (z.zoneType !== 'city') return false;

        // Modern match: Compare zoneIdentifier (placeId from LocationIQ)
        if (z.zoneIdentifier) {
          // City identifier format: "city:{lat},{lon}" or raw placeId
          // For now, we can't match placeId without the buyer's placeId
          // This would require geocoding the buyer address first
          // So we skip identifier matching for cities and rely on name match
          logger.debug('[ZoneMatching] City zone has identifier, skipping for now', {
            zoneName: z.zoneName,
            zoneIdentifier: z.zoneIdentifier
          });
        }

        // Legacy/Fallback match: City name + country match
        const zoneCityName = z.zoneName.toLowerCase().trim();
        const isNameMatch = zoneCityName.includes(buyerCity) || buyerCity.includes(zoneCityName);
        
        // Check metadata for country match if available
        let isCountryMatch = true;
        if (z.metadata) {
          try {
            const metadata = JSON.parse(z.metadata);
            if (metadata.countryCode) {
              isCountryMatch = metadata.countryCode.toUpperCase() === buyerCountryISO;
            }
          } catch (e) {
            // Invalid JSON, skip metadata check
          }
        }

        const matches = isNameMatch && isCountryMatch;
        
        logger.debug('[ZoneMatching] City zone check', {
          zoneName: z.zoneName,
          buyerCity,
          isNameMatch,
          isCountryMatch,
          matches
        });

        return matches;
      });

      if (cityZone) {
        logger.info('[ZoneMatching] ✅ City match found!', {
          zoneName: cityZone.zoneName,
          zoneIdentifier: cityZone.zoneIdentifier || 'legacy',
          rate: cityZone.rate
        });
        return cityZone;
      }
    }

    // Priority 2: Country matching
    logger.debug('[ZoneMatching] Attempting country-level match', {
      buyerCountryISO,
      countryZonesCount: zones.filter(z => z.zoneType === 'country').length
    });

    const countryZone = zones.find(z => {
      if (z.zoneType !== 'country') return false;

      // Modern match: Compare zoneIdentifier with buyer's country ISO code
      if (z.zoneIdentifier) {
        const match = z.zoneIdentifier.toUpperCase() === buyerCountryISO;
        logger.debug('[ZoneMatching] Country zone identifier check', {
          zoneIdentifier: z.zoneIdentifier,
          buyerCountryISO,
          match
        });
        return match;
      }

      // Legacy match: Fall back to zoneCode (deprecated field)
      if (z.zoneCode) {
        const match = z.zoneCode.toUpperCase() === buyerCountryISO;
        logger.debug('[ZoneMatching] Country zone legacy zoneCode check', {
          zoneCode: z.zoneCode,
          buyerCountryISO,
          match
        });
        return match;
      }

      // Last resort: Fuzzy match on zoneName
      const zoneName = z.zoneName.toLowerCase().trim();
      const countryName = this.getCountryNameFromISO(buyerCountryISO);
      if (countryName) {
        const match = zoneName === countryName.toLowerCase() || 
                     zoneName.includes(countryName.toLowerCase()) ||
                     countryName.toLowerCase().includes(zoneName);
        logger.debug('[ZoneMatching] Country zone name fuzzy match', {
          zoneName: z.zoneName,
          countryName,
          match
        });
        return match;
      }

      return false;
    });

    if (countryZone) {
      logger.info('[ZoneMatching] ✅ Country match found!', {
        zoneName: countryZone.zoneName,
        zoneIdentifier: countryZone.zoneIdentifier || countryZone.zoneCode || 'legacy-name-match',
        rate: countryZone.rate
      });
      return countryZone;
    }

    // Priority 3: Continent matching
    if (buyerContinent) {
      logger.debug('[ZoneMatching] Attempting continent-level match', {
        buyerContinent,
        continentZonesCount: zones.filter(z => z.zoneType === 'continent').length
      });

      const continentZone = zones.find(z => {
        if (z.zoneType !== 'continent') return false;

        // Modern match: Compare zoneIdentifier with buyer's continent code
        if (z.zoneIdentifier) {
          const match = z.zoneIdentifier.toLowerCase() === buyerContinent.toLowerCase();
          logger.debug('[ZoneMatching] Continent zone identifier check', {
            zoneIdentifier: z.zoneIdentifier,
            buyerContinent,
            match
          });
          return match;
        }

        // Legacy match: Fuzzy match on zoneName
        const normalizeZoneName = (name: string): string => {
          return name
            .toLowerCase()
            .replace(/\s*\(continent\)\s*/gi, '')
            .replace(/\s*\(country\)\s*/gi, '')
            .replace(/\s*\(city\)\s*/gi, '')
            .trim();
        };

        const normalizedZoneName = normalizeZoneName(z.zoneName);
        const normalizedContinent = buyerContinent.replace(/-/g, ' ').toLowerCase();
        
        const match = normalizedZoneName === normalizedContinent ||
                     normalizedZoneName.includes(normalizedContinent) ||
                     normalizedContinent.includes(normalizedZoneName);

        logger.debug('[ZoneMatching] Continent zone name fuzzy match', {
          zoneName: z.zoneName,
          normalizedZoneName,
          buyerContinent,
          normalizedContinent,
          match
        });

        return match;
      });

      if (continentZone) {
        logger.info('[ZoneMatching] ✅ Continent match found!', {
          zoneName: continentZone.zoneName,
          zoneIdentifier: continentZone.zoneIdentifier || 'legacy-name-match',
          rate: continentZone.rate
        });
        return continentZone;
      }
    }

    // No match found
    logger.warn('[ZoneMatching] ❌ No matching zone found', {
      buyerCountryISO,
      buyerContinent: buyerContinent || 'unknown',
      buyerCity: buyerCity || 'none',
      availableZones: zones.map(z => `${z.zoneName} (${z.zoneType})`).join(', ')
    });

    return null;
  }

  /**
   * Helper: Get country name from ISO code for legacy matching
   */
  private getCountryNameFromISO(isoCode: string): string | null {
    const countryMap: Record<string, string> = {
      'US': 'United States',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'PL': 'Poland',
      'IE': 'Ireland',
      'PT': 'Portugal',
      'GR': 'Greece',
      'CZ': 'Czech Republic',
      'JP': 'Japan',
      'CN': 'China',
      'KR': 'South Korea',
      'SG': 'Singapore',
      'HK': 'Hong Kong',
      'IN': 'India',
      'TH': 'Thailand',
      'MY': 'Malaysia',
      'ID': 'Indonesia',
      'PH': 'Philippines',
      'VN': 'Vietnam',
      'NZ': 'New Zealand',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'ZA': 'South Africa',
      'NG': 'Nigeria',
      'EG': 'Egypt',
      'KE': 'Kenya',
      'AE': 'United Arab Emirates',
      'SA': 'Saudi Arabia',
      'IL': 'Israel',
      'TR': 'Turkey',
    };
    return countryMap[isoCode.toUpperCase()] || null;
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
      line1?: string;
      line2?: string;
    }
  ): Promise<ShippingCalculation> {
    logger.info('[ShippingService] calculateMatrixShipping - Starting', {
      matrixId,
      destinationCountry: destination.country,
      destinationCity: destination.city || 'none',
      destinationState: destination.state || 'none'
    });

    // Get all zones for this matrix
    const zones = await this.storage.getShippingZonesByMatrixId(matrixId);
    
    logger.info('[ShippingService] Available shipping zones', {
      zoneCount: zones.length,
      zonesInfo: zones.map(z => ({
        id: z.id,
        zoneName: z.zoneName,
        zoneType: z.zoneType,
        zoneIdentifier: z.zoneIdentifier || z.zoneCode || 'legacy',
        rate: z.rate
      }))
    });
    
    if (zones.length === 0) {
      throw new ConfigurationError(
        "No shipping zones configured for this shipping matrix. Please add shipping zones in Settings > Shipping."
      );
    }

    // Task 9: Use new zone matching algorithm
    const matchedZone = this.matchShippingZone(zones, destination);
    
    if (!matchedZone) {
      // No match found - throw specific error (Architecture 3: no silent fallbacks)
      const buyerContinent = getContinentFromCountry(destination.country.toUpperCase());
      
      throw new ConfigurationError(
        `No shipping zone configured for ${destination.country}${destination.city ? ` (${destination.city})` : ''}. ` +
        `Available zones: ${zones.map(z => z.zoneName).join(', ')}. ` +
        `Please contact the seller for shipping options.`
      );
    }

    // Return shipping calculation with matched zone
    return {
      cost: parseFloat(matchedZone.rate),
      method: "matrix",
      zone: matchedZone.zoneName,
      estimatedDays: matchedZone.estimatedDays?.toString(),
      carrier: "Matrix Shipping",
      details: this.formatShippingDetails(
        matchedZone.zoneName,
        matchedZone.estimatedDays?.toString()
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
      line1?: string;
      line2?: string;
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

      // Get seller's warehouse address from warehouse_addresses table (new multi-warehouse system)
      const seller = await this.storage.getUser(product.sellerId);
      if (!seller) {
        throw new Error("Seller not found");
      }

      // Get warehouse address from warehouse_addresses table
      const warehouseAddresses = await this.storage.getWarehouseAddressesBySellerId(product.sellerId);
      if (warehouseAddresses.length === 0) {
        throw new ConfigurationError("Warehouse address not configured. Please set up your warehouse address in Settings > Warehouse to enable shipping calculations.");
      }

      // Use default warehouse or first available
      const warehouse = warehouseAddresses.find(w => w.isDefault === 1) || warehouseAddresses[0];

      // Validate warehouse has all required fields
      if (!warehouse.addressLine1 || !warehouse.city || !warehouse.postalCode || !warehouse.countryCode) {
        throw new ConfigurationError("Warehouse address incomplete. Please ensure all required fields are filled in Settings > Warehouse.");
      }

      const addressFrom = {
        name: warehouse.name,
        company: seller.companyName || '',
        street1: warehouse.addressLine1,
        street2: warehouse.addressLine2 || '',
        city: warehouse.city,
        state: warehouse.state || '',
        zip: warehouse.postalCode,
        country: warehouse.countryCode,
      };

      // Convert country name to ISO code for Shippo
      logger.info('[ShippingService] Converting country for Shippo API', {
        rawCountry: destination.country,
        destinationLine1: destination.line1,
        destinationLine2: destination.line2,
        destinationCity: destination.city,
        destinationState: destination.state,
        destinationPostalCode: destination.postalCode
      });
      
      const countryISO = this.convertCountryToISO(destination.country);
      
      logger.info('[ShippingService] Country code converted for Shippo', {
        input: destination.country,
        output: countryISO,
        isValidLength: countryISO.length === 2 || countryISO.length === 3
      });
      
      const addressTo = {
        name: 'Customer',
        street1: destination.line1 || destination.city || 'Address',  // Use actual street address
        street2: destination.line2 || '',  // Add line2 support
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

      logger.info('[ShippingService] Calling Shippo API with payload', {
        addressFrom: JSON.stringify({
          street1: addressFrom.street1,
          city: addressFrom.city,
          state: addressFrom.state,
          zip: addressFrom.zip,
          country: addressFrom.country
        }),
        addressTo: JSON.stringify({
          street1: addressTo.street1,
          street2: addressTo.street2,
          city: addressTo.city,
          state: addressTo.state,
          zip: addressTo.zip,
          country: addressTo.country
        }),
        parcel: JSON.stringify({
          weight: parcel.weight,
          length: parcel.length,
          width: parcel.width,
          height: parcel.height
        })
      });

      // Create shipment to get rates
      logger.info('[ShippingService] Calling Shippo API to create shipment', {
        from: `${addressFrom.city}, ${addressFrom.country}`,
        to: `${addressTo.city}, ${addressTo.country}`,
        parcel: `${parcel.weight}lb, ${parcel.length}x${parcel.width}x${parcel.height}in`
      });
      
      const shipment = await shippo.shipments.create({
        addressFrom: addressFrom,
        addressTo: addressTo,
        parcels: [parcel],
        async: false,
      });

      // Check for errors in shipment response
      if (shipment.status === 'ERROR') {
        logger.error('[ShippingService] Shippo shipment validation failed', {
          messages: shipment.messages,
          addressFrom: JSON.stringify(addressFrom),
          addressTo: JSON.stringify(addressTo)
        });
        throw new Error(`Shippo validation failed: ${JSON.stringify(shipment.messages)}`);
      }

      // Get the rates
      const rates = shipment.rates || [];
      
      logger.info('[ShippingService] Shippo returned rates', {
        rateCount: rates.length,
        rates: rates.map(r => ({
          carrier: r.provider,
          service: r.servicelevel?.name,
          amount: r.amount,
          currency: r.currency
        }))
      });
      
      if (rates.length === 0) {
        logger.error('[ShippingService] No shipping rates available', {
          shipmentId: shipment.objectId,
          status: shipment.status,
          addressTo: JSON.stringify(addressTo)
        });
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
   * CASE-INSENSITIVE to prevent bugs like "United Kingdom" → "UN"
   */
  private convertCountryToISO(country: string): string {
    const countryMap: Record<string, string> = {
      // North America
      'united states': 'US',
      'usa': 'US',
      'canada': 'CA',
      'mexico': 'MX',
      
      // Europe
      'united kingdom': 'GB',
      'uk': 'GB',
      'gb': 'GB',
      'germany': 'DE',
      'france': 'FR',
      'italy': 'IT',
      'spain': 'ES',
      'netherlands': 'NL',
      'belgium': 'BE',
      'switzerland': 'CH',
      'austria': 'AT',
      'sweden': 'SE',
      'norway': 'NO',
      'denmark': 'DK',
      'finland': 'FI',
      'poland': 'PL',
      'portugal': 'PT',
      'ireland': 'IE',
      'greece': 'GR',
      'czech republic': 'CZ',
      
      // Asia Pacific
      'australia': 'AU',
      'new zealand': 'NZ',
      'japan': 'JP',
      'china': 'CN',
      'south korea': 'KR',
      'singapore': 'SG',
      'hong kong': 'HK',
      'india': 'IN',
      'thailand': 'TH',
      'malaysia': 'MY',
      'indonesia': 'ID',
      'philippines': 'PH',
      'vietnam': 'VN',
      
      // South America
      'brazil': 'BR',
      'argentina': 'AR',
      'chile': 'CL',
      'colombia': 'CO',
      
      // Middle East & Africa
      'united arab emirates': 'AE',
      'uae': 'AE',
      'saudi arabia': 'SA',
      'israel': 'IL',
      'south africa': 'ZA',
      'egypt': 'EG',
      'turkey': 'TR',
    };

    const normalized = country.trim().toLowerCase();
    const isoCode = countryMap[normalized];
    
    if (isoCode) {
      logger.debug(`[ShippingService] Country code conversion: "${country}" → "${isoCode}"`);
      return isoCode;
    }
    
    // If not found in map, assume it's already an ISO code (e.g., "US", "GB")
    // Only use the raw value if it's already 2-3 characters (valid ISO format)
    const uppercased = country.trim().toUpperCase();
    if (uppercased.length === 2 || uppercased.length === 3) {
      logger.debug(`[ShippingService] Country already in ISO format: "${country}" → "${uppercased}"`);
      return uppercased;
    }
    
    // Throw error for unknown country (no more silent fallbacks!)
    logger.error(`[ShippingService] ❌ Unknown country code: "${country}"`);
    throw new ConfigurationError(`Invalid country code: ${country}. Please select a valid country from the dropdown.`);
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
