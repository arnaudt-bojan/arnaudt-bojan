export declare abstract class DomainError extends Error {
    abstract readonly code: string;
    abstract readonly httpStatus: number;
    constructor(message: string);
}
