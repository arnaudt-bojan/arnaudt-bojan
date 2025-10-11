/**
 * Cart Service
 * 
 * Backend cart management - all cart business logic centralized here
 * Frontend should only make API calls to these services
 */

import type { IStorage } from "../storage";
import type { Product } from "@shared/schema";

export interface CartItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  productType: string;
  depositAmount?: string;
  requiresDeposit?: number;
  sellerId: string;
  images?: string[];
  discountPercentage?: string;
  promotionActive?: number;
}

export interface Cart {
  items: CartItem[];
  sellerId: string | null; // Single seller constraint
  total: number;
  itemsCount: number;
}

export class CartService {
  constructor(private storage: IStorage) {}

  /**
   * Add item to cart with validation
   */
  async addToCart(
    userId: string | null,
    productId: string,
    quantity: number = 1
  ): Promise<{ success: boolean; cart?: Cart; error?: string }> {
    try {
      // Fetch product
      const product = await this.storage.getProduct(productId);
      if (!product) {
        return { success: false, error: "Product not found" };
      }

      // Get current cart
      const cart = await this.getCart(userId);

      // Validate seller constraint
      if (cart.sellerId && cart.sellerId !== product.sellerId) {
        return {
          success: false,
          error: "Cannot add products from different sellers to the same cart. Please checkout your current items first.",
        };
      }

      // Check if item already exists
      const existingItem = cart.items.find((item) => item.id === productId);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        // Calculate actual price with discount
        let actualPrice = product.price;
        if (
          product.promotionActive === 1 &&
          product.discountPercentage &&
          product.promotionEndDate &&
          new Date(product.promotionEndDate) > new Date()
        ) {
          const discount = parseFloat(product.discountPercentage);
          const originalPrice = parseFloat(product.price);
          actualPrice = (originalPrice * (1 - discount / 100)).toFixed(2);
        }

        const cartItem: CartItem = {
          id: product.id,
          name: product.name,
          price: actualPrice,
          quantity,
          productType: product.productType,
          depositAmount: product.depositAmount || undefined,
          requiresDeposit: product.requiresDeposit || undefined,
          sellerId: product.sellerId,
          images: product.images || [product.image],
          discountPercentage: product.discountPercentage || undefined,
          promotionActive: product.promotionActive || undefined,
        };

        cart.items.push(cartItem);
        cart.sellerId = product.sellerId;
      }

      // Recalculate totals
      this.recalculateCart(cart);

      // Save cart
      await this.saveCart(userId, cart);

      return { success: true, cart };
    } catch (error: any) {
      console.error("[CartService] Error adding to cart:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(
    userId: string | null,
    productId: string
  ): Promise<{ success: boolean; cart?: Cart }> {
    const cart = await this.getCart(userId);
    cart.items = cart.items.filter((item) => item.id !== productId);

    // Clear seller if cart is empty
    if (cart.items.length === 0) {
      cart.sellerId = null;
    }

    this.recalculateCart(cart);
    await this.saveCart(userId, cart);

    return { success: true, cart };
  }

  /**
   * Update item quantity
   */
  async updateQuantity(
    userId: string | null,
    productId: string,
    quantity: number
  ): Promise<{ success: boolean; cart?: Cart }> {
    const cart = await this.getCart(userId);
    const item = cart.items.find((item) => item.id === productId);

    if (item) {
      if (quantity <= 0) {
        return this.removeFromCart(userId, productId);
      }
      item.quantity = quantity;
      this.recalculateCart(cart);
      await this.saveCart(userId, cart);
    }

    return { success: true, cart };
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string | null): Promise<{ success: boolean }> {
    const emptyCart: Cart = {
      items: [],
      sellerId: null,
      total: 0,
      itemsCount: 0,
    };
    await this.saveCart(userId, emptyCart);
    return { success: true };
  }

  /**
   * Get cart - In a production system, this would be session/database backed
   * For now, cart is managed client-side; backend validates and calculates
   */
  async getCart(userId: string | null): Promise<Cart> {
    // Cart is client-side (localStorage) - backend only validates/calculates
    // This method is a placeholder for future session-based cart
    return {
      items: [],
      sellerId: null,
      total: 0,
      itemsCount: 0,
    };
  }

  /**
   * Save cart - In a production system, this would persist to session/database
   * For now, cart is managed client-side; backend only validates/calculates
   */
  private async saveCart(userId: string | null, cart: Cart): Promise<void> {
    // Cart is client-side (localStorage) - backend only validates/calculates
    // This method is a placeholder for future session-based cart
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
   * Validate inventory (placeholder for future enhancement)
   */
  async validateInventory(productId: string, quantity: number): Promise<boolean> {
    // TODO: Add actual inventory check
    return true;
  }
}
