/**
 * Domain-specific error classes for Payment operations
 * 
 * These errors are transport-agnostic and can be converted to:
 * - GraphQL errors in the GraphQL layer
 * - HTTP responses in the REST layer
 */

import { DomainError } from './domain-error';

export class StripeAuthorizationFailedError extends DomainError {
  readonly code = 'STRIPE_AUTHORIZATION_FAILED';
  readonly httpStatus = 402;
  
  constructor(message: string = 'Payment authorization failed') {
    super(message);
  }
}

export class InvalidPaymentMethodError extends DomainError {
  readonly code = 'INVALID_PAYMENT_METHOD';
  readonly httpStatus = 400;
  
  constructor(message: string = 'Invalid payment method') {
    super(message);
  }
}

export class PaymentIntentNotFoundError extends DomainError {
  readonly code = 'PAYMENT_INTENT_NOT_FOUND';
  readonly httpStatus = 404;
  
  constructor(paymentIntentId?: string) {
    super(paymentIntentId ? `Payment intent not found: ${paymentIntentId}` : 'Payment intent not found');
  }
}

export class RefundFailedError extends DomainError {
  readonly code = 'REFUND_FAILED';
  readonly httpStatus = 400;
  
  constructor(message: string = 'Refund processing failed') {
    super(message);
  }
}

export class InvalidRefundAmountError extends DomainError {
  readonly code = 'INVALID_REFUND_AMOUNT';
  readonly httpStatus = 400;
  
  constructor(message: string = 'Invalid refund amount') {
    super(message);
  }
}

export class PaymentProcessingError extends DomainError {
  readonly code = 'PAYMENT_PROCESSING_ERROR';
  readonly httpStatus = 500;
  
  constructor(message: string = 'Payment processing error') {
    super(message);
  }
}
