export interface Logger {
    debug(message: string, meta?: Record<string, any>): void;
    info(message: string, meta?: Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    error(message: string, meta?: Record<string, any>): void;
    child(defaultMeta: Record<string, any>): Logger;
}
export declare const logger: Logger;
export default logger;
export type LogContext = Record<string, any>;
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
