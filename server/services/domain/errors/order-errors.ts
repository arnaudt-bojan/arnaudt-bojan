/**
 * Domain-specific error classes for Order operations
 * 
 * These errors are transport-agnostic and can be converted to:
 * - GraphQL errors in the GraphQL layer
 * - HTTP responses in the REST layer
 */

// ============================================================================
// Base Domain Error
// ============================================================================

export class OrderDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// Specific Order Domain Errors
// ============================================================================

export class OrderNotFoundError extends OrderDomainError {
  constructor(orderId?: string) {
    super(orderId ? `Order not found: ${orderId}` : 'Order not found');
  }
}

export class UnauthorizedOrderAccessError extends OrderDomainError {
  constructor() {
    super('You do not have permission to access this order');
  }
}

export class InvalidOrderDataError extends OrderDomainError {
  constructor(message: string) {
    super(`Invalid order data: ${message}`);
  }
}

export class CartNotFoundError extends OrderDomainError {
  constructor(cartId?: string) {
    super(cartId ? `Cart not found: ${cartId}` : 'Cart not found');
  }
}

export class UnauthorizedCartAccessError extends OrderDomainError {
  constructor() {
    super('Unauthorized: Cart does not belong to the current user');
  }
}

export class EmptyCartError extends OrderDomainError {
  constructor() {
    super('Cart is empty');
  }
}

export class InvalidRefundAmountError extends OrderDomainError {
  constructor(message: string = 'Refund amount cannot exceed order total') {
    super(message);
  }
}

export class InvalidCursorError extends OrderDomainError {
  constructor() {
    super('Invalid cursor');
  }
}

export class ForbiddenError extends OrderDomainError {
  constructor(message: string) {
    super(message);
  }
}
