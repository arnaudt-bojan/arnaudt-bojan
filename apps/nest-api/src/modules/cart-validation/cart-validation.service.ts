import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import {
  CartItemValidation,
  StockAvailability,
  MOQValidation,
  CartValidation,
  WholesaleCartValidation,
} from './interfaces/cart-validation.interface';

@Injectable()
export class CartValidationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check stock availability for a product or variant
   */
  async checkStockAvailability(
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<StockAvailability> {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new GraphQLError('Product not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    let currentStock = 0;

    if (variantId && product.variants) {
      // Extract stock from variant JSON structure
      const variants = product.variants as any[];
      let variantFound = false;

      for (const colorGroup of variants) {
        if (colorGroup.sizes && Array.isArray(colorGroup.sizes)) {
          for (const sizeItem of colorGroup.sizes) {
            const colorName = colorGroup.colorName || '';
            const constructedId = `${sizeItem.size}-${colorName}`.toLowerCase();
            
            if (constructedId === variantId) {
              currentStock = sizeItem.stock || 0;
              variantFound = true;
              break;
            }
          }
        }
        if (variantFound) break;
      }

      if (!variantFound) {
        throw new GraphQLError('Variant not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
    } else {
      currentStock = product.stock || 0;
    }

    const available = currentStock >= quantity;
    const availableQuantity = Math.min(currentStock, quantity);

    return {
      available,
      currentStock,
      requestedQuantity: quantity,
      availableQuantity,
    };
  }

  /**
   * Validate minimum order quantity for a product
   */
  async validateMinimumOrderQuantity(
    productId: string,
    quantity: number,
  ): Promise<MOQValidation> {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new GraphQLError('Product not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Default to 1 if MOQ field doesn't exist in schema yet
    const minimumQuantity = (product as any).minimum_order_quantity || 1;
    const met = quantity >= minimumQuantity;
    const remaining = met ? 0 : minimumQuantity - quantity;

    return {
      met,
      minimumQuantity,
      currentQuantity: quantity,
      remaining,
    };
  }

  /**
   * Validate a single cart item
   */
  async validateCartItem(
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<CartItemValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate quantity range
    if (quantity < 1 || quantity > 10000) {
      errors.push('Quantity must be between 1 and 10000');
      return {
        valid: false,
        errors,
        warnings,
        stockAvailable: false,
        moqMet: false,
      };
    }

    // Check if product exists and is active
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      errors.push('Product not found');
      return {
        valid: false,
        errors,
        warnings,
        stockAvailable: false,
        moqMet: false,
      };
    }

    if (product.status !== 'active') {
      errors.push('Product is not available for purchase');
    }

    // Check if variant exists (if provided)
    if (variantId && product.variants) {
      const variants = product.variants as any[];
      let variantFound = false;

      for (const colorGroup of variants) {
        if (colorGroup.sizes && Array.isArray(colorGroup.sizes)) {
          for (const sizeItem of colorGroup.sizes) {
            const colorName = colorGroup.colorName || '';
            const constructedId = `${sizeItem.size}-${colorName}`.toLowerCase();
            
            if (constructedId === variantId) {
              variantFound = true;
              break;
            }
          }
        }
        if (variantFound) break;
      }

      if (!variantFound) {
        errors.push('Selected variant does not exist');
      }
    }

    // Check stock availability
    let stockAvailability: StockAvailability;
    try {
      stockAvailability = await this.checkStockAvailability(
        productId,
        variantId,
        quantity,
      );

      if (!stockAvailability.available) {
        errors.push(
          `Insufficient stock. Available: ${stockAvailability.currentStock}, Requested: ${quantity}`,
        );
      }
    } catch (error) {
      if (error instanceof GraphQLError && error.extensions.code === 'NOT_FOUND') {
        // Already handled variant not found above
        stockAvailability = {
          available: false,
          currentStock: 0,
          requestedQuantity: quantity,
          availableQuantity: 0,
        };
      } else {
        throw error;
      }
    }

    // Check MOQ
    const moqValidation = await this.validateMinimumOrderQuantity(
      productId,
      quantity,
    );

    if (!moqValidation.met) {
      errors.push(
        `Minimum order quantity not met. Minimum: ${moqValidation.minimumQuantity}, Current: ${quantity}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stockAvailable: stockAvailability.available,
      moqMet: moqValidation.met,
    };
  }

  /**
   * Validate entire cart
   */
  async validateCart(cartId: string): Promise<CartValidation> {
    const cart = await this.prisma.carts.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new GraphQLError('Cart not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const cartItems = (cart.items as any[]) || [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const items: CartItemValidation[] = [];

    for (const item of cartItems) {
      try {
        const validation = await this.validateCartItem(
          item.product_id,
          item.variant_id || null,
          item.quantity,
        );

        items.push(validation);
        
        // Add item-specific context to errors
        validation.errors.forEach(error => {
          errors.push(`${item.name}: ${error}`);
        });
        
        validation.warnings.forEach(warning => {
          warnings.push(`${item.name}: ${warning}`);
        });
      } catch (error) {
        // Handle validation errors gracefully
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${item.name}: ${errorMessage}`);
        
        items.push({
          valid: false,
          errors: [errorMessage],
          warnings: [],
          stockAvailable: false,
          moqMet: false,
        });
      }
    }

    const allItemsInStock = items.every(item => item.stockAvailable);
    const allMOQsMet = items.every(item => item.moqMet);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      items,
      totalItems: cartItems.length,
      allItemsInStock,
      allMOQsMet,
    };
  }

  /**
   * Validate wholesale cart with additional wholesale rules
   */
  async validateWholesaleCart(cartId: string): Promise<WholesaleCartValidation> {
    const baseValidation = await this.validateCart(cartId);

    const cart = await this.prisma.carts.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new GraphQLError('Cart not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const cartItems = (cart.items as any[]) || [];

    // Calculate order value using variant pricing when applicable
    const currentOrderValue = await this.calculateCartValue(cartItems);

    // Get wholesale rules (these should come from settings/config in production)
    const minimumOrderValue = 1000;
    const depositPercent = 30;

    const wholesaleRulesMet = currentOrderValue >= minimumOrderValue;
    const depositRequired = (currentOrderValue * depositPercent) / 100;

    if (!wholesaleRulesMet) {
      baseValidation.errors.push(
        `Minimum wholesale order value not met. Minimum: $${minimumOrderValue.toFixed(2)}, Current: $${currentOrderValue.toFixed(2)}`,
      );
    }

    return {
      ...baseValidation,
      valid: baseValidation.errors.length === 0,
      wholesaleRulesMet,
      depositRequired,
      minimumOrderValue,
      currentOrderValue,
    };
  }

  /**
   * Calculate cart value using variant pricing when applicable
   */
  private async calculateCartValue(cartItems: any[]): Promise<number> {
    let total = 0;

    for (const item of cartItems) {
      let price = parseFloat(item.price || '0');

      // If item has a variant, fetch product to check for variant-specific pricing
      if (item.variant_id && item.product_id) {
        try {
          const product = await this.prisma.products.findUnique({
            where: { id: item.product_id },
            select: { variants: true },
          });

          if (product && product.variants) {
            const variants = product.variants as any[];
            for (const colorGroup of variants) {
              if (colorGroup.sizes && Array.isArray(colorGroup.sizes)) {
                for (const sizeItem of colorGroup.sizes) {
                  const colorName = colorGroup.colorName || '';
                  const constructedId = `${sizeItem.size}-${colorName}`.toLowerCase();
                  
                  if (constructedId === item.variant_id) {
                    // Use variant price if available
                    if (sizeItem.price !== undefined && sizeItem.price !== null) {
                      price = parseFloat(String(sizeItem.price));
                    }
                    break;
                  }
                }
              }
            }
          }
        } catch (error) {
          // If variant lookup fails, use item price
          console.warn(`Failed to fetch variant price for item ${item.product_id}:`, error);
        }
      }

      total += price * item.quantity;
    }

    return total;
  }
}
