/**
 * Wholesale Cart Validation Service
 * 
 * Consolidates wholesale cart validation logic following CartValidationService architecture
 * Extracts duplicated validation from WholesaleCheckoutService, WholesaleService, WholesalePricingService
 * 
 * Architecture: Service Layer Pattern (Architecture 3) with dependency injection
 * 
 * Key Differences from B2C CartValidationService:
 * - Validates against wholesaleProducts table (not products)
 * - Enforces MOQ requirements (product-level OR variant-level)
 * - Uses wholesale pricing (wholesalePrice field)
 * - Supports variant-level MOQ and pricing overrides
 */

import type { IStorage } from '../storage';
import { logger } from '../logger';

// ============================================================================
// Interfaces
// ============================================================================

export interface WholesaleCartItem {
  productId: string;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
    variantId?: string;
  };
}

export interface ValidatedWholesaleItem {
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  moq: number;
  unitPriceCents: number;
  subtotalCents: number;
  variant?: any;
  matchingVariant?: any; // Full variant object if matched
}

export interface WholesaleCartValidationResult {
  success: boolean;
  valid: boolean;
  errors: string[];
  validatedItems: ValidatedWholesaleItem[];
  subtotalCents: number;
  sellerId: string | null;
}

// ============================================================================
// WholesaleCartValidationService
// ============================================================================

export class WholesaleCartValidationService {
  constructor(private storage: IStorage) {}

