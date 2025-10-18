import { logger } from "../logger";
import type { Address } from "../../shared/schema";
import { getCountryCode, getCountryName } from "../../shared/countries";

export interface LocationIQSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface AddressAutocompleteResult {
  displayName: string;
  address: Partial<Address>;
}

export interface CitySearchResult {
  placeId: string; // Unique identifier for city matching
  displayName: string; // e.g., "New York, NY, United States"
  city: string; // e.g., "New York"
  state: string; // e.g., "NY" or "New York"
  country: string; // ISO code, e.g., "US"
  countryName: string; // e.g., "United States"
  latitude: number;
  longitude: number;
}

export class LocationIQAddressService {
  private apiKey: string | undefined;
  private baseUrl = "https://us1.locationiq.com/v1";

  constructor() {
    this.apiKey = process.env.LOCATIONIQ_API_KEY;
    
    if (!this.apiKey) {
      logger.warn("[LocationIQ] API key not configured. Address autocomplete will not be available.");
    } else {
      logger.info("[LocationIQ] Service initialized successfully");
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async searchAddress(
    query: string,
    countryCode?: string,
    limit: number = 5
  ): Promise<AddressAutocompleteResult[]> {
    if (!this.apiKey) {
      throw new Error("LocationIQ API key not configured");
    }

    if (!query || query.trim().length < 3) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        q: query.trim(),
        format: "json",
        addressdetails: "1",
        limit: limit.toString(),
      });

      if (countryCode) {
        params.append("countrycodes", countryCode.toLowerCase());
      }

      const url = `${this.baseUrl}/search?${params.toString()}`;
      
      logger.debug(`[LocationIQ] Searching: ${query}`, { countryCode, limit });

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[LocationIQ] API error: ${response.status}`, { error: errorText });
        throw new Error(`LocationIQ API error: ${response.statusText}`);
      }

      const results: LocationIQSearchResult[] = await response.json();

      logger.info(`[LocationIQ] Found ${results.length} results for: ${query}`);

      return results.map(result => this.convertToAddress(result));

    } catch (error: any) {
      logger.error("[LocationIQ] Search failed:", error);
      throw error;
    }
  }

  /**
   * Search for cities only (no street addresses) for shipping zone configuration
   * 
   * @param query - City name to search (e.g., "New York", "London")
   * @param countryCode - Optional ISO country code to filter results (e.g., "US", "GB")
   * @param limit - Maximum number of results (default: 5)
   * @returns Array of city search results with place IDs for normalized matching
   * 
   * Architecture 3: Server-side city lookup for shipping matrix standardization
   */
  async searchCities(
    query: string,
    countryCode?: string,
    limit: number = 5
  ): Promise<CitySearchResult[]> {
    if (!this.apiKey) {
      throw new Error("LocationIQ API key not configured");
    }

    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      // LocationIQ search with city-level filtering
      const params = new URLSearchParams({
        key: this.apiKey,
        q: query.trim(),
        format: "json",
        addressdetails: "1",
        limit: (limit * 2).toString(), // Get more results to filter for cities
      });

      if (countryCode) {
        params.append("countrycodes", countryCode.toLowerCase());
      }

      const url = `${this.baseUrl}/search?${params.toString()}`;
      
      logger.debug(`[LocationIQ] City search: ${query}`, { countryCode, limit });

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[LocationIQ] City search API error: ${response.status}`, { error: errorText });
        throw new Error(`LocationIQ API error: ${response.statusText}`);
      }

      const results: LocationIQSearchResult[] = await response.json();

      // Filter for city-level results only (no street addresses)
      const cityResults = results
        .filter(result => {
          const addr = result.address;
          // Must have city/town/village but NOT specific street address
          const hasCity = !!(addr.city || addr.town || addr.village);
          const hasStreetAddress = !!(addr.road || addr.house_number);
          return hasCity && !hasStreetAddress;
        })
        .slice(0, limit)
        .map(result => this.convertToCity(result));

      logger.info(`[LocationIQ] Found ${cityResults.length} city results for: ${query}`);

      return cityResults;

    } catch (error: any) {
      logger.error("[LocationIQ] City search failed:", error);
      throw error;
    }
  }

  async validateAddress(address: Partial<Address>): Promise<Address | null> {
    if (!this.apiKey) {
      throw new Error("LocationIQ API key not configured");
    }

    const parts = [
      address.line1,
      address.city,
      address.state,
      address.postalCode,
      address.countryName || getCountryName(address.country || ""),
    ].filter(Boolean);

    if (parts.length < 3) {
      logger.warn("[LocationIQ] Incomplete address for validation");
      return null;
    }

    const query = parts.join(", ");

    try {
      const results = await this.searchAddress(query, address.country, 1);
      
      if (results.length === 0) {
        logger.warn(`[LocationIQ] No validation results for: ${query}`);
        return null;
      }

      const validated = results[0].address;
      
      if (!validated.line1 || !validated.city || !validated.country) {
        logger.warn("[LocationIQ] Validation result missing required fields");
        return null;
      }

      logger.info(`[LocationIQ] Address validated successfully: ${query}`);

      return {
        ...validated,
        validatedSource: 'locationiq',
        validatedAt: new Date(),
      } as Address;

    } catch (error: any) {
      logger.error("[LocationIQ] Validation failed:", error);
      throw error;
    }
  }

  private convertToAddress(result: LocationIQSearchResult): AddressAutocompleteResult {
    const addr = result.address;
    
    const line1Parts = [addr.house_number, addr.road].filter(Boolean);
    const line1 = line1Parts.join(" ") || addr.suburb || "";

    const city = addr.city || addr.town || addr.village || addr.suburb || "";

    const countryCode = addr.country_code?.toUpperCase() || "";
    const countryName = addr.country || getCountryName(countryCode) || "";

    const address: Partial<Address> = {
      line1,
      city,
      state: addr.state || "",
      postalCode: addr.postcode || "",
      country: countryCode,
      countryName,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };

    return {
      displayName: result.display_name,
      address,
    };
  }

  /**
   * Convert LocationIQ result to city search result
   * Used for shipping zone city selection (no street addresses)
   */
  private convertToCity(result: LocationIQSearchResult): CitySearchResult {
    const addr = result.address;
    
    const city = addr.city || addr.town || addr.village || "";
    const state = addr.state || "";
    const countryCode = addr.country_code?.toUpperCase() || "";
    const countryName = addr.country || getCountryName(countryCode) || "";

    // Generate a stable place ID from coordinates (LocationIQ doesn't provide osm_id consistently)
    // Format: "city:{lat},{lon}" - stable across searches for same location
    const placeId = `city:${parseFloat(result.lat).toFixed(6)},${parseFloat(result.lon).toFixed(6)}`;

    // Build display name: "City, State, Country" or "City, Country"
    const displayParts = [city, state, countryName].filter(Boolean);
    const displayName = displayParts.join(", ");

    return {
      placeId,
      displayName,
      city,
      state,
      country: countryCode,
      countryName,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
  }
}
