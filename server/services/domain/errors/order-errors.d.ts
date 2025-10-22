import { DomainError } from './domain-error';
export declare class OrderNotFoundError extends DomainError {
    readonly code = "ORDER_NOT_FOUND";
    readonly httpStatus = 404;
    constructor(orderId?: string);
}
export declare class UnauthorizedOrderAccessError extends DomainError {
    readonly code = "UNAUTHORIZED_ORDER_ACCESS";
    readonly httpStatus = 403;
    constructor();
}
export declare class InvalidOrderDataError extends DomainError {
    readonly code = "INVALID_ORDER_DATA";
    readonly httpStatus = 400;
    constructor(message: string);
}
export declare class CartNotFoundError extends DomainError {
    readonly code = "CART_NOT_FOUND";
    readonly httpStatus = 404;
    constructor(cartId?: string);
}
export declare class UnauthorizedCartAccessError extends DomainError {
    readonly code = "UNAUTHORIZED_CART_ACCESS";
    readonly httpStatus = 403;
    constructor();
}
export declare class EmptyCartError extends DomainError {
    readonly code = "EMPTY_CART";
    readonly httpStatus = 400;
    constructor();
}
export declare class InvalidRefundAmountError extends DomainError {
    readonly code = "INVALID_REFUND_AMOUNT";
    readonly httpStatus = 400;
    constructor(message?: string);
}
export declare class InvalidCursorError extends DomainError {
    readonly code = "INVALID_CURSOR";
    readonly httpStatus = 400;
    constructor();
}
export declare class ForbiddenError extends DomainError {
    readonly code = "FORBIDDEN";
    readonly httpStatus = 403;
    constructor(message: string);
}
