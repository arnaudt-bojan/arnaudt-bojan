import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { TestingUtils } from '../../../test/test-utils';

describe('PricingService', () => {
  let service: PricingService;
  let prisma: any;
  
  beforeEach(async () => {
    const module: TestingModule = await TestingUtils.createTestingModule([
      PricingService,
    ]);
    
    service = module.get<PricingService>(PricingService);
    prisma = module.get<PrismaService>(PrismaService);
  });
  
  afterEach(() => {
    TestingUtils.resetMocks();
  });
  
  describe('getExchangeRate', () => {
    it('should fetch exchange rate successfully', async () => {
      TestingUtils.mockFetch({
        usd: { eur: 0.85 },
      });
      
      const rate = await service.getExchangeRate('USD', 'EUR');
      
      expect(rate).toBe(0.85);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('fawazahmed0')
      );
    });
    
    it('should return 1 for same currency', async () => {
      const rate = await service.getExchangeRate('USD', 'USD');
      
      expect(rate).toBe(1);
    });
    
    it('should use last known good rate on API failure', async () => {
      TestingUtils.mockFetch({
        usd: { eur: 0.85 },
      });
      
      await service.getExchangeRate('USD', 'EUR');
      
      global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));
      
      const rate = await service.getExchangeRate('USD', 'EUR');
      
      expect(rate).toBe(0.85);
    });
  });
  
  describe('convertPrice', () => {
    it('should convert price between currencies', async () => {
      TestingUtils.mockFetch({
        usd: { eur: 0.85 },
      });
      
      const converted = await service.convertPrice(100, 'USD', 'EUR');
      
      expect(converted).toBe(85);
    });
    
    it('should return same amount for same currency', async () => {
      const converted = await service.convertPrice(100, 'USD', 'USD');
      
      expect(converted).toBe(100);
    });
  });

  describe('calculateCartSubtotal', () => {
    it('should calculate cart subtotal correctly', async () => {
      const mockCart = {
        id: 'cart-1',
        items: [
          { price: '100', quantity: 2 },
          { price: '50', quantity: 1 },
        ],
      };
      
      prisma.carts.findUnique.mockResolvedValue(mockCart);
      
      const subtotal = await service.calculateCartSubtotal('cart-1');
      
      expect(subtotal).toBe(250);
    });
    
    it('should throw error for non-existent cart', async () => {
      prisma.carts.findUnique.mockResolvedValue(null);
      
      await expect(service.calculateCartSubtotal('invalid-cart')).rejects.toThrow('Cart not found');
    });
  });

  describe('calculateWholesaleDeposit', () => {
    it('should calculate wholesale deposit correctly', async () => {
      const items = [
        { price: 100, quantity: 10 },
        { price: 50, quantity: 5 },
      ];
      
      const deposit = await service.calculateWholesaleDeposit(items, 30);
      
      expect(deposit).toBe(375);
    });
  });
});
