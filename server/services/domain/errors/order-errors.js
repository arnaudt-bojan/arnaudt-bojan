"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenError = exports.InvalidCursorError = exports.InvalidRefundAmountError = exports.EmptyCartError = exports.UnauthorizedCartAccessError = exports.CartNotFoundError = exports.InvalidOrderDataError = exports.UnauthorizedOrderAccessError = exports.OrderNotFoundError = void 0;
const domain_error_1 = require("./domain-error");
class OrderNotFoundError extends domain_error_1.DomainError {
    constructor(orderId) {
        super(orderId ? `Order not found: ${orderId}` : 'Order not found');
        this.code = 'ORDER_NOT_FOUND';
        this.httpStatus = 404;
    }
}
exports.OrderNotFoundError = OrderNotFoundError;
class UnauthorizedOrderAccessError extends domain_error_1.DomainError {
    constructor() {
        super('You do not have permission to access this order');
        this.code = 'UNAUTHORIZED_ORDER_ACCESS';
        this.httpStatus = 403;
    }
}
exports.UnauthorizedOrderAccessError = UnauthorizedOrderAccessError;
class InvalidOrderDataError extends domain_error_1.DomainError {
    constructor(message) {
        super(`Invalid order data: ${message}`);
        this.code = 'INVALID_ORDER_DATA';
        this.httpStatus = 400;
    }
}
exports.InvalidOrderDataError = InvalidOrderDataError;
class CartNotFoundError extends domain_error_1.DomainError {
    constructor(cartId) {
        super(cartId ? `Cart not found: ${cartId}` : 'Cart not found');
        this.code = 'CART_NOT_FOUND';
        this.httpStatus = 404;
    }
}
exports.CartNotFoundError = CartNotFoundError;
class UnauthorizedCartAccessError extends domain_error_1.DomainError {
    constructor() {
        super('Unauthorized: Cart does not belong to the current user');
        this.code = 'UNAUTHORIZED_CART_ACCESS';
        this.httpStatus = 403;
    }
}
exports.UnauthorizedCartAccessError = UnauthorizedCartAccessError;
class EmptyCartError extends domain_error_1.DomainError {
    constructor() {
        super('Cart is empty');
        this.code = 'EMPTY_CART';
        this.httpStatus = 400;
    }
}
exports.EmptyCartError = EmptyCartError;
class InvalidRefundAmountError extends domain_error_1.DomainError {
    constructor(message = 'Refund amount cannot exceed order total') {
        super(message);
        this.code = 'INVALID_REFUND_AMOUNT';
        this.httpStatus = 400;
    }
}
exports.InvalidRefundAmountError = InvalidRefundAmountError;
class InvalidCursorError extends domain_error_1.DomainError {
    constructor() {
        super('Invalid cursor');
        this.code = 'INVALID_CURSOR';
        this.httpStatus = 400;
    }
}
exports.InvalidCursorError = InvalidCursorError;
class ForbiddenError extends domain_error_1.DomainError {
    constructor(message) {
        super(message);
        this.code = 'FORBIDDEN';
        this.httpStatus = 403;
    }
}
exports.ForbiddenError = ForbiddenError;
//# sourceMappingURL=order-errors.js.map