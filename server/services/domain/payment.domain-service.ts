/**
 * PaymentDomainService - Single source of truth for payment business logic
 * 
 * Architecture 3 Compliance:
 * - Consolidates payment logic from REST and GraphQL services
 * - Transport-agnostic domain service
 * - Handles: payment intent creation, refund processing, payment methods
 * 
 * Used by:
 * - REST layer: server/routes.ts
 * - GraphQL layer: apps/nest-api (future)
 * 
 * Design: Standalone service (not NestJS Injectable) for maximum portability
 */

import type { PrismaClient } from '../../../generated/prisma';
import {
  StripeAuthorizationFailedError,
  InvalidPaymentMethodError,
  PaymentIntentNotFoundError,
  RefundFailedError,
  InvalidRefundAmountError,
  PaymentProcessingError,
} from './errors/payment-errors';
import { OrderNotFoundError } from './errors/order-errors';

// ============================================================================
// Interfaces & Types
// ============================================================================

export interface CreatePaymentIntentInput {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  customerId?: string;
  paymentMethodId?: string;
}

export interface ProcessRefundInput {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
  orderId?: string;
}

export interface AttachPaymentMethodInput {
  userId: string;
  paymentMethodId: string;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

// Minimal Stripe provider interface
export interface IStripeProvider {
  createPaymentIntent(params: any): Promise<any>;
  retrievePaymentIntent(paymentIntentId: string): Promise<any>;
  refundPayment(paymentIntentId: string, amount?: number, reason?: string): Promise<any>;
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<any>;
}

// ============================================================================
// PaymentDomainService
// ============================================================================

export class PaymentDomainService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly stripeProvider: IStripeProvider,
  ) {}

  /**
   * Create payment intent for checkout or balance payment
   * VALIDATION: Validates amount and currency
   * STRIPE: Creates Stripe payment intent
   */
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    const { amount, currency, metadata, customerId, paymentMethodId } = input;

    // Validate amount
    if (amount <= 0) {
      throw new InvalidRefundAmountError('Payment amount must be greater than zero');
    }

    // Validate currency
    if (!currency || currency.length !== 3) {
      throw new PaymentProcessingError('Invalid currency code');
    }

    try {
      // Create payment intent via Stripe provider
      const paymentIntent = await this.stripeProvider.createPaymentIntent({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: metadata || {},
        customer: customerId,
        payment_method: paymentMethodId,
        automatic_payment_methods: paymentMethodId ? undefined : {
          enabled: true,
        },
      });

      if (!paymentIntent || !paymentIntent.client_secret) {
        throw new StripeAuthorizationFailedError('Failed to create payment intent');
      }

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
      };
    } catch (error: any) {
      if (error instanceof StripeAuthorizationFailedError) {
        throw error;
      }
      throw new PaymentProcessingError(error.message || 'Failed to create payment intent');
    }
  }

  /**
   * Process refund for an order or payment intent
   * VALIDATION: Validates refund amount and order
   * STRIPE: Processes refund via Stripe
   */
  async processRefund(input: ProcessRefundInput): Promise<any> {
    const { paymentIntentId, amount, reason, orderId } = input;

    // Validate payment intent
    if (!paymentIntentId) {
      throw new PaymentIntentNotFoundError('Payment intent ID is required');
    }

    // If order ID is provided, verify it exists and get payment details
    if (orderId) {
      const order = await this.prisma.orders.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new OrderNotFoundError(orderId);
      }

      // Verify payment intent matches order
      if (order.stripe_payment_intent_id !== paymentIntentId) {
        throw new PaymentIntentNotFoundError('Payment intent does not match order');
      }

      // Validate refund amount doesn't exceed order total
      if (amount && amount > parseFloat(order.total.toString())) {
        throw new InvalidRefundAmountError(`Refund amount cannot exceed order total of ${order.total}`);
      }
    }

    try {
      // Retrieve payment intent to verify it exists
      const paymentIntent = await this.stripeProvider.retrievePaymentIntent(paymentIntentId);

      if (!paymentIntent) {
        throw new PaymentIntentNotFoundError(paymentIntentId);
      }

      // Process refund
      const refundAmountCents = amount ? Math.round(amount * 100) : undefined;
      const refund = await this.stripeProvider.refundPayment(
        paymentIntentId,
        refundAmountCents,
        reason || 'Refund requested'
      );

      if (!refund || !refund.id) {
        throw new RefundFailedError('Stripe refund creation failed');
      }

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase(),
        status: refund.status,
        reason: refund.reason || reason,
        paymentIntentId,
      };
    } catch (error: any) {
      if (error instanceof PaymentIntentNotFoundError || 
          error instanceof InvalidRefundAmountError ||
          error instanceof RefundFailedError) {
        throw error;
      }
      throw new RefundFailedError(error.message || 'Failed to process refund');
    }
  }

  /**
   * Attach payment method to customer
   * VALIDATION: Validates user and payment method
   * STRIPE: Attaches payment method to Stripe customer
   */
  async attachPaymentMethod(input: AttachPaymentMethodInput): Promise<any> {
    const { userId, paymentMethodId } = input;

    if (!paymentMethodId) {
      throw new InvalidPaymentMethodError('Payment method ID is required');
    }

    // Get user
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify user has Stripe customer ID
    if (!user.stripe_customer_id) {
      throw new InvalidPaymentMethodError('User does not have a Stripe customer account');
    }

    try {
      // Attach payment method to customer
      const paymentMethod = await this.stripeProvider.attachPaymentMethod(
        user.stripe_customer_id,
        paymentMethodId
      );

      if (!paymentMethod) {
        throw new InvalidPaymentMethodError('Failed to attach payment method');
      }

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
        } : undefined,
      };
    } catch (error: any) {
      if (error instanceof InvalidPaymentMethodError) {
        throw error;
      }
      throw new InvalidPaymentMethodError(error.message || 'Failed to attach payment method');
    }
  }

  /**
   * Retrieve payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    if (!paymentIntentId) {
      throw new PaymentIntentNotFoundError('Payment intent ID is required');
    }

    try {
      const paymentIntent = await this.stripeProvider.retrievePaymentIntent(paymentIntentId);

      if (!paymentIntent) {
        throw new PaymentIntentNotFoundError(paymentIntentId);
      }

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error: any) {
      if (error instanceof PaymentIntentNotFoundError) {
        throw error;
      }
      throw new PaymentProcessingError(error.message || 'Failed to retrieve payment intent');
    }
  }
}
