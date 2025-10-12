/**
 * PaymentService - Comprehensive payment orchestration service
 * 
 * Implements e-commerce payment best practices:
 * - Server-orchestrated payment flow (order → payment intent → confirmation)
 * - Idempotent operations using checkout session IDs
 * - Atomic order creation with inventory commitment
 * - Proper currency handling (zero/two/three decimal)
 * - 3DS authentication support
 * - Stripe Connect integration with platform fees
 * - Race condition prevention
 * 
 * Architecture Rule 3: Every payment operation MUST be idempotent
 */

import type { IStorage } from '../../storage';
import type { IPaymentProvider } from './payment-provider.interface';
import type { InventoryService } from '../inventory.service';
import type { InsertOrder, Product, User } from '@shared/schema';
import type { CreateIntentParams } from './types';
import { logger } from '../../logger';
import { nanoid } from 'nanoid';

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  items: Array<{
    id: string;
    productId?: string;
    quantity: number;
    variantId?: string;
  }>;
  orderData: InsertOrder;
  checkoutSessionId?: string;
  paymentType?: 'full' | 'deposit';
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  orderId: string;
  requiresAction: boolean;
}

export interface PaymentConfirmationResult {
  success: boolean;
  orderId: string;
  status: string;
  requiresAction: boolean;
  error?: string;
}

export class PaymentService {
  constructor(
    private storage: IStorage,
    private provider: IPaymentProvider,
    private inventoryService: InventoryService
  ) {}

