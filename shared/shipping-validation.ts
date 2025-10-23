/**
 * Shared shipping validation configuration
 * Used by both frontend and backend to ensure consistency
 */

/**
 * Countries that require state/province field
 * Normalized to uppercase for case-insensitive matching
 */
export const COUNTRIES_REQUIRING_STATE = new Set([
  // United States
  'UNITED STATES',
  'USA',
  'US',
  
  // Canada
  'CANADA',
  'CA',
  
  // Australia
  'AUSTRALIA',
  'AU',
  
  // Mexico
  'MEXICO',
  'MX',
  
  // Brazil
  'BRAZIL',
  'BR',
  
  // India
  'INDIA',
  'IN',
]);

/**
 * Normalize country input for consistent validation
 * @param country - Raw country input from user
 * @returns Normalized country string (trimmed & uppercased)
 */
export function normalizeCountry(country: string): string {
  return country.trim().toUpperCase();
}

/**
 * Check if a country requires state/province
 * @param country - Raw country input from user
 * @returns True if state/province is required
 */
export function requiresState(country: string): boolean {
  const normalized = normalizeCountry(country);
  return COUNTRIES_REQUIRING_STATE.has(normalized);
}

/**
 * Validate if state value is non-empty (not just whitespace)
 * @param state - State/province input from user
 * @returns True if state is valid (non-empty after trimming)
 */
export function isValidState(state: string | undefined): boolean {
  if (!state) return false;
  const trimmed = state.trim();
  return trimmed.length >= 2 && /[a-zA-Z0-9]/.test(trimmed);
}
