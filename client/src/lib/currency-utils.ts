/**
 * Format price with currency using Intl.NumberFormat
 * This properly formats any currency without hardcoded symbols
 */
export function formatPrice(amount: number, currencyCode?: string | null): string {
  if (!currencyCode) {
    // Fallback to USD if no currency provided
    currencyCode = 'USD';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // If currency code is invalid, fallback to showing amount with generic symbol
    console.error(`Invalid currency code: ${currencyCode}`, error);
    return `¤${amount.toFixed(2)}`;
  }
}

/**
 * Get currency symbol from currency code using Intl.NumberFormat
 * Returns the symbol for the given currency or fallback symbol
 */
export function getCurrencySymbol(currencyCode?: string | null): string {
  if (!currencyCode) {
    return '¤'; // Universal currency symbol
  }

  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);

    // Extract the symbol by removing the numeric part
    const symbol = formatted.replace(/[\d,.\s]/g, '').trim();
    return symbol || '¤';
  } catch (error) {
    console.error(`Invalid currency code: ${currencyCode}`, error);
    return '¤'; // Universal currency symbol fallback
  }
}
