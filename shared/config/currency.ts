/**
 * Currency Configuration
 * 
 * This is the ONLY file where currency literals are allowed.
 * All other code must import from here.
 * 
 * ESLint will enforce this rule - any hard-coded currency literal
 * outside this file will cause CI to fail.
 */

export const DEFAULT_CURRENCY = 'USD' as const;

export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
] as const;

export type Currency = typeof SUPPORTED_CURRENCIES[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  CHF: 'CHF',
};

export const CURRENCY_DECIMAL_PLACES: Record<Currency, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0, // Zero-decimal currency
  CHF: 2,
};

export function isSupportedCurrency(currency: string): currency is Currency {
  return SUPPORTED_CURRENCIES.includes(currency as Currency);
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function getCurrencyDecimalPlaces(currency: Currency): number {
  return CURRENCY_DECIMAL_PLACES[currency] || 2;
}

export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = getCurrencySymbol(currency);
  const decimals = getCurrencyDecimalPlaces(currency);
  const formatted = amount.toFixed(decimals);
  
  return `${symbol}${formatted}`;
}

/**
 * Empty/default totals object for cart and checkout
 * Use this as the single source of truth for empty state totals
 */
export const EMPTY_TOTALS = {
  subtotal: '0',
  tax: '0',
  total: '0',
  currency: DEFAULT_CURRENCY,
} as const;

/**
 * Empty/default wholesale totals (includes shipping)
 */
export const EMPTY_WHOLESALE_TOTALS = {
  subtotal: '0',
  tax: '0',
  shipping: '0',
  total: '0',
  currency: DEFAULT_CURRENCY,
} as const;
