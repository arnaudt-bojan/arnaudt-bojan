import Stripe from "stripe";
import { IStorage } from "../storage";
import { logger } from "../logger";

export interface CreateSubscriptionInput {
  userId: string;
  plan: "monthly" | "annual";
  origin: string;
}

export interface SyncSubscriptionInput {
  userId: string;
}

export interface SubscriptionStatusResult {
  status: string | null;
  plan: string | null;
  trialEndsAt: Date | null;
  hasPaymentMethod: boolean;
  subscription: any;
  paymentMethod: any;
  nextBillingDate: Date | null;
  cancelAtPeriodEnd: boolean;
  billingHistory: any[];
  upcomingInvoice: {
    amount: number;
    currency: string;
    date: Date | null;
  } | null;
}

export class SubscriptionService {
  constructor(
    private storage: IStorage,
    private stripe: Stripe | null
  ) {}

  async createCheckoutSession(input: CreateSubscriptionInput) {
    if (!this.stripe) {
      return {
        success: false,
        error: "Stripe is not configured",
      };
    }

    const user = await this.storage.getUser(input.userId);
    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Get or create Stripe price ID
    const priceId = await this.getOrCreatePriceId(input.plan);

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await this.storage.upsertUser({ ...user, stripeCustomerId: customerId });
    }

    // Calculate trial end date
    const trialInfo = this.calculateTrialEnd(user);

