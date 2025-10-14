/**
 * Balance Payment Service
 * 
 * Architecture 3: Centralized backend pricing for balance payment workflows
 * 
 * Orchestrates balance payment flows by delegating pricing to PricingCalculationService
 * Handles:
 * - Balance request creation with signed session tokens
 * - Shipping recalculation when address changes  
 * - Stripe payment intent management
 * - Order balance payment capture
 */

import crypto from "crypto";
import Stripe from "stripe";
import type { IStorage } from "../storage";
import type { BalanceRequest, InsertBalanceRequest, ShippingAddress } from "@shared/schema";
import { PricingCalculationService } from "./pricing-calculation.service";
import { ShippingService } from "./shipping.service";
import { logger } from "../logger";

// Session secret for HMAC token signing (should be in env vars in production)
const SESSION_SECRET = process.env.BALANCE_SESSION_SECRET || "balance-payment-session-secret-change-in-production";

export interface BalanceRequestResponse {
  success: boolean;
  balanceRequest?: BalanceRequest;
  sessionToken?: string; // Plain token (not hashed) - sent to client for email link
  error?: string;
}

export interface BalanceSessionResponse {
  success: boolean;
  session?: {
    orderId: string;
    orderNumber?: string;
    customerName: string;
    customerEmail: string;
    balanceDueCents: number;
    currency: string;
    shippingAddress: ShippingAddress;
    canChangeAddress: boolean;
    pricingSnapshot?: any;
    expiresAt?: Date | null;
  };
  error?: string;
}

export interface RecalculateBalanceResponse {
  success: boolean;
  newBalanceCents?: number;
  newShippingCostCents?: number;
  pricingBreakdown?: {
    productBalanceCents: number;
    shippingCents: number;
    totalBalanceCents: number;
  };
  error?: string;
}

export interface BalancePaymentIntentResponse {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export class BalancePaymentService {
  constructor(
    private storage: IStorage,
    private pricingService: PricingCalculationService,
    private shippingService: ShippingService,
    private stripe?: Stripe
  ) {}

  /**
   * Request balance payment for an order
   * Creates a secure session with token-based authentication
   * Architecture 3: Delegates ALL pricing to PricingCalculationService
   */
  async requestBalancePayment(
    orderId: string, 
    requestedBy: string
  ): Promise<BalanceRequestResponse> {
    try {
      logger.info(`[BalancePayment] Requesting balance payment for order ${orderId}`, {
        orderId,
        requestedBy
      });

      // Get order from storage
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        return {
          success: false,
          error: "Order not found"
        };
      }

      // Verify order has a deposit (pre-order or made-to-order)
      if (!order.depositAmountCents || order.depositAmountCents <= 0) {
        return {
          success: false,
          error: "Order does not require balance payment"
        };
      }

      // Get order items for fresh pricing calculation
      const orderItems = await this.storage.getOrderItems(order.id);
      if (!orderItems || orderItems.length === 0) {
        return {
          success: false,
          error: "Order has no items"
        };
      }

      // Architecture 3: Delegate to PricingCalculationService for FRESH pricing
      const pricing = await this.pricingService.calculateCartPricing({
        sellerId: order.userId || '',
        items: orderItems.map(item => ({ 
          productId: item.productId, 
          quantity: item.quantity 
        })),
        destination: {
          country: order.shippingCountry || '',
          city: order.shippingCity || '',
          state: order.shippingState || '',
          postalCode: order.shippingPostalCode || '',
          line1: order.shippingStreet || ''
        },
        includeShippingInDeposit: false // Architecture 3: deposit on product only, shipping in balance
      });

      // Calculate balance due from fresh pricing (all in cents)
      const orderTotalCents = Math.round(pricing.total * 100);
      const depositAmountCents = order.depositAmountCents;
      const shippingCostCents = Math.round(pricing.shippingCost * 100);
      const taxAmountCents = Math.round(pricing.taxAmount * 100);
      
      // Balance = Total - Deposit Already Paid
      const balanceDueCents = Math.round(pricing.remainingBalance * 100);
      const productBalanceCents = balanceDueCents - shippingCostCents;

      // Verify balance is actually due after calculation
      if (balanceDueCents <= 0) {
        return {
          success: false,
          error: "No balance due for this order"
        };
      }

      // Generate secure session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionTokenHash = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(sessionToken)
        .digest('hex');

      // Calculate expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Store COMPLETE pricing snapshot from PricingCalculationService
      const pricingSnapshot = {
        productBalanceCents,
        shippingCents: shippingCostCents,
        taxCents: taxAmountCents,
        totalBalanceCents: balanceDueCents,
        orderTotalCents,
        depositAmountCents,
        subtotalCents: Math.round(pricing.subtotal * 100),
        currency: pricing.currency,
        taxCalculationId: pricing.taxCalculationId,
        hasPreOrders: pricing.hasPreOrders,
        calculatedAt: new Date().toISOString(),
        source: 'PricingCalculationService'
      };

      // Build shipping snapshot
      const shippingSnapshot = {
        street: order.shippingStreet,
        city: order.shippingCity,
        state: order.shippingState,
        postalCode: order.shippingPostalCode,
        country: order.shippingCountry,
        method: order.shippingMethod,
        carrier: order.shippingCarrier,
        zone: order.shippingZone
      };

      // Create balance request record
      const balanceRequestData: InsertBalanceRequest = {
        orderId: order.id,
        createdBy: requestedBy,
        status: "requested",
        sessionTokenHash,
        expiresAt,
        balanceDueCents,
        currency: pricing.currency,
        pricingSnapshot,
        shippingSnapshot,
        paymentIntentId: null,
        emailSentAt: null
      };

      const balanceRequest = await this.storage.createBalanceRequest(balanceRequestData);

      logger.info(`[BalancePayment] Balance request created with fresh pricing`, {
        orderId,
        balanceRequestId: balanceRequest.id,
        balanceDueCents,
        shippingCostCents,
        taxAmountCents,
        source: 'PricingCalculationService',
        expiresAt: expiresAt.toISOString()
      });

      return {
        success: true,
        balanceRequest,
        sessionToken // Return plain token for email link
      };

    } catch (error: any) {
      logger.error(`[BalancePayment] Failed to request balance payment`, error, {
        orderId,
        requestedBy
      });

      return {
        success: false,
        error: error.message || "Failed to create balance request"
      };
    }
  }

