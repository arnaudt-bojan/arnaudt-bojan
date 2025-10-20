/**
 * Domain-specific error classes for Checkout operations
 * 
 * These errors are transport-agnostic and can be converted to:
 * - GraphQL errors in the GraphQL layer
 * - HTTP responses in the REST layer
 */

import { DomainError } from './domain-error';

export class CartReservationExpiredError extends DomainError {
  readonly code = 'CART_RESERVATION_EXPIRED';
  readonly httpStatus = 400;
  
  constructor(message: string = 'One or more items in your cart are no longer reserved') {
    super(message);
  }
}

export class PaymentIntentMismatchError extends DomainError {
  readonly code = 'PAYMENT_INTENT_MISMATCH';
  readonly httpStatus = 400;
  
  constructor(message: string = 'Payment intent does not match the checkout session') {
    super(message);
  }
}

export class AddressValidationError extends DomainError {
  readonly code = 'ADDRESS_VALIDATION_ERROR';
  readonly httpStatus = 400;
  
  constructor(message: string = 'Invalid shipping or billing address') {
    super(message);
  }
}

export class CheckoutSessionNotFoundError extends DomainError {
  readonly code = 'CHECKOUT_SESSION_NOT_FOUND';
  readonly httpStatus = 404;
  
  constructor(sessionId?: string) {
    super(sessionId ? `Checkout session not found: ${sessionId}` : 'Checkout session not found');
  }
}

export class InvalidCheckoutStateError extends DomainError {
  readonly code = 'INVALID_CHECKOUT_STATE';
  readonly httpStatus = 400;
  
  constructor(message: string = 'Invalid checkout state') {
    super(message);
  }
}

export class InsufficientStockError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK';
  readonly httpStatus = 400;
  
  constructor(message: string = 'Insufficient stock for one or more items') {
    super(message);
  }
}
