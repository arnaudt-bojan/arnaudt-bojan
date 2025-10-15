/**
 * Cart Service
 * 
 * Backend cart management with storage persistence
 * - Session-based cart storage (guest and authenticated users)
 * - Single-seller cart constraint enforcement
 * - Guest→Auth migration support
 */

import type { IStorage } from "../storage";
import type { Product, Cart as StorageCart } from "@shared/schema";
import { logger } from "../logger";

export interface CartItem {
  id: string;
  name: string;
  price: string; // Discounted price (if applicable)
  originalPrice?: string; // Price before discount
  discountPercentage?: string; // Discount percentage (e.g., "15.00" for 15%)
  discountAmount?: string; // Dollar amount saved
  quantity: number;
  productType: string;
  depositAmount?: string;
  requiresDeposit?: number;
  sellerId: string;
  images?: string[];
  promotionActive?: number;
  variantId?: string;
  variant?: {
    size?: string;
    color?: string;
  };
  productSku?: string; // Product-level SKU
  variantSku?: string; // Variant-specific SKU (if applicable)
}

export interface Cart {
  items: CartItem[];
  sellerId: string | null;
  total: number;
  itemsCount: number;
}

export class CartService {
  constructor(private storage: IStorage) {}

  /**
   * Get cart by session ID
   */
  async getCart(sessionId: string): Promise<Cart> {
    try {
      const storageCart = await this.storage.getCartBySession(sessionId);
      
      if (!storageCart) {
        return this.createEmptyCart();
      }

      // Convert storage cart to service cart format
      const items = (storageCart.items as CartItem[]) || [];
      
      // CRITICAL FIX: Filter out deleted products to prevent 404 errors
      const validItems: CartItem[] = [];
      let hasInvalidItems = false;
      
      for (const item of items) {
        const product = await this.storage.getProduct(item.id);
        if (product) {
          validItems.push(item);
        } else {
          hasInvalidItems = true;
          logger.warn("[CartService] Removed deleted product from cart", { 
            productId: item.id, 
            productName: item.name,
            sessionId 
          });
        }
      }
      
      const cart: Cart = {
        items: validItems,
        sellerId: validItems.length > 0 ? storageCart.sellerId : null,
        total: 0,
        itemsCount: 0,
      };

      this.recalculateCart(cart);
      
      // Update storage if we removed invalid items
      if (hasInvalidItems && validItems.length >= 0) {
        await this.storage.saveCart(
          sessionId,
          cart.sellerId || '',
          cart.items,
          undefined
        );
      }
      
      return cart;
    } catch (error: any) {
      logger.error("[CartService] Error getting cart", error, { sessionId });
      return this.createEmptyCart();
    }
  }

