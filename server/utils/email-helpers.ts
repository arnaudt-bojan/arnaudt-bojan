/**
 * Email Template Helper Utilities
 * 
 * Server-side helpers for email template generation:
 * - Currency symbol handling
 * - Safe image URL conversion
 * - Safe text handling for optional fields
 */

/**
 * Get currency symbol from currency code using Intl.NumberFormat
 * Server-side version compatible with Node.js
 * 
 * @param currencyCode - ISO 4217 currency code (e.g., "USD", "EUR", "GBP")
 * @returns Currency symbol (e.g., "$", "€", "£") or universal symbol fallback
 */
export function getCurrencySymbol(currencyCode?: string | null): string {
  if (!currencyCode) {
    return '¤'; // Universal currency symbol
  }

  try {
    // Use 'en-US' locale for consistent symbol extraction
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
    console.error(`[EmailHelpers] Invalid currency code: ${currencyCode}`, error);
    return '¤'; // Universal currency symbol fallback
  }
}

/**
 * Format price with currency symbol and amount
 * Server-side version for email templates
 * 
 * @param amount - Numeric amount
 * @param currencyCode - ISO 4217 currency code
 * @returns Formatted price string (e.g., "$25.00", "€25.00")
 */
export function formatEmailPrice(amount: number, currencyCode?: string | null): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Convert relative image URLs to absolute URLs for email compatibility
 * Email clients require full URLs (http:// or https://)
 * 
 * @param url - Image URL (relative or absolute, can be null/undefined)
 * @returns Absolute URL for use in emails, or empty string if no URL provided
 */
export function safeImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Get base URL from environment
  const baseUrl = process.env.REPLIT_DOMAINS 
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
    : `http://localhost:${process.env.PORT || 5000}`;
  
  // Ensure URL starts with /
  const path = url.startsWith('/') ? url : `/${url}`;
  
  return `${baseUrl}${path}`;
}

/**
 * Safe text handler for optional fields
 * Returns empty string instead of "undefined" or "null" in email templates
 * 
 * @param value - Any value that might be null/undefined
 * @returns String value or empty string
 */
export function safeText(value: any): string {
  if (value === null || value === undefined || value === 'undefined' || value === 'null') {
    return '';
  }
  return String(value);
}

/**
 * Safe text with fallback
 * Returns fallback value if primary value is null/undefined
 * 
 * @param value - Primary value
 * @param fallback - Fallback value to use if primary is null/undefined
 * @returns String value or fallback
 */
export function safeTextWithFallback(value: any, fallback: string): string {
  if (value === null || value === undefined || value === 'undefined' || value === 'null' || value === '') {
    return fallback;
  }
  return String(value);
}
