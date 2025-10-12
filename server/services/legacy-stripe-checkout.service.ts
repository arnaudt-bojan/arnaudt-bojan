import type Stripe from "stripe";
import type { IStorage } from "../storage";
import { logger } from "../logger";

/**
 * Legacy Stripe Checkout Service
 * 
 * This service encapsulates Stripe-specific payment operations for the legacy
 * /api/create-payment-intent flow. It wraps Stripe SDK directly and is NOT
 * part of the IPaymentProvider abstraction.
 * 
 * NOTE: New code should use the modern CheckoutService.initiateCheckout() flow
 * which uses the IPaymentProvider abstraction. This service exists for backward
 * compatibility with existing checkout flows.
 */
export class LegacyStripeCheckoutService {
  private readonly PLATFORM_FEE_RATE = 0.015; // 1.5% platform fee

  constructor(
    private storage: IStorage,
    private stripe: Stripe | null
  ) {}

  /**
   * Create payment intent with Stripe Connect (legacy flow)
   */
  async createPaymentIntent(params: {
    amount: number;
    orderId?: string;
    paymentType?: 'full' | 'balance' | 'partial' | 'deposit';
    items?: Array<{ productId?: string; id?: string; productType?: string; }>;
    shippingAddress?: any;
  }): Promise<{
    success: boolean;
    clientSecret?: string;
    paymentIntentId?: string;
    error?: string;
    errorCode?: string;
  }> {
    try {
      if (!this.stripe) {
        logger.info("[Stripe] Cannot create payment intent - Stripe is not configured");
        return {
          success: false,
          error: "Stripe is not configured. Please contact the store owner to set up payments.",
        };
      }

      const { amount, orderId, paymentType = 'full', items, shippingAddress } = params;

      if (!amount || amount <= 0) {
        return { success: false, error: "Invalid amount" };
      }

      // Determine seller from cart items
      let sellerId: string | null = null;
      let sellerConnectedAccountId: string | null = null;
      let seller: any = null;

      if (items && items.length > 0) {
        const firstProductId = items[0].productId || items[0].id;
        if (!firstProductId) {
          return { success: false, error: "Invalid product ID" };
        }
        const product = await this.storage.getProduct(firstProductId);

        if (product) {
          sellerId = product.sellerId;
          seller = await this.storage.getUser(sellerId);
          sellerConnectedAccountId = seller?.stripeConnectedAccountId || null;
        }
      }

      // Calculate platform fee and total amount
      const platformFeeAmount = Math.round(amount * 100 * this.PLATFORM_FEE_RATE);
      const totalAmount = Math.round(amount * 100);

      // Build payment intent parameters
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: totalAmount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: orderId || "",
          paymentType,
          sellerId: sellerId || "",
        },
      };

      // Use Stripe Connect if seller has connected account
      if (sellerConnectedAccountId && sellerId && seller) {
        // Check if seller can accept charges
        if (!seller?.stripeChargesEnabled) {
          return {
            success: false,
            error: "This store is still setting up payment processing. Please check back soon.",
            errorCode: "STRIPE_CHARGES_DISABLED",
          };
        }

        // Check and request capabilities if needed
        const capabilityCheck = await this.ensureAccountCapabilities(sellerConnectedAccountId);
        if (!capabilityCheck.success) {
          return {
            success: false,
            error: capabilityCheck.error!,
            errorCode: capabilityCheck.errorCode,
          };
        }

        // Configure Stripe Connect payment
        paymentIntentParams.application_fee_amount = platformFeeAmount;
        paymentIntentParams.on_behalf_of = sellerConnectedAccountId;
        paymentIntentParams.transfer_data = {
          destination: sellerConnectedAccountId,
        };

        // Use seller's listing currency
        paymentIntentParams.currency = (seller.listingCurrency || 'USD').toLowerCase();

        console.log(`[Stripe Connect] Creating payment intent with ${platformFeeAmount / 100} ${paymentIntentParams.currency.toUpperCase()} fee to platform, rest to seller ${sellerId}`);
      } else if (sellerId) {
        // Seller exists but hasn't connected Stripe account
        return {
          success: false,
          error: "This store hasn't set up payment processing yet. Please contact the seller to complete their Stripe setup.",
          errorCode: "STRIPE_NOT_CONNECTED",
        };
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      return {
        success: true,
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      logger.error("Stripe payment intent error", error);
      return {
        success: false,
        error: "Error creating payment intent: " + error.message,
      };
    }
  }

