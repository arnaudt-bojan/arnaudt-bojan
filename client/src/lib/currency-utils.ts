/**
 * Format price with currency using Intl.NumberFormat
 * This properly formats any currency without hardcoded symbols or decimal places
 * Uses browser's default locale and respects currency-specific decimal conventions
 */
export function formatPrice(amount: number, currencyCode?: string | null): string {
  try {
    if (!currencyCode) {
      // Use XXX (no currency) code for locale-aware formatting with universal symbol
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'XXX',
        currencyDisplay: 'symbol',
      }).format(amount);
    }

    // Use browser's default locale and let Intl choose proper fraction digits for the currency
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
    }).format(amount);
  } catch (error) {
    // If currency code is invalid, fallback to XXX with locale-aware formatting
    console.error(`Invalid currency code: ${currencyCode}`, error);
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'XXX',
        currencyDisplay: 'symbol',
      }).format(amount);
    } catch {
      // Last resort: plain number with universal symbol
      return `¤${amount}`;
    }
  }
}

/**
 * Get currency symbol from currency code using Intl.NumberFormat
 * Returns the symbol for the given currency or fallback symbol
 * Uses browser's default locale for proper symbol extraction
 */
export function getCurrencySymbol(currencyCode?: string | null): string {
  if (!currencyCode) {
    return '¤'; // Universal currency symbol
  }

  try {
    // Use browser's default locale for proper currency symbol
    const formatted = new Intl.NumberFormat(undefined, {
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
