import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { createMockPrismaClient } from './setup';

export class TestingUtils {
  static async createTestingModule(providers: any[]): Promise<TestingModule> {
    return Test.createTestingModule({
      providers: [
        ...providers,
        {
          provide: PrismaService,
          useValue: createMockPrismaClient(),
        },
      ],
    }).compile();
  }
  
  static mockFetch(response: any) {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response)
    );
  }
  
  static resetMocks() {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  }
}

export const mockProduct = {
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

export const mockOrder = {
  id: 'order-1',
  status: 'PENDING_PAYMENT',
  fulfillment_status: 'UNFULFILLED',
  total: 100,
  currency: 'USD',
  created_at: new Date(),
};

export const mockCart = {
  id: 'cart-1',
  user_id: 'user-1',
  session_id: null,
  items: [],
};

export const mockWholesaleInvitation = {
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