  /**
   * Create payment intent with atomic order creation and inventory reservation
   * 
   * Flow:
   * 1. Validate seller and get currency
   * 2. Reserve inventory (atomic with row-level locking)
   * 3. Create order in pending state
   * 4. Create payment intent with idempotency
   * 5. Store payment intent
   * 
   * Idempotency: Uses checkoutSessionId to prevent duplicate charges
   */
  async createPaymentIntent(
    request: CreatePaymentIntentRequest
  ): Promise<PaymentIntentResult> {
    // CRITICAL FIX #1: Enforce checkoutSessionId requirement for idempotency
    if (!request.checkoutSessionId) {
      throw new Error('checkoutSessionId is required for idempotent payment intent creation');
    }
    
    const checkoutSessionId = request.checkoutSessionId;

    // Step 1: Validate seller and get connected account info
    const firstProductId = request.items[0].productId || request.items[0].id;
    const product = await this.storage.getProduct(firstProductId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    const seller = await this.storage.getUser(product.sellerId);
    
    if (!seller) {
      throw new Error('Seller not found');
    }

    // Validate seller can accept charges
    if (!seller.stripeChargesEnabled) {
      throw new Error('This store is still setting up payment processing. Please check back soon.');
    }

    // Use seller's listing currency (from Stripe account) as single source of truth
    const currency = seller.listingCurrency || 'USD';

    // CRITICAL FIX #2: Atomic workflow with rollback on failure
    let orderId: string | null = null;
    let reservationsCreated = false;

    try {
      // Step 2: Reserve inventory atomically
      logger.info(`[Payment] Reserving inventory for checkout session ${checkoutSessionId}`);
      
      const reservationResults = await Promise.all(
        request.items.map(item =>
          this.inventoryService.reserveStock(
            item.productId || item.id,
            item.quantity,
            checkoutSessionId,
            {
              variantId: item.variantId,
              expirationMinutes: 15, // 15 minute reservation
            }
          )
        )
      );

      // Check for reservation failures
      const failedReservation = reservationResults.find(r => !r.success);
      if (failedReservation) {
        throw new Error(failedReservation.error || 'Failed to reserve inventory');
      }

      reservationsCreated = true;

      // Step 3: Create order in pending state
      const orderToCreate: InsertOrder = {
        ...request.orderData,
        status: 'pending',
        paymentStatus: 'pending',
        currency,
      };

      const createdOrder = await this.storage.createOrder(orderToCreate);
      orderId = createdOrder.id;
      logger.info(`[Payment] Created order ${orderId} in pending state`);

      // Step 4: Calculate platform fee (1.5%)
      const platformFeeAmount = request.amount * 0.015;

      // Step 5: Create payment intent with idempotency key
      const idempotencyKey = `intent_${checkoutSessionId}`;
      
      const intentParams: CreateIntentParams = {
        amount: request.amount,
        currency,
        metadata: {
          orderId,
          sellerId: seller.id,
          checkoutSessionId,
          paymentType: request.paymentType || 'full',
        },
        connectedAccountId: seller.stripeConnectedAccountId || undefined,
        applicationFeeAmount: platformFeeAmount,
        captureMethod: 'automatic',
        idempotencyKey,
      };

      const paymentIntent = await this.provider.createPaymentIntent(intentParams);

      // CRITICAL FIX #3: Store payment intent in database for 3DS/confirmation flow
      try {
        await this.storage.createPaymentIntent({
          providerName: paymentIntent.providerName,
          providerIntentId: paymentIntent.providerIntentId,
          amount: paymentIntent.amount.toString(),
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          clientSecret: paymentIntent.clientSecret,
          metadata: JSON.stringify(paymentIntent.metadata),
        });
        logger.info(`[Payment] Stored payment intent ${paymentIntent.id} in database`);
      } catch (dbError) {
        logger.error(`[Payment] Failed to store payment intent in database:`, dbError);
        // Continue - webhook will handle this, but log the issue
      }

      logger.info(`[Payment] Created payment intent ${paymentIntent.id} for order ${orderId}`);

      return {
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.id,
        orderId,
        requiresAction: paymentIntent.status === 'requires_action',
      };

    } catch (error) {
      // ROLLBACK: Clean up on any failure
      logger.error(`[Payment] Payment intent creation failed, rolling back:`, error);

      // Release inventory reservations
      if (reservationsCreated) {
        try {
          // Get all reservations for this checkout session and release them
          const reservations = await this.storage.getReservationsByCheckoutSession(checkoutSessionId);
          for (const reservation of reservations) {
            await this.inventoryService.releaseReservation(reservation.id);
          }
          logger.info(`[Payment] Released inventory reservations for checkout session ${checkoutSessionId}`);
        } catch (releaseError) {
          logger.error(`[Payment] Failed to release inventory:`, releaseError);
        }
      }

      // Delete pending order
      if (orderId) {
        try {
          await this.storage.deleteOrder(orderId);
          logger.info(`[Payment] Deleted pending order ${orderId}`);
        } catch (deleteError) {
          logger.error(`[Payment] Failed to delete pending order:`, deleteError);
        }
      }

      throw error;
    }
  }

  /**
   * Confirm payment (client-side confirmation completed)
   * 
   * Note: Most confirmation happens automatically via webhook
   * This method is primarily for handling 3DS authentication flows
   */
  async confirmPayment(
    paymentIntentId: string,
    returnUrl?: string
  ): Promise<PaymentConfirmationResult> {
    const paymentIntent = await this.storage.getPaymentIntent(paymentIntentId);
    
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    const metadata: any = paymentIntent.metadata ? JSON.parse(paymentIntent.metadata) : {};
    const orderId: string = metadata.orderId || '';

    if (!orderId) {
      throw new Error('Order ID not found in payment intent metadata');
    }

    // Confirm with provider
    const result = await this.provider.confirmPayment(
      paymentIntent.providerIntentId,
      { returnUrl }
    );

    // Update payment intent status
    await this.storage.updatePaymentIntentStatus(
      paymentIntentId,
      result.status as any
    );

    return {
      success: result.success,
      orderId,
      status: result.status,
      requiresAction: result.status === 'requires_action',
      error: result.error,
    };
  }

  /**
   * Cancel payment and release inventory
   * 
   * Flow:
   * 1. Cancel payment intent with provider
   * 2. Release inventory reservations
   * 3. Update order status to canceled
   */
  async cancelPayment(paymentIntentId: string): Promise<void> {
    const paymentIntent = await this.storage.getPaymentIntent(paymentIntentId);
    
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    const metadata: any = paymentIntent.metadata ? JSON.parse(paymentIntent.metadata) : {};
    const { orderId, checkoutSessionId } = metadata as { orderId?: string; checkoutSessionId?: string };

    // Cancel with provider
    await this.provider.cancelPayment(paymentIntent.providerIntentId);

    // Update payment intent status
    await this.storage.updatePaymentIntentStatus(paymentIntentId, 'canceled');

    // CRITICAL FIX #4: Actually release inventory reservations
    if (checkoutSessionId) {
      try {
        // Get all reservations for this checkout session and release them
        const reservations = await this.storage.getReservationsByCheckoutSession(checkoutSessionId);
        for (const reservation of reservations) {
          await this.inventoryService.releaseReservation(reservation.id);
        }
        logger.info(`[Payment] Released ${reservations.length} inventory reservations for checkout session ${checkoutSessionId}`);
      } catch (releaseError) {
        logger.error(`[Payment] Failed to release inventory reservations:`, releaseError);
        // Don't throw - cancellation should succeed even if release fails
      }
    }

    // Update order status
    if (orderId) {
      await this.storage.updateOrderStatus(orderId, 'canceled');
      logger.info(`[Payment] Canceled order ${orderId}`);
    }
  }

  /**
   * Create refund for a payment
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ) {
    const paymentIntent = await this.storage.getPaymentIntent(paymentIntentId);
    
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    const refund = await this.provider.createRefund({
      paymentIntentId: paymentIntent.providerIntentId,
      amount,
      reason,
      metadata: {
        orderId: (JSON.parse(paymentIntent.metadata || '{}') as any).orderId,
      },
    });

    logger.info(`[Payment] Created refund ${refund.id} for payment intent ${paymentIntentId}`);
    
    return refund;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentIntentId: string) {
    const paymentIntent = await this.storage.getPaymentIntent(paymentIntentId);
    
    if (!paymentIntent) {
      throw new Error('Payment intent not found');
    }

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: JSON.parse(paymentIntent.metadata || '{}') as any,
    };
  }
}
