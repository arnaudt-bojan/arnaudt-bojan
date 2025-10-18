import Stripe from "stripe";
import { logger } from "../logger";
import type { IStorage } from "../storage";
import type { InventoryService } from "./inventory.service";
import type { WebhookHandler } from "./payment/webhook-handler";

interface NotificationService {
  sendSubscriptionInvoice(user: any, invoiceData: any): Promise<void>;
}

export class StripeWebhookService {
  constructor(
    private storage: IStorage,
    private stripe: Stripe,
    private notificationService: NotificationService,
    private inventoryService: InventoryService,
    private webhookHandler: WebhookHandler | null
  ) {}

  /**
   * Main entry point for webhook processing
   * Handles signature verification, idempotency check, event routing, and marking as processed
   */
  async processWebhook(
    body: any,
    signature: string,
    webhookSecret: string
  ): Promise<{ received: boolean; skipped?: boolean }> {
    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      logger.error(`[Webhook] Signature verification failed:`, err.message);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    logger.info(`[Webhook] Received event: ${event.type}`);

    // Check if event already processed (idempotency)
    const alreadyProcessed = await this.storage.isWebhookEventProcessed(event.id);
    if (alreadyProcessed) {
      logger.info(`[Webhook] Event ${event.id} already processed, skipping`);
      return { received: true, skipped: true };
    }

    // Route to appropriate event handler
    await this.routeEvent(event);

    // Mark event as processed (idempotency)
    await this.storage.markWebhookEventProcessed(event.id, event.data, event.type, 'stripe');
    logger.info(`[Webhook] Marked event ${event.id} as processed`);

    return { received: true };
  }