  /**
   * Get balance payment session by token or order ID
   * Validates token and returns session data for payment flow
   */
  async getBalanceSession(
    tokenOrOrderId: string,
    userId?: string
  ): Promise<BalanceSessionResponse> {
    try {
      logger.info(`[BalancePayment] Getting balance session`, {
        tokenOrOrderId: tokenOrOrderId.substring(0, 8) + '...',
        userId
      });

      let balanceRequest: BalanceRequest | undefined;

      // Check if it's a token (64 chars hex) or order ID
      if (tokenOrOrderId.length === 64 && /^[a-f0-9]+$/i.test(tokenOrOrderId)) {
        // It's a token - hash it and lookup
        const tokenHash = crypto
          .createHmac('sha256', SESSION_SECRET)
          .update(tokenOrOrderId)
          .digest('hex');

        balanceRequest = await this.storage.getBalanceRequestByToken(tokenHash);
      } else {
        // It's an order ID - lookup by order
        balanceRequest = await this.storage.getBalanceRequestByOrderId(tokenOrOrderId);
      }

      if (!balanceRequest) {
        return {
          success: false,
          error: "Balance request not found"
        };
      }

      // Check expiration and update status if expired
      if (balanceRequest.expiresAt && new Date() > balanceRequest.expiresAt) {
        // Update status to 'cancelled' if not already (expired sessions are cancelled)
        if (balanceRequest.status !== 'cancelled') {
          await this.storage.updateBalanceRequest(balanceRequest.id, {
            status: 'cancelled'
          });
          logger.info(`[BalancePayment] Marked balance request as cancelled (expired)`, {
            balanceRequestId: balanceRequest.id,
            expiresAt: balanceRequest.expiresAt?.toISOString()
          });
        }
        
        return {
          success: false,
          error: "Balance payment session has expired"
        };
      }

      // Get order details
      const order = await this.storage.getOrder(balanceRequest.orderId);
      if (!order) {
        return {
          success: false,
          error: "Order not found"
        };
      }

      // Build shipping address from order
      const shippingAddress: ShippingAddress = {
        street: order.shippingStreet || '',
        city: order.shippingCity || '',
        state: order.shippingState || '',
        postalCode: order.shippingPostalCode || '',
        country: order.shippingCountry || ''
      };

      // Check if address can be changed (not locked)
      const canChangeAddress = !order.shippingLocked || order.shippingLocked === 0;

      logger.info(`[BalancePayment] Balance session retrieved successfully`, {
        orderId: order.id,
        balanceDueCents: balanceRequest.balanceDueCents || 0,
        canChangeAddress
      });

      return {
        success: true,
        session: {
          orderId: order.id,
          orderNumber: order.id, // Can add order number field to schema if needed
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          balanceDueCents: balanceRequest.balanceDueCents || 0,
          currency: balanceRequest.currency,
          shippingAddress,
          canChangeAddress,
          pricingSnapshot: balanceRequest.pricingSnapshot,
          expiresAt: balanceRequest.expiresAt
        }
      };

    } catch (error: any) {
      logger.error(`[BalancePayment] Failed to get balance session`, error, {
        tokenOrOrderId: tokenOrOrderId.substring(0, 8) + '...'
      });

      return {
        success: false,
        error: error.message || "Failed to retrieve balance session"
      };
    }
  }

