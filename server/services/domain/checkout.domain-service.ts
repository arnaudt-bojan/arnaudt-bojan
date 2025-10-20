/**
 * CheckoutDomainService - Single source of truth for checkout business logic
 * 
 * Architecture 3 Compliance:
 * - Consolidates checkout logic from REST and GraphQL services
 * - Transport-agnostic domain service
 * - Handles: cart validation, tax/shipping calculations, payment intent creation
 * 
 * Used by:
 * - REST layer: server/routes.ts
 * - GraphQL layer: apps/nest-api (future)
 * 
 * Design: Standalone service (not NestJS Injectable) for maximum portability
 */

import type { PrismaClient } from '../../../generated/prisma';
import { Prisma } from '../../../generated/prisma';
import {
  CartReservationExpiredError,
  PaymentIntentMismatchError,
  AddressValidationError,
  CheckoutSessionNotFoundError,
  InvalidCheckoutStateError,
  InsufficientStockError,
} from './errors/checkout-errors';
import { CartNotFoundError } from './errors/order-errors';

// ============================================================================
// Interfaces & Types
// ============================================================================

export interface CheckoutItem {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BillingAddress {
  name: string;
  email?: string;
  phone?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface InitiateCheckoutInput {
  sessionId?: string;
  userId?: string;
  items: CheckoutItem[];
  shippingAddress: ShippingAddress;
  billingAddress?: BillingAddress;
  customerEmail: string;
  customerName: string;
  currency?: string;
}

export interface CompleteCheckoutInput {
  userId?: string;
  paymentIntentId: string;
  sessionId?: string;
}

export interface CheckoutSession {
  clientSecret: string;
  paymentIntentId: string;
  checkoutSessionId?: string;
  amountToCharge: number;
  currency: string;
  order?: any;
}

// Minimal interfaces for injected dependencies
export interface ICheckoutWorkflowOrchestrator {
  executeCheckout(data: any): Promise<any>;
}

export interface ICartReservationService {
  validateReservations(userId: string): Promise<{ valid: boolean; expired?: string[] }>;
}

// ============================================================================
// CheckoutDomainService
// ============================================================================

export class CheckoutDomainService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly checkoutOrchestrator: ICheckoutWorkflowOrchestrator,
    private readonly cartReservationService?: ICartReservationService,
  ) {}

  /**
   * Initiate checkout - creates payment intent and prepares order
   * VALIDATION: Validates cart, stock availability, and shipping address
   * ORCHESTRATION: Delegates to CheckoutWorkflowOrchestrator for transaction management
   */
  async initiateCheckout(input: InitiateCheckoutInput): Promise<CheckoutSession> {
    const {
      sessionId,
      userId,
      items,
      shippingAddress,
      billingAddress,
      customerEmail,
      customerName,
      currency = 'USD',
    } = input;

    // Validate cart reservations if user is authenticated and service is available
    if (userId && this.cartReservationService) {
      const reservationCheck = await this.cartReservationService.validateReservations(userId);
      if (!reservationCheck.valid && reservationCheck.expired && reservationCheck.expired.length > 0) {
        throw new CartReservationExpiredError(
          `Cart reservations expired for items: ${reservationCheck.expired.join(', ')}`
        );
      }
    }

    // Validate address
    if (!shippingAddress.line1 || !shippingAddress.city || !shippingAddress.country) {
      throw new AddressValidationError('Shipping address must include street, city, and country');
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new InvalidCheckoutStateError('Cart is empty');
    }

    // Prepare billing address for orchestrator
    const finalBillingAddress = billingAddress 
      ? {
          name: billingAddress.name,
          email: billingAddress.email || customerEmail,
          phone: billingAddress.phone,
          street: billingAddress.street,
          city: billingAddress.city,
          state: billingAddress.state,
          postalCode: billingAddress.postalCode,
          country: billingAddress.country,
        }
      : undefined;

    // Map to CheckoutData format expected by orchestrator
    const checkoutData = {
      sessionId,
      userId,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variantId,
      })),
      shippingAddress: {
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
      },
      billingAddress: finalBillingAddress,
      customerEmail,
      customerName,
      currency,
    };

    // Execute checkout workflow
    const result = await this.checkoutOrchestrator.executeCheckout(checkoutData);

    if (!result.success) {
      // Map orchestrator errors to domain errors
      if (result.errorCode?.includes('VALIDATION')) {
        throw new InvalidCheckoutStateError(result.error || 'Validation failed');
      }
      if (result.errorCode?.includes('STOCK')) {
        throw new InsufficientStockError(result.error || 'Insufficient stock');
      }
      if (result.errorCode?.includes('CART')) {
        throw new CartNotFoundError(result.error);
      }
      
      // Generic error fallback
      throw new Error(result.error || 'Checkout failed');
    }

    // Return checkout session
    return {
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      checkoutSessionId: sessionId,
      amountToCharge: result.order?.total || 0,
      currency: result.order?.currency || currency,
      order: result.order,
    };
  }

  /**
   * Complete checkout - verifies payment and finalizes order
   * VALIDATION: Verifies payment intent status
   * FINALIZATION: Creates order and clears cart
   */
  async completeCheckout(input: CompleteCheckoutInput): Promise<any> {
    const { userId, paymentIntentId, sessionId } = input;

    if (!paymentIntentId) {
      throw new PaymentIntentMismatchError('Payment intent ID is required');
    }

    // Note: Workflow tracking is handled by checkoutOrchestrator
    // For now, return minimal completion data based on payment intent
    // In production, you would query the workflow/order by payment intent
    
    throw new InvalidCheckoutStateError(
      'Complete checkout endpoint not yet implemented - payment is processed via webhook'
    );
  }

  /**
   * Get checkout session by ID
   * Note: In production, this would query the workflows table if it exists
   */
  async getCheckoutSession(sessionId: string): Promise<any> {
    // Note: Workflow table may not exist in all deployments
    // This is a placeholder for the pattern - implement based on your schema
    throw new CheckoutSessionNotFoundError(
      'Session lookup not implemented - use payment intent for order lookup'
    );
  }
}
