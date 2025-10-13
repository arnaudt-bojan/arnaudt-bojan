/**
 * OrderService - Comprehensive order management with proper service architecture
 * 
 * Follows "Option C - Perfect Architecture":
 * - Service layer handles business logic and orchestration
 * - Storage layer handles data access
 * - Clean dependency injection
 * - Proper error handling and rollback
 * 
 * Coordinates with:
 * - InventoryService: Stock reservations and commits
 * - CartValidationService: Server-side price validation
 * - ShippingService: Shipping cost calculation
 * - NotificationService: Email and in-app notifications
 * - Stripe: Payment processing and refunds
 */

import type { IStorage } from '../storage';
import type {
  Order,
  InsertOrder,
  OrderItem,
  InsertOrderItem,
  Product,
  User,
} from '@shared/schema';
import type { InventoryService } from './inventory.service';
import type { CartValidationService } from './cart-validation.service';
import type { ShippingService } from './shipping.service';
import type { TaxService } from './tax.service';
import type { NotificationService } from '../notifications';
import { calculatePricing } from './pricing.service';
import { logger } from '../logger';
import type Stripe from 'stripe';
import { DocumentGenerator, type InvoiceData, type PackingSlipData } from './document-generator';
import { Storage } from '@google-cloud/storage';

// ===========================================================================
// Interfaces
// ============================================================================

export interface CreateOrderParams {
  customerEmail: string;
  customerName: string;
  customerAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
    variant?: {
      size?: string;
      color?: string;
    };
  }>;
  destination: {
    country: string;
    state?: string;
    postalCode?: string;
  };
}

export interface CreateOrderResult {
  success: boolean;
  order?: Order;
  error?: string;
  details?: string[];
}

export interface RefundParams {
  orderId: string;
  sellerId: string;
  refundType: 'full' | 'item';
  refundItems?: Array<{
    itemId: string;
    quantity: number;
  }>;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}

export interface UpdateTrackingParams {
  orderId: string;
  sellerId: string;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
}

export interface BalancePaymentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface UpdateStatusParams {
  orderId: string;
  sellerId: string;
  status: string;
}

// ============================================================================
// OrderService
// ============================================================================

export class OrderService {
  constructor(
    private storage: IStorage,
    private inventoryService: InventoryService,
    private cartValidationService: CartValidationService,
    private shippingService: ShippingService,
    private taxService: TaxService,
    private notificationService: NotificationService,
    private stripe?: Stripe
  ) {}

