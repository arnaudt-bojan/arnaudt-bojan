import Stripe from 'stripe';
import { IStorage } from '../../storage';
import { IPaymentProvider } from './payment-provider.interface';
import { InventoryService } from '../inventory.service';
import { NotificationService } from '../../notifications';
import { logger } from '../../logger';
import type { OrderService } from '../order.service';
import { orderWebSocketService } from '../../websocket';

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
}

export interface WebhookResult {
  success: boolean;
  error?: string;
}

export class WebhookHandler {
  constructor(
    private storage: IStorage,
    private provider: IPaymentProvider,
    private inventoryService: InventoryService,
    private notificationService: NotificationService,
    private orderService: OrderService,
    private stripe?: Stripe
  ) {}

  /**
   * Handle already-verified webhook event (for use when signature already checked)
   */
  async handleVerifiedEvent(event: WebhookEvent): Promise<WebhookResult> {
    try {
      // Check if event already processed (idempotency)
      const alreadyProcessed = await this.storage.isWebhookEventProcessed(event.id);
      if (alreadyProcessed) {
        logger.info(`Webhook event ${event.id} already processed, skipping`);
        return { success: true };
      }

      // Process event based on type
      await this.processEvent(event);

      // Mark event as processed
      await this.storage.markWebhookEventProcessed(
        event.id,
        event.data,
        event.type,
        this.provider.getName()
      );

      logger.info(`Successfully processed webhook event ${event.id} (${event.type})`);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Webhook processing failed:', error);

      // Store failed event for retry
      try {
        await this.storage.storeFailedWebhookEvent({
          eventId: event.id,
          providerName: this.provider.getName(),
          eventType: event.type,
          payload: JSON.stringify(event), // Store event as JSON
          errorMessage,
          retryCount: 0,
        });
      } catch (storeError) {
        logger.error('Failed to store failed webhook event:', storeError);
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process incoming webhook event with idempotency and error handling
   */
  async handleWebhook(rawBody: string, signature: string): Promise<WebhookResult> {
    try {
      // Verify signature and construct event
      const event = await this.provider.verifyWebhookSignature(rawBody, signature);

      // Check if event already processed (idempotency)
      const alreadyProcessed = await this.storage.isWebhookEventProcessed(event.id);
      if (alreadyProcessed) {
        logger.info(`Webhook event ${event.id} already processed, skipping`);
        return { success: true };
      }

      // Process event based on type
      await this.processEvent(event);

      // Mark event as processed
      await this.storage.markWebhookEventProcessed(
        event.id,
        event.data,
        event.type,
        this.provider.getName()
      );

      logger.info(`Successfully processed webhook event ${event.id} (${event.type})`);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Webhook processing failed:', error);

      // Store failed event for retry with original Stripe event data
      try {
        // Try to parse event from rawBody to get event ID and type
        let eventId = `failed_${Date.now()}`;
        let eventType = 'unknown';
        
        try {
          const parsedEvent = JSON.parse(rawBody);
          if (parsedEvent.id) eventId = parsedEvent.id;
          if (parsedEvent.type) eventType = parsedEvent.type;
        } catch {
          // If parsing fails, use defaults
        }

        await this.storage.storeFailedWebhookEvent({
          eventId,
          providerName: this.provider.getName(),
          eventType,
          payload: rawBody, // Store original raw payload for signature verification
          errorMessage,
          retryCount: 0,
        });
      } catch (storeError) {
        logger.error('Failed to store failed webhook event:', storeError);
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process specific event types
   */
  private async processEvent(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event);
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event);
        break;

      case 'account.updated':
        await this.handleAccountUpdated(event);
        break;

      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Handle successful payment intent
   * 
   * Architecture 3 Compliance:
   * - Thin webhook handler
   * - Delegates to OrderService for business logic
   * - OrderService handles: DB updates + notifications
   */
  private async handlePaymentIntentSucceeded(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    const paymentType = paymentIntent.metadata?.paymentType; // 'deposit' | 'balance' | undefined
    const balanceRequestId = paymentIntent.metadata?.balanceRequestId;
    
    // Update payment intent status in database
    const existingIntent = await this.storage.getPaymentIntentByProviderIntentId(paymentIntent.id);
    
    if (existingIntent) {
      await this.storage.updatePaymentIntentStatus(existingIntent.id, 'succeeded');
      logger.info(`[Webhook] Updated payment intent ${existingIntent.id} to succeeded`);
    } else {
      logger.warn(`[Webhook] Payment intent ${paymentIntent.id} not found in database`);
    }

    // Calculate amountPaid with proper currency conversion
    const amountInMinorUnits = paymentIntent.amount_received || paymentIntent.amount;
    const currency = paymentIntent.currency.toUpperCase();
    
    // Currency conversion
    const zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
    const threeDecimalCurrencies = ['BHD', 'JOD', 'KWD', 'OMR', 'TND'];
    
    let divisor = 100; // Default: 2 decimal places
    if (zeroDecimalCurrencies.includes(currency)) {
      divisor = 1;
    } else if (threeDecimalCurrencies.includes(currency)) {
      divisor = 1000;
    }
    
    const amountPaid = amountInMinorUnits / divisor;
    const amountPaidCents = amountInMinorUnits; // Store amount in cents for events
    const checkoutSessionId = paymentIntent.metadata?.checkoutSessionId;

    // Handle BALANCE payments separately
    if (paymentType === 'balance' && balanceRequestId && orderId) {
      logger.info(`[Webhook] Processing balance payment for order ${orderId}`);
      
      // Get current order and balance request
      const order = await this.storage.getOrder(orderId);
      const balanceRequest = await this.storage.getBalanceRequest(balanceRequestId);
      
      if (!order) {
        logger.error(`[Webhook] Order ${orderId} not found for balance payment`);
        return;
      }
      
      if (!balanceRequest) {
        logger.error(`[Webhook] Balance request ${balanceRequestId} not found`);
        return;
      }
      
      // Use ACTUAL Stripe payment amount (not pre-computed balance request amount)
      const balancePaidCents = amountPaidCents; // From paymentIntent.amount_received
      const depositAmountCents = order.depositAmountCents || 0;
      const totalPaidCents = depositAmountCents + balancePaidCents;
      
      // Determine decimal precision based on currency
      let decimalPlaces = 2; // Default
      if (zeroDecimalCurrencies.includes(currency)) {
        decimalPlaces = 0;
      } else if (threeDecimalCurrencies.includes(currency)) {
        decimalPlaces = 3;
      }
      
      // Convert to decimal for amountPaid field (currency-aware)
      const totalPaidDecimal = (totalPaidCents / divisor).toFixed(decimalPlaces);
      
      // Update order with balance payment
      const updateData: any = {
        balancePaidAt: new Date(),
        paymentStatus: 'fully_paid',
        amountPaid: totalPaidDecimal,
        remainingBalance: (0).toFixed(decimalPlaces), // Currency-aware zero
      };
      
      // Only update status if not already shipped/delivered/completed
      if (!['shipped', 'delivered', 'completed'].includes(order.status)) {
        updateData.status = 'processing';
      }
      
      await this.storage.updateOrder(orderId, updateData);
      
      // Update balance request status with full payment details
      await this.storage.updateBalanceRequest(balanceRequestId, {
        status: 'paid',
        paymentIntentId: paymentIntent.id,
      });
      
      // Create order event
      await this.storage.createOrderEvent({
        orderId,
        eventType: 'balance_payment_received',
        payload: {
          amountPaidCents: totalPaidCents,
          balancePaidCents,
          depositAmountCents,
          balanceRequestId,
          paymentIntentId: paymentIntent.id,
        },
        performedBy: 'system',
      });
      
      // Get seller for email notification
      const seller = order.sellerId ? await this.storage.getUser(order.sellerId) : null;
      
      if (seller) {
        // Send balance payment confirmation email (currency-aware)
        const balanceAmountDecimal = balancePaidCents / divisor;
        await this.notificationService.sendBalancePaymentReceived(order, seller, balanceAmountDecimal);
        logger.info(`[Webhook] Balance payment confirmation email sent for order ${orderId}`);
      } else {
        logger.warn(`[Webhook] Seller not found for order ${orderId}, skipping email`);
      }
      
      // Broadcast WebSocket update to all clients
      const updatedOrder = await this.storage.getOrder(orderId);
      if (updatedOrder) {
        orderWebSocketService.broadcastOrderUpdate(orderId, {
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus || undefined,
          amountPaid: updatedOrder.amountPaid || undefined,
        });
        logger.info(`[Webhook] Broadcasted balance payment update via WebSocket for order ${orderId}`);
      }
      
      logger.info(`[Webhook] Balance payment confirmed for order ${orderId}, total paid: ${totalPaidCents} cents`);
      
      return; // Don't call orderService.confirmPayment for balance payments
    }

    // Handle DEPOSIT/FULL payments (existing flow)
    // Architecture 3: Delegate to OrderService for payment confirmation
    // OrderService handles: DB updates + inventory commit + event creation + notifications
    if (orderId) {
      const result = await this.orderService.confirmPayment(
        paymentIntent.id, 
        amountPaid, 
        checkoutSessionId
      );
      
      if (result.success) {
        logger.info(`[Webhook] Payment confirmed successfully for order ${orderId}`);
      } else {
        logger.error(`[Webhook] Payment confirmation failed for order ${orderId}:`, result.error);
      }
    } else {
      logger.warn(`[Webhook] No orderId in payment intent metadata`);
    }
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    
    const existingIntent = await this.storage.getPaymentIntentByProviderIntentId(paymentIntent.id);
    
    if (existingIntent) {
      await this.storage.updatePaymentIntentStatus(existingIntent.id, 'failed');
      logger.info(`Updated payment intent ${existingIntent.id} to failed`);
    }

    // CRITICAL: Release inventory reservations on payment failure
    if (orderId) {
      const checkoutSessionId = paymentIntent.metadata?.checkoutSessionId;
      if (checkoutSessionId) {
        try {
          const reservations = await this.storage.getStockReservationsBySession(checkoutSessionId);
          for (const reservation of reservations) {
            await this.inventoryService.releaseReservation(reservation.id);
          }
          logger.info(`[Webhook] Released ${reservations.length} inventory reservations for failed payment (order ${orderId})`);
        } catch (error) {
          logger.error(`[Webhook] Failed to release inventory for failed payment:`, error);
        }
      }

      // Update order status
      await this.storage.updateOrderPaymentStatus(orderId, 'failed');
      await this.storage.updateOrderStatus(orderId, 'cancelled');
      logger.info(`[Webhook] Updated order ${orderId} to cancelled (payment failed)`);
    }
  }

  /**
   * Handle canceled payment intent
   */
  private async handlePaymentIntentCanceled(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    
    const existingIntent = await this.storage.getPaymentIntentByProviderIntentId(paymentIntent.id);
    
    if (existingIntent) {
      await this.storage.updatePaymentIntentStatus(existingIntent.id, 'canceled');
      logger.info(`Updated payment intent ${existingIntent.id} to canceled`);
    }

    // CRITICAL: Release inventory reservations on payment cancellation
    if (orderId) {
      const checkoutSessionId = paymentIntent.metadata?.checkoutSessionId;
      if (checkoutSessionId) {
        try {
          const reservations = await this.storage.getStockReservationsBySession(checkoutSessionId);
          for (const reservation of reservations) {
            await this.inventoryService.releaseReservation(reservation.id);
          }
          logger.info(`[Webhook] Released ${reservations.length} inventory reservations for canceled payment (order ${orderId})`);
        } catch (error) {
          logger.error(`[Webhook] Failed to release inventory for canceled payment:`, error);
        }
      }

      // Update order status
      await this.storage.updateOrderPaymentStatus(orderId, 'failed');
      await this.storage.updateOrderStatus(orderId, 'cancelled');
      logger.info(`[Webhook] Updated order ${orderId} to cancelled (payment canceled)`);
    }
  }

  /**
   * Handle charge refunded event
   */
  private async handleChargeRefunded(event: WebhookEvent): Promise<void> {
    const charge = event.data.object as Stripe.Charge;
    logger.info(`Charge ${charge.id} refunded, amount: ${charge.amount_refunded}`);
    
    // Additional refund processing logic can be added here
    // For example, updating order status, sending notifications, etc.
  }

  /**
   * Handle account updated event (for connected accounts)
   */
  private async handleAccountUpdated(event: WebhookEvent): Promise<void> {
    const account = event.data.object as Stripe.Account;
    logger.info(`Account ${account.id} updated, charges_enabled: ${account.charges_enabled}`);
    
    // Update seller's Stripe account status in database
    // This is important for showing correct account status in dashboard
  }

  /**
   * Handle checkout session completed event (for subscriptions)
   */
  private async handleCheckoutSessionCompleted(event: WebhookEvent): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    logger.info(`[Webhook] Checkout session ${session.id} completed`, {
      mode: session.mode,
      customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
    });

    // Only process subscription checkouts
    if (session.mode !== 'subscription' || !session.subscription) {
      logger.info(`[Webhook] Skipping non-subscription checkout session ${session.id}`);
      return;
    }

    try {
      // Get customer ID as string
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (!customerId) {
        logger.warn(`[Webhook] No customer ID in session ${session.id}`);
        return;
      }

      // Get user by Stripe customer ID
      const user = await this.storage.getUserByStripeCustomerId(customerId);
      if (!user) {
        logger.warn(`[Webhook] No user found for customer ${customerId}`);
        return;
      }

      // Use Stripe instance from constructor
      if (!this.stripe) {
        logger.error('[Webhook] Stripe instance not available');
        return;
      }
      const stripe = this.stripe;

      // Fetch subscription details with expanded payment method and latest invoice
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
        expand: ['default_payment_method', 'latest_invoice.payment_intent'],
      });

      // Map Stripe status to our app status
      let status = null;
      if (subscription.status === 'trialing') {
        status = 'trial';
      } else if (subscription.status === 'active') {
        status = 'active';
      } else if (subscription.status === 'past_due') {
        status = 'past_due';
      } else if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
        status = 'canceled';
      } else if (subscription.status === 'incomplete' || subscription.status === 'unpaid') {
        status = 'incomplete'; // Map incomplete/unpaid to a known status
      }

      // Find payment method from multiple sources (Stripe stores it in different places)
      let paymentMethodId: string | null = null;
      
      // 1. Check subscription.default_payment_method
      if (subscription.default_payment_method) {
        if (typeof subscription.default_payment_method === 'string') {
          paymentMethodId = subscription.default_payment_method;
        } else {
          paymentMethodId = subscription.default_payment_method.id;
        }
      }
      
      // 2. Fallback: Check customer.invoice_settings.default_payment_method
      if (!paymentMethodId) {
        const customer = await stripe.customers.retrieve(session.customer as string);
        if ('invoice_settings' in customer && customer.invoice_settings?.default_payment_method) {
          const defaultPm = customer.invoice_settings.default_payment_method;
          paymentMethodId = typeof defaultPm === 'string' ? defaultPm : defaultPm.id;
        }
      }
      
      // 3. Fallback: Check latest_invoice.payment_intent.payment_method
      if (!paymentMethodId && subscription.latest_invoice) {
        const invoice = subscription.latest_invoice as any; // Use 'any' for expanded invoice
        if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
          const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
          if (paymentIntent.payment_method) {
            paymentMethodId = typeof paymentIntent.payment_method === 'string' 
              ? paymentIntent.payment_method 
              : paymentIntent.payment_method.id;
          }
        }
      }

      // Save payment method to database if found
      if (paymentMethodId) {
        // Retrieve full payment method details
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        // Check if already saved
        const existingPaymentMethod = await this.storage.getSavedPaymentMethodByStripeId(paymentMethod.id);
        
        if (!existingPaymentMethod) {
          // Save the new payment method as default
          await this.storage.createSavedPaymentMethod({
            userId: user.id,
            stripePaymentMethodId: paymentMethod.id,
            cardBrand: paymentMethod.card?.brand || null,
            cardLast4: paymentMethod.card?.last4 || null,
            cardExpMonth: paymentMethod.card?.exp_month || null,
            cardExpYear: paymentMethod.card?.exp_year || null,
            isDefault: 1, // Always default since it's the subscription's default
            label: null,
          });
          logger.info(`[Webhook] Saved payment method ${paymentMethod.id} as default for user ${user.id}`);
        } else if (existingPaymentMethod.isDefault === 0) {
          // Payment method exists but isn't default - make it default using setDefaultPaymentMethod
          await this.storage.setDefaultPaymentMethod(user.id, existingPaymentMethod.id);
          logger.info(`[Webhook] Updated payment method ${paymentMethod.id} to default for user ${user.id}`);
        }
      }

      // Update user with subscription info
      await this.storage.upsertUser({
        ...user,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: status,
        subscriptionPlan: subscription.items.data[0]?.price?.recurring?.interval || 'monthly',
      });

      logger.info(`[Webhook] Updated user ${user.id} with subscription status: ${status}, plan: ${subscription.items.data[0]?.price?.recurring?.interval}`);
    } catch (error) {
      logger.error(`[Webhook] Failed to process checkout session completed:`, error);
      throw error; // Re-throw to mark webhook as failed for retry
    }
  }

