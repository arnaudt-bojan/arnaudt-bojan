import Stripe from 'stripe';
import type { IPaymentProvider } from './payment-provider.interface';
import type {
  CreateIntentParams,
  PaymentIntent,
  PaymentResult,
  ConfirmParams,
  RefundParams,
  Refund,
  AccountParams,
  ConnectedAccount,
  AccountStatus,
  OnboardingSession,
  WebhookEvent,
} from './types';

export class StripePaymentProvider implements IPaymentProvider {
  private stripe: Stripe;
  private webhookSecret: string;
  readonly providerName = 'stripe';
  readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'MXN', 'BRL', 'PLN', 'NZD'];
  readonly supportedCountries = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'SG', 'HK', 'JP', 'MX', 'BR'];

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-09-30.clover',
    });
    this.webhookSecret = webhookSecret;
  }

  async createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent> {
    const stripeIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency.toLowerCase(),
      metadata: params.metadata,
      transfer_data: params.connectedAccountId ? {
        destination: params.connectedAccountId,
      } : undefined,
      application_fee_amount: params.applicationFeeAmount ? Math.round(params.applicationFeeAmount * 100) : undefined,
      capture_method: params.captureMethod || 'automatic',
    }, {
      idempotencyKey: params.idempotencyKey,
    });

    return {
      id: stripeIntent.id,
      providerName: this.providerName,
      providerIntentId: stripeIntent.id,
      clientSecret: stripeIntent.client_secret!,
      amount: stripeIntent.amount, // Keep in cents to match database schema
      currency: stripeIntent.currency.toUpperCase(),
      status: this.mapStripeStatus(stripeIntent.status),
      metadata: stripeIntent.metadata,
    };
  }

  async confirmPayment(intentId: string, params: ConfirmParams): Promise<PaymentResult> {
    try {
      const stripeIntent = await this.stripe.paymentIntents.confirm(intentId, {
        return_url: params.returnUrl,
      });

      return {
        success: stripeIntent.status === 'succeeded',
        status: stripeIntent.status,
        intentId: stripeIntent.id,
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        intentId,
        error: error.message,
      };
    }
  }

  async cancelPayment(intentId: string): Promise<void> {
    await this.stripe.paymentIntents.cancel(intentId);
  }

  async createRefund(params: RefundParams): Promise<Refund> {
    const refund = await this.stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amount ? Math.round(params.amount * 100) : undefined,
      reason: params.reason,
      metadata: params.metadata,
    });

    return {
      id: refund.id,
      amount: refund.amount, // Keep in cents to match database schema
      status: this.mapRefundStatus(refund.status),
      created: new Date(refund.created * 1000),
    };
  }

  async createConnectedAccount(params: AccountParams): Promise<ConnectedAccount> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: params.country,
      email: params.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          debit_negative_balances: true,
        },
      },
    });

    return {
      id: account.id,
      country: account.country!,
      currency: account.default_currency?.toUpperCase() || 'USD',
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    const account = await this.stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsStatus: {
        currentlyDue: account.requirements?.currently_due || [],
        pastDue: account.requirements?.past_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
      },
      restrictions: account.requirements?.disabled_reason ? {
        isRestricted: true,
        reason: account.requirements.disabled_reason,
      } : undefined,
    };
  }

  async createOnboardingSession(accountId: string, purpose: 'onboarding' | 'payouts' = 'onboarding'): Promise<OnboardingSession> {
    const components: any = {
      account_onboarding: {
        enabled: true,
      },
    };

    if (purpose === 'payouts') {
      components.account_onboarding.features = {
        external_account_collection: true,
      };
    }

    const accountSession = await this.stripe.accountSessions.create({
      account: accountId,
      components,
    });

    return {
      clientSecret: accountSession.client_secret,
      expiresAt: new Date(accountSession.expires_at * 1000),
    };
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<WebhookEvent> {
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    
    return {
      id: event.id,
      type: event.type,
      data: event.data,
    };
  }

  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    // This will be implemented by the payment service
    // The provider just validates the signature
  }

  getName(): string {
    return this.providerName;
  }

  private mapStripeStatus(status: string): PaymentIntent['status'] {
    const statusMap: Record<string, PaymentIntent['status']> = {
      'requires_payment_method': 'requires_payment_method',
      'requires_confirmation': 'requires_confirmation',
      'requires_action': 'requires_action',
      'processing': 'processing',
      'succeeded': 'succeeded',
      'canceled': 'canceled',
    };
    return statusMap[status] || 'requires_payment_method';
  }

  private mapRefundStatus(status: string | null): Refund['status'] {
    if (status === 'succeeded') return 'succeeded';
    if (status === 'failed') return 'failed';
    return 'pending';
  }
}
