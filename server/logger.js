"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const request_context_1 = require("./request-context");
const isDevelopment = process.env.NODE_ENV !== 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
const LOG_FORMAT = process.env.LOG_FORMAT || (isDevelopment ? 'pretty' : 'json');
const correlationIdFormat = winston_1.default.format((info) => {
    const requestId = (0, request_context_1.getRequestId)();
    if (requestId) {
        info.requestId = requestId;
    }
    return info;
});
const prettyFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), correlationIdFormat(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf((info) => {
    const { timestamp, level, message, service, requestId, ...meta } = info;
    const levelColors = {
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[36m',
        debug: '\x1b[35m',
    };
    const reset = '\x1b[0m';
    const gray = '\x1b[90m';
    const color = levelColors[level] || '';
    const levelStr = `[${level.toUpperCase()}]`.padEnd(9);
    let logLine = `${gray}${timestamp}${reset} ${color}${levelStr}${reset}`;
    if (service) {
        logLine += ` ${gray}[${service}]${reset}`;
    }
    if (requestId) {
        logLine += ` ${gray}[req:${requestId}]${reset}`;
    }
    logLine += ` ${message}`;
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
        const metaStr = JSON.stringify(meta, null, 2);
        if (metaStr.length < 100) {
            logLine += ` ${gray}${metaStr}${reset}`;
        }
        else {
            logLine += `\n${gray}${metaStr}${reset}`;
        }
    }
    return logLine;
}));
const jsonFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), correlationIdFormat(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const winstonLogger = winston_1.default.createLogger({
    level: LOG_LEVEL,
    format: LOG_FORMAT === 'json' ? jsonFormat : prettyFormat,
    transports: [
        new winston_1.default.transports.Console({
            handleExceptions: true,
            handleRejections: true,
        }),
    ],
    exitOnError: false,
});
function createLoggerInterface(baseLogger) {
    return {
        debug: (message, meta) => {
            baseLogger.debug(message, meta);
        },
        info: (message, meta) => {
            baseLogger.info(message, meta);
        },
        warn: (message, meta) => {
            baseLogger.warn(message, meta);
        },
        error: (message, meta) => {
            baseLogger.error(message, meta);
        },
        child: (defaultMeta) => {
            const childLogger = baseLogger.child(defaultMeta);
            return createLoggerInterface(childLogger);
        },
    };
}
exports.logger = createLoggerInterface(winstonLogger);
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map