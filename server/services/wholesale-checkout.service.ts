/**
 * WholesaleCheckoutService - Wholesale B2B checkout processing
 * 
 * Follows Architecture 3: Service Layer Pattern with dependency injection
 * - Validates cart items against MOQ requirements
 * - Calculates deposit and balance amounts
 * - Orchestrates order creation with all related entities
 */

import type { IStorage } from '../storage';
import type { WholesaleOrderService } from './wholesale-order.service';
import { logger } from '../logger';

// ============================================================================
// Interfaces
// ============================================================================

export interface CartItem {
  productId: string;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
  };
}

export interface ValidateCartResult {
  success: boolean;
  valid: boolean;
  errors?: string[];
  validatedItems?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    moq: number;
    unitPriceCents: number;
    subtotalCents: number;
    variant?: any;
  }>;
  subtotalCents?: number;
}

export interface CalculateDepositResult {
  success: boolean;
  depositCents?: number;
  error?: string;
}

export interface CalculateBalanceResult {
  success: boolean;
  balanceCents?: number;
  error?: string;
}

export interface CheckoutData {
  sellerId: string;
  buyerId: string;
  cartItems: CartItem[];
  shippingData?: {
    shippingType: 'freight_collect' | 'buyer_pickup';
    carrierName?: string;
    carrierAccountNumber?: string;
    pickupAddress?: any;
    invoicingAddress?: any;
  };
  depositPercentage?: number;
  depositAmountCents?: number;
  paymentTerms?: string;
  poNumber?: string;
  vatNumber?: string;
  buyerCompanyName?: string;
  buyerEmail: string;
  buyerName?: string;
  buyerPhone?: string;
}

export interface ProcessCheckoutResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
  statusCode?: number;
}

export interface WholesaleCart {
  buyerId: string;
  items: CartItem[];
}

export interface AddToCartResult {
  success: boolean;
  cart?: WholesaleCart;
  error?: string;
}

export interface GetCartResult {
  success: boolean;
  cart?: WholesaleCart;
  error?: string;
}

export interface UpdateCartItemResult {
  success: boolean;
  cart?: WholesaleCart;
  error?: string;
}

export interface RemoveCartItemResult {
  success: boolean;
  cart?: WholesaleCart;
  error?: string;
}

// ============================================================================
// WholesaleCheckoutService
// ============================================================================

export class WholesaleCheckoutService {
  constructor(
    private storage: IStorage,
    private wholesaleOrderService: WholesaleOrderService
  ) {}

