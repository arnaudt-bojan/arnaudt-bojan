import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

interface CartItem {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  discountPercentage?: string;
  discountAmount?: string;
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
  productSku?: string;
  variantSku?: string;
}

interface Cart {
  items: CartItem[];
  sellerId: string | null;
  total: number;
  itemsCount: number;
}

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private websocketGateway: AppWebSocketGateway,
  ) {}

  /**
   * Get cart by session ID
   */
  async getCartBySessionId(sessionId: string): Promise<any> {
    try {
      const cartSession = await this.prisma.cart_sessions.findUnique({
        where: { session_id: sessionId },
        include: {
          carts: true,
        },
      });

      if (!cartSession || !cartSession.carts) {
        return this.createEmptyCart();
      }

      const cart = cartSession.carts;
      const items = (cart.items as any[]) || [];

      // Filter out deleted products
      const validItems: CartItem[] = [];
      for (const item of items) {
        const product = await this.prisma.products.findUnique({
          where: { id: item.id },
        });
        if (product) {
          validItems.push(item);
        }
      }

      const result = {
        id: cart.id,
        sellerId: cart.seller_id,
        buyerId: cart.buyer_id,
        items: validItems,
        status: cart.status || 'active',
        subtotal: this.calculateSubtotal(validItems),
        itemCount: this.calculateItemCount(validItems),
        createdAt: cart.created_at,
        updatedAt: cart.updated_at,
      };

      // Update cart if we removed invalid items
      if (items.length !== validItems.length) {
        await this.prisma.carts.update({
          where: { id: cart.id },
          data: { items: validItems as any },
        });
      }

      return result;
    } catch (error: any) {
      console.error('[CartService] Error getting cart by session', error);
      return this.createEmptyCart();
    }
  }

  /**
   * Get cart by cart ID
   */
  async getCart(cartId: string): Promise<any> {
    try {
      const cart = await this.prisma.carts.findUnique({
        where: { id: cartId },
      });

      if (!cart) {
        throw new GraphQLError('Cart not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const items = (cart.items as any[]) || [];

      return {
        id: cart.id,
        sellerId: cart.seller_id,
        buyerId: cart.buyer_id,
        items,
        status: cart.status || 'active',
        subtotal: this.calculateSubtotal(items),
        itemCount: this.calculateItemCount(items),
        createdAt: cart.created_at,
        updatedAt: cart.updated_at,
      };
    } catch (error: any) {
      throw new GraphQLError('Failed to get cart', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(input: any, sessionId?: string): Promise<any> {
    try {
      const { sellerId, productId, variantId, quantity } = input;

      // Validate quantity
      if (quantity < 1 || quantity > 10000) {
        throw new GraphQLError('Invalid quantity. Must be between 1 and 10000', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      // Fetch product
      const product = await this.prisma.products.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new GraphQLError('Product not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Find or create cart
      let cart;
      if (sessionId) {
        const cartSession = await this.prisma.cart_sessions.findUnique({
          where: { session_id: sessionId },
          include: { carts: true },
        });

        if (cartSession) {
          cart = cartSession.carts;
        }
      }

      if (!cart) {
        // Create new cart
        cart = await this.prisma.carts.create({
          data: {
            seller_id: sellerId,
            items: [],
            status: 'active',
          },
        });

        // Create cart session if sessionId provided
        if (sessionId) {
          await this.prisma.cart_sessions.create({
            data: {
              session_id: sessionId,
              cart_id: cart.id,
            },
          });
        }
      }

      // Validate seller constraint
      if (cart.seller_id !== sellerId) {
        throw new GraphQLError(
          'Cannot add products from different sellers to the same cart',
          {
            extensions: { code: 'BAD_REQUEST' },
          },
        );
      }

      const items = (cart.items as any[]) || [];

      // Find variant details
      let variant: { size?: string; color?: string } | undefined;
      let variantSku: string | undefined;

      if (variantId && product.variants) {
        const variants = product.variants as any[];
        for (const colorGroup of variants) {
          if (colorGroup.colorName || colorGroup.sizes) {
            const colorName = colorGroup.colorName || '';
            if (colorGroup.sizes && Array.isArray(colorGroup.sizes)) {
              for (const sizeItem of colorGroup.sizes) {
                const constructedId = `${sizeItem.size}-${colorName}`.toLowerCase();
                if (constructedId === variantId) {
                  variant = {
                    size: sizeItem.size,
                    color: colorName || undefined,
                  };
                  variantSku = sizeItem.sku;
                  break;
                }
              }
            }
            if (variant) break;
          }
        }
      }

      // Check if item already exists
      const itemKey = variantId ? `${productId}-${variantId}` : productId;
      const existingItem = items.find((item: any) => {
        const existingKey = item.variantId
          ? `${item.id}-${item.variantId}`
          : item.id;
        return existingKey === itemKey;
      });

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        // Calculate price with discount
        const originalPrice = parseFloat(String(product.price));
        let actualPrice = String(product.price);
        let discountAmount = '0';

        if (
          product.promotion_active === 1 &&
          product.discount_percentage &&
          (!product.promotion_end_date ||
            new Date(product.promotion_end_date) > new Date())
        ) {
          const discount = parseFloat(String(product.discount_percentage));
          const discountedPrice = originalPrice * (1 - discount / 100);
          actualPrice = discountedPrice.toFixed(2);
          discountAmount = (originalPrice - discountedPrice).toFixed(2);
        }

        const cartItem: CartItem = {
          id: product.id,
          name: product.name,
          price: actualPrice,
          originalPrice: String(product.price),
          discountPercentage: product.discount_percentage ? String(product.discount_percentage) : undefined,
          discountAmount: discountAmount !== '0' ? discountAmount : undefined,
          quantity,
          productType: product.product_type,
          depositAmount: product.deposit_amount ? String(product.deposit_amount) : undefined,
          requiresDeposit: product.requires_deposit || undefined,
          sellerId: product.seller_id,
          images: product.images || [product.image],
          promotionActive: product.promotion_active || undefined,
          variantId,
          variant,
          productSku: product.sku || undefined,
          variantSku: variantSku || undefined,
        };

        items.push(cartItem);
      }

      // Update cart
      const updatedCart = await this.prisma.carts.update({
        where: { id: cart.id },
        data: { items: items as any, updated_at: new Date() },
      });

      const result = {
        id: updatedCart.id,
        sellerId: updatedCart.seller_id,
        buyerId: updatedCart.buyer_id,
        items,
        status: updatedCart.status || 'active',
        subtotal: this.calculateSubtotal(items),
        itemCount: this.calculateItemCount(items),
        createdAt: updatedCart.created_at,
        updatedAt: updatedCart.updated_at,
      };

      if (updatedCart.buyer_id) {
        this.websocketGateway.emitCartUpdate(updatedCart.buyer_id, result);
      }

      return result;
    } catch (error: any) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError('Failed to add to cart', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(cartId: string, input: any): Promise<any> {
    try {
      const { productId, variantId, quantity } = input;

      if (quantity < 1 || quantity > 10000) {
        throw new GraphQLError('Invalid quantity. Must be between 1 and 10000', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const cart = await this.prisma.carts.findUnique({
        where: { id: cartId },
      });

      if (!cart) {
        throw new GraphQLError('Cart not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const items = (cart.items as any[]) || [];
      const itemKey = variantId ? `${productId}-${variantId}` : productId;

      const item = items.find((item: any) => {
        const existingKey = item.variantId
          ? `${item.id}-${item.variantId}`
          : item.id;
        return existingKey === itemKey;
      });

      if (!item) {
        throw new GraphQLError('Item not found in cart', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      item.quantity = quantity;

      const updatedCart = await this.prisma.carts.update({
        where: { id: cartId },
        data: { items: items as any, updated_at: new Date() },
      });

      const result = {
        id: updatedCart.id,
        sellerId: updatedCart.seller_id,
        buyerId: updatedCart.buyer_id,
        items,
        status: updatedCart.status || 'active',
        subtotal: this.calculateSubtotal(items),
        itemCount: this.calculateItemCount(items),
        createdAt: updatedCart.created_at,
        updatedAt: updatedCart.updated_at,
      };

      if (updatedCart.buyer_id) {
        this.websocketGateway.emitCartUpdate(updatedCart.buyer_id, result);
      }

      return result;
    } catch (error: any) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError('Failed to update cart item', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(
    cartId: string,
    productId: string,
    variantId?: string,
  ): Promise<any> {
    try {
      const cart = await this.prisma.carts.findUnique({
        where: { id: cartId },
      });

      if (!cart) {
        throw new GraphQLError('Cart not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const items = (cart.items as any[]) || [];
      const itemKey = variantId ? `${productId}-${variantId}` : productId;

      const newItems = items.filter((item: any) => {
        const existingKey = item.variantId
          ? `${item.id}-${item.variantId}`
          : item.id;
        return existingKey !== itemKey;
      });

      const updatedCart = await this.prisma.carts.update({
        where: { id: cartId },
        data: { items: newItems as any, updated_at: new Date() },
      });

      const result = {
        id: updatedCart.id,
        sellerId: updatedCart.seller_id,
        buyerId: updatedCart.buyer_id,
        items: newItems,
        status: updatedCart.status || 'active',
        subtotal: this.calculateSubtotal(newItems),
        itemCount: this.calculateItemCount(newItems),
        createdAt: updatedCart.created_at,
        updatedAt: updatedCart.updated_at,
      };

      if (updatedCart.buyer_id) {
        this.websocketGateway.emitCartUpdate(updatedCart.buyer_id, result);
      }

      return result;
    } catch (error: any) {
      if (error instanceof GraphQLError) throw error;
      throw new GraphQLError('Failed to remove from cart', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(cartId: string): Promise<boolean> {
    try {
      const cart = await this.prisma.carts.update({
        where: { id: cartId },
        data: { items: [] as any, updated_at: new Date() },
      });

      if (cart.buyer_id) {
        this.websocketGateway.emitCartUpdate(cart.buyer_id, {
          id: cart.id,
          sellerId: cart.seller_id,
          buyerId: cart.buyer_id,
          items: [],
          status: cart.status || 'active',
          subtotal: '0.00',
          itemCount: 0,
          createdAt: cart.created_at,
          updatedAt: cart.updated_at,
        });
      }

      return true;
    } catch (error: any) {
      throw new GraphQLError('Failed to clear cart', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }
  }

  /**
   * Helper: Create empty cart
   */
  private createEmptyCart() {
    return {
      id: null,
      sellerId: null,
      buyerId: null,
      items: [],
      status: 'active',
      subtotal: '0.00',
      itemCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Helper: Calculate subtotal
   */
  private calculateSubtotal(items: CartItem[]): string {
    const total = items.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);
    return total.toFixed(2);
  }

  /**
   * Helper: Calculate item count
   */
  private calculateItemCount(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