  /**
   * Route events to appropriate handler methods
   */
  private async routeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event);
        break;

      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event);
        break;

      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await this.handlePaymentIntentEvents(event);
        break;

      default:
        logger.info(`[Webhook] Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle checkout.session.completed event
   * Processes subscription creation, wallet top-ups, and payment method saving
   */
  private async handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const type = session.metadata?.type;
    const sellerId = session.metadata?.sellerId;

    // Handle wallet top-up
    if (type === 'wallet_topup' && sellerId && session.payment_status === 'paid') {
      // SECURITY: Use Stripe's amount_total as source of truth (prevents metadata tampering)
      const amountCents = session.amount_total || 0;
      const amount = amountCents / 100; // Convert cents to dollars
      
      // Validate currency (enforce USD only)
      if (session.currency !== 'usd') {
        logger.error('[Webhook] Wallet top-up rejected - non-USD currency', {
          sellerId,
          currency: session.currency,
          sessionId: session.id
        });
        return;
      }
      
      if (amount > 0) {
        // CRITICAL: Do NOT catch errors - let them bubble up so webhook retries
        // If we mark event processed without crediting, seller loses money!
        const { CreditLedgerService } = await import('./credit-ledger.service');
        const creditLedgerService = new CreditLedgerService(this.storage);
        
        await creditLedgerService.creditWalletTopup(sellerId, amount, session.id);
        
        logger.info('[Webhook] Wallet top-up credited', {
          sellerId,
          amount,
          currency: session.currency,
          sessionId: session.id
        });
      }
      return;
    }

    // Handle subscription checkout
    if (userId && plan && session.subscription) {
      const user = await this.storage.getUser(userId);
      if (user) {
        // Retrieve the subscription with expanded payment method
        const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string, {
          expand: ['default_payment_method', 'latest_invoice']
        });
        
        // CRITICAL: Only activate subscription if payment method is actually attached
        // Check for default_payment_method or payment_intent success
        let hasValidPaymentMethod = false;
        
        if (subscription.default_payment_method) {
          hasValidPaymentMethod = true;
        } else if (subscription.latest_invoice && typeof subscription.latest_invoice === 'object') {
          const invoice = subscription.latest_invoice as any;
          if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
            const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
            hasValidPaymentMethod = paymentIntent.status === 'succeeded';
          } else if (invoice.paid === true) {
            hasValidPaymentMethod = true;
          }
        }
        
        let status: string;
        
        // Only activate trial or paid subscription if payment method is confirmed
        if (subscription.status === 'trialing' && hasValidPaymentMethod) {
          status = 'trial';
          logger.info(`[Webhook] Checkout completed - user ${userId} starting trial with confirmed payment method`);
        } else if (subscription.status === 'active' && hasValidPaymentMethod) {
          status = 'active';
          logger.info(`[Webhook] Checkout completed - user ${userId} subscription active (paid)`);
        } else {
          // No valid payment method - don't activate subscription
          logger.info(`[Webhook] Checkout completed - user ${userId} subscription status ${subscription.status} without payment method, awaiting payment`);
          await this.storage.upsertUser({
            ...user,
            stripeSubscriptionId: subscription.id,
            subscriptionPlan: plan,
            // Don't set subscriptionStatus - keep it null until payment confirmed
          });
          return;
        }

        // Save payment method to database if it exists
        if (subscription.default_payment_method && typeof subscription.default_payment_method === 'object') {
          const paymentMethod = subscription.default_payment_method as Stripe.PaymentMethod;
          
          // Check if already saved
          const existingPaymentMethods = await this.storage.getSavedPaymentMethodsByUserId(userId);
          const alreadySaved = existingPaymentMethods.find((pm: any) => pm.stripePaymentMethodId === paymentMethod.id);
          
          if (!alreadySaved) {
            // Save the new payment method as default
            await this.storage.createSavedPaymentMethod({
              userId,
              stripePaymentMethodId: paymentMethod.id,
              cardBrand: paymentMethod.card?.brand || null,
              cardLast4: paymentMethod.card?.last4 || null,
              cardExpMonth: paymentMethod.card?.exp_month || null,
              cardExpYear: paymentMethod.card?.exp_year || null,
              isDefault: 1, // Always default since it's the subscription's default
              label: null,
            });
            logger.info(`[Webhook] Saved payment method ${paymentMethod.id} as default for user ${userId}`);
            
            // Ensure this is the only default (use setDefaultPaymentMethod to handle this)
            await this.storage.setDefaultPaymentMethod(userId, paymentMethod.id);
          } else if (alreadySaved.isDefault === 0) {
            // Payment method exists but isn't default - make it default since it's the subscription's default
            await this.storage.setDefaultPaymentMethod(userId, alreadySaved.id);
            logger.info(`[Webhook] Updated payment method ${paymentMethod.id} to default for user ${userId}`);
          }
        }

        await this.storage.upsertUser({
          ...user,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: status,
          subscriptionPlan: plan,
        });
      }
    }
  }

  /**
   * Handle customer.subscription.created event
   * Saves subscription ID, status will be set by checkout.session.completed or invoice.payment_succeeded
   */
  private async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    // Find user by Stripe customer ID (indexed lookup)
    const user = await (this.storage as any).getUserByStripeCustomerId(customerId);

    if (user) {
      // Only update subscription ID, don't change status yet
      // Status will be set by checkout.session.completed or invoice.payment_succeeded
      await this.storage.upsertUser({
        ...user,
        stripeSubscriptionId: subscription.id,
      });
      logger.info(`[Webhook] Subscription created for user ${user.id}, awaiting payment confirmation`);
    }
  }

  /**
   * Handle customer.subscription.updated event
   * Updates subscription status based on Stripe subscription status
   */
  private async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    // Find user by Stripe customer ID (indexed lookup)
    const user = await (this.storage as any).getUserByStripeCustomerId(customerId);

    if (user) {
      let status: string;
      switch (subscription.status) {
        case 'trialing':
          status = 'trial';
          break;
        case 'active':
          status = 'active';
          break;
        case 'past_due':
          status = 'past_due';
          break;
        case 'canceled':
        case 'unpaid':
          status = 'canceled';
          break;
        default:
          status = subscription.status;
      }

      await this.storage.upsertUser({
        ...user,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: status,
      });
      logger.info(`[Webhook] Updated user ${user.id} subscription status to ${status}`);
    }
  }

  /**
   * Handle customer.subscription.deleted event
   * Cancels subscription and deactivates store
   */
  private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    const user = await (this.storage as any).getUserByStripeCustomerId(customerId);

    if (user) {
      await this.storage.upsertUser({
        ...user,
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
        storeActive: 0, // CRITICAL: Deactivate store when subscription is cancelled
      });
      logger.info(`[Webhook] Cancelled subscription for user ${user.id} and deactivated store`);
    }
  }

  /**
   * Handle invoice.payment_failed event
   * Marks subscription as past_due and potentially deactivates store
   */
  private async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    
    const user = await (this.storage as any).getUserByStripeCustomerId(customerId);

    if (user) {
      // Retrieve subscription to check attempt count
      let shouldDeactivateStore = false;
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          // If subscription is unpaid or cancelled due to payment failures, deactivate store
          if (subscription.status === 'unpaid' || subscription.status === 'canceled') {
            shouldDeactivateStore = true;
          }
        } catch (error) {
          logger.error(`[Webhook] Error retrieving subscription:`, error);
        }
      }

      await this.storage.upsertUser({
        ...user,
        subscriptionStatus: 'past_due',
        storeActive: shouldDeactivateStore ? 0 : user.storeActive, // Deactivate if subscription is dead
      });
      logger.info(`[Webhook] Marked user ${user.id} subscription as past_due${shouldDeactivateStore ? ' and deactivated store' : ''}`);
      
      // TODO: Send notification email to user about failed payment
    }
  }

  /**
   * Handle invoice.payment_succeeded event
   * Activates subscription and sends invoice email
   */
  private async handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    
    const user = await (this.storage as any).getUserByStripeCustomerId(customerId);

    if (user) {
      // CRITICAL: Activate subscription on first successful payment
      // This handles cases where trial period ends and first payment is collected
      // Or when user subscribes without trial
      const shouldActivate = !user.subscriptionStatus || 
                            user.subscriptionStatus === 'past_due' || 
                            user.subscriptionStatus === null;
      
      if (shouldActivate) {
        await this.storage.upsertUser({
          ...user,
          subscriptionStatus: 'active',
        });
        logger.info(`[Webhook] Activated user ${user.id} subscription (first payment succeeded)`);
      } else if (user.subscriptionStatus === 'past_due') {
        await this.storage.upsertUser({
          ...user,
          subscriptionStatus: 'active',
        });
        logger.info(`[Webhook] Restored user ${user.id} subscription to active`);
      }

      // Send invoice email for all successful subscription payments
      try {
        const periodStart = new Date(invoice.period_start * 1000).toLocaleDateString();
        const periodEnd = new Date(invoice.period_end * 1000).toLocaleDateString();

        await this.notificationService.sendSubscriptionInvoice(user, {
          amount: invoice.amount_paid,
          currency: invoice.currency,
          invoiceNumber: invoice.number || invoice.id,
          invoiceUrl: invoice.hosted_invoice_url || undefined,
          periodStart,
          periodEnd,
          plan: user.subscriptionPlan || 'monthly',
        });
        
        logger.info(`[Webhook] Subscription invoice email sent to ${user.email}`);
      } catch (emailError) {
        logger.error(`[Webhook] Failed to send invoice email:`, emailError);
        // Continue processing - don't fail webhook if email fails
      }
    }
  }

  /**
   * Handle payment_intent events (succeeded, payment_failed, canceled)
   * Delegates to WebhookHandler for order processing
   */
  private async handlePaymentIntentEvents(event: Stripe.Event): Promise<void> {
    // Delegate payment events to WebhookHandler
    if (this.webhookHandler) {
      await this.webhookHandler.handleVerifiedEvent({
        id: event.id,
        type: event.type,
        data: event.data,
      });
    } else {
      logger.warn(`[Webhook] WebhookHandler not initialized, skipping ${event.type}`);
    }
  }

}