  /**
   * Create order - Full orchestration of order creation process
   * 
   * Steps:
   * 1. User lookup/creation (guest checkout support)
   * 2. Cart validation (server-side pricing)
   * 3. Shipping calculation
   * 4. Tax calculation
   * 5. Inventory reservation (CRITICAL for preventing overselling)
   * 6. Order creation
   * 7. Order items creation
   * 8. Notification sending
   * 
   * Rollback on ANY failure
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    let userId: string;
    const successfulReservations: any[] = [];
    let createdOrder: Order | null = null; // Track order creation for rollback

    try {
      // Step 1: User lookup/creation
      const userResult = await this.getOrCreateUser(
        params.customerEmail,
        params.customerName
      );

      if (!userResult.success || !userResult.user) {
        return {
          success: false,
          error: userResult.error || 'Failed to create/find user',
        };
      }

      userId = userResult.user.id;

      // Step 2: Cart validation (server-side pricing)
      const validation = await this.cartValidationService.validateCart(
        params.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      );

      if (!validation.valid) {
        return {
          success: false,
          error: 'Invalid cart items',
          details: validation.errors,
        };
      }

      // Step 3: Shipping calculation
      const shipping = await this.shippingService.calculateShipping(
        params.items.map(i => ({ id: i.productId, quantity: i.quantity })),
        params.destination
      );

      // Step 4: Tax calculation using Stripe Tax (Plan C architecture)
      const sellerId = validation.items[0]?.sellerId || '';
      const seller = await this.storage.getUser(sellerId);
      const currency = seller?.listingCurrency || 'USD';

      const taxCalculation = await this.taxService.calculateTax({
        amount: validation.total + shipping.cost,
        currency: currency,
        shippingAddress: params.customerAddress,
        sellerId: sellerId,
        items: validation.items.map(item => ({
          id: item.id,
          price: item.price.toString(),
          quantity: item.quantity,
        })),
        shippingCost: shipping.cost,
      });

      // Step 5: Pricing calculation
      const pricing = calculatePricing(
        validation.items,
        shipping.cost,
        taxCalculation.taxAmount
      );

      // Get seller currency
      const sellerCurrency = await this.getSellerCurrency(validation.items[0]?.id);

      // Step 6: Inventory reservation (CRITICAL)
      const checkoutSessionId = `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const reservationResult = await this.reserveInventory(
        params.items,
        validation.items,
        userId,
        checkoutSessionId
      );

      if (!reservationResult.success) {
        return {
          success: false,
          error: 'Some items are no longer available',
          details: reservationResult.errors,
        };
      }

      successfulReservations.push(...(reservationResult.reservations || []));

      // Step 7: Create order with shipping data
      const order = await this.createOrderRecord(
        userId,
        params,
        validation,
        pricing,
        taxCalculation.taxAmount,
        sellerCurrency,
        checkoutSessionId,
        taxCalculation.calculationId,
        shipping
      );
      createdOrder = order; // Track for rollback

      // Step 8: Create order items
      await this.createOrderItems(order);

      // Step 9: CRITICAL - Commit inventory reservations (finalize stock deduction)
      // This is NOT best-effort - if commit fails, we must roll back the entire order
      const commitResult = await this.inventoryService.commitReservationsBySession(checkoutSessionId, order.id);
      
      if (!commitResult.success) {
        logger.error('[OrderService] CRITICAL - Failed to commit inventory, rolling back order', {
          orderId: order.id,
          checkoutSessionId,
          error: commitResult.error,
        });
        
        // ROLLBACK: Delete order and order items since inventory couldn't be committed
        try {
          await this.storage.deleteOrderItems(order.id);
          await this.storage.deleteOrder(order.id);
          logger.info('[OrderService] Successfully rolled back order and items', { orderId: order.id });
        } catch (rollbackError: any) {
          logger.error('[OrderService] Failed to rollback order - manual intervention required', {
            orderId: order.id,
            error: rollbackError.message,
          });
        }
        
        // Release reservations (cleanup)
        for (const reservation of successfulReservations) {
          await this.inventoryService.releaseReservation(reservation.id);
        }
        
        // Return error - order creation FAILED
        return {
          success: false,
          error: 'Failed to finalize inventory. Please try again.',
        };
      }

      logger.info('[OrderService] Inventory committed successfully', {
        orderId: order.id,
        checkoutSessionId,
        committed: commitResult.committed,
      });

      // NOTE: Order notifications are now sent from payment webhook after amountPaid is set
      // This fixes the "$0.00 Amount Paid" bug in seller emails
      // See: server/services/payment/webhook-handler.ts - handlePaymentIntentSucceeded()

      logger.info('[OrderService] Order created successfully', {
        orderId: order.id,
        checkoutSessionId,
        itemCount: validation.items.length,
      });

      return {
        success: true,
        order,
      };

    } catch (error: any) {
      // CRITICAL ROLLBACK: Clean up ALL created resources
      logger.error('[OrderService] Order creation failed - initiating full rollback', { 
        error: error.message,
        orderCreated: !!createdOrder,
        reservationsCount: successfulReservations.length,
      });

      // 1. Rollback order and items if they were created
      if (createdOrder) {
        try {
          await this.storage.deleteOrderItems(createdOrder.id);
          await this.storage.deleteOrder(createdOrder.id);
          logger.info('[OrderService] Successfully rolled back order and items', { 
            orderId: createdOrder.id 
          });
        } catch (rollbackError: any) {
          logger.error('[OrderService] Failed to rollback order - manual intervention required', {
            orderId: createdOrder.id,
            error: rollbackError.message,
          });
        }
      }

      // 2. Release any successful reservations
      if (successfulReservations.length > 0) {
        logger.warn('[OrderService] Rolling back reservations', {
          count: successfulReservations.length,
        });

        for (const reservation of successfulReservations) {
          await this.inventoryService.releaseReservation(reservation.id);
        }
      }

      logger.error('[OrderService] Order creation failed after full rollback', { error });
      return {
        success: false,
        error: error.message || 'Failed to create order',
      };
    }
  }

  /**
   * Update order status with auto-document generation
   */
  async updateOrderStatus(params: UpdateStatusParams): Promise<Order> {
    const order = await this.storage.getOrder(params.orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    // Verify seller authorization
    await this.verifySellerAuthorization(params.orderId, params.sellerId);

    // Update status
    const updatedOrder = await this.storage.updateOrderStatus(
      params.orderId,
      params.status
    );

    if (!updatedOrder) {
      throw new Error('Failed to update order status');
    }

    // Auto-generate documents based on status
    this.handleStatusChangeDocuments(updatedOrder).catch(error => {
      logger.error('[OrderService] Document generation failed', { error });
    });

    return updatedOrder;
  }

  /**
   * Process refund (full or item-level)
   */
  async processRefund(params: RefundParams): Promise<RefundResult> {
    if (!this.stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }

    try {
      const order = await this.storage.getOrder(params.orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Verify seller authorization
      await this.verifySellerAuthorization(params.orderId, params.sellerId);

      // Calculate refund amount (NEVER trust client)
      const refundAmount = await this.calculateRefundAmount(
        params.orderId,
        params.refundType,
        params.refundItems
      );

      if (refundAmount <= 0) {
        return { success: false, error: 'No refundable amount' };
      }

      // Process Stripe refund
      const stripeRefund = await this.stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId || '',
        amount: Math.round(refundAmount * 100),
        reason: params.reason as any,
        metadata: {
          orderId: params.orderId,
          refundType: params.refundType,
        },
      });

      // Update order refund tracking
      await this.updateRefundTracking(
        params.orderId,
        params.refundType,
        params.refundItems,
        refundAmount
      );

      // Send refund notifications
      this.sendRefundNotifications(order, refundAmount).catch(error => {
        logger.error('[OrderService] Refund notification failed', { error });
      });

      logger.info('[OrderService] Refund processed successfully', {
        orderId: params.orderId,
        refundId: stripeRefund.id,
        amount: refundAmount,
      });

      return {
        success: true,
        refundId: stripeRefund.id,
        amount: refundAmount,
      };

    } catch (error: any) {
      logger.error('[OrderService] Refund processing failed', { error });
      return {
        success: false,
        error: error.message || 'Failed to process refund',
      };
    }
  }

