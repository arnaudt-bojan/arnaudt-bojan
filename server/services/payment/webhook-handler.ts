import Stripe from 'stripe';
import { IStorage } from '../../storage';
import { IPaymentProvider } from './payment-provider.interface';
import { logger } from '../../logger';

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
    private provider: IPaymentProvider
  ) {}

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

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Handle successful payment intent
   */
  private async handlePaymentIntentSucceeded(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Update payment intent status in database
    const existingIntent = await this.storage.getPaymentIntentByProviderIntentId(paymentIntent.id);
    
    if (existingIntent) {
      await this.storage.updatePaymentIntentStatus(existingIntent.id, 'succeeded');
      logger.info(`Updated payment intent ${existingIntent.id} to succeeded`);
    } else {
      logger.warn(`Payment intent ${paymentIntent.id} not found in database`);
    }
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    const existingIntent = await this.storage.getPaymentIntentByProviderIntentId(paymentIntent.id);
    
    if (existingIntent) {
      await this.storage.updatePaymentIntentStatus(existingIntent.id, 'failed');
      logger.info(`Updated payment intent ${existingIntent.id} to failed`);
    }
  }

  /**
   * Handle canceled payment intent
   */
  private async handlePaymentIntentCanceled(event: WebhookEvent): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    const existingIntent = await this.storage.getPaymentIntentByProviderIntentId(paymentIntent.id);
    
    if (existingIntent) {
      await this.storage.updatePaymentIntentStatus(existingIntent.id, 'canceled');
      logger.info(`Updated payment intent ${existingIntent.id} to canceled`);
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