  /**
   * Recalculate balance with new shipping address
   * Architecture 3: Delegates ALL pricing to PricingCalculationService
   */
  async recalculateBalanceWithNewAddress(
    balanceRequestId: string,
    newAddress: ShippingAddress
  ): Promise<RecalculateBalanceResponse> {
    try {
      logger.info(`[BalancePayment] Recalculating balance with new address`, {
        balanceRequestId,
        newCountry: newAddress.country
      });

      // Get balance request and order
      const balanceRequest = await this.storage.getBalanceRequest(balanceRequestId);
      if (!balanceRequest) {
        return {
          success: false,
          error: "Balance request not found"
        };
      }

      const order = await this.storage.getOrder(balanceRequest.orderId);
      if (!order) {
        return {
          success: false,
          error: "Order not found"
        };
      }

      // Check if shipping is locked
      if (order.shippingLocked && order.shippingLocked !== 0) {
        return {
          success: false,
          error: "Shipping address is locked and cannot be changed"
        };
      }

      // Get order items for pricing calculation
      const orderItems = await this.storage.getOrderItems(order.id);
      if (!orderItems || orderItems.length === 0) {
        return {
          success: false,
          error: "Order has no items"
        };
      }

      // Store previous pricing for audit trail
      const previousPricingSnapshot = balanceRequest.pricingSnapshot as any;
      const previousShippingCostCents = previousPricingSnapshot?.shippingCents || 0;

      // Architecture 3: Delegate to PricingCalculationService for FRESH pricing with new address
      const pricing = await this.pricingService.calculateCartPricing({
        sellerId: order.userId || '',
        items: orderItems.map(item => ({ 
          productId: item.productId, 
          quantity: item.quantity 
        })),
        destination: {
          country: newAddress.country,
          city: newAddress.city || '',
          state: newAddress.state || '',
          postalCode: newAddress.postalCode || '',
          line1: newAddress.street
        },
        includeShippingInDeposit: false // Architecture 3: shipping in balance, not deposit
      });

      // Extract fresh pricing from PricingCalculationService (all in cents)
      const newShippingCostCents = Math.round(pricing.shippingCost * 100);
      const taxAmountCents = Math.round(pricing.taxAmount * 100);
      const orderTotalCents = Math.round(pricing.total * 100);
      const depositAmountCents = order.depositAmountCents;
      
      // Balance = Total - Deposit Already Paid
      const newBalanceCents = Math.round(pricing.remainingBalance * 100);
      const productBalanceCents = newBalanceCents - newShippingCostCents;

      // Store previous address for audit trail
      const previousAddress = {
        street: order.shippingStreet,
        city: order.shippingCity,
        state: order.shippingState,
        postalCode: order.shippingPostalCode,
        country: order.shippingCountry
      };

      // Build COMPLETE pricing snapshot from PricingCalculationService
      const updatedPricingSnapshot = {
        productBalanceCents,
        shippingCents: newShippingCostCents,
        taxCents: taxAmountCents,
        totalBalanceCents: newBalanceCents,
        orderTotalCents,
        depositAmountCents,
        subtotalCents: Math.round(pricing.subtotal * 100),
        currency: pricing.currency,
        taxCalculationId: pricing.taxCalculationId,
        hasPreOrders: pricing.hasPreOrders,
        recalculatedAt: new Date().toISOString(),
        source: 'PricingCalculationService'
      };

      // Update balance request with new pricing
      await this.storage.updateBalanceRequest(balanceRequestId, {
        balanceDueCents: newBalanceCents,
        pricingSnapshot: updatedPricingSnapshot,
        shippingSnapshot: {
          street: newAddress.street,
          city: newAddress.city,
          state: newAddress.state,
          postalCode: newAddress.postalCode,
          country: newAddress.country,
          method: null, // Will be set by shipping service on checkout
          carrier: null,
          zone: null
        }
      });

      // Create address change audit record
      await this.storage.createOrderAddressChange({
        orderId: order.id,
        balanceRequestId,
        changedBy: null, // Could pass userId if available
        previousAddress,
        newAddress,
        previousShippingCostCents,
        newShippingCostCents,
        reason: "balance_payment_address_update"
      });

      logger.info(`[BalancePayment] Balance recalculated with fresh pricing`, {
        balanceRequestId,
        orderId: order.id,
        previousBalanceCents: balanceRequest.balanceDueCents || 0,
        newBalanceCents,
        previousShippingCostCents,
        newShippingCostCents,
        taxAmountCents,
        source: 'PricingCalculationService'
      });

      return {
        success: true,
        newBalanceCents,
        newShippingCostCents,
        pricingBreakdown: {
          productBalanceCents,
          shippingCents: newShippingCostCents,
          totalBalanceCents: newBalanceCents
        }
      };

    } catch (error: any) {
      logger.error(`[BalancePayment] Failed to recalculate balance`, error, {
        balanceRequestId
      });

      return {
        success: false,
        error: error.message || "Failed to recalculate balance with new address"
      };
    }
  }

