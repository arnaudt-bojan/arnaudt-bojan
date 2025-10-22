"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRequestId = generateRequestId;
exports.getRequestContext = getRequestContext;
exports.getRequestId = getRequestId;
exports.withRequestContext = withRequestContext;
exports.enrichRequestContext = enrichRequestContext;
const async_hooks_1 = require("async_hooks");
const nanoid_1 = require("nanoid");
const asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
const nanoid = (0, nanoid_1.customAlphabet)('0123456789abcdefghijklmnopqrstuvwxyz', 12);
function generateRequestId() {
    return nanoid();
}
function getRequestContext() {
    return asyncLocalStorage.getStore();
}
function getRequestId() {
    return asyncLocalStorage.getStore()?.requestId;
}
function withRequestContext(context, callback) {
    return asyncLocalStorage.run(context, callback);
}
function enrichRequestContext(fields) {
    const context = asyncLocalStorage.getStore();
    if (context) {
        Object.assign(context, fields);
    }
}
//# sourceMappingURL=request-context.js.map