// Currency symbol mapping
const currencySymbols: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  // Add more as needed
};

/**
 * Get currency symbol from currency code
 * Returns universal currency symbol (¤) if currency not found or not connected
 */
export function getCurrencySymbol(currencyCode?: string | null): string {
  if (!currencyCode) {
    return '¤'; // Universal currency symbol
  }
  return currencySymbols[currencyCode.toUpperCase()] || '¤';
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currencyCode?: string | null): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
}
