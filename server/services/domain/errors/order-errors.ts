/**
 * Domain-specific error classes for Order operations
 * 
 * These errors are transport-agnostic and can be converted to:
 * - GraphQL errors in the GraphQL layer
 * - HTTP responses in the REST layer
 */

import { DomainError } from './domain-error';

// ============================================================================
// Specific Order Domain Errors
// ============================================================================

export class OrderNotFoundError extends DomainError {
  readonly code = 'ORDER_NOT_FOUND';
  readonly httpStatus = 404;
  
  constructor(orderId?: string) {
    super(orderId ? `Order not found: ${orderId}` : 'Order not found');
  }
}

export class UnauthorizedOrderAccessError extends DomainError {
  readonly code = 'UNAUTHORIZED_ORDER_ACCESS';
  readonly httpStatus = 403;
  
  constructor() {
    super('You do not have permission to access this order');
  }
}

export class InvalidOrderDataError extends DomainError {
  readonly code = 'INVALID_ORDER_DATA';
  readonly httpStatus = 400;
  
  constructor(message: string) {
    super(`Invalid order data: ${message}`);
  }
}

export class CartNotFoundError extends DomainError {
  readonly code = 'CART_NOT_FOUND';
  readonly httpStatus = 404;
  
  constructor(cartId?: string) {
    super(cartId ? `Cart not found: ${cartId}` : 'Cart not found');
  }
}

export class UnauthorizedCartAccessError extends DomainError {
  readonly code = 'UNAUTHORIZED_CART_ACCESS';
  readonly httpStatus = 403;
  
  constructor() {
    super('Unauthorized: Cart does not belong to the current user');
  }
}

export class EmptyCartError extends DomainError {
  readonly code = 'EMPTY_CART';
  readonly httpStatus = 400;
  
  constructor() {
    super('Cart is empty');
  }
}

export class InvalidRefundAmountError extends DomainError {
  readonly code = 'INVALID_REFUND_AMOUNT';
  readonly httpStatus = 400;
  
  constructor(message: string = 'Refund amount cannot exceed order total') {
    super(message);
  }
}

export class InvalidCursorError extends DomainError {
  readonly code = 'INVALID_CURSOR';
  readonly httpStatus = 400;
  
  constructor() {
    super('Invalid cursor');
  }
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;
  
  constructor(message: string) {
    super(message);
  }
}
