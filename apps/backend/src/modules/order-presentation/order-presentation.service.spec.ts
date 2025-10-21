import { Test, TestingModule } from '@nestjs/testing';
import { OrderPresentationService } from './order-presentation.service';

describe('OrderPresentationService', () => {
  let service: OrderPresentationService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderPresentationService],
    }).compile();
    
    service = module.get<OrderPresentationService>(OrderPresentationService);
  });
  
  describe('getOrderStatusLabel', () => {
    it('should handle uppercase status enums', () => {
      expect(service.getOrderStatusLabel('PENDING_PAYMENT')).toBe('Awaiting Payment');
      expect(service.getOrderStatusLabel('PROCESSING')).toBe('Processing');
      expect(service.getOrderStatusLabel('DELIVERED')).toBe('Delivered');
    });
    
    it('should handle lowercase status enums', () => {
      expect(service.getOrderStatusLabel('pending_payment')).toBe('Awaiting Payment');
      expect(service.getOrderStatusLabel('processing')).toBe('Processing');
      expect(service.getOrderStatusLabel('delivered')).toBe('Delivered');
    });
    
    it('should handle null/undefined safely', () => {
      expect(service.getOrderStatusLabel(null)).toBe('Unknown');
      expect(service.getOrderStatusLabel(undefined)).toBe('Unknown');
    });
    
    it('should return original status for unknown values', () => {
      expect(service.getOrderStatusLabel('custom_status')).toBe('custom_status');
    });
  });
  
  describe('getOrderStatusColor', () => {
    it('should return correct colors for different statuses', () => {
      expect(service.getOrderStatusColor('DELIVERED')).toBe('green');
      expect(service.getOrderStatusColor('CANCELLED')).toBe('red');
      expect(service.getOrderStatusColor('PROCESSING')).toBe('blue');
      expect(service.getOrderStatusColor('PENDING_PAYMENT')).toBe('orange');
    });
    
    it('should return gray for null/undefined', () => {
      expect(service.getOrderStatusColor(null)).toBe('gray');
      expect(service.getOrderStatusColor(undefined)).toBe('gray');
    });
    
    it('should normalize case before lookup', () => {
      expect(service.getOrderStatusColor('delivered')).toBe('green');
      expect(service.getOrderStatusColor('DELIVERED')).toBe('green');
    });
  });

  describe('getFulfillmentStatusLabel', () => {
    it('should return correct labels', () => {
      expect(service.getFulfillmentStatusLabel('UNFULFILLED')).toBe('Unfulfilled');
      expect(service.getFulfillmentStatusLabel('FULFILLED')).toBe('Fulfilled');
      expect(service.getFulfillmentStatusLabel('IN_TRANSIT')).toBe('In Transit');
    });
    
    it('should handle null/undefined', () => {
      expect(service.getFulfillmentStatusLabel(null)).toBe('Unknown');
    });
  });

  describe('getNextOrderStatuses', () => {
    it('should return valid transitions for pending payment', () => {
      const next = service.getNextOrderStatuses('PENDING_PAYMENT');
      expect(next).toContain('deposit_paid');
      expect(next).toContain('paid');
      expect(next).toContain('cancelled');
    });
    
    it('should return valid transitions for confirmed', () => {
      const next = service.getNextOrderStatuses('CONFIRMED');
      expect(next).toContain('processing');
      expect(next).toContain('cancelled');
    });
    
    it('should return empty for terminal statuses', () => {
      expect(service.getNextOrderStatuses('CANCELLED')).toEqual([]);
      expect(service.getNextOrderStatuses('REFUNDED')).toEqual([]);
    });
    
    it('should normalize case for lookup', () => {
      const next1 = service.getNextOrderStatuses('confirmed');
      const next2 = service.getNextOrderStatuses('CONFIRMED');
      expect(next1).toEqual(next2);
    });
  });

  describe('getOrderPresentation', () => {
    it('should return full presentation for valid order', () => {
      const order = {
        status: 'PROCESSING',
        fulfillment_status: 'UNFULFILLED',
      };
      
      const result = service.getOrderPresentation(order);
      
      expect(result.statusLabel).toBe('Processing');
      expect(result.statusColor).toBe('blue');
      expect(result.fulfillmentLabel).toBe('Unfulfilled');
      expect(result.canCancel).toBe(true);
      expect(result.canFulfill).toBe(true);
    });
    
    it('should handle null order', () => {
      const result = service.getOrderPresentation(null);
      
      expect(result.statusLabel).toBe('Unknown');
      expect(result.canCancel).toBe(false);
      expect(result.canRefund).toBe(false);
    });
    
    it('should correctly set action flags', () => {
      const deliveredOrder = {
        status: 'DELIVERED',
        fulfillment_status: 'DELIVERED',
      };
      
      const result = service.getOrderPresentation(deliveredOrder);
      
      expect(result.canCancel).toBe(false);
      expect(result.canRefund).toBe(true);
      expect(result.canFulfill).toBe(false);
    });
  });
});
