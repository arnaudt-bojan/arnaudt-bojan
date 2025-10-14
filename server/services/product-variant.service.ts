/**
 * Product Variant Service
 * 
 * Centralized validation and logic for product variants
 * Architecture 3: All variant validation happens on the backend
 */

import { Product } from "@shared/schema";
import { logger } from "../logger";

// Variant type definitions
export interface SizeVariant {
  size: string;
  stock: number;
  sku?: string;
}

export interface ColorVariant {
  colorName: string;
  colorHex: string;
  images: string[];
  sizes: { size: string; stock: number; sku?: string }[];
}

export interface VariantValidationResult {
  valid: boolean;
  error?: string;
  variantData?: {
    size?: string;
    color?: string;
    stock: number;
  };
}

export interface VariantRequirement {
  requiresVariantSelection: boolean;
  variantType: 'none' | 'size-only' | 'color-size';
  availableColors?: string[];
  availableSizes?: string[];
}

export class ProductVariantService {
  /**
   * Check if a product has variants
   */
  productHasVariants(product: Product): boolean {
    if (!product.variants || product.variants === null) {
      return false;
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];
    return variants.length > 0;
  }

  /**
   * Get variant requirements for a product
   */
  getVariantRequirements(product: Product): VariantRequirement {
    if (!this.productHasVariants(product)) {
      return {
        requiresVariantSelection: false,
        variantType: 'none',
      };
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const hasColors = product.hasColors === 1;

    if (hasColors) {
      // Color-based variants (new format)
      const colorVariants = variants as ColorVariant[];
      const availableColors = colorVariants.map(cv => cv.colorName);
      const allSizes = new Set<string>();
      
      colorVariants.forEach(cv => {
        cv.sizes?.forEach(s => allSizes.add(s.size));
      });

      return {
        requiresVariantSelection: true,
        variantType: 'color-size',
        availableColors,
        availableSizes: Array.from(allSizes),
      };
    } else {
      // Size-only variants (old format)
      const sizeVariants = variants as SizeVariant[];
      const availableSizes = sizeVariants.map(sv => sv.size);

      return {
        requiresVariantSelection: true,
        variantType: 'size-only',
        availableSizes,
      };
    }
  }

  /**
   * Validate variant selection for a product
   * 
   * @param product - The product to validate against
   * @param variantSelection - The selected variant (size and/or color)
   * @returns Validation result with error or variant data
   */
  validateVariantSelection(
    product: Product,
    variantSelection?: { size?: string; color?: string }
  ): VariantValidationResult {
    const requirements = this.getVariantRequirements(product);

    // If product doesn't require variants, selection is valid (even if provided)
    if (!requirements.requiresVariantSelection) {
      return { valid: true };
    }

    // Product requires variants but none provided
    if (!variantSelection) {
      return {
        valid: false,
        error: `This product requires variant selection. Please select ${
          requirements.variantType === 'color-size' ? 'a color and size' : 'a size'
        }.`,
      };
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];

    if (requirements.variantType === 'color-size') {
      // Color-size validation
      if (!variantSelection.color || !variantSelection.size) {
        return {
          valid: false,
          error: 'Both color and size must be selected for this product.',
        };
      }

      const colorVariants = variants as ColorVariant[];
      const colorVariant = colorVariants.find(
        cv => cv.colorName.toLowerCase() === variantSelection.color!.toLowerCase()
      );

      if (!colorVariant) {
        return {
          valid: false,
          error: `Color "${variantSelection.color}" is not available for this product.`,
        };
      }

      const sizeVariant = colorVariant.sizes?.find(
        s => s.size.toLowerCase() === variantSelection.size!.toLowerCase()
      );

      if (!sizeVariant) {
        return {
          valid: false,
          error: `Size "${variantSelection.size}" is not available for color "${variantSelection.color}".`,
        };
      }

      // For in-stock products, check stock availability
      if (product.productType === 'in-stock' && sizeVariant.stock <= 0) {
        return {
          valid: false,
          error: `The selected variant (${variantSelection.color}/${variantSelection.size}) is out of stock.`,
        };
      }

      return {
        valid: true,
        variantData: {
          color: variantSelection.color,
          size: variantSelection.size,
          stock: sizeVariant.stock,
        },
      };
    } else {
      // Size-only validation
      if (!variantSelection.size) {
        return {
          valid: false,
          error: 'Size must be selected for this product.',
        };
      }

      const sizeVariants = variants as SizeVariant[];
      const sizeVariant = sizeVariants.find(
        sv => sv.size.toLowerCase() === variantSelection.size!.toLowerCase()
      );

      if (!sizeVariant) {
        return {
          valid: false,
          error: `Size "${variantSelection.size}" is not available for this product.`,
        };
      }

      // For in-stock products, check stock availability
      if (product.productType === 'in-stock' && sizeVariant.stock <= 0) {
        return {
          valid: false,
          error: `The selected size (${variantSelection.size}) is out of stock.`,
        };
      }

      return {
        valid: true,
        variantData: {
          size: variantSelection.size,
          stock: sizeVariant.stock,
        },
      };
    }
  }

  /**
   * Construct variant ID from selection (format: "size-color" or "size")
   */
  constructVariantId(variantSelection?: { size?: string; color?: string }): string | undefined {
    if (!variantSelection) {
      return undefined;
    }

    const parts: string[] = [];
    
    if (variantSelection.size) {
      parts.push(variantSelection.size);
    }
    
    if (variantSelection.color) {
      parts.push(variantSelection.color);
    }

    return parts.length > 0 ? parts.join('-').toLowerCase() : undefined;
  }

  /**
   * Get variant stock for in-stock products
   */
  getVariantStock(
    product: Product,
    variantSelection: { size?: string; color?: string }
  ): number {
    if (!this.productHasVariants(product)) {
      return product.stock || 0;
    }

    const validation = this.validateVariantSelection(product, variantSelection);
    if (!validation.valid || !validation.variantData) {
      return 0;
    }

    return validation.variantData.stock;
  }

  /**
   * Log variant validation for debugging
   */
  logVariantValidation(
    productId: string,
    productName: string,
    variantSelection: { size?: string; color?: string } | undefined,
    result: VariantValidationResult
  ): void {
    logger.info('[VariantValidation]', {
      productId,
      productName,
      variantSelection,
      valid: result.valid,
      error: result.error,
      variantData: result.variantData,
    });
  }
}

// Singleton instance
export const productVariantService = new ProductVariantService();
