/**
 * Continent Mapping for Shipping Zones
 * 
 * Maps ISO 3166-1 alpha-2 country codes to standardized continent identifiers
 * Used for shipping matrix matching (seller: "Europe" → buyer: "GB" → continent: "europe")
 * 
 * Architecture 3: Server-side static lookup, no API calls required
 */

export type ContinentCode = 
  | 'africa'
  | 'asia'
  | 'europe'
  | 'north-america'
  | 'south-america'
  | 'oceania'
  | 'antarctica';

export interface Continent {
  code: ContinentCode;
  name: string;
  displayName: string;
}

/**
 * Standardized list of continents for shipping zones
 */
export const CONTINENTS: Continent[] = [
  { code: 'africa', name: 'Africa', displayName: 'Africa' },
  { code: 'asia', name: 'Asia', displayName: 'Asia' },
  { code: 'europe', name: 'Europe', displayName: 'Europe' },
  { code: 'north-america', name: 'North America', displayName: 'North America' },
  { code: 'south-america', name: 'South America', displayName: 'South America' },
  { code: 'oceania', name: 'Oceania', displayName: 'Oceania' },
  { code: 'antarctica', name: 'Antarctica', displayName: 'Antarctica' },
];

/**
 * Country ISO code → Continent code mapping
 * Covers all 60 supported countries from shared/countries.ts
 */
export const COUNTRY_TO_CONTINENT: Record<string, ContinentCode> = {
  // Europe (30 countries)
  'AT': 'europe', // Austria
  'BE': 'europe', // Belgium
  'BG': 'europe', // Bulgaria
  'HR': 'europe', // Croatia
  'CY': 'europe', // Cyprus
  'CZ': 'europe', // Czech Republic
  'DK': 'europe', // Denmark
  'EE': 'europe', // Estonia
  'FI': 'europe', // Finland
  'FR': 'europe', // France
  'DE': 'europe', // Germany
  'GR': 'europe', // Greece
  'HU': 'europe', // Hungary
  'IE': 'europe', // Ireland
  'IT': 'europe', // Italy
  'LV': 'europe', // Latvia
  'LT': 'europe', // Lithuania
  'LU': 'europe', // Luxembourg
  'MT': 'europe', // Malta
  'NL': 'europe', // Netherlands
  'PL': 'europe', // Poland
  'PT': 'europe', // Portugal
  'RO': 'europe', // Romania
  'SK': 'europe', // Slovakia
  'SI': 'europe', // Slovenia
  'ES': 'europe', // Spain
  'SE': 'europe', // Sweden
  'GB': 'europe', // United Kingdom
  'NO': 'europe', // Norway
  'CH': 'europe', // Switzerland
  
  // North America (3 countries)
  'CA': 'north-america', // Canada
  'MX': 'north-america', // Mexico
  'US': 'north-america', // United States
  
  // Asia (14 countries)
  'CN': 'asia', // China
  'HK': 'asia', // Hong Kong
  'IN': 'asia', // India
  'ID': 'asia', // Indonesia
  'IL': 'asia', // Israel
  'JP': 'asia', // Japan
  'MY': 'asia', // Malaysia
  'PH': 'asia', // Philippines
  'SG': 'asia', // Singapore
  'KR': 'asia', // South Korea
  'TW': 'asia', // Taiwan
  'TH': 'asia', // Thailand
  'TR': 'asia', // Turkey
  'VN': 'asia', // Vietnam
  
  // Oceania (2 countries)
  'AU': 'oceania', // Australia
  'NZ': 'oceania', // New Zealand
  
  // South America (4 countries)
  'AR': 'south-america', // Argentina
  'BR': 'south-america', // Brazil
  'CL': 'south-america', // Chile
  'CO': 'south-america', // Colombia
  
  // Africa (7 countries)
  'EG': 'africa', // Egypt
  'KE': 'africa', // Kenya
  'MA': 'africa', // Morocco
  'NG': 'africa', // Nigeria
  'ZA': 'africa', // South Africa
  'TZ': 'africa', // Tanzania
  'UG': 'africa', // Uganda
};

/**
 * Get continent code from country ISO code
 * 
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "US", "GB")
 * @returns Continent code or null if country not found
 * 
 * @example
 * getContinentFromCountry("US") // Returns "north-america"
 * getContinentFromCountry("GB") // Returns "europe"
 * getContinentFromCountry("ZZ") // Returns null
 */
export function getContinentFromCountry(countryCode: string): ContinentCode | null {
  return COUNTRY_TO_CONTINENT[countryCode.toUpperCase()] || null;
}

/**
 * Get continent display name from country ISO code
 * 
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Continent display name or null if not found
 */
export function getContinentNameFromCountry(countryCode: string): string | null {
  const continentCode = getContinentFromCountry(countryCode);
  if (!continentCode) return null;
  
  const continent = CONTINENTS.find(c => c.code === continentCode);
  return continent ? continent.displayName : null;
}

/**
 * Get continent details from continent code
 * 
 * @param code - Continent code (e.g., "europe", "asia")
 * @returns Continent details or null if not found
 */
export function getContinentByCode(code: string): Continent | null {
  return CONTINENTS.find(c => c.code === code.toLowerCase()) || null;
}

/**
 * Validate if a continent code is valid
 * 
 * @param code - Continent code to validate
 * @returns True if valid, false otherwise
 */
export function isValidContinentCode(code: string): boolean {
  return CONTINENTS.some(c => c.code === code.toLowerCase());
}
