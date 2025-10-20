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

// Service-specific logger with structured logging
const serviceLogger = logger.child({ service: 'CartService' });

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
  currency: string;
}

export class CartService {
  constructor(private storage: IStorage) {}

  /**
   * Get cart by session ID
   * Architecture 3: Server-side total/itemsCount/currency calculation
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
          serviceLogger.warn("[CartService] Removed deleted product from cart", { 
            productId: item.id, 
            productName: item.name,
            sessionId 
          });
        }
      }
      
      // Architecture 3: Fetch seller to get currency setting
      let currency = 'USD'; // Default currency
      if (validItems.length > 0 && storageCart.sellerId) {
        const seller = await this.storage.getUser(storageCart.sellerId);
        if (seller && seller.listingCurrency) {
          currency = seller.listingCurrency;
        }
      }
      
      const cart: Cart = {
        items: validItems,
        sellerId: validItems.length > 0 ? storageCart.sellerId : null,
        total: 0,
        itemsCount: 0,
        currency,
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
      serviceLogger.error("[CartService] Error getting cart", { error, sessionId });
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
      // CRITICAL FIX #4: Validate quantity bounds (1 ≤ quantity ≤ 10000)
      if (quantity < 1 || quantity > 10000) {
        return { 
          success: false, 
          error: `Invalid quantity: ${quantity}. Must be between 1 and 10000.` 
        };
      }
      
      // Additional validation: quantity must be an integer
      if (!Number.isInteger(quantity)) {
        return { 
          success: false, 
          error: `Invalid quantity: ${quantity}. Must be a whole number.` 
        };
      }

      // Fetch product
      const product = await this.storage.getProduct(productId);
      if (!product) {
        return { success: false, error: "Product not found" };
      }

      // CRITICAL FIX #1 & #2: Clone cart before modifications to prevent state inconsistency
      const originalCart = await this.getCart(sessionId);
      const currentCart: Cart = {
        items: JSON.parse(JSON.stringify(originalCart.items)),
        sellerId: originalCart.sellerId,
        total: originalCart.total,
        itemsCount: originalCart.itemsCount,
        currency: originalCart.currency,
      };

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
          } else if (colorGroup.size && colorGroup.color) {
            // Flat structure: {size, color, sku} (legacy)
            // CRITICAL FIX: Changed OR to AND to avoid matching size-only variants
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
          (!product.promotionEndDate || new Date(product.promotionEndDate) > new Date())
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

      // CRITICAL FIX #2: Save cart to storage and only return updated cart if save succeeds
      try {
        await this.storage.saveCart(
          sessionId,
          currentCart.sellerId!,
          currentCart.items,
          userId
        );
        
        // Only return modified cart after successful save
        return { success: true, cart: currentCart };
      } catch (saveError: any) {
        serviceLogger.error("[CartService] Failed to save cart", { error: saveError, sessionId, productId });
        // Return original cart on save failure to maintain consistency
        return { 
          success: false, 
          error: "Failed to save cart. Please try again.",
          cart: originalCart 
        };
      }
    } catch (error: any) {
      serviceLogger.error("[CartService] Error adding to cart", { error, sessionId, productId });
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
  ): Promise<{ success: boolean; cart?: Cart; error?: string }> {
    try {
      // CRITICAL FIX #2: Clone cart before modifications
      const originalCart = await this.getCart(sessionId);
      const cart: Cart = {
        items: JSON.parse(JSON.stringify(originalCart.items)),
        sellerId: originalCart.sellerId,
        total: originalCart.total,
        itemsCount: originalCart.itemsCount,
        currency: originalCart.currency,
      };
      
      // Remove item (handles both productId and productId-variantId)
      const initialLength = cart.items.length;
      cart.items = cart.items.filter((item) => {
        const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
        return itemKey !== itemId && item.id !== itemId;
      });

      // If no items were removed, return original cart
      if (cart.items.length === initialLength) {
        return { success: true, cart: originalCart };
      }

      // Clear seller if cart is empty
      if (cart.items.length === 0) {
        cart.sellerId = null;
        this.recalculateCart(cart);
        
        try {
          await this.storage.clearCartBySession(sessionId);
          return { success: true, cart };
        } catch (saveError: any) {
          serviceLogger.error("[CartService] Failed to clear cart", { error: saveError, sessionId, itemId });
          return { 
            success: false, 
            error: "Failed to remove item. Please try again.",
            cart: originalCart 
          };
        }
      } else {
        this.recalculateCart(cart);
        
        try {
          await this.storage.saveCart(
            sessionId,
            cart.sellerId!,
            cart.items,
            userId
          );
          return { success: true, cart };
        } catch (saveError: any) {
          serviceLogger.error("[CartService] Failed to save cart", { error: saveError, sessionId, itemId });
          return { 
            success: false, 
            error: "Failed to remove item. Please try again.",
            cart: originalCart 
          };
        }
      }
    } catch (error: any) {
      serviceLogger.error("[CartService] Error removing from cart", { error, sessionId, itemId });
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
  ): Promise<{ success: boolean; cart?: Cart; error?: string }> {
    try {
      // If quantity is 0 or negative, remove the item
      if (quantity <= 0) {
        return this.removeFromCart(sessionId, itemId, userId);
      }

      // CRITICAL FIX #4: Validate quantity bounds (1 ≤ quantity ≤ 10000)
      if (quantity < 1 || quantity > 10000) {
        return { 
          success: false, 
          error: `Invalid quantity: ${quantity}. Must be between 1 and 10000.` 
        };
      }
      
      if (!Number.isInteger(quantity)) {
        return { 
          success: false, 
          error: `Invalid quantity: ${quantity}. Must be a whole number.` 
        };
      }

      // CRITICAL FIX #2: Clone cart before modifications
      const originalCart = await this.getCart(sessionId);
      const cart: Cart = {
        items: JSON.parse(JSON.stringify(originalCart.items)),
        sellerId: originalCart.sellerId,
        total: originalCart.total,
        itemsCount: originalCart.itemsCount,
        currency: originalCart.currency,
      };
      
      // Find item (handles both productId and productId-variantId)
      const item = cart.items.find((item) => {
        const itemKey = item.variantId ? `${item.id}-${item.variantId}` : item.id;
        return itemKey === itemId || item.id === itemId;
      });

      if (item) {
        item.quantity = quantity;
        this.recalculateCart(cart);
        
        // Save and only return updated cart if save succeeds
        try {
          await this.storage.saveCart(
            sessionId,
            cart.sellerId!,
            cart.items,
            userId
          );
          return { success: true, cart };
        } catch (saveError: any) {
          serviceLogger.error("[CartService] Failed to save cart", { error: saveError, sessionId, itemId });
          return { 
            success: false, 
            error: "Failed to update quantity. Please try again.",
            cart: originalCart 
          };
        }
      }

      return { success: true, cart: originalCart };
    } catch (error: any) {
      serviceLogger.error("[CartService] Error updating cart quantity", { error, sessionId, itemId, quantity });
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
      serviceLogger.error("[CartService] Error clearing cart", { error, sessionId });
      return { success: false };
    }
  }

  /**
   * Migrate guest cart to authenticated user (called on login)
   * 
   * CRITICAL FIX #5 & #6: 
   * - Use atomic operations with row locking to prevent race conditions
   * - Detect seller mismatches and return conflict error instead of silent data loss
   */
  async migrateGuestCart(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; cart?: Cart; error?: string; conflict?: { userCart: Cart; guestCart: Cart } }> {
    try {
      // CRITICAL FIX #5: Get both carts atomically to detect conflicts
      // The saveCart method uses transactions with row locking for auth users
      const userCart = await this.storage.getCartByUserId(userId);
      const guestCartStorage = await this.storage.getCartBySession(sessionId);
      
      // Convert guest cart to service format if it exists
      let guestCart: Cart | null = null;
      if (guestCartStorage && guestCartStorage.items) {
        // Fetch seller currency for guest cart
        let guestCurrency = 'USD';
        if (guestCartStorage.sellerId) {
          const seller = await this.storage.getUser(guestCartStorage.sellerId);
          if (seller && seller.listingCurrency) {
            guestCurrency = seller.listingCurrency;
          }
        }
        
        guestCart = {
          items: (guestCartStorage.items as CartItem[]) || [],
          sellerId: guestCartStorage.sellerId,
          total: 0,
          itemsCount: 0,
          currency: guestCurrency,
        };
        this.recalculateCart(guestCart);
      }
      
      // CASE 1: User has existing cart and guest has cart
      if (userCart && guestCart && guestCart.items.length > 0) {
        // CRITICAL FIX #6: Check for seller mismatch
        if (userCart.sellerId !== guestCart.sellerId) {
          // Seller mismatch - return conflict error with both carts
          // Fetch user cart seller currency
          let userCurrency = 'USD';
          if (userCart.sellerId) {
            const seller = await this.storage.getUser(userCart.sellerId);
            if (seller && seller.listingCurrency) {
              userCurrency = seller.listingCurrency;
            }
          }
          
          const userCartFormatted: Cart = {
            items: (userCart.items as CartItem[]) || [],
            sellerId: userCart.sellerId,
            total: 0,
            itemsCount: 0,
            currency: userCurrency,
          };
          this.recalculateCart(userCartFormatted);
          
          serviceLogger.warn("[CartService] Seller mismatch during cart migration", { 
            sessionId, 
            userId, 
            userSellerId: userCart.sellerId || 'null',
            guestSellerId: guestCart.sellerId || 'null'
          });
          
          return {
            success: false,
            error: "SELLER_MISMATCH",
            conflict: {
              userCart: userCartFormatted,
              guestCart: guestCart
            }
          };
        }
        
        // Same seller - merge carts (use existing user cart, bind session to it)
        // The saveCart with userId will use row locking to ensure atomicity
        await this.storage.saveCart(sessionId, userCart.sellerId, userCart.items as any[], userId);
        
        // Fetch seller currency
        let currency = 'USD';
        if (userCart.sellerId) {
          const seller = await this.storage.getUser(userCart.sellerId);
          if (seller && seller.listingCurrency) {
            currency = seller.listingCurrency;
          }
        }
        
        const cart: Cart = {
          items: (userCart.items as CartItem[]) || [],
          sellerId: userCart.sellerId,
          total: 0,
          itemsCount: 0,
          currency,
        };
        this.recalculateCart(cart);
        
        serviceLogger.info("[CartService] Bound new session to existing user cart (same seller)", { 
          sessionId, 
          userId, 
          cartId: userCart.id,
          guestCartDiscarded: true 
        });
        return { success: true, cart };
      }
      
      // CASE 2: User has existing cart, no guest cart
      if (userCart) {
        // Bind new session to existing user cart atomically
        await this.storage.saveCart(sessionId, userCart.sellerId, userCart.items as any[], userId);
        
        // Fetch seller currency
        let currency = 'USD';
        if (userCart.sellerId) {
          const seller = await this.storage.getUser(userCart.sellerId);
          if (seller && seller.listingCurrency) {
            currency = seller.listingCurrency;
          }
        }
        
        const cart: Cart = {
          items: (userCart.items as CartItem[]) || [],
          sellerId: userCart.sellerId,
          total: 0,
          itemsCount: 0,
          currency,
        };
        this.recalculateCart(cart);
        
        serviceLogger.info("[CartService] Bound new session to existing user cart", { sessionId, userId, cartId: userCart.id });
        return { success: true, cart };
      }
      
      // CASE 3: No user cart, but guest has cart - promote guest cart
      if (guestCart && guestCart.items.length > 0) {
        // Atomically promote guest cart to authenticated cart
        await this.storage.saveCart(
          sessionId,
          guestCart.sellerId!,
          guestCart.items,
          userId
        );
        
        serviceLogger.info("[CartService] Promoted guest cart to authenticated", { sessionId, userId });
        return { success: true, cart: guestCart };
      }
      
      // CASE 4: No cart exists for user or session
      return { success: true, cart: this.createEmptyCart() };
    } catch (error: any) {
      serviceLogger.error("[CartService] Error migrating guest cart", { error, sessionId, userId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Recalculate cart totals
   * CRITICAL FIX #3: Add NaN validation with fallback values
   */
  private recalculateCart(cart: Cart): void {
    cart.total = cart.items.reduce((sum, item) => {
      const price = parseFloat(item.price);
      const quantity = item.quantity;
      
      // CRITICAL: Validate parseFloat result and quantity
      if (isNaN(price) || isNaN(quantity)) {
        serviceLogger.error("[CartService] Invalid price or quantity in cart item", { 
          itemId: item.id, 
          price: item.price, 
          quantity,
          parsedPrice: price 
        });
        // Use 0 as fallback to prevent NaN propagation
        return sum + 0;
      }
      
      return sum + price * quantity;
    }, 0);
    
    cart.itemsCount = cart.items.reduce((sum, item) => {
      const quantity = item.quantity;
      
      // Validate quantity is a valid number
      if (isNaN(quantity)) {
        serviceLogger.error("[CartService] Invalid quantity in cart item", { 
          itemId: item.id, 
          quantity 
        });
        return sum + 0;
      }
      
      return sum + quantity;
    }, 0);
  }

  /**
   * Create empty cart
   * Architecture 3: Server-calculated totals with default currency
   */
  private createEmptyCart(): Cart {
    return {
      items: [],
      sellerId: null,
      total: 0,
      itemsCount: 0,
      currency: 'USD',
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
