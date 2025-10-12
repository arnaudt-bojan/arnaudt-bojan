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
 * - NotificationMessagesService: Email notifications
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
import type { NotificationMessagesService } from './notification-messages.service';
import { calculatePricing, estimateTax } from './pricing.service';
import { logger } from '../logger';
import type Stripe from 'stripe';
import { emailProvider } from './email-provider.service';
import { 
  createEmailTemplate, 
  createEmailButton, 
  createAlertBox, 
  createOrderItemsTable,
  formatPrice 
} from '../email-template';
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
    private notificationService: NotificationMessagesService,
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

      // Step 4: Tax calculation
      const taxableAmount = validation.total + shipping.cost;
      const taxAmount = estimateTax(taxableAmount);

      // Step 5: Pricing calculation
      const pricing = calculatePricing(
        validation.items,
        shipping.cost,
        taxAmount
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

      // Step 7: Create order
      const order = await this.createOrderRecord(
        userId,
        params,
        validation,
        pricing,
        taxAmount,
        sellerCurrency,
        checkoutSessionId
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

      // Step 10: Send notifications (async, don't block response)
      this.sendOrderNotifications(order).catch(error => {
        logger.error('[OrderService] Failed to send notifications', { error });
      });

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
    checkoutSessionId: string
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
    };

    return await this.storage.createOrder(orderData);
  }

  private async createOrderItems(order: Order): Promise<void> {
    try {
      const items = JSON.parse(order.items);
      const orderItemsToCreate: InsertOrderItem[] = items.map((item: any) => ({
        orderId: order.id,
        productId: item.productId || item.id,
        productName: item.name,
        productImage: item.image || null,
        productType: item.productType || 'in-stock',
        quantity: item.quantity,
        price: String(item.price),
        subtotal: String(parseFloat(item.price) * item.quantity),
        depositAmount: item.depositAmount ? String(item.depositAmount) : null,
        requiresDeposit: item.requiresDeposit ? 1 : 0,
        variant: item.variant || null,
        itemStatus: 'pending' as const,
      }));

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

      // Get first item's product to find seller
      const firstProduct = await this.storage.getProduct(orderItems[0].productId);
      if (!firstProduct) {
        logger.error('[OrderService] Cannot send order notifications - product not found', {
          orderId: order.id,
          productId: orderItems[0].productId,
        });
        return;
      }

      // Get seller information for branding
      const seller = await this.storage.getUser(firstProduct.sellerId);
      if (!seller) {
        logger.error('[OrderService] Cannot send order notifications - seller not found', {
          orderId: order.id,
          sellerId: firstProduct.sellerId,
        });
        return;
      }

      // Get seller branding info
      const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.username || 'Store';
      const sellerEmail = seller.email || process.env.RESEND_FROM_EMAIL || 'noreply@upfirst.io';
      
      // 1. Send ORDER CONFIRMATION to BUYER (seller-branded)
      const buyerTemplate = this.notificationService.orderConfirmation(order, sellerName);
      const buyerContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important;" class="dark-mode-text-dark">
            ${buyerTemplate.notificationTitle}
          </h1>
          <p style="margin: 0; color: #6b7280 !important; font-size: 16px;">
            ${buyerTemplate.notificationMessage}
          </p>
        </div>

        ${createAlertBox(`
          <strong>Order #${order.id.slice(0, 8)}</strong><br/>
          Total: ${formatPrice(parseFloat(order.total), order.currency || undefined)}<br/>
          Status: ${order.status}
        `, 'success')}

        <h3 style="margin: 30px 0 15px; color: #1a1a1a !important;">Order Items</h3>
        ${createOrderItemsTable(orderItems.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          price: formatPrice(parseFloat(item.price), order.currency),
        })))}

        <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a1a !important;">Shipping Address</p>
          <p style="margin: 0; color: #6b7280 !important; font-size: 14px; white-space: pre-line;">
            ${order.customerAddress}
          </p>
        </div>

        <p style="color: #6b7280 !important;">
          Thank you for your order! We'll send you another email when your order ships.
        </p>
      `;

      const buyerHtml = createEmailTemplate({
        preheader: buyerTemplate.emailPreheader,
        storeName: sellerName,
        content: buyerContent,
        footerText: `© ${new Date().getFullYear()} ${sellerName}. All rights reserved.`,
      });

      await emailProvider.sendEmail({
        to: order.customerEmail,
        from: sellerEmail,
        replyTo: sellerEmail,
        subject: buyerTemplate.emailSubject,
        html: buyerHtml,
      });

      logger.info('[OrderService] Order confirmation sent to buyer', {
        orderId: order.id,
        customerEmail: order.customerEmail,
      });

      // 2. Send NEW ORDER ALERT to SELLER (platform-branded)
      const sellerTemplate = this.notificationService.newOrderReceived(order, order.currency || undefined);
      const sellerContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important;" class="dark-mode-text-dark">
            ${sellerTemplate.notificationTitle}
          </h1>
          <p style="margin: 0; color: #6b7280 !important; font-size: 16px;">
            ${sellerTemplate.notificationMessage}
          </p>
        </div>

        ${createAlertBox(`
          <strong>Order #${order.id.slice(0, 8)}</strong><br/>
          Customer: ${order.customerName}<br/>
          Total: ${formatPrice(parseFloat(order.total), order.currency)}
        `, 'info')}

        ${createEmailButton('View Order Details', `${this.getBaseUrl()}/dashboard/orders/${order.id}`)}

        <h3 style="margin: 30px 0 15px; color: #1a1a1a !important;">Order Summary</h3>
        ${createOrderItemsTable(orderItems.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          price: formatPrice(parseFloat(item.price), order.currency),
        })))}

        <p style="color: #6b7280 !important;">
          Log in to your dashboard to process this order and update shipping information.
        </p>
      `;

      const sellerHtml = createEmailTemplate({
        preheader: sellerTemplate.emailPreheader,
        storeName: 'Upfirst',
        content: sellerContent,
        footerText: `© ${new Date().getFullYear()} Upfirst. All rights reserved.`,
      });

      await emailProvider.sendEmail({
        to: sellerEmail,
        from: process.env.RESEND_FROM_EMAIL || 'noreply@upfirst.io',
        subject: sellerTemplate.emailSubject,
        html: sellerHtml,
      });

      logger.info('[OrderService] New order alert sent to seller', {
        orderId: order.id,
        sellerEmail,
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
              address: `${order.shippingAddress?.street || ''}\n${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode || ''}\n${order.shippingAddress?.country || ''}`,
            },
            order: {
              id: order.id,
              orderNumber: order.id.slice(0, 8).toUpperCase(),
              date: new Date(order.createdAt || new Date()),
              total: order.total,
              tax: order.taxAmount || '0',
              subtotal: order.subtotalBeforeTax || order.total,
              shipping: order.shippingCost || undefined,
              paymentStatus: order.status,
            },
            items: orderItems.map(item => ({
              name: item.productName || '',
              sku: item.productSku || undefined,
              variant: item.variantId || undefined,
              quantity: item.quantity,
              price: item.unitPrice,
              subtotal: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
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
              address: `${order.shippingAddress?.street || ''}\n${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode || ''}\n${order.shippingAddress?.country || ''}`,
            },
            order: {
              id: order.id,
              orderNumber: order.id.slice(0, 8).toUpperCase(),
              date: new Date(order.createdAt || new Date()),
            },
            items: orderItems.map(item => ({
              name: item.productName || '',
              sku: item.productSku || undefined,
              variant: item.variantId || undefined,
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

      const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.username || 'Store';
      const sellerEmail = seller.email || process.env.RESEND_FROM_EMAIL || 'noreply@upfirst.io';

      // Get refund details - find the refunded item
      const refundedItem = orderItems.find(item => parseFloat(item.refundedAmount || '0') > 0);

      if (!refundedItem) {
        logger.warn('[OrderService] No refunded items found for notification', { orderId: order.id });
        return;
      }

      // Use itemRefunded template
      const template = this.notificationService.itemRefunded(
        order.id,
        refundedItem.productName,
        amount,
        order.currency || 'USD'
      );

      const content = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important;" class="dark-mode-text-dark">
            ${template.notificationTitle}
          </h1>
          <p style="margin: 0; color: #6b7280 !important; font-size: 16px;">
            ${template.notificationMessage}
          </p>
        </div>

        <div style="text-align: center; padding: 30px; background: #f0fdf4; border-radius: 8px; margin: 30px 0;">
          <p style="margin: 0 0 10px; color: #166534; font-weight: 600;">Refund Amount</p>
          <div style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 10px 0;">
            ${formatPrice(amount, order.currency)}
          </div>
          <p style="margin: 10px 0 0; color: #666; font-size: 14px;">
            This will appear in your account within 5-10 business days
          </p>
        </div>

        ${createAlertBox(`
          <strong>Refund Details</strong><br/>
          Order #${order.id.slice(0, 8)}<br/>
          Item: ${refundedItem.productName}<br/>
          Quantity: ${refundedItem.refundedQuantity || 1}
        `, 'success')}

        <p style="color: #6b7280 !important;">
          The refund has been processed and will appear on your original payment method within 5-10 business days. 
          If you have any questions, please reply to this email.
        </p>
      `;

      const html = createEmailTemplate({
        preheader: template.emailPreheader,
        storeName: sellerName,
        content,
        footerText: `© ${new Date().getFullYear()} ${sellerName}. All rights reserved.`,
      });

      await emailProvider.sendEmail({
        to: order.customerEmail,
        from: sellerEmail,
        replyTo: sellerEmail,
        subject: template.emailSubject,
        html,
      });

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

      const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.username || 'Store';
      const sellerEmail = seller.email || process.env.RESEND_FROM_EMAIL || 'noreply@upfirst.io';

      // Use orderShipped template
      const template = this.notificationService.orderShipped(order, sellerName, tracking.trackingNumber);

      const content = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important;" class="dark-mode-text-dark">
            ${template.notificationTitle}
          </h1>
          <p style="margin: 0; color: #6b7280 !important; font-size: 16px;">
            ${template.notificationMessage}
          </p>
        </div>

        ${createAlertBox(`
          <strong>Order #${order.id.slice(0, 8)}</strong><br/>
          ${tracking.trackingNumber ? `Tracking Number: ${tracking.trackingNumber}` : 'Your order is on its way!'}
        `, 'info')}

        ${tracking.trackingUrl ? createEmailButton('Track Your Package', tracking.trackingUrl) : ''}

        ${tracking.carrier ? `
          <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <p style="margin: 0 0 10px; font-weight: 600; color: #1a1a1a !important;">Shipping Carrier</p>
            <p style="margin: 0; color: #6b7280 !important;">${tracking.carrier}</p>
          </div>
        ` : ''}

        <p style="color: #6b7280 !important;">
          Thank you for your order! If you have any questions, please reply to this email.
        </p>
      `;

      const html = createEmailTemplate({
        preheader: template.emailPreheader,
        storeName: sellerName,
        content,
        footerText: `© ${new Date().getFullYear()} ${sellerName}. All rights reserved.`,
      });

      await emailProvider.sendEmail({
        to: order.customerEmail,
        from: sellerEmail,
        replyTo: sellerEmail,
        subject: template.emailSubject,
        html,
      });

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

      const sellerName = [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.username || 'Store';
      const sellerEmail = seller.email || process.env.RESEND_FROM_EMAIL || 'noreply@upfirst.io';

      // Calculate balance amount
      const balanceAmount = paymentIntent.amount / this.getCurrencyDivisor(paymentIntent.currency || 'usd');

      // Use balancePaymentRequest template
      const template = this.notificationService.balancePaymentRequest(order, sellerName);

      // Build payment link with client secret
      const paymentLink = `${this.getBaseUrl()}/checkout-complete?payment_intent_client_secret=${paymentIntent.client_secret}&order_id=${order.id}`;

      const content = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px; font-size: 28px; font-weight: 600; color: #1a1a1a !important;" class="dark-mode-text-dark">
            ${template.notificationTitle}
          </h1>
          <p style="margin: 0; color: #6b7280 !important; font-size: 16px;">
            ${template.notificationMessage}
          </p>
        </div>

        ${createAlertBox(`
          <strong>Order #${order.id.slice(0, 8)}</strong><br/>
          Balance Due: ${formatPrice(balanceAmount, paymentIntent.currency)}<br/>
          Payment Type: Final Balance
        `, 'warning')}

        <div style="text-align: center; margin: 30px 0;">
          <p style="margin: 0 0 20px; color: #1a1a1a !important; font-size: 18px; font-weight: 600;">
            Amount Due: ${formatPrice(balanceAmount, paymentIntent.currency)}
          </p>
          ${createEmailButton('Complete Payment', paymentLink)}
        </div>

        <p style="color: #6b7280 !important;">
          This is the remaining balance for your pre-order. Please complete the payment to finalize your order. 
          The payment link is valid for 24 hours.
        </p>

        <div style="margin: 30px 0; padding: 20px; background: #f0f9ff; border-radius: 8px;">
          <p style="margin: 0; font-weight: 600; color: #0369a1;">Payment Details</p>
          <ul style="margin: 10px 0 0; padding-left: 20px; color: #666; font-size: 14px;">
            <li>Original deposit has been paid</li>
            <li>This is the final balance payment</li>
            <li>Your order will ship once payment is complete</li>
          </ul>
        </div>
      `;

      const html = createEmailTemplate({
        preheader: template.emailPreheader,
        storeName: sellerName,
        content,
        footerText: `© ${new Date().getFullYear()} ${sellerName}. All rights reserved.`,
      });

      await emailProvider.sendEmail({
        to: order.customerEmail,
        from: sellerEmail,
        replyTo: sellerEmail,
        subject: template.emailSubject,
        html,
      });

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
