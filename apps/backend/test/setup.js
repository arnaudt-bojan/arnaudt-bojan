"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockPrismaClient = void 0;
jest.setTimeout(30000);
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/upfirst_test';
const createMockPrismaClient = () => {
    return {
        products: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        carts: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        orders: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        wholesale_orders: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        wholesale_invitations: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
        },
        wholesale_products: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
        },
        trade_quotations: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
    };
};
exports.createMockPrismaClient = createMockPrismaClient;
afterAll(async () => {
});
//# sourceMappingURL=setup.js.map