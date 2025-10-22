export interface RequestContext {
    requestId: string;
    userId?: string;
    sessionId?: string;
    [key: string]: any;
}
export declare function generateRequestId(): string;
export declare function getRequestContext(): RequestContext | undefined;
export declare function getRequestId(): string | undefined;
export declare function withRequestContext<T>(context: RequestContext, callback: () => T): T;
export declare function enrichRequestContext(fields: Partial<RequestContext>): void;