  /**
   * Ensure Stripe Connect account has required capabilities
   */
  private async ensureAccountCapabilities(accountId: string): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
  }> {
    try {
      if (!this.stripe) {
        return { success: false, error: "Stripe not configured" };
      }

      const account = await this.stripe.accounts.retrieve(accountId);
      const hasCardPayments = account.capabilities?.card_payments === 'active' ||
        account.capabilities?.card_payments === 'pending';
      const hasTransfers = account.capabilities?.transfers === 'active' ||
        account.capabilities?.transfers === 'pending';

      if (!hasCardPayments || !hasTransfers) {
        console.log(`[Stripe] Account ${account.id} missing capabilities. card_payments: ${account.capabilities?.card_payments}, transfers: ${account.capabilities?.transfers}`);
        logger.info(`[Stripe] Requesting card_payments and transfers for account ${account.id}...`);

        await this.stripe.accounts.update(accountId, {
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

        // Re-fetch to check updated status
        const updatedAccount = await this.stripe.accounts.retrieve(accountId);
        logger.info(`[Stripe] Capabilities after request - card_payments: ${updatedAccount.capabilities?.card_payments}, transfers: ${updatedAccount.capabilities?.transfers}`);

        // Allow pending/unrequested capabilities - Stripe will error if truly required
        if (updatedAccount.capabilities?.card_payments === 'inactive' ||
          updatedAccount.capabilities?.transfers === 'inactive') {
          logger.info(`[Stripe] Capabilities inactive - payment may fail. Account may need additional information.`);
          return {
            success: false,
            error: "This store needs to complete payment setup. Please contact the store owner to finish their Stripe onboarding.",
            errorCode: "STRIPE_CAPABILITIES_INACTIVE",
          };
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error(`[Stripe] Capability check failed:`, error.message);
      return {
        success: false,
        error: "Payment processing setup error. Please contact the store owner.",
        errorCode: "STRIPE_CAPABILITY_ERROR",
      };
    }
  }

  /**
   * Update payment intent with shipping address for tax calculation
   */
  async updatePaymentIntentAddress(params: {
    paymentIntentId: string;
    address: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    email?: string;
    name?: string;
    phone?: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!this.stripe) {
        return { success: false, error: "Stripe is not configured" };
      }

      const { paymentIntentId, address, email, name, phone } = params;

      if (!address || typeof address !== 'object') {
        return { success: false, error: "Invalid address data" };
      }

      if (!address.country || !address.postalCode) {
        return { success: false, error: "Country and postal code are required for tax calculation" };
      }

      await this.stripe.paymentIntents.update(paymentIntentId, {
        shipping: {
          name: name || "Customer",
          phone: phone || undefined,
          address: {
            line1: address.line1 || "",
            line2: address.line2 || undefined,
            city: address.city || "",
            state: address.state || "",
            postal_code: address.postalCode || "",
            country: address.country || "",
          },
        },
        receipt_email: email || undefined,
      });

      logger.info(`[Express Checkout] Updated PaymentIntent ${paymentIntentId} with wallet address`, {
        city: address.city,
        state: address.state,
        country: address.country,
      });

      return { success: true };
    } catch (error: any) {
      logger.error("Failed to update payment intent with wallet address", error);
      return { success: false, error: "Failed to update payment intent" };
    }
  }

  /**
   * Retrieve payment intent with tax data
   */
  async getPaymentIntentTaxData(paymentIntentId: string): Promise<{
    success: boolean;
    data?: {
      taxAmount: string;
      taxCalculationId: string | null;
      taxBreakdown: any;
      subtotalBeforeTax: string;
    };
    error?: string;
  }> {
    try {
      if (!this.stripe) {
        return { success: false, error: "Stripe is not configured" };
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge'],
      });

      const charge = paymentIntent.latest_charge as any;
      const taxAmountInCents = charge?.total_details?.amount_tax || 0;
      const taxAmount = taxAmountInCents / 100;

      const taxData = {
        taxAmount: taxAmount.toString(),
        taxCalculationId: (paymentIntent as any).automatic_tax?.calculation || null,
        taxBreakdown: charge?.total_details?.breakdown?.taxes || null,
        subtotalBeforeTax: ((paymentIntent.amount_received - taxAmountInCents) / 100).toString(),
      };

      logger.info(`[Stripe Tax] Retrieved tax data for payment ${paymentIntentId}: ${taxAmount > 0 ? `$${taxAmount} tax collected` : 'no tax'}`, {
        taxAmount,
        calculationId: taxData.taxCalculationId,
        hasBreakdown: !!taxData.taxBreakdown
      });

      return { success: true, data: taxData };
    } catch (error: any) {
      logger.error("Failed to retrieve tax data", error);
      return { success: false, error: "Failed to retrieve tax data" };
    }
  }

  /**
   * Retrieve payment intent details with client_secret validation
   */
  async getPaymentIntent(paymentIntentId: string, clientSecret: string): Promise<{
    success: boolean;
    data?: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      metadata: any;
    };
    error?: string;
  }> {
    try {
      if (!this.stripe) {
        return { success: false, error: "Stripe is not configured" };
      }

      if (!clientSecret) {
        return { success: false, error: "Unauthorized - client_secret required" };
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      // Validate client_secret
      if (paymentIntent.client_secret !== clientSecret) {
        logger.warn(`[Security] Invalid client_secret for payment intent ${paymentIntentId}`);
        return { success: false, error: "Unauthorized - invalid client_secret" };
      }

      return {
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
        },
      };
    } catch (error: any) {
      logger.error("Failed to retrieve payment intent", error);
      return { success: false, error: "Failed to retrieve payment intent" };
    }
  }

  /**
   * Cancel payment intent - releases inventory and cancels Stripe payment
   */
  async cancelPaymentIntent(params: {
    paymentIntentId: string;
    clientSecret: string;
  }, paymentService?: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!this.stripe) {
        return { success: false, error: "Stripe is not configured" };
      }

      const { paymentIntentId, clientSecret } = params;

      if (!clientSecret) {
        logger.warn(`[Security] Missing client_secret for payment intent cancellation ${paymentIntentId}`);
        return { success: false, error: "Unauthorized - client_secret required" };
      }

      // Get payment intent record
      const paymentIntent = await this.storage.getPaymentIntentByProviderIntentId(paymentIntentId);

      if (!paymentIntent) {
        logger.warn(`[Payment Cancel] Payment intent not found: ${paymentIntentId}`);
        return { success: false, error: "Payment intent not found" };
      }

      // Validate client_secret
      const stripeIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (stripeIntent.client_secret !== clientSecret) {
        logger.warn(`[Security] Invalid client_secret for payment intent cancellation ${paymentIntentId}`);
        return { success: false, error: "Unauthorized - invalid client_secret" };
      }

      // Only allow cancellation of pending/requires_payment_method intents
      if (!['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(stripeIntent.status)) {
        logger.warn(`[Payment Cancel] Cannot cancel payment intent with status: ${stripeIntent.status}`);
        return {
          success: false,
          error: `Cannot cancel payment with status: ${stripeIntent.status}`,
        };
      }

      // Use payment service if available
      if (paymentService) {
        await paymentService.cancelPayment(paymentIntent.id);
        logger.info(`[Payment Cancel] Successfully cancelled payment intent ${paymentIntentId} via PaymentService`);
      } else {
        // Fallback: Cancel directly with Stripe
        await this.stripe.paymentIntents.cancel(paymentIntentId);
        logger.info(`[Payment Cancel] Successfully cancelled payment intent ${paymentIntentId} directly`);
      }

      return { success: true };
    } catch (error: any) {
      logger.error("Failed to cancel payment intent", error);
      return { success: false, error: "Failed to cancel payment intent" };
    }
  }
}