  /**
   * Validate wholesale cart items
   * 
   * Validates:
   * 1. Products exist in wholesaleProducts table
   * 2. All products belong to same seller
   * 3. Quantities meet MOQ requirements (product-level OR variant-level)
   * 4. Variants exist if specified (with variantId support)
   * 5. Calculates pricing using wholesale prices (product-level OR variant-level)
   * 
   * @param cartItems - Array of cart items to validate
   * @param sellerId - Optional seller constraint (if provided, validates all items belong to this seller)
   */
  async validateCart(
    cartItems: WholesaleCartItem[],
    sellerId?: string
  ): Promise<WholesaleCartValidationResult> {
    try {
      const errors: string[] = [];
      const validatedItems: ValidatedWholesaleItem[] = [];
      let detectedSellerId: string | null = null;
      let subtotalCents = 0;

      // Validate each cart item
      for (const item of cartItems) {
        // Validate quantity is positive integer
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          errors.push(`Invalid quantity ${item.quantity} for product ${item.productId}. Must be a positive integer.`);
          continue;
        }

        // Fetch wholesale product from database
        const product = await this.storage.getWholesaleProduct(item.productId);

        if (!product) {
          errors.push(`Product ${item.productId} not found`);
          continue;
        }

        // Validate seller constraint
        if (detectedSellerId === null) {
          detectedSellerId = product.sellerId;
        } else if (detectedSellerId !== product.sellerId) {
          errors.push('Cannot have products from different sellers in the same cart');
          return {
            success: true,
            valid: false,
            errors,
            validatedItems: [],
            subtotalCents: 0,
            sellerId: null,
          };
        }

        // If sellerId provided, validate product belongs to seller
        if (sellerId && product.sellerId !== sellerId) {
          errors.push(`Product ${product.name} belongs to different seller`);
          continue;
        }

        // Validate item with MOQ and pricing
        const itemValidation = this.validateItemWithMOQ(item, product);

        if (!itemValidation.valid) {
          errors.push(...itemValidation.errors);
          continue;
        }

        // Add validated item
        validatedItems.push(itemValidation.validatedItem!);
        subtotalCents += itemValidation.validatedItem!.subtotalCents;
      }

      // Return validation result
      if (errors.length > 0) {
        return {
          success: true,
          valid: false,
          errors,
          validatedItems: [],
          subtotalCents: 0,
          sellerId: null,
        };
      }

      return {
        success: true,
        valid: true,
        errors: [],
        validatedItems,
        subtotalCents,
        sellerId: detectedSellerId,
      };
    } catch (error: any) {
      logger.error('[WholesaleCartValidationService] Cart validation failed', error);
      return {
        success: false,
        valid: false,
        errors: [error.message || 'Cart validation failed'],
        validatedItems: [],
        subtotalCents: 0,
        sellerId: null,
      };
    }
  }

  /**
   * Validate single cart item with MOQ requirements
   * 
   * Handles:
   * - Variant matching (variantId OR size/color matching)
   * - MOQ validation (product-level OR variant-level)
   * - Price calculation (product-level OR variant-level wholesale prices)
   */
  private validateItemWithMOQ(
    item: WholesaleCartItem,
    product: any
  ): {
    valid: boolean;
    errors: string[];
    validatedItem?: ValidatedWholesaleItem;
  } {
    const errors: string[] = [];

    // Default to product-level MOQ and price
    let moq = product.moq;
    let unitPriceCents = Math.round(parseFloat(product.wholesalePrice) * 100);
    let matchingVariant: any = null;

    // Variant validation if specified
    if (item.variant && product.variants) {
      const variants = Array.isArray(product.variants) ? product.variants : [];

      // Try to match by variantId first (most specific)
      if (item.variant.variantId) {
        matchingVariant = variants.find((v: any) => v.variantId === item.variant?.variantId);
      }

      // Fallback to size/color matching if variantId not found
      if (!matchingVariant && (item.variant.size || item.variant.color)) {
        matchingVariant = variants.find(
          (v: any) => v.size === item.variant?.size && v.color === item.variant?.color
        );
      }

      if (matchingVariant) {
        // Use variant-level MOQ and price if available
        moq = matchingVariant.moq || moq;
        if (matchingVariant.wholesalePrice) {
          unitPriceCents = Math.round(parseFloat(matchingVariant.wholesalePrice) * 100);
        }
      } else if (item.variant.size || item.variant.color || item.variant.variantId) {
        // Variant specified but not found in product
        const variantDesc = item.variant.variantId
          ? `variantId: ${item.variant.variantId}`
          : `${item.variant.size || 'any size'}/${item.variant.color || 'any color'}`;
        errors.push(`${product.name}: variant (${variantDesc}) not found`);
        return { valid: false, errors };
      }
    }

    // Validate MOQ requirement
    if (item.quantity < moq) {
      const variantInfo = matchingVariant
        ? ` (variant: ${matchingVariant.variantId || `${matchingVariant.size}/${matchingVariant.color}`})`
        : '';
      errors.push(`${product.name}${variantInfo}: quantity ${item.quantity} is below MOQ of ${moq}`);
      return { valid: false, errors };
    }

    // Calculate item subtotal
    const itemSubtotal = unitPriceCents * item.quantity;

    // Return validated item
    return {
      valid: true,
      errors: [],
      validatedItem: {
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        quantity: item.quantity,
        moq,
        unitPriceCents,
        subtotalCents: itemSubtotal,
        variant: item.variant,
        matchingVariant,
      },
    };
  }

  /**
   * Validate single product for adding to cart
   * Convenience method for quick validation before cart operations
   */
  async validateProduct(
    productId: string,
    quantity: number,
    variant?: any
  ): Promise<{
    valid: boolean;
    product?: any;
    error?: string;
    moqError?: string;
  }> {
    try {
      // Validate quantity
      if (!Number.isInteger(quantity) || quantity < 1) {
        return { valid: false, error: 'Quantity must be a positive integer' };
      }

      // Fetch product
      const product = await this.storage.getWholesaleProduct(productId);
      if (!product) {
        return { valid: false, error: 'Product not found' };
      }

      // Validate with MOQ
      const itemValidation = this.validateItemWithMOQ(
        { productId, quantity, variant },
        product
      );

      if (!itemValidation.valid) {
        const moqError = itemValidation.errors.find(e => e.includes('MOQ'));
        return {
          valid: false,
          product,
          error: itemValidation.errors.join('; '),
          moqError,
        };
      }

      return { valid: true, product };
    } catch (error: any) {
      logger.error('[WholesaleCartValidationService] Product validation failed', error);
      return {
        valid: false,
        error: error.message || 'Product validation failed',
      };
    }
  }
}
