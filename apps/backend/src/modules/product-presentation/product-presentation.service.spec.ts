import { Test, TestingModule } from '@nestjs/testing';
import { ProductPresentationService } from './product-presentation.service';
import { mockProduct } from '../../../test/test-utils';

describe('ProductPresentationService', () => {
  let service: ProductPresentationService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductPresentationService],
    }).compile();
    
    service = module.get<ProductPresentationService>(ProductPresentationService);
  });
  
  describe('getAvailabilityText', () => {
    it('should return "In Stock" for active products with stock', () => {
      expect(service.getAvailabilityText(mockProduct)).toBe('In Stock');
    });
    
    it('should return "Out of Stock" for products with no stock', () => {
      const product = { ...mockProduct, stock_quantity: 0 };
      expect(service.getAvailabilityText(product)).toBe('Out of Stock');
    });
    
    it('should return "Made to Order" for MTO products', () => {
      const product = { ...mockProduct, product_type: 'made-to-order' };
      expect(service.getAvailabilityText(product)).toBe('Made to Order');
    });
    
    it('should return "Pre-order" for pre-order products', () => {
      const product = { ...mockProduct, product_type: 'pre-order' };
      expect(service.getAvailabilityText(product)).toBe('Pre-order');
    });
    
    it('should handle null/undefined product', () => {
      expect(service.getAvailabilityText(null)).toBe('Unavailable');
      expect(service.getAvailabilityText(undefined)).toBe('Unavailable');
    });
    
    it('should return "Low Stock" for products with low stock', () => {
      const product = { ...mockProduct, stock_quantity: 5 };
      expect(service.getAvailabilityText(product)).toBe('Low Stock');
    });
  });
  
  describe('getProductBadges', () => {
    it('should include "New" badge for recent products', () => {
      const product = { ...mockProduct, created_at: new Date() };
      const badges = service.getProductBadges(product);
      expect(badges).toContain('New');
    });
    
    it('should include "Sale" badge for discounted products', () => {
      const product = { ...mockProduct, price: 80, compare_at_price: 150 };
      const badges = service.getProductBadges(product);
      expect(badges).toContain('Sale');
    });
    
    it('should include "Low Stock" badge for low stock', () => {
      const product = { ...mockProduct, stock_quantity: 3 };
      const badges = service.getProductBadges(product);
      expect(badges).toContain('Low Stock');
    });
    
    it('should include "Pre-order" badge for pre-order products', () => {
      const product = { ...mockProduct, product_type: 'pre-order' };
      const badges = service.getProductBadges(product);
      expect(badges).toContain('Pre-order');
    });
    
    it('should return empty array for null product', () => {
      expect(service.getProductBadges(null)).toEqual([]);
    });
  });

  describe('getStockLevelIndicator', () => {
    it('should return "out-of-stock" for zero stock', () => {
      expect(service.getStockLevelIndicator(0)).toBe('out-of-stock');
    });
    
    it('should return "critical" for very low stock', () => {
      expect(service.getStockLevelIndicator(3)).toBe('critical');
    });
    
    it('should return "low" for low stock', () => {
      expect(service.getStockLevelIndicator(8)).toBe('low');
    });
    
    it('should return "medium" for medium stock', () => {
      expect(service.getStockLevelIndicator(25)).toBe('medium');
    });
    
    it('should return "high" for high stock', () => {
      expect(service.getStockLevelIndicator(100)).toBe('high');
    });
  });

  describe('isAvailableForPurchase', () => {
    it('should return true for active products with stock', () => {
      expect(service.isAvailableForPurchase(mockProduct)).toBe(true);
    });
    
    it('should return false for inactive products', () => {
      const product = { ...mockProduct, status: 'inactive' };
      expect(service.isAvailableForPurchase(product)).toBe(false);
    });
    
    it('should return false for products with no stock', () => {
      const product = { ...mockProduct, stock_quantity: 0 };
      expect(service.isAvailableForPurchase(product)).toBe(false);
    });
    
    it('should return true for made-to-order products regardless of stock', () => {
      const product = { ...mockProduct, product_type: 'made-to-order', stock_quantity: 0 };
      expect(service.isAvailableForPurchase(product)).toBe(true);
    });
    
    it('should return false for null product', () => {
      expect(service.isAvailableForPurchase(null)).toBe(false);
    });
  });

  describe('getProductPresentation', () => {
    it('should return full presentation for valid product', () => {
      const result = service.getProductPresentation(mockProduct);
      
      expect(result.availabilityText).toBe('In Stock');
      expect(result.availableForPurchase).toBe(true);
      expect(result.stockLevelIndicator).toBe('high');
      expect(result.isPreOrder).toBe(false);
      expect(result.isMadeToOrder).toBe(false);
    });
    
    it('should handle null product', () => {
      const result = service.getProductPresentation(null);
      
      expect(result.availabilityText).toBe('Unavailable');
      expect(result.availableForPurchase).toBe(false);
      expect(result.stockQuantity).toBe(0);
    });
    
    it('should correctly identify pre-order products', () => {
      const product = { ...mockProduct, product_type: 'pre-order' };
      const result = service.getProductPresentation(product);
      
      expect(result.isPreOrder).toBe(true);
      expect(result.isMadeToOrder).toBe(false);
    });
  });
});
