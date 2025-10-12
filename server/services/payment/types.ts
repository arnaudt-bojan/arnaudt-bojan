export interface CreateIntentParams {
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  connectedAccountId?: string;
  applicationFeeAmount?: number;
  captureMethod?: 'automatic' | 'manual';
  idempotencyKey: string;
}

export interface PaymentIntent {
  id: string;
  providerName: string;
  providerIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  metadata: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  status: string;
  intentId: string;
  error?: string;
}

export interface RefundParams {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export interface Refund {
  id: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  created: Date;
}

export interface AccountParams {
  country: string;
  email?: string;
  businessType?: 'individual' | 'company';
}

export interface ConnectedAccount {
  id: string;
  country: string;
  currency: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export interface AccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsStatus: {
    currentlyDue: string[];
    pastDue: string[];
    eventuallyDue: string[];
  };
  restrictions?: {
    isRestricted: boolean;
    reason?: string;
  };
}

export interface OnboardingSession {
  clientSecret: string;
  expiresAt: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface ConfirmParams {
  returnUrl?: string;
}