  /**
   * Create Stripe payment intent for balance payment
   * Returns client secret for frontend payment collection
   */
  async createBalancePaymentIntent(
    balanceRequestId: string
  ): Promise<BalancePaymentIntentResponse> {
    try {
      logger.info(`[BalancePayment] Creating payment intent`, {
        balanceRequestId
      });

      // Get balance request
      const balanceRequest = await this.storage.getBalanceRequest(balanceRequestId);
      if (!balanceRequest) {
        return {
          success: false,
          error: "Balance request not found"
        };
      }

      const balanceDueCents = balanceRequest.balanceDueCents || 0;
      if (balanceDueCents <= 0) {
        return {
          success: false,
          error: "No balance due for this request"
        };
      }

      // Get order for metadata
      const order = await this.storage.getOrder(balanceRequest.orderId);
      if (!order) {
        return {
          success: false,
          error: "Order not found"
        };
      }

      // Check if Stripe is available
      if (!this.stripe) {
        // Development mode - return mock client secret
        const mockClientSecret = `mock_secret_${balanceRequestId}`;
        logger.warn(`[BalancePayment] Stripe not configured - returning mock client secret`, {
          balanceRequestId
        });

        // Update balance request with mock payment intent
        await this.storage.updateBalanceRequest(balanceRequestId, {
          paymentIntentId: `mock_pi_${balanceRequestId}`
        });

        return {
          success: true,
          clientSecret: mockClientSecret,
          paymentIntentId: `mock_pi_${balanceRequestId}`
        };
      }

      // Create or update Stripe payment intent
      let paymentIntent: Stripe.PaymentIntent;

      if (balanceRequest.paymentIntentId) {
        // Update existing payment intent
        try {
          paymentIntent = await this.stripe.paymentIntents.update(
            balanceRequest.paymentIntentId,
            {
              amount: balanceDueCents,
              currency: balanceRequest.currency.toLowerCase(),
              metadata: {
                orderId: order.id,
                paymentType: 'balance',
                balanceRequestId: balanceRequestId
              }
            }
          );

          logger.info(`[BalancePayment] Updated existing payment intent`, {
            paymentIntentId: paymentIntent.id,
            balanceDueCents
          });
        } catch (updateError: any) {
          // If update fails, create new payment intent
          logger.warn(`[BalancePayment] Failed to update payment intent, creating new one`, {
            error: updateError.message
          });

          paymentIntent = await this.stripe.paymentIntents.create({
            amount: balanceDueCents,
            currency: balanceRequest.currency.toLowerCase(),
            metadata: {
              orderId: order.id,
              paymentType: 'balance',
              balanceRequestId: balanceRequestId
            }
          });
        }
      } else {
        // Create new payment intent
        paymentIntent = await this.stripe.paymentIntents.create({
          amount: balanceDueCents,
          currency: balanceRequest.currency.toLowerCase(),
          metadata: {
            orderId: order.id,
            paymentType: 'balance',
            balanceRequestId: balanceRequestId
          }
        });

        logger.info(`[BalancePayment] Created new payment intent`, {
          paymentIntentId: paymentIntent.id,
          balanceDueCents
        });
      }

      // Update balance request with payment intent ID
      await this.storage.updateBalanceRequest(balanceRequestId, {
        paymentIntentId: paymentIntent.id
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id
      };

    } catch (error: any) {
      logger.error(`[BalancePayment] Failed to create payment intent`, error, {
        balanceRequestId
      });

      return {
        success: false,
        error: error.message || "Failed to create payment intent"
      };
    }
  }
}
