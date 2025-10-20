import { describe, it, expect } from 'vitest';

describe('Pricing & Discounts @catalog', () => {
  describe('Tiered Pricing', () => {
    function getTieredPrice(quantity: number, tiers: Array<{ minQty: number; price: number }>) {
      const sortedTiers = [...tiers].sort((a, b) => b.minQty - a.minQty);
      const tier = sortedTiers.find(t => quantity >= t.minQty);
      return tier ? tier.price : tiers[0].price;
    }

    it('should apply volume discount', () => {
      const tiers = [
        { minQty: 1, price: 10.00 },
        { minQty: 10, price: 9.00 },
        { minQty: 50, price: 8.00 }
      ];

      expect(getTieredPrice(5, tiers)).toBe(10.00);
      expect(getTieredPrice(15, tiers)).toBe(9.00);
      expect(getTieredPrice(100, tiers)).toBe(8.00);
    });

    it('should handle edge cases at tier boundaries', () => {
      const tiers = [
        { minQty: 1, price: 10.00 },
        { minQty: 10, price: 9.00 },
        { minQty: 50, price: 8.00 }
      ];

      expect(getTieredPrice(10, tiers)).toBe(9.00);
      expect(getTieredPrice(50, tiers)).toBe(8.00);
    });
  });

  describe('Discount Precedence', () => {
    function applyBestDiscount(
      price: number, 
      discounts: Array<{ type: string; value: number }>
    ): number {
      let bestPrice = price;

      for (const discount of discounts) {
        let discountedPrice: number;
        
        if (discount.type === 'percentage') {
          discountedPrice = price * (1 - discount.value / 100);
        } else if (discount.type === 'fixed') {
          discountedPrice = price - discount.value;
        } else {
          discountedPrice = price;
        }

        if (discountedPrice < bestPrice) {
          bestPrice = discountedPrice;
        }
      }

      return Math.round(bestPrice * 100) / 100;
    }

    it('should apply highest discount when multiple apply', () => {
      const discounts = [
        { type: 'percentage', value: 10 },
        { type: 'fixed', value: 5.00 },
        { type: 'percentage', value: 15 }
      ];

      const price = 100.00;
      const finalPrice = applyBestDiscount(price, discounts);

      expect(finalPrice).toBe(85.00);
    });

    it('should not stack discounts', () => {
      const discounts = [
        { type: 'percentage', value: 20 },
        { type: 'percentage', value: 10 }
      ];

      const price = 100.00;
      const finalPrice = applyBestDiscount(price, discounts);

      expect(finalPrice).toBe(80.00);
    });

    it('should handle fixed discount being better than percentage', () => {
      const discounts = [
        { type: 'percentage', value: 5 },
        { type: 'fixed', value: 20.00 }
      ];

      const price = 100.00;
      const finalPrice = applyBestDiscount(price, discounts);

      expect(finalPrice).toBe(80.00);
    });
  });

  describe('Minimum Order Quantity (MOQ)', () => {
    function validateOrder(product: { moq: number; price: number }, quantity: number): boolean {
      if (quantity < product.moq) {
        throw new Error(`Minimum order quantity is ${product.moq}`);
      }
      return true;
    }

    function calculateWholesaleTotal(product: { moq: number; price: number }, quantity: number): number {
      validateOrder(product, quantity);
      return product.price * quantity;
    }

    it('should enforce MOQ for wholesale', () => {
      const product = { moq: 50, price: 10.00 };

      expect(() => validateOrder(product, 25)).toThrow('Minimum order quantity is 50');
      expect(validateOrder(product, 50)).toBe(true);
      expect(validateOrder(product, 100)).toBe(true);
    });

    it('should calculate correct total with MOQ', () => {
      const product = { moq: 50, price: 10.00 };
      const quantity = 75;

      const total = calculateWholesaleTotal(product, quantity);
      expect(total).toBe(750.00);
    });

    it('should enforce MOQ at exact boundary', () => {
      const product = { moq: 100, price: 5.00 };

      expect(validateOrder(product, 100)).toBe(true);
      expect(() => validateOrder(product, 99)).toThrow('Minimum order quantity is 100');
    });
  });

  describe('Complex Pricing Scenarios', () => {
    it('should combine tiered pricing with discount', () => {
      const tiers = [
        { minQty: 1, price: 10.00 },
        { minQty: 50, price: 8.00 }
      ];

      const getTieredPrice = (qty: number) => {
        const tier = tiers.filter(t => qty >= t.minQty).sort((a, b) => b.minQty - a.minQty)[0];
        return tier.price;
      };

      const applyDiscount = (price: number, discount: number) => price * (1 - discount / 100);

      const quantity = 60;
      const tieredPrice = getTieredPrice(quantity);
      const finalPrice = applyDiscount(tieredPrice, 10);

      expect(tieredPrice).toBe(8.00);
      expect(finalPrice).toBe(7.20);
    });

    it('should calculate total with quantity breaks and tax', () => {
      const basePrice = 10.00;
      const quantity = 100;
      const volumeDiscount = 0.10;
      const taxRate = 0.0875;

      const subtotal = basePrice * quantity;
      const discountedSubtotal = subtotal * (1 - volumeDiscount);
      const tax = Math.round(discountedSubtotal * taxRate * 100) / 100;
      const total = discountedSubtotal + tax;

      expect(subtotal).toBe(1000.00);
      expect(discountedSubtotal).toBe(900.00);
      expect(tax).toBe(78.75);
      expect(total).toBe(978.75);
    });
  });
});