  /**
   * Update tracking information
   */
  async updateTracking(params: UpdateTrackingParams): Promise<void> {
    // Verify seller authorization
    await this.verifySellerAuthorization(params.orderId, params.sellerId);

    // Update tracking
    await this.storage.updateOrderTracking(
      params.orderId,
      params.trackingNumber || '',
      params.trackingUrl || ''
    );

    // Send tracking notification
    const order = await this.storage.getOrder(params.orderId);
    if (order && params.trackingNumber) {
      this.sendTrackingNotification(order, params).catch(error => {
        logger.error('[OrderService] Tracking notification failed', { error });
      });
    }
  }

  /**
   * Request balance payment
   */
  async requestBalancePayment(
    orderId: string,
    sellerId: string
  ): Promise<BalancePaymentResult> {
    if (!this.stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }

    try {
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Verify seller authorization
      await this.verifySellerAuthorization(orderId, sellerId);

      const remainingBalance = parseFloat(order.remainingBalance || '0');
      if (remainingBalance <= 0) {
        return { success: false, error: 'No balance remaining' };
      }

      // Create payment intent for balance
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(remainingBalance * 100),
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          orderId: order.id,
          paymentType: 'balance',
        },
      });

      // Update order with balance payment intent
      await this.storage.updateOrderBalancePaymentIntent(
        order.id,
        paymentIntent.id
      );

      // Send balance payment request email
      this.sendBalancePaymentNotification(order, paymentIntent).catch(error => {
        logger.error('[OrderService] Balance payment notification failed', { error });
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        paymentIntentId: paymentIntent.id,
      };

    } catch (error: any) {
      logger.error('[OrderService] Balance payment request failed', { error });
      return {
        success: false,
        error: error.message || 'Failed to request balance payment',
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getOrCreateUser(
    email: string,
    name: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const allUsers = await this.storage.getAllUsers();
    let user = allUsers.find(u => u.email?.toLowerCase().trim() === normalizedEmail);

    // Check if seller trying to checkout
    const sellerRoles = ['admin', 'editor', 'viewer', 'seller', 'owner'];
    if (user && sellerRoles.includes(user.role)) {
      return {
        success: false,
        error: 'This is a seller account email. Sellers cannot checkout as buyers. Please use a different email address.',
      };
    }

    if (!user) {
      // Create buyer account
      const newUserId = Math.random().toString(36).substring(2, 8);
      const [firstName, ...lastNameParts] = (name || 'Guest User').split(' ');
      const username = await this.generateUniqueUsername();

      user = await this.storage.upsertUser({
        id: newUserId,
        email: normalizedEmail,
        username,
        firstName: firstName || 'Guest',
        lastName: lastNameParts.join(' ') || 'User',
        profileImageUrl: null,
        role: 'buyer',
        userType: 'buyer',
        password: null,
      });

      logger.info('[OrderService] Created buyer account', {
        email: normalizedEmail,
        username,
      });
    }

    return { success: true, user };
  }

  private async reserveInventory(
    requestedItems: CreateOrderParams['items'],
    validatedItems: any[],
    userId: string,
    checkoutSessionId: string
  ): Promise<{ success: boolean; reservations?: any[]; errors?: string[] }> {
    const failedReservations: any[] = [];
    const successfulReservations: any[] = [];

    for (let i = 0; i < requestedItems.length; i++) {
      const requestedItem = requestedItems[i];
      const validatedItem = validatedItems[i];

      const variantId = requestedItem.variant
        ? this.inventoryService.getVariantId(
            requestedItem.variant.size,
            requestedItem.variant.color
          )
        : undefined;

      const reservationResult = await this.inventoryService.reserveStock(
        requestedItem.productId,
        requestedItem.quantity,
        checkoutSessionId,
        {
          variantId,
          userId,
          expirationMinutes: 30,
        }
      );

      if (!reservationResult.success) {
        failedReservations.push({
          productName: validatedItem.name,
          error: reservationResult.error,
          available: reservationResult.availability?.availableStock || 0,
        });
      } else {
        successfulReservations.push(reservationResult.reservation);
      }
    }

    if (failedReservations.length > 0) {
      // Release successful reservations
      for (const reservation of successfulReservations) {
        await this.inventoryService.releaseReservation(reservation!.id);
      }

      return {
        success: false,
        errors: failedReservations.map(f => `${f.productName}: ${f.error}`),
      };
    }

    return {
      success: true,
      reservations: successfulReservations,
    };
  }

  private async createOrderRecord(
    userId: string,
    params: CreateOrderParams,
    validation: any,
    pricing: any,
    taxAmount: number,
    currency: string,
    checkoutSessionId: string,
    taxCalculationId?: string,
    shipping?: {
      cost: number;
      method: string;
      zone?: string;
      estimatedDays?: string;
      carrier?: string;
    }
  ): Promise<Order> {
    const fullAddress = [
      params.customerAddress.line1,
      params.customerAddress.line2,
      `${params.customerAddress.city}, ${params.customerAddress.state} ${params.customerAddress.postalCode}`,
      params.customerAddress.country,
    ]
      .filter(Boolean)
      .join('\n');

    const orderData: InsertOrder = {
      userId,
      customerName: params.customerName,
      customerEmail: params.customerEmail.toLowerCase().trim(),
      customerAddress: fullAddress,
      taxCalculationId: taxCalculationId || null,
      items: JSON.stringify(
        validation.items.map((item: any) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          productType: item.productType,
          depositAmount: item.depositAmount,
          requiresDeposit: item.requiresDeposit,
          variant: params.items.find(i => i.productId === item.id)?.variant || null,
        }))
      ),
      total: pricing.fullTotal.toString(),
      amountPaid: '0',
      remainingBalance: pricing.payingDepositOnly
        ? pricing.remainingBalance.toString()
        : '0',
      paymentType: pricing.payingDepositOnly ? 'deposit' : 'full',
      paymentStatus: 'pending',
      status: 'pending',
      subtotalBeforeTax: pricing.subtotal.toString(),
      taxAmount: taxAmount.toString(),
      currency,
      // Save shipping data from ShippingService
      shippingCost: shipping ? shipping.cost.toString() : null,
      shippingMethod: shipping ? shipping.method : null,
      shippingZone: shipping?.zone || null,
      shippingCarrier: shipping?.carrier || null,
      shippingEstimatedDays: shipping?.estimatedDays || null,
      // Save shipping address fields for better querying and display
      shippingStreet: params.customerAddress.line1,
      shippingCity: params.customerAddress.city,
      shippingState: params.customerAddress.state,
      shippingPostalCode: params.customerAddress.postalCode,
      shippingCountry: params.customerAddress.country,
    };

    return await this.storage.createOrder(orderData);
  }

  private async createOrderItems(order: Order): Promise<void> {
    try {
      const items = JSON.parse(order.items);
      const orderItemsToCreate: InsertOrderItem[] = items.map((item: any) => {
        const itemPrice = parseFloat(item.price);
        const subtotal = itemPrice * item.quantity;
        const productType = item.productType || 'in-stock';
        
        // FIX BUG #3: Calculate per-item balance amount
        let balanceAmount: string | null = null;
        if ((productType === 'pre-order' || productType === 'made-to-order') && item.depositAmount) {
          const depositPerItem = parseFloat(item.depositAmount);
          const totalDeposit = depositPerItem * item.quantity;
          balanceAmount = String(subtotal - totalDeposit);
        }
        
        return {
          orderId: order.id,
          productId: item.productId || item.id,
          productName: item.name,
          productImage: item.image || null,
          productType,
          quantity: item.quantity,
          price: String(item.price),
          subtotal: String(subtotal),
          depositAmount: item.depositAmount ? String(item.depositAmount) : null,
          balanceAmount,
          requiresDeposit: item.requiresDeposit ? 1 : 0,
          variant: item.variant || null,
          itemStatus: 'pending' as const,
        };
      });

      await this.storage.createOrderItems(orderItemsToCreate);
      logger.info('[OrderService] Created order items', {
        orderId: order.id,
        count: orderItemsToCreate.length,
      });
    } catch (error) {
      logger.error('[OrderService] Failed to create order items', { error });
    }
  }

  private async getSellerCurrency(productId: string): Promise<string> {
    try {
      const product = await this.storage.getProduct(productId);
      if (product?.sellerId) {
        const seller = await this.storage.getUser(product.sellerId);
        if (seller?.listingCurrency) {
          return seller.listingCurrency;
        }
      }
    } catch (error) {
      logger.error('[OrderService] Failed to get seller currency', { error });
    }
    return 'USD';
  }

  private async verifySellerAuthorization(
    orderId: string,
    sellerId: string
  ): Promise<void> {
    const order = await this.storage.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const items = JSON.parse(order.items);
    const allProducts = await this.storage.getAllProducts();
    const orderProductIds = items.map((item: any) => item.productId);
    const sellerProducts = allProducts.filter(p => p.sellerId === sellerId);
    const sellerProductIds = new Set(sellerProducts.map(p => p.id));

    const isSeller = orderProductIds.some((id: string) => sellerProductIds.has(id));

    if (!isSeller) {
      throw new Error('Access denied');
    }
  }

  private async calculateRefundAmount(
    orderId: string,
    refundType: 'full' | 'item',
    refundItems?: Array<{ itemId: string; quantity: number }>
  ): Promise<number> {
    const orderItems = await this.storage.getOrderItems(orderId);
    let refundAmount = 0;

    if (refundType === 'full') {
      for (const item of orderItems) {
        const alreadyRefunded = parseFloat(item.refundedAmount || '0');
        const itemTotal = parseFloat(item.subtotal);
        refundAmount += itemTotal - alreadyRefunded;
      }
    } else if (refundType === 'item' && refundItems) {
      for (const refundItem of refundItems) {
        const item = orderItems.find(i => i.id === refundItem.itemId);
        if (item) {
          const itemPrice = parseFloat(item.price);
          const alreadyRefunded = parseFloat(item.refundedAmount || '0');
          const itemRefund = itemPrice * refundItem.quantity;
          refundAmount += Math.min(itemRefund, parseFloat(item.subtotal) - alreadyRefunded);
        }
      }
    }

    return refundAmount;
  }

  private async updateRefundTracking(
    orderId: string,
    refundType: 'full' | 'item',
    refundItems: Array<{ itemId: string; quantity: number }> | undefined,
    amount: number
  ): Promise<void> {
    if (refundType === 'full') {
      const orderItems = await this.storage.getOrderItems(orderId);
      for (const item of orderItems) {
        const alreadyRefunded = parseFloat(item.refundedAmount || '0');
        const itemTotal = parseFloat(item.subtotal);
        const itemRefund = itemTotal - alreadyRefunded;

        await this.storage.updateOrderItemRefund(
          item.id,
          item.quantity,
          (alreadyRefunded + itemRefund).toString(),
          'refunded'
        );
      }
    } else if (refundType === 'item' && refundItems) {
      for (const refundItem of refundItems) {
        const item = await this.storage.getOrderItemById(refundItem.itemId);
        if (item) {
          const itemPrice = parseFloat(item.price);
          const alreadyRefunded = parseFloat(item.refundedAmount || '0');
          const refundAmount = itemPrice * refundItem.quantity;

          await this.storage.updateOrderItemRefund(
            refundItem.itemId,
            (item.refundedQuantity || 0) + refundItem.quantity,
            (alreadyRefunded + refundAmount).toString(),
            'partially_refunded'
          );
        }
      }
    }
  }

  private async sendOrderNotifications(order: Order): Promise<void> {
    try {
      // Get seller from order items (all items must be from same seller)
      const orderItems = await this.storage.getOrderItems(order.id);
      if (orderItems.length === 0) {
        logger.error('[OrderService] Cannot send order notifications - no order items found', {
          orderId: order.id,
        });
        return;
      }

      // Get products for the order items
      const productIds = [...new Set(orderItems.map(item => item.productId))];
      const products: Product[] = [];
      
      for (const productId of productIds) {
        const product = await this.storage.getProduct(productId);
        if (product) {
          products.push(product);
        }
      }

      if (products.length === 0) {
        logger.error('[OrderService] Cannot send order notifications - no products found', {
          orderId: order.id,
        });
        return;
      }

      // Get seller information
      const seller = await this.storage.getUser(products[0].sellerId);
      if (!seller) {
        logger.error('[OrderService] Cannot send order notifications - seller not found', {
          orderId: order.id,
          sellerId: products[0].sellerId,
        });
        return;
      }

      // Send order confirmation to buyer (also creates in-app notification for seller)
      await this.notificationService.sendOrderConfirmation(order, seller, products);

      logger.info('[OrderService] Order confirmation sent to buyer', {
        orderId: order.id,
        customerEmail: order.customerEmail,
      });

      // Send order notification email to seller
      await this.notificationService.sendSellerOrderNotification(order, seller, products);

      logger.info('[OrderService] Seller order notification sent', {
        orderId: order.id,
        sellerEmail: seller.email,
      });
    } catch (error) {
      logger.error('[OrderService] Failed to send order notifications', { error, orderId: order.id });
    }
  }

  private async handleStatusChangeDocuments(order: Order): Promise<void> {
    try {
      // Get seller from order items
      const orderItems = await this.storage.getOrderItems(order.id);
      if (orderItems.length === 0) {
        logger.error('[OrderService] Cannot generate documents - no order items', {
          orderId: order.id,
        });
        return;
      }

      const firstProduct = await this.storage.getProduct(orderItems[0].productId);
      if (!firstProduct) {
        logger.error('[OrderService] Cannot generate documents - product not found', {
          orderId: order.id,
        });
        return;
      }

      const seller = await this.storage.getUser(firstProduct.sellerId);
      if (!seller) {
        logger.error('[OrderService] Cannot generate documents - seller not found', {
          orderId: order.id,
        });
        return;
      }

      // Generate INVOICE when order is paid
      if (order.status === 'paid') {
        try {
          // Check if invoice already exists
          const existingInvoices = await this.storage.getInvoicesByOrderId(order.id);
          if (existingInvoices.length > 0) {
            logger.info('[OrderService] Invoice already exists for order', {
              orderId: order.id,
              invoiceId: existingInvoices[0].id,
            });
            return;
          }

          logger.info('[OrderService] Generating invoice for order', {
            orderId: order.id,
            sellerId: seller.id,
          });

          // Prepare invoice data
          const invoiceNumber = DocumentGenerator.generateDocumentNumber('INV');
          const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.username || 'Store';
          
          // Parse customerAddress JSON
          let parsedAddress: any = {};
          try {
            parsedAddress = JSON.parse(order.customerAddress);
          } catch (e) {
            logger.warn('[OrderService] Failed to parse customerAddress', { orderId: order.id });
          }

          const invoiceData: InvoiceData = {
            invoice: {
              number: invoiceNumber,
              date: new Date(),
            },
            seller: {
              businessName: sellerName,
              email: seller.email || '',
              logo: seller.storeLogo || undefined,
            },
            customer: {
              name: order.customerName || '',
              email: order.customerEmail || '',
              address: `${parsedAddress.street || parsedAddress.line1 || ''}\n${parsedAddress.city || ''}, ${parsedAddress.state || ''} ${parsedAddress.postalCode || ''}\n${parsedAddress.country || ''}`,
            },
            order: {
              id: order.id,
              orderNumber: order.id.slice(0, 8).toUpperCase(),
              date: new Date(order.createdAt || new Date()),
              total: order.total,
              tax: order.taxAmount || '0',
              subtotal: order.subtotalBeforeTax || order.total,
              shipping: undefined,
              paymentStatus: order.status,
            },
            items: orderItems.map(item => ({
              name: item.productName || '',
              sku: undefined,
              variant: item.variant ? JSON.stringify(item.variant) : undefined,
              quantity: item.quantity,
              price: item.price,
              subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
            })),
            currency: order.currency || 'USD',
          };

          // Generate PDF
          const { url: documentUrl } = await DocumentGenerator.generateInvoice(invoiceData);

          // Store invoice record
          await this.storage.createInvoice({
            orderId: order.id,
            sellerId: seller.id,
            invoiceNumber,
            documentUrl,
            documentType: 'invoice',
            orderType: 'b2c',
            currency: order.currency || 'USD',
            totalAmount: order.total,
            taxAmount: order.taxAmount || '0',
            generationTrigger: 'auto_on_payment',
          });

          logger.info('[OrderService] Invoice generated successfully', {
            orderId: order.id,
            invoiceNumber,
            documentUrl,
          });
        } catch (error) {
          logger.error('[OrderService] Invoice generation failed', { error, orderId: order.id });
        }
      }

      // Generate PACKING SLIP when order is shipped
      if (order.status === 'shipped') {
        try {
          // Check if packing slip already exists
          const existingSlips = await this.storage.getPackingSlipsByOrderId(order.id);
          if (existingSlips.length > 0) {
            logger.info('[OrderService] Packing slip already exists for order', {
              orderId: order.id,
              slipId: existingSlips[0].id,
            });
            return;
          }

          logger.info('[OrderService] Generating packing slip for order', {
            orderId: order.id,
            sellerId: seller.id,
          });

          // Prepare packing slip data
          const packingSlipNumber = DocumentGenerator.generateDocumentNumber('PS');
          const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.username || 'Store';
          
          // Parse customerAddress JSON
          let parsedAddress: any = {};
          try {
            parsedAddress = JSON.parse(order.customerAddress);
          } catch (e) {
            logger.warn('[OrderService] Failed to parse customerAddress', { orderId: order.id });
          }

          const packingSlipData: PackingSlipData = {
            packingSlip: {
              number: packingSlipNumber,
              date: new Date(),
            },
            seller: {
              businessName: sellerName,
              logo: seller.storeLogo || undefined,
            },
            customer: {
              name: order.customerName || '',
              email: order.customerEmail || '',
              address: `${parsedAddress.street || parsedAddress.line1 || ''}\n${parsedAddress.city || ''}, ${parsedAddress.state || ''} ${parsedAddress.postalCode || ''}\n${parsedAddress.country || ''}`,
            },
            order: {
              id: order.id,
              orderNumber: order.id.slice(0, 8).toUpperCase(),
              date: new Date(order.createdAt || new Date()),
            },
            items: orderItems.map(item => ({
              name: item.productName || '',
              sku: undefined,
              variant: item.variant ? JSON.stringify(item.variant) : undefined,
              quantity: item.quantity,
            })),
          };

          // Generate PDF
          const { url: documentUrl } = await DocumentGenerator.generatePackingSlip(packingSlipData);

          // Store packing slip record
          await this.storage.createPackingSlip({
            orderId: order.id,
            sellerId: seller.id,
            packingSlipNumber,
            documentUrl,
            documentType: 'packing_slip',
            generationTrigger: 'auto_on_ready_to_ship',
          });

          logger.info('[OrderService] Packing slip generated successfully', {
            orderId: order.id,
            packingSlipNumber,
            documentUrl,
          });
        } catch (error) {
          logger.error('[OrderService] Packing slip generation failed', { error, orderId: order.id });
        }
      }
    } catch (error) {
      logger.error('[OrderService] Status change document handling failed', { error, orderId: order.id });
    }
  }

  private async sendRefundNotifications(order: Order, amount: number): Promise<void> {
    try {
      // Get seller from order items
      const orderItems = await this.storage.getOrderItems(order.id);
      if (orderItems.length === 0) {
        logger.error('[OrderService] Cannot send refund notification - no order items', {
          orderId: order.id,
        });
        return;
      }

      const firstProduct = await this.storage.getProduct(orderItems[0].productId);
      if (!firstProduct) {
        logger.error('[OrderService] Cannot send refund notification - product not found', {
          orderId: order.id,
        });
        return;
      }

      const seller = await this.storage.getUser(firstProduct.sellerId);
      if (!seller) {
        logger.error('[OrderService] Cannot send refund notification - seller not found', {
          orderId: order.id,
        });
        return;
      }

      // Get refund details - find the refunded item
      const refundedItem = orderItems.find(item => parseFloat(item.refundedAmount || '0') > 0);

      if (!refundedItem) {
        logger.warn('[OrderService] No refunded items found for notification', { orderId: order.id });
        return;
      }

      // Send refund notification using NotificationService
      await this.notificationService.sendItemRefunded(
        order,
        refundedItem,
        seller,
        amount,
        refundedItem.refundedQuantity || 1,
        order.currency || 'USD'
      );

      logger.info('[OrderService] Refund notification sent', {
        orderId: order.id,
        customerEmail: order.customerEmail,
        amount,
      });
    } catch (error) {
      logger.error('[OrderService] Failed to send refund notification', { error, orderId: order.id });
    }
  }

  private async sendTrackingNotification(
    order: Order,
    tracking: UpdateTrackingParams
  ): Promise<void> {
    try {
      // Get seller from order items
      const orderItems = await this.storage.getOrderItems(order.id);
      if (orderItems.length === 0) {
        logger.error('[OrderService] Cannot send tracking notification - no order items', {
          orderId: order.id,
        });
        return;
      }

      const firstProduct = await this.storage.getProduct(orderItems[0].productId);
      if (!firstProduct) {
        logger.error('[OrderService] Cannot send tracking notification - product not found', {
          orderId: order.id,
        });
        return;
      }

      const seller = await this.storage.getUser(firstProduct.sellerId);
      if (!seller) {
        logger.error('[OrderService] Cannot send tracking notification - seller not found', {
          orderId: order.id,
        });
        return;
      }

      // Update order with tracking info before sending notification
      const updatedOrder = { ...order, trackingNumber: tracking.trackingNumber || order.trackingNumber };

      // Send order shipped notification with tracking info
      await this.notificationService.sendOrderShipped(updatedOrder, seller);

      logger.info('[OrderService] Tracking notification sent', {
        orderId: order.id,
        customerEmail: order.customerEmail,
        trackingNumber: tracking.trackingNumber,
      });
    } catch (error) {
      logger.error('[OrderService] Failed to send tracking notification', { error, orderId: order.id });
    }
  }

  private async sendBalancePaymentNotification(
    order: Order,
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    try {
      // Get seller from order items
      const orderItems = await this.storage.getOrderItems(order.id);
      if (orderItems.length === 0) {
        logger.error('[OrderService] Cannot send balance payment notification - no order items', {
          orderId: order.id,
        });
        return;
      }

      const firstProduct = await this.storage.getProduct(orderItems[0].productId);
      if (!firstProduct) {
        logger.error('[OrderService] Cannot send balance payment notification - product not found', {
          orderId: order.id,
        });
        return;
      }

      const seller = await this.storage.getUser(firstProduct.sellerId);
      if (!seller) {
        logger.error('[OrderService] Cannot send balance payment notification - seller not found', {
          orderId: order.id,
        });
        return;
      }

      // Build payment link with client secret
      const paymentLink = `${this.getBaseUrl()}/checkout-complete?payment_intent_client_secret=${paymentIntent.client_secret}&order_id=${order.id}`;

      // Send balance payment request using NotificationService
      await this.notificationService.sendBalancePaymentRequest(order, seller, paymentLink);

      // Calculate balance amount for logging
      const balanceAmount = paymentIntent.amount / this.getCurrencyDivisor(paymentIntent.currency || 'usd');

      logger.info('[OrderService] Balance payment notification sent', {
        orderId: order.id,
        customerEmail: order.customerEmail,
        balanceAmount,
      });
    } catch (error) {
      logger.error('[OrderService] Failed to send balance payment notification', { error, orderId: order.id });
    }
  }

  private getBaseUrl(): string {
    return process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : `http://localhost:${process.env.PORT || 5000}`;
  }

  private getCurrencyDivisor(currency: string): number {
    const zeroDecimalCurrencies = ['jpy', 'krw'];
    const threeDecimalCurrencies = ['bhd', 'jod', 'kwd', 'omr', 'tnd'];
    
    const currencyLower = currency.toLowerCase();
    
    if (zeroDecimalCurrencies.includes(currencyLower)) {
      return 1;
    } else if (threeDecimalCurrencies.includes(currencyLower)) {
      return 1000;
    } else {
      return 100; // Default for most currencies (USD, EUR, GBP, etc.)
    }
  }

  private async generateUniqueUsername(): Promise<string> {
    const prefix = 'user';
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${randomSuffix}`;
  }
}
