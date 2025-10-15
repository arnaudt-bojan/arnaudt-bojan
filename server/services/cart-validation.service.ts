/**
 * Cart Validation Service
 * 
 * Validates cart items against database, calculates totals with server-side pricing
 * CRITICAL: Never trust client-supplied prices - always fetch from database
 */

import type { IStorage } from "../storage";
import type { Product } from "@shared/schema";

export interface ClientCartItem {
  productId: string;
  quantity: number;
}

export interface ValidatedCartItem {
  id: string;
  name: string;
  price: string; // Server-validated price
  originalPrice?: string; // Price before discount
  discountPercentage?: string; // Discount % (e.g., "15.00" for 15%)
  discountAmount?: string; // Dollar amount saved
  quantity: number;
  productType: string;
  depositAmount?: string;
  requiresDeposit?: number;
  sellerId: string;
  images?: string[];
}

export interface CartValidationResult {
  valid: boolean;
  items: ValidatedCartItem[];
  total: number;
  errors: string[];
  sellerId: string | null;
}

export class CartValidationService {
  constructor(private storage: IStorage) {}

  /**
   * Validate cart items against database
   * SECURITY: Fetch products from DB, never trust client prices
   */
  async validateCart(clientItems: ClientCartItem[]): Promise<CartValidationResult> {
    const errors: string[] = [];
    const validatedItems: ValidatedCartItem[] = [];
    let sellerId: string | null = null;

    for (const item of clientItems) {
      // SECURITY: Validate quantity is positive integer
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        errors.push(`Invalid quantity ${item.quantity} for product ${item.productId}. Must be a positive integer.`);
        continue;
      }

      // Fetch product from database - this is the authoritative source
      const product = await this.storage.getProduct(item.productId);

      if (!product) {
        errors.push(`Product ${item.productId} not found`);
        continue;
      }

      // Validate seller constraint - all items must be from same seller
      if (sellerId === null) {
        sellerId = product.sellerId;
      } else if (sellerId !== product.sellerId) {
        errors.push(
          "Cannot have products from different sellers in the same cart"
        );
        return {
          valid: false,
          items: [],
          total: 0,
          errors,
          sellerId: null,
        };
      }

      // Calculate actual price with discount (server-side calculation)
      let actualPrice = product.price;
      let originalPrice: string | undefined;
      let discountPercentage: string | undefined;
      let discountAmount: string | undefined;
      
      if (
        product.promotionActive === 1 &&
        product.discountPercentage &&
        (!product.promotionEndDate || new Date(product.promotionEndDate) > new Date())
      ) {
        const discount = parseFloat(product.discountPercentage);
        const origPrice = parseFloat(product.price);
        const discPrice = (origPrice * (1 - discount / 100)).toFixed(2);
        
        originalPrice = product.price;
        discountPercentage = product.discountPercentage;
        discountAmount = (origPrice - parseFloat(discPrice)).toFixed(2);
        actualPrice = discPrice;
      }

      validatedItems.push({
        id: product.id,
        name: product.name,
        price: actualPrice, // Use server-calculated price
        originalPrice,
        discountPercentage,
        discountAmount,
        quantity: item.quantity,
        productType: product.productType,
        depositAmount: product.depositAmount || undefined,
        requiresDeposit: product.requiresDeposit || undefined,
        sellerId: product.sellerId,
        images: product.images || [product.image],
      });
    }

    // Calculate total from validated items
    const total = validatedItems.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    // SECURITY: Reject if total is zero or negative
    if (total <= 0) {
      return {
        valid: false,
        items: [],
        total: 0,
        errors: ["Order total must be greater than zero"],
        sellerId: null,
      };
    }

    return {
      valid: errors.length === 0,
      items: validatedItems,
      total,
      errors,
      sellerId,
    };
  }

  /**
   * Validate single product for cart
   */
  async validateProduct(
    productId: string,
    quantity: number
  ): Promise<{ valid: boolean; product?: Product; error?: string }> {
    const product = await this.storage.getProduct(productId);

    if (!product) {
      return { valid: false, error: "Product not found" };
    }

    // SECURITY: Validate quantity is positive integer
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { valid: false, error: "Quantity must be a positive integer" };
    }

    // TODO: Add inventory check here
    // if (product.inventory && product.inventory < quantity) {
    //   return { valid: false, error: "Insufficient inventory" };
    // }

    return { valid: true, product };
  }
}
