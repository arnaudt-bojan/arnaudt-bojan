import { Test, TestingModule } from '@nestjs/testing';
import { CartValidationService } from './cart-validation.service';
import { PrismaService } from '../prisma/prisma.service';
import { TestingUtils, mockProduct } from '../../../test/test-utils';

describe('CartValidationService', () => {
  let service: CartValidationService;
  let prisma: any;
  
  beforeEach(async () => {
    const module: TestingModule = await TestingUtils.createTestingModule([
      CartValidationService,
    ]);
    
    service = module.get<CartValidationService>(CartValidationService);
    prisma = module.get<PrismaService>(PrismaService);
  });
  
  afterEach(() => {
    TestingUtils.resetMocks();
  });
  
  describe('checkStockAvailability', () => {
    it('should return true for available stock', async () => {
      prisma.products.findUnique.mockResolvedValue(mockProduct);
      
      const result = await service.checkStockAvailability('product-1', null, 10);
      
      expect(result.available).toBe(true);
      expect(result.currentStock).toBe(50);
      expect(result.requestedQuantity).toBe(10);
    });
    
    it('should return false for insufficient stock', async () => {
      prisma.products.findUnique.mockResolvedValue(mockProduct);
      
      const result = await service.checkStockAvailability('product-1', null, 100);
      
      expect(result.available).toBe(false);
      expect(result.currentStock).toBe(50);
      expect(result.availableQuantity).toBe(50);
    });
    
    it('should throw error for non-existent product', async () => {
      prisma.products.findUnique.mockResolvedValue(null);
      
      await expect(
        service.checkStockAvailability('invalid-product', null, 10)
      ).rejects.toThrow('Product not found');
    });
  });
  
  describe('validateMinimumOrderQuantity', () => {
    it('should validate MOQ correctly when met', async () => {
      const productWithMOQ = { ...mockProduct, minimum_order_quantity: 5 };
      prisma.products.findUnique.mockResolvedValue(productWithMOQ);
      
      const result = await service.validateMinimumOrderQuantity('product-1', 10);
      
      expect(result.met).toBe(true);
      expect(result.minimumQuantity).toBe(5);
      expect(result.remaining).toBe(0);
    });
    
    it('should fail MOQ validation when not met', async () => {
      const productWithMOQ = { ...mockProduct, minimum_order_quantity: 10 };
      prisma.products.findUnique.mockResolvedValue(productWithMOQ);
      
      const result = await service.validateMinimumOrderQuantity('product-1', 5);
      
      expect(result.met).toBe(false);
      expect(result.remaining).toBe(5);
    });
    
    it('should default to MOQ of 1 if not specified', async () => {
      prisma.products.findUnique.mockResolvedValue(mockProduct);
      
      const result = await service.validateMinimumOrderQuantity('product-1', 1);
      
      expect(result.met).toBe(true);
      expect(result.minimumQuantity).toBe(1);
    });
  });

  describe('validateCartItem', () => {
    it('should validate a valid cart item', async () => {
      prisma.products.findUnique.mockResolvedValue(mockProduct);
      
      const result = await service.validateCartItem('product-1', null, 10);
      
      expect(result.valid).toBe(true);
      expect(result.stockAvailable).toBe(true);
      expect(result.moqMet).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect insufficient stock', async () => {
      prisma.products.findUnique.mockResolvedValue(mockProduct);
      
      const result = await service.validateCartItem('product-1', null, 100);
      
      expect(result.valid).toBe(false);
      expect(result.stockAvailable).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should validate quantity range', async () => {
      const result = await service.validateCartItem('product-1', null, 0);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Quantity must be between 1 and 10000');
    });
  });
});