  /**
   * Add item to cart with seller validation
   */
  async addToCart(
    sessionId: string,
    productId: string,
    quantity: number = 1,
    variantId?: string,
    userId?: string
  ): Promise<{ success: boolean; cart?: Cart; error?: string }> {
    try {
      // Fetch product
      const product = await this.storage.getProduct(productId);
      if (!product) {
        return { success: false, error: "Product not found" };
      }

      // Get current cart
      const currentCart = await this.getCart(sessionId);

      // Validate seller constraint (single-seller cart)
      if (currentCart.sellerId && currentCart.sellerId !== product.sellerId) {
        return {
          success: false,
          error: "Cannot add products from different sellers to the same cart. Please checkout your current items first.",
        };
      }

      // Find variant and extract SKU if applicable
      // CRITICAL FIX: Handle nested variant structure [{colorName, sizes: [{size, stock, sku}]}]
      // Match the EXACT frontend logic: `${size}-${color}`.toLowerCase()
      let variant: { size?: string; color?: string } | undefined;
      let variantSku: string | undefined;
      
      if (variantId && product.variants) {
        const variants = product.variants as any[];
        
        // Search through nested structure
        for (const colorGroup of variants) {
          if (colorGroup.colorName || colorGroup.sizes) {
            // Nested structure: {colorName, sizes: [{size, stock, sku}]}
            const colorName = colorGroup.colorName || '';
            
            if (colorGroup.sizes && Array.isArray(colorGroup.sizes)) {
              for (const sizeItem of colorGroup.sizes) {
                // Construct variantId the SAME way frontend does: `${size}-${color}`.toLowerCase()
                const constructedId = `${sizeItem.size}-${colorName}`.toLowerCase();
                
                if (constructedId === variantId) {
                  variant = {
                    size: sizeItem.size,
                    color: colorName || undefined,
                  };
                  variantSku = sizeItem.sku; // Extract variant SKU
                  break;
                }
              }
            }
            if (variant) break;
          } else if (colorGroup.size || colorGroup.color) {
            // Flat structure: {size, color, sku} (legacy)
            const constructedId = `${colorGroup.size}-${colorGroup.color}`.toLowerCase();
            if (constructedId === variantId) {
              variant = {
                size: colorGroup.size,
                color: colorGroup.color,
              };
              variantSku = colorGroup.sku; // Extract variant SKU
              break;
            }
          } else if (colorGroup.size && !colorGroup.color) {
            // Size-only structure: {size, sku}
            if (colorGroup.size?.toLowerCase() === variantId.toLowerCase()) {
              variant = {
                size: colorGroup.size,
              };
              variantSku = colorGroup.sku; // Extract variant SKU
              break;
            }
          }
        }
      }

      // Check if item already exists (same product and variant)
      const itemKey = variantId ? `${productId}-${variantId}` : productId;
      const existingItem = currentCart.items.find((item) => {
        const existingKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
        return existingKey === itemKey;
      });

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        // Calculate actual price with discount
        const originalPrice = parseFloat(product.price);
        let actualPrice = product.price;
        let discountAmount = '0';
        
        if (
          product.promotionActive === 1 &&
          product.discountPercentage &&
          product.promotionEndDate &&
          new Date(product.promotionEndDate) > new Date()
        ) {
          const discount = parseFloat(product.discountPercentage);
          const discountedPrice = originalPrice * (1 - discount / 100);
          actualPrice = discountedPrice.toFixed(2);
          discountAmount = (originalPrice - discountedPrice).toFixed(2);
        }

        const cartItem: CartItem = {
          id: product.id,
          name: product.name,
          price: actualPrice,
          originalPrice: product.price,
          discountPercentage: product.discountPercentage || undefined,
          discountAmount: discountAmount !== '0' ? discountAmount : undefined,
          quantity,
          productType: product.productType,
          depositAmount: product.depositAmount || undefined,
          requiresDeposit: product.requiresDeposit || undefined,
          sellerId: product.sellerId,
          images: product.images || [product.image],
          promotionActive: product.promotionActive || undefined,
          variantId,
          variant,
          productSku: product.sku || undefined, // Product-level SKU
          variantSku: variantSku || undefined, // Variant-specific SKU
        };

        currentCart.items.push(cartItem);
        currentCart.sellerId = product.sellerId;
      }

      // Recalculate totals
      this.recalculateCart(currentCart);

      // Save cart to storage
      await this.storage.saveCart(
        sessionId,
        currentCart.sellerId!,
        currentCart.items,
        userId
      );

      return { success: true, cart: currentCart };
    } catch (error: any) {
      logger.error("[CartService] Error adding to cart", error, { sessionId, productId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(
    sessionId: string,
    itemId: string,
    userId?: string
  ): Promise<{ success: boolean; cart?: Cart }> {
    try {
      const cart = await this.getCart(sessionId);
      
      // Remove item (handles both productId and productId-variantId)
      const initialLength = cart.items.length;
      cart.items = cart.items.filter((item) => {
        const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
        return itemKey !== itemId && item.id !== itemId;
      });

      // If no items were removed, return current cart
      if (cart.items.length === initialLength) {
        return { success: true, cart };
      }

      // Clear seller if cart is empty
      if (cart.items.length === 0) {
        cart.sellerId = null;
        await this.storage.clearCartBySession(sessionId);
        // CRITICAL FIX: Recalculate to set total=0 and itemsCount=0
        this.recalculateCart(cart);
      } else {
        this.recalculateCart(cart);
        await this.storage.saveCart(
          sessionId,
          cart.sellerId!,
          cart.items,
          userId
        );
      }

      return { success: true, cart };
    } catch (error: any) {
      logger.error("[CartService] Error removing from cart", error, { sessionId, itemId });
      return { success: false, cart: this.createEmptyCart() };
    }
  }

  /**
   * Update item quantity
   */
  async updateQuantity(
    sessionId: string,
    itemId: string,
    quantity: number,
    userId?: string
  ): Promise<{ success: boolean; cart?: Cart }> {
    try {
      // If quantity is 0 or negative, remove the item
      if (quantity <= 0) {
        return this.removeFromCart(sessionId, itemId, userId);
      }

      const cart = await this.getCart(sessionId);
      
      // Find item (handles both productId and productId-variantId)
      const item = cart.items.find((item) => {
        const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
        return itemKey === itemId || item.id === itemId;
      });

      if (item) {
        item.quantity = quantity;
        this.recalculateCart(cart);
        await this.storage.saveCart(
          sessionId,
          cart.sellerId!,
          cart.items,
          userId
        );
      }

      return { success: true, cart };
    } catch (error: any) {
      logger.error("[CartService] Error updating cart quantity", error, { sessionId, itemId, quantity });
      return { success: false, cart: this.createEmptyCart() };
    }
  }

  /**
   * Clear cart
   */
  async clearCart(sessionId: string): Promise<{ success: boolean }> {
    try {
      await this.storage.clearCartBySession(sessionId);
      return { success: true };
    } catch (error: any) {
      logger.error("[CartService] Error clearing cart", error, { sessionId });
      return { success: false };
    }
  }

  /**
   * Migrate guest cart to authenticated user (called on login)
   * 
   * CRITICAL FIX: Always check for existing user cart first to handle returning users with new sessions
   */
  async migrateGuestCart(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; cart?: Cart; error?: string }> {
    try {
      // ALWAYS try to get authenticated user's cart first
      const userCart = await this.storage.getCartByUserId(userId);
      
      if (userCart) {
        // User has existing cart - bind new session to it
        await this.storage.saveCart(sessionId, userCart.sellerId, userCart.items as any[], userId);
        
        // Convert to service cart format
        const cart: Cart = {
          items: (userCart.items as CartItem[]) || [],
          sellerId: userCart.sellerId,
          total: 0,
          itemsCount: 0,
        };
        this.recalculateCart(cart);
        
        logger.info("[CartService] Bound new session to existing user cart", { sessionId, userId, cartId: userCart.id });
        return { success: true, cart };
      }
      
      // No user cart exists - check guest cart
      const guestCart = await this.getCart(sessionId);
      
      if (guestCart && guestCart.items.length > 0) {
        // Promote guest cart to authenticated
        await this.storage.saveCart(
          sessionId,
          guestCart.sellerId!,
          guestCart.items,
          userId
        );
        
        logger.info("[CartService] Promoted guest cart to authenticated", { sessionId, userId });
        return { success: true, cart: guestCart };
      }
      
      // No cart exists for user or session
      return { success: true, cart: this.createEmptyCart() };
    } catch (error: any) {
      logger.error("[CartService] Error migrating guest cart", error, { sessionId, userId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Recalculate cart totals
   */
  private recalculateCart(cart: Cart): void {
    cart.total = cart.items.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    cart.itemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Create empty cart
   */
  private createEmptyCart(): Cart {
    return {
      items: [],
      sellerId: null,
      total: 0,
      itemsCount: 0,
    };
  }

  /**
   * Validate inventory (placeholder for future enhancement)
   */
  async validateInventory(productId: string, quantity: number, variantId?: string): Promise<boolean> {
    // TODO: Add actual inventory check with stock reservations
    return true;
  }
}