    // Create Checkout Session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      subscription_data: trialInfo.trialEndTimestamp ? {
        trial_end: trialInfo.trialEndTimestamp,
      } : undefined,
      success_url: `${input.origin}/subscription-success`,
      cancel_url: `${input.origin}/settings?subscription=cancelled`,
      metadata: {
        userId: user.id,
        plan: input.plan,
      },
      payment_method_options: {
        card: {
          request_three_d_secure: 'any',
        },
      },
      customer_update: {
        address: 'never',
        name: 'never',
      },
    });

    // Update trial end date if new trial was created
    if (trialInfo.shouldUpdateTrialDate && trialInfo.trialEndTimestamp) {
      const newTrialEndDate = new Date(trialInfo.trialEndTimestamp * 1000);
      await this.storage.upsertUser({
        ...user,
        trialEndsAt: newTrialEndDate,
      });
    }

    return {
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    };
  }

  async syncSubscription(input: SyncSubscriptionInput) {
    if (!this.stripe) {
      return {
        success: false,
        error: "Stripe is not configured",
      };
    }

    const user = await this.storage.getUser(input.userId);
    if (!user || !user.stripeCustomerId) {
      return {
        success: false,
        error: "No Stripe customer found",
      };
    }

    // Fetch subscriptions from Stripe
    const subscriptions = await this.stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      
      // Map Stripe status to app status
      const status = this.mapStripeStatus(subscription.status);
      
      logger.info(`[Subscription Sync] Subscription ${subscription.id} has Stripe status: ${subscription.status}, mapped to: ${status}`);

      // Save payment method if available
      if (subscription.default_payment_method && typeof subscription.default_payment_method === 'object') {
        await this.savePaymentMethod(input.userId, subscription.default_payment_method as Stripe.PaymentMethod);
      }

      // Update user with subscription info
      const plan = this.normalizeStripePlan(subscription.items.data[0]?.price?.recurring?.interval);
      
      await this.storage.upsertUser({
        ...user,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: status,
        subscriptionPlan: plan,
      });

      logger.info(`[Subscription Sync] Updated user ${input.userId} with status: ${status}`);

      // Emit Socket.IO event for real-time UI update
      const { settingsSocketService } = await import('../websocket');
      settingsSocketService.emitInternalSettingsUpdated(user.id, 'subscription', {
        subscriptionStatus: status,
        subscriptionPlan: plan,
      });

      return {
        success: true,
        data: {
          status,
          plan,
          subscriptionId: subscription.id,
        },
      };
    }

    // No subscription found
    return {
      success: true,
      data: {
        status: null,
        plan: null,
      },
    };
  }

  async fixSubscription(userId: string) {
    if (!this.stripe) {
      return {
        success: false,
        error: "Stripe is not configured",
      };
    }

    const user = await this.storage.getUser(userId);
    if (!user || !user.stripeCustomerId) {
      return {
        success: false,
        error: "No Stripe customer found",
      };
    }

    logger.info(`[DEBUG] Fetching subscriptions for customer ${user.stripeCustomerId}`);

    // Fetch all subscriptions with debugging
    const subscriptions = await this.stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      limit: 10,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    logger.info(`[DEBUG] Found ${subscriptions.data.length} subscriptions for customer ${user.stripeCustomerId}`);
    subscriptions.data.forEach((sub) => {
      logger.info(`[DEBUG] Subscription ${sub.id}: status=${sub.status}, created=${new Date(sub.created * 1000)}, items=${JSON.stringify(sub.items.data.map((i) => i.price?.id))}`);
    });

    // Check checkout sessions
    const sessions = await this.stripe.checkout.sessions.list({
      customer: user.stripeCustomerId,
      limit: 5,
    });
    logger.info(`[DEBUG] Found ${sessions.data.length} checkout sessions`);
    sessions.data.forEach((session) => {
      logger.info(`[DEBUG] Checkout ${session.id}: status=${session.status}, payment_status=${session.payment_status}, subscription=${session.subscription}, mode=${session.mode}, created=${new Date(session.created * 1000)}`);
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const status = this.mapStripeStatus(subscription.status);
      const plan = this.normalizeStripePlan(subscription.items.data[0]?.price?.recurring?.interval);

      logger.info(`[DEBUG] Updating user with subscription ${subscription.id}, status: ${status}`);

      await this.storage.upsertUser({
        ...user,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: status,
        subscriptionPlan: plan,
      });

      return {
        success: true,
        data: {
          subscriptionId: subscription.id,
          stripeStatus: subscription.status,
          mappedStatus: status,
          plan,
          message: "Subscription synced successfully",
        },
      };
    }

    return {
      success: false,
      error: "No subscriptions found in Stripe for this customer",
      customerId: user.stripeCustomerId,
    };
  }

  async getSubscriptionStatus(userId: string): Promise<{ success: boolean; data?: SubscriptionStatusResult; error?: string }> {
    const user = await this.storage.getUser(userId);
    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    let subscription = null;
    let paymentMethod = null;
    let upcomingInvoice = null;
    let billingHistory: any[] = [];
    let nextBillingDate = null;
    let cancelAtPeriodEnd = false;

    if (user.stripeSubscriptionId && this.stripe) {
      try {
        // Get subscription with expanded data
        subscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ['default_payment_method']
        });

        // Get payment method
        if (subscription.default_payment_method) {
          paymentMethod = subscription.default_payment_method;
        }

        // Get upcoming invoice
        try {
          upcomingInvoice = await this.stripe.invoices.retrieveUpcoming({
            customer: user.stripeCustomerId as string,
          });
          nextBillingDate = new Date(upcomingInvoice.period_end * 1000);
        } catch {
          logger.info("No upcoming invoice found");
        }

        // Get billing history
        if (user.stripeCustomerId) {
          const invoices = await this.stripe.invoices.list({
            customer: user.stripeCustomerId,
            limit: 5,
          });
          logger.info(`[Subscription Status] Retrieved ${invoices.data.length} invoices for customer ${user.stripeCustomerId}`);
          billingHistory = invoices.data.map(inv => ({
            id: inv.id,
            amount: inv.amount_paid,
            currency: inv.currency,
            status: inv.status,
            date: new Date(inv.created * 1000),
            invoiceUrl: inv.hosted_invoice_url,
            invoicePdf: inv.invoice_pdf,
            number: inv.number,
          }));
        }

        cancelAtPeriodEnd = subscription.cancel_at_period_end;
      } catch (error) {
        logger.error("Error fetching subscription details", error);
      }
    }

    return {
      success: true,
      data: {
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
        trialEndsAt: user.trialEndsAt,
        hasPaymentMethod: !!user.stripeCustomerId,
        subscription,
        paymentMethod,
        nextBillingDate,
        cancelAtPeriodEnd,
        billingHistory,
        upcomingInvoice: upcomingInvoice ? {
          amount: upcomingInvoice.amount_due,
          currency: upcomingInvoice.currency,
          date: nextBillingDate,
        } : null,
      },
    };
  }

  async cancelSubscription(userId: string) {
    if (!this.stripe) {
      return {
        success: false,
        error: "Stripe is not configured",
      };
    }

    const user = await this.storage.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      return {
        success: false,
        error: "No active subscription",
      };
    }

    const subscription = await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return {
      success: true,
      data: {
        message: "Subscription will be canceled at the end of your billing period",
        subscription,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        periodEnd: new Date(subscription.current_period_end * 1000),
      },
    };
  }

  async reactivateSubscription(userId: string) {
    if (!this.stripe) {
      return {
        success: false,
        error: "Stripe is not configured",
      };
    }

    const user = await this.storage.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      return {
        success: false,
        error: "No active subscription",
      };
    }

    const subscription = await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return {
      success: true,
      data: {
        message: "Subscription reactivated successfully",
        subscription,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    };
  }

  // Private helper methods

  private async getOrCreatePriceId(plan: "monthly" | "annual"): Promise<string> {
    if (!this.stripe) {
      throw new Error("Stripe not configured");
    }

    // In production, use environment variable price IDs
    if (process.env.NODE_ENV !== 'development' && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_ANNUAL) {
      return plan === "annual" 
        ? process.env.STRIPE_PRICE_ANNUAL
        : process.env.STRIPE_PRICE_MONTHLY;
    }

    // In development, create prices programmatically
    const products = await this.stripe.products.list({ limit: 1 });
    let product = products.data.find(p => p.name === 'Upfirst Pro');
    
    if (!product) {
      product = await this.stripe.products.create({
        name: 'Upfirst Pro',
        description: 'Professional e-commerce platform subscription',
      });
    }

    const prices = await this.stripe.prices.list({ product: product.id });
    
    if (plan === "annual") {
      let annualPrice = prices.data.find(p => p.recurring?.interval === 'year' && p.unit_amount === 9900);
      if (!annualPrice) {
        annualPrice = await this.stripe.prices.create({
          product: product.id,
          unit_amount: 9900,
          currency: 'usd',
          recurring: { interval: 'year' },
        });
      }
      return annualPrice.id;
    } else {
      let monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month' && p.unit_amount === 999);
      if (!monthlyPrice) {
        monthlyPrice = await this.stripe.prices.create({
          product: product.id,
          unit_amount: 999,
          currency: 'usd',
          recurring: { interval: 'month' },
        });
      }
      return monthlyPrice.id;
    }
  }

  private calculateTrialEnd(user: any): { trialEndTimestamp: number | undefined; shouldUpdateTrialDate: boolean } {
    let trialEndTimestamp: number | undefined;
    let shouldUpdateTrialDate = false;
    
    if (user.trialEndsAt) {
      const existingTrialEnd = new Date(user.trialEndsAt);
      if (Number.isFinite(existingTrialEnd.getTime()) && existingTrialEnd.getTime() > Date.now()) {
        trialEndTimestamp = Math.floor(existingTrialEnd.getTime() / 1000);
      }
    } else {
      const newTrialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      trialEndTimestamp = Math.floor(newTrialEnd.getTime() / 1000);
      shouldUpdateTrialDate = true;
    }

    return { trialEndTimestamp, shouldUpdateTrialDate };
  }

  private mapStripeStatus(stripeStatus: string): string | null {
    switch (stripeStatus) {
      case 'trialing':
        return 'trial';
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'canceled':
      case 'incomplete_expired':
        return 'canceled';
      case 'incomplete':
      case 'unpaid':
        return 'incomplete';
      default:
        return null;
    }
  }

  private normalizeStripePlan(stripeInterval: string | undefined): string {
    // Map Stripe interval to app plan identifiers
    if (stripeInterval === 'year') return 'annual';
    if (stripeInterval === 'month') return 'monthly';
    return 'monthly'; // default fallback
  }

  private async savePaymentMethod(userId: string, paymentMethod: Stripe.PaymentMethod) {
    const existingPaymentMethods = await this.storage.getSavedPaymentMethodsByUserId(userId);
    const alreadySaved = existingPaymentMethods.find((pm: any) => pm.stripePaymentMethodId === paymentMethod.id);
    
    if (!alreadySaved) {
      // Save new payment method as default
      const newPm = await this.storage.createSavedPaymentMethod({
        userId,
        stripePaymentMethodId: paymentMethod.id,
        cardBrand: paymentMethod.card?.brand || null,
        cardLast4: paymentMethod.card?.last4 || null,
        cardExpMonth: paymentMethod.card?.exp_month || null,
        cardExpYear: paymentMethod.card?.exp_year || null,
        isDefault: 1,
        label: null,
      });
      
      // Use setDefaultPaymentMethod to handle updating defaults properly
      await this.storage.setDefaultPaymentMethod(userId, newPm.id);
      logger.info(`[Subscription Sync] Saved payment method ${paymentMethod.id} as default for user ${userId}`);
    } else if (alreadySaved.isDefault === 0) {
      // Set this as default
      await this.storage.setDefaultPaymentMethod(userId, alreadySaved.id);
      logger.info(`[Subscription Sync] Updated payment method ${paymentMethod.id} to default for user ${userId}`);
    }
  }
}
