/**
 * Calculate total stock from product variants
 * This ensures product.stock stays synchronized with variant stock
 */
export function calculateTotalStockFromVariants(variants: any[] | null | undefined): number {
  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    return 0;
  }

  let totalStock = 0;

  for (const variant of variants) {
    // Handle color-size variant structure
    if (variant.sizes && Array.isArray(variant.sizes)) {
      for (const size of variant.sizes) {
        totalStock += size.stock || 0;
      }
    }
    // Handle simple size-only variant structure
    else if (variant.stock !== undefined) {
      totalStock += variant.stock || 0;
    }
  }

  return totalStock;
}

/**
 * Recalculate and sync product.stock from variants if variants exist
 * Returns the original product data with updated stock if variants present
 */
export function syncProductStockFromVariants(productData: any): any {
  if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
    const calculatedStock = calculateTotalStockFromVariants(productData.variants);
    return {
      ...productData,
      stock: calculatedStock,
    };
  }
  return productData;
}