  /**
   * Retry failed webhook events
   */
  async retryFailedWebhooks(): Promise<void> {
    const failedEvents = await this.storage.getUnprocessedFailedWebhooks(10);
    
    for (const failedEvent of failedEvents) {
      try {
        // Skip if no eventId
        if (!failedEvent.eventId) {
          logger.warn(`Failed webhook event ${failedEvent.id} has no eventId, skipping retry`);
          await this.storage.incrementWebhookRetryCount(failedEvent.id);
          continue;
        }

        logger.info(`Retrying failed webhook event ${failedEvent.eventId}`);
        
        // Parse the original Stripe event from stored payload
        const stripeEvent = JSON.parse(failedEvent.payload);
        
        // Reconstruct event in our standard format
        const event = {
          id: stripeEvent.id || failedEvent.eventId,
          type: stripeEvent.type || failedEvent.eventType,
          data: stripeEvent.data,
        };
        
        await this.processEvent(event);
        
        // If successful, mark as processed and remove failed event record
        await this.storage.markWebhookEventProcessed(
          event.id,
          event.data,
          event.type,
          failedEvent.providerName
        );
        
        // Delete the failed event record to prevent re-processing
        await this.storage.deleteFailedWebhookEvent(failedEvent.id);
        
        logger.info(`Successfully retried and resolved webhook event ${failedEvent.eventId}`);
        
      } catch (error) {
        logger.error(`Retry failed for webhook event ${failedEvent.eventId}:`, error);
        await this.storage.incrementWebhookRetryCount(failedEvent.id);
      }
    }
  }
}
