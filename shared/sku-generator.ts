/**
 * SKU Generation Utility
 * Generates unique SKU codes for products and variants
 */

/**
 * Generate a short random alphanumeric string
 * Format: Uppercase letters and numbers only (e.g., "A1B2C3")
 */
function generateShortId(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a product SKU
 * - If user provides SKU, use it (uppercase and trim)
 * - If not provided, auto-generate: PROD-{6-char-random}
 * Example: "PROD-A1B2C3"
 */
export function generateProductSKU(userProvidedSKU?: string | null): string {
  if (userProvidedSKU && userProvidedSKU.trim()) {
    // Use user-provided SKU (uppercase, trim spaces)
    return userProvidedSKU.trim().toUpperCase();
  }
  
  // Auto-generate short SKU
  return `PROD-${generateShortId(6)}`;
}

/**
 * Generate a variant SKU based on product SKU and variant attributes
 * Format: {productSKU}-{color}-{size}
 * Examples:
 * - "PROD-A1B2C3-RED-L"
 * - "PROD-A1B2C3-BLUE-M"
 * - "MYSHIRT-BLACK-XL" (if user provided custom SKU "MYSHIRT")
 */
export function generateVariantSKU(
  productSKU: string,
  variantAttributes: {
    color?: string;
    size?: string;
  }
): string {
  const parts = [productSKU];
  
  if (variantAttributes.color) {
    // Clean and uppercase color name
    const cleanColor = variantAttributes.color
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-'); // Replace spaces with dashes
    parts.push(cleanColor);
  }
  
  if (variantAttributes.size) {
    // Clean and uppercase size
    const cleanSize = variantAttributes.size
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-'); // Replace spaces with dashes
    parts.push(cleanSize);
  }
  
  return parts.join('-');
}

/**
 * Validate SKU format
 * - Must not be empty
 * - Must not exceed 50 characters
 * - Only alphanumeric characters and dashes allowed
 */
export function validateSKU(sku: string): { valid: boolean; error?: string } {
  if (!sku || sku.trim() === '') {
    return { valid: false, error: 'SKU cannot be empty' };
  }
  
  if (sku.length > 50) {
    return { valid: false, error: 'SKU must be 50 characters or less' };
  }
  
  const validPattern = /^[A-Z0-9-]+$/;
  if (!validPattern.test(sku.toUpperCase())) {
    return { valid: false, error: 'SKU can only contain letters, numbers, and dashes' };
  }
  
  return { valid: true };
}