  /**
   * Add item to wholesale cart
   */
  async addToCart(buyerId: string, item: CartItem): Promise<AddToCartResult> {
    try {
      // Get product to determine sellerId
      const product = await this.storage.getWholesaleProduct(item.productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      // Get existing cart or create new one
      let cart = await this.storage.getWholesaleCart(buyerId);
      
      if (!cart) {
        // Create new cart with sellerId from the product
        cart = await this.storage.createWholesaleCart(buyerId, product.sellerId);
      }

      // Check if item already exists in cart
      const items = (cart.items as any[]) || [];
      const existingItemIndex = items.findIndex((i: any) => 
        i.productId === item.productId && 
        JSON.stringify(i.variant) === JSON.stringify(item.variant)
      );

      if (existingItemIndex >= 0) {
        // Update quantity if item exists
        items[existingItemIndex].quantity += item.quantity;
      } else {
        // Add new item
        items.push(item);
      }

      // Update cart in storage
      const updatedCart = await this.storage.updateWholesaleCart(buyerId, items);
      
      return { 
        success: true, 
        cart: { buyerId, items: items as CartItem[] }
      };
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Failed to add to cart', error);
      return { success: false, error: error.message || 'Failed to add item to cart' };
    }
  }

  /**
   * Get wholesale cart for buyer
   */
  async getCart(buyerId: string): Promise<GetCartResult> {
    try {
      const cart = await this.storage.getWholesaleCart(buyerId);
      const items = cart?.items as CartItem[] || [];
      return { 
        success: true, 
        cart: { buyerId, items }
      };
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Failed to get cart', error);
      return { success: false, error: error.message || 'Failed to get cart' };
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(
    buyerId: string, 
    productId: string, 
    variant: any, 
    quantity: number
  ): Promise<UpdateCartItemResult> {
    try {
      const cart = await this.storage.getWholesaleCart(buyerId);
      
      if (!cart) {
        return { success: false, error: 'Cart not found' };
      }

      const items = (cart.items as any[]) || [];
      const itemIndex = items.findIndex((i: any) => 
        i.productId === productId && 
        JSON.stringify(i.variant) === JSON.stringify(variant)
      );

      if (itemIndex < 0) {
        return { success: false, error: 'Item not found in cart' };
      }

      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        items.splice(itemIndex, 1);
      } else {
        // Update quantity
        items[itemIndex].quantity = quantity;
      }

      await this.storage.updateWholesaleCart(buyerId, items);

      return { 
        success: true, 
        cart: { buyerId, items: items as CartItem[] }
      };
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Failed to update cart item', error);
      return { success: false, error: error.message || 'Failed to update cart item' };
    }
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(
    buyerId: string, 
    productId: string, 
    variant: any
  ): Promise<RemoveCartItemResult> {
    try {
      const cart = await this.storage.getWholesaleCart(buyerId);
      
      if (!cart) {
        return { success: false, error: 'Cart not found' };
      }

      const items = ((cart.items as any[]) || []).filter((i: any) => 
        !(i.productId === productId && 
          JSON.stringify(i.variant) === JSON.stringify(variant))
      );

      await this.storage.updateWholesaleCart(buyerId, items);

      return { 
        success: true, 
        cart: { buyerId, items: items as CartItem[] }
      };
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Failed to remove cart item', error);
      return { success: false, error: error.message || 'Failed to remove cart item' };
    }
  }

  /**
   * Clear cart after successful checkout
   */
  async clearCart(buyerId: string): Promise<void> {
    await this.storage.clearWholesaleCart(buyerId);
  }

  /**
   * Validate cart items against MOQ requirements
   * Issue 4 Fix: Handle all variant types including variantId
   */
  async validateCart(
    cartItems: CartItem[], 
    sellerId: string
  ): Promise<ValidateCartResult> {
    try {
      const errors: string[] = [];
      const validatedItems: any[] = [];
      let subtotalCents = 0;

      for (const item of cartItems) {
        const product = await this.storage.getWholesaleProduct(item.productId);

        if (!product) {
          errors.push(`Product ${item.productId} not found`);
          continue;
        }

        if (product.sellerId !== sellerId) {
          errors.push(`Product ${product.name} belongs to different seller`);
          continue;
        }

        // Check MOQ (product-level or variant-level)
        let moq = product.moq;
        let unitPriceCents = Math.round(parseFloat(product.wholesalePrice) * 100);
        let matchingVariant: any = null;

        // Issue 4: Enhanced variant matching with variantId support
        if (item.variant && product.variants) {
          const variants = Array.isArray(product.variants) ? product.variants : [];
          
          // Try to match by variantId first if available
          if ((item.variant as any).variantId) {
            matchingVariant = variants.find((v: any) => 
              v.variantId === (item.variant as any).variantId
            );
          }
          
          // Fallback to size/color matching if variantId not found
          if (!matchingVariant && (item.variant.size || item.variant.color)) {
            matchingVariant = variants.find((v: any) => 
              v.size === item.variant?.size && v.color === item.variant?.color
            );
          }

          if (matchingVariant) {
            moq = matchingVariant.moq || moq;
            if (matchingVariant.wholesalePrice) {
              unitPriceCents = Math.round(parseFloat(matchingVariant.wholesalePrice) * 100);
            }
          } else if (item.variant.size || item.variant.color || (item.variant as any).variantId) {
            // Variant specified but not found in product
            const variantDesc = (item.variant as any).variantId 
              ? `variantId: ${(item.variant as any).variantId}`
              : `${item.variant.size || 'any size'}/${item.variant.color || 'any color'}`;
            errors.push(`${product.name}: variant (${variantDesc}) not found`);
            continue;
          }
        }

        // Check MOQ
        if (item.quantity < moq) {
          const variantInfo = matchingVariant 
            ? ` (variant: ${matchingVariant.variantId || `${matchingVariant.size}/${matchingVariant.color}`})`
            : '';
          errors.push(`${product.name}${variantInfo}: quantity ${item.quantity} is below MOQ of ${moq}`);
          continue;
        }

        const itemSubtotal = unitPriceCents * item.quantity;
        subtotalCents += itemSubtotal;

        validatedItems.push({
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          quantity: item.quantity,
          moq,
          unitPriceCents,
          subtotalCents: itemSubtotal,
          variant: item.variant,
        });
      }

      if (errors.length > 0) {
        return {
          success: true,
          valid: false,
          errors,
        };
      }

      return {
        success: true,
        valid: true,
        validatedItems,
        subtotalCents,
      };
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Failed to validate cart', error);
      return {
        success: false,
        valid: false,
        errors: [error.message || 'Failed to validate cart'],
      };
    }
  }

  /**
   * Calculate deposit amount
   * Issue 3 Fix: Validate depositAmountCents <= totalCents
   */
  calculateDeposit(
    totalCents: number,
    depositPercentage?: number,
    depositAmountCents?: number
  ): CalculateDepositResult {
    try {
      // Fixed deposit amount takes precedence
      if (depositAmountCents !== undefined && depositAmountCents > 0) {
        // Issue 3: Validate deposit doesn't exceed total
        if (depositAmountCents > totalCents) {
          logger.error('[WholesaleCheckoutService] Deposit amount exceeds total', {
            depositAmountCents,
            totalCents,
          });
          return {
            success: false,
            error: `Deposit amount (${depositAmountCents}) cannot exceed total (${totalCents})`,
          };
        }
        return {
          success: true,
          depositCents: depositAmountCents,
        };
      }

      // Calculate from percentage
      if (depositPercentage !== undefined && depositPercentage > 0) {
        const depositCents = Math.round(totalCents * (depositPercentage / 100));
        return {
          success: true,
          depositCents,
        };
      }

      // Default: no deposit required (full payment)
      return {
        success: true,
        depositCents: totalCents,
      };
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Failed to calculate deposit', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate deposit',
      };
    }
  }

  /**
   * Calculate balance amount
   * Issue 3 Fix: Ensure depositCents + balanceCents = totalCents
   */
  calculateBalance(
    totalCents: number,
    depositCents: number
  ): CalculateBalanceResult {
    try {
      const balanceCents = totalCents - depositCents;

      if (balanceCents < 0) {
        logger.error('[WholesaleCheckoutService] Deposit exceeds total amount', {
          totalCents,
          depositCents,
          balanceCents,
        });
        return {
          success: false,
          error: `Deposit (${depositCents}) exceeds total amount (${totalCents})`,
        };
      }

      // Issue 3: Verify calculation consistency
      const calculatedTotal = depositCents + balanceCents;
      if (calculatedTotal !== totalCents) {
        logger.error('[WholesaleCheckoutService] Calculation inconsistency detected', {
          totalCents,
          depositCents,
          balanceCents,
          calculatedTotal,
        });
        return {
          success: false,
          error: `Calculation error: deposit (${depositCents}) + balance (${balanceCents}) = ${calculatedTotal} ≠ total (${totalCents})`,
        };
      }

      return {
        success: true,
        balanceCents,
      };
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Failed to calculate balance', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate balance',
      };
    }
  }

  /**
   * Process checkout - create order, items, payments, shipping
   * Issue 1 Fix: Atomic transaction with compensating cleanup on failure
   */
  async processCheckout(data: CheckoutData): Promise<ProcessCheckoutResult> {
    // Track created entities for cleanup on failure
    let createdOrderId: string | null = null;
    let createdItemIds: string[] = [];
    let createdPaymentIds: string[] = [];
    let createdShippingId: string | null = null;

    try {
      // Step 1: Validate cart
      const validation = await this.validateCart(data.cartItems, data.sellerId);

      if (!validation.success || !validation.valid) {
        return {
          success: false,
          error: validation.errors?.join(', ') || 'Cart validation failed',
          statusCode: 400,
        };
      }

      const { validatedItems, subtotalCents } = validation;

      if (!validatedItems || !subtotalCents) {
        return {
          success: false,
          error: 'Invalid cart data',
          statusCode: 400,
        };
      }

      // Step 2: Calculate deposit and balance
      const depositResult = this.calculateDeposit(
        subtotalCents,
        data.depositPercentage,
        data.depositAmountCents
      );

      if (!depositResult.success || depositResult.depositCents === undefined) {
        return {
          success: false,
          error: depositResult.error || 'Failed to calculate deposit',
          statusCode: 400,
        };
      }

      const balanceResult = this.calculateBalance(subtotalCents, depositResult.depositCents);

      if (!balanceResult.success || balanceResult.balanceCents === undefined) {
        return {
          success: false,
          error: balanceResult.error || 'Failed to calculate balance',
          statusCode: 400,
        };
      }

      // Step 3: Create order (wrapped in try-catch for cleanup)
      try {
        const orderResult = await this.wholesaleOrderService.createOrder({
          sellerId: data.sellerId,
          buyerId: data.buyerId,
          orderData: {
            subtotalCents,
            totalCents: subtotalCents,
            depositAmountCents: depositResult.depositCents,
            balanceAmountCents: balanceResult.balanceCents,
            depositPercentage: data.depositPercentage,
            paymentTerms: data.paymentTerms,
            poNumber: data.poNumber,
            vatNumber: data.vatNumber,
            buyerCompanyName: data.buyerCompanyName,
            buyerEmail: data.buyerEmail,
            buyerName: data.buyerName,
          },
          items: validatedItems,
        });

        if (!orderResult.success || !orderResult.order) {
          throw new Error(orderResult.error || 'Failed to create order');
        }

        createdOrderId = orderResult.order.id;

        // Step 4: Get created item IDs for potential cleanup
        const items = await this.storage.getWholesaleOrderItems(createdOrderId);
        createdItemIds = items.map((item: any) => item.id);

        // Step 5: Create shipping details if provided
        if (data.shippingData && createdOrderId) {
          try {
            const shipping = await this.createShippingDetails(createdOrderId, data.shippingData);
            if (shipping?.id) {
              createdShippingId = shipping.id;
            }
          } catch (shippingError: any) {
            logger.error('[WholesaleCheckoutService] Shipping creation failed, initiating cleanup', shippingError);
            throw new Error(`Shipping creation failed: ${shippingError.message}`);
          }
        }

        logger.info('[WholesaleCheckoutService] Checkout processed successfully', {
          orderId: orderResult.order.id,
          orderNumber: orderResult.order.orderNumber,
        });

        return {
          success: true,
          orderId: orderResult.order.id,
          orderNumber: orderResult.order.orderNumber,
        };
      } catch (createError: any) {
        // Compensating cleanup in reverse order
        logger.error('[WholesaleCheckoutService] Order creation failed, initiating cleanup', {
          error: createError.message,
          createdOrderId,
          createdItemIds,
          createdShippingId,
        });

        await this.cleanupFailedCheckout({
          orderId: createdOrderId,
          itemIds: createdItemIds,
          paymentIds: createdPaymentIds,
          shippingId: createdShippingId,
        });

        return {
          success: false,
          error: `Order creation failed: ${createError.message}. Cleanup completed.`,
          statusCode: 500,
        };
      }
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Failed to process checkout', error);
      return {
        success: false,
        error: error.message || 'Failed to process checkout',
        statusCode: 500,
      };
    }
  }

  /**
   * Cleanup failed checkout - delete created records in reverse order
   * Issue 1 Fix: Compensating transaction cleanup
   */
  private async cleanupFailedCheckout(cleanup: {
    orderId: string | null;
    itemIds: string[];
    paymentIds: string[];
    shippingId: string | null;
  }): Promise<void> {
    const cleanupResults: string[] = [];

    try {
      // Step 1: Delete shipping (if exists)
      if (cleanup.shippingId) {
        try {
          await this.storage.deleteWholesaleShippingDetails(cleanup.shippingId);
          cleanupResults.push(`Deleted shipping ${cleanup.shippingId}`);
        } catch (err: any) {
          logger.error('[WholesaleCheckoutService] Failed to delete shipping during cleanup', err);
          cleanupResults.push(`Failed to delete shipping: ${err.message}`);
        }
      }

      // Step 2: Delete payments (if exist)
      for (const paymentId of cleanup.paymentIds) {
        try {
          await this.storage.deleteWholesalePayment(paymentId);
          cleanupResults.push(`Deleted payment ${paymentId}`);
        } catch (err: any) {
          logger.error('[WholesaleCheckoutService] Failed to delete payment during cleanup', err);
          cleanupResults.push(`Failed to delete payment ${paymentId}: ${err.message}`);
        }
      }

      // Step 3: Delete order items (if exist)
      for (const itemId of cleanup.itemIds) {
        try {
          await this.storage.deleteWholesaleOrderItem(itemId);
          cleanupResults.push(`Deleted item ${itemId}`);
        } catch (err: any) {
          logger.error('[WholesaleCheckoutService] Failed to delete item during cleanup', err);
          cleanupResults.push(`Failed to delete item ${itemId}: ${err.message}`);
        }
      }

      // Step 4: Delete order (if exists)
      if (cleanup.orderId) {
        try {
          await this.storage.deleteWholesaleOrder(cleanup.orderId);
          cleanupResults.push(`Deleted order ${cleanup.orderId}`);
        } catch (err: any) {
          logger.error('[WholesaleCheckoutService] Failed to delete order during cleanup', err);
          cleanupResults.push(`Failed to delete order: ${err.message}`);
        }
      }

      logger.info('[WholesaleCheckoutService] Cleanup completed', { results: cleanupResults });
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Cleanup process failed', error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Create shipping details for order
   */
  private async createShippingDetails(orderId: string, shippingData: any): Promise<any> {
    try {
      const shipping = await this.storage.createWholesaleShippingDetails({
        wholesaleOrderId: orderId,
        shippingType: shippingData.shippingType,
        carrierName: shippingData.carrierName,
        carrierAccountNumber: shippingData.carrierAccountNumber,
        pickupAddress: shippingData.pickupAddress,
        invoicingAddress: shippingData.invoicingAddress,
      });
      return shipping;
    } catch (error: any) {
      logger.error('[WholesaleCheckoutService] Failed to create shipping details', error);
      throw error;
    }
  }
}
