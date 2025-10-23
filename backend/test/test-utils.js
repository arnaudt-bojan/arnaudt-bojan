"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockWholesaleInvitation = exports.mockCart = exports.mockOrder = exports.mockProduct = exports.TestingUtils = void 0;
const testing_1 = require("@nestjs/testing");
const prisma_service_1 = require("../src/modules/prisma/prisma.service");
const setup_1 = require("./setup");
class TestingUtils {
    static async createTestingModule(providers) {
        return testing_1.Test.createTestingModule({
            providers: [
                ...providers,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: (0, setup_1.createMockPrismaClient)(),
                },
            ],
        }).compile();
    }
    static mockFetch(response) {
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve(response),
        }));
    }
    static resetMocks() {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    }
}
exports.TestingUtils = TestingUtils;
exports.mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    price: 100,
    status: 'active',
    stock: 50,
    stock_quantity: 50,
    product_type: 'IN_STOCK',
    created_at: new Date('2024-01-01'),
    compare_at_price: null,
    is_wholesale: false,
    variants: [],
};
exports.mockOrder = {
    id: 'order-1',
    status: 'PENDING_PAYMENT',
    fulfillment_status: 'UNFULFILLED',
    total: 100,
    currency: 'USD',
    created_at: new Date(),
};
exports.mockCart = {
    id: 'cart-1',
    user_id: 'user-1',
    session_id: null,
    items: [],
};
exports.mockWholesaleInvitation = {
    id: 'invitation-1',
    seller_id: 'seller-1',
    buyer_email: 'buyer@example.com',
    status: 'ACCEPTED',
    deposit_percentage: 30,
    minimum_order_value: 1000,
    wholesale_terms: {
        allowedPaymentTerms: ['Net 30', 'Net 60', 'Net 90'],
    },
};
//# sourceMappingURL=test-utils.js.map