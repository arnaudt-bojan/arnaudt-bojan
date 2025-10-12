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

export interface IPaymentProvider {
  readonly providerName: string;
  readonly supportedCurrencies: string[];
  readonly supportedCountries: string[];

  createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent>;
  
  confirmPayment(intentId: string, params: ConfirmParams): Promise<PaymentResult>;
  
  cancelPayment(intentId: string): Promise<void>;
  
  createRefund(params: RefundParams): Promise<Refund>;
  
  createConnectedAccount(params: AccountParams): Promise<ConnectedAccount>;
  
  getAccountStatus(accountId: string): Promise<AccountStatus>;
  
  createOnboardingSession(accountId: string, purpose?: 'onboarding' | 'payouts'): Promise<OnboardingSession>;
  
  verifyWebhookSignature(rawBody: string, signature: string): Promise<WebhookEvent>;
  
  processWebhookEvent(event: WebhookEvent): Promise<void>;
  
  getName(): string;
}
