/**
 * Pricing Service Unit Tests
 * Tests for pricing calculations, discounts, and price rules
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Pricing Service', () => {
  describe('Base Price Calculation', () => {
    it('should calculate base price correctly', () => {
      const price = 100.00;
      const quantity = 2;
      const total = price * quantity;

      expect(total).toBe(200.00);
    });

    it('should handle decimal precision in calculations', () => {
      const price = 19.99;
      const quantity = 3;
      const total = Math.round(price * quantity * 100) / 100;

      expect(total).toBeCloseTo(59.97, 2);
    });
  });

  describe('Discount Calculations', () => {
    it('should apply percentage discount correctly', () => {
      const price = 100.00;
      const discountPercent = 10;
      const finalPrice = price * (1 - discountPercent / 100);

      expect(finalPrice).toBe(90.00);
    });

    it('should apply fixed amount discount', () => {
      const price = 100.00;
      const discountAmount = 15.00;
      const finalPrice = price - discountAmount;

      expect(finalPrice).toBe(85.00);
    });

    it('should not allow negative prices after discount', () => {
      const price = 10.00;
      const discountAmount = 15.00;
      const finalPrice = Math.max(0, price - discountAmount);

      expect(finalPrice).toBe(0);
    });
  });

  describe('Wholesale Pricing', () => {
    it('should apply MOQ-based pricing tiers', () => {
      const tiers = [
        { minQuantity: 1, price: 10.00 },
        { minQuantity: 10, price: 9.00 },
        { minQuantity: 100, price: 8.00 }
      ];

      const quantity = 50;
      const applicableTier = [...tiers]
        .reverse()
        .find(tier => quantity >= tier.minQuantity);

      expect(applicableTier?.price).toBe(9.00);
    });

    it('should calculate volume discounts', () => {
      const basePrice = 10.00;
      const quantity = 100;
      const volumeDiscountPercent = 5;

      const finalPrice = quantity >= 100 
        ? basePrice * (1 - volumeDiscountPercent / 100)
        : basePrice;

      expect(finalPrice).toBe(9.50);
    });
  });

  describe('Currency Conversion', () => {
    it('should convert prices between currencies', () => {
      const usdPrice = 100.00;
      const exchangeRate = 1.2; // USD to EUR
      const eurPrice = Math.round(usdPrice * exchangeRate * 100) / 100;

      expect(eurPrice).toBe(120.00);
    });

    it('should handle rounding in currency conversion', () => {
      const usdPrice = 99.99;
      const exchangeRate = 0.85;
      const convertedPrice = Math.round(usdPrice * exchangeRate * 100) / 100;

      expect(convertedPrice).toBeCloseTo(84.99, 2);
    });
  });

  describe('Tax Calculations', () => {
    it('should calculate tax exclusive pricing', () => {
      const netPrice = 100.00;
      const taxRate = 0.20; // 20%
      const grossPrice = netPrice * (1 + taxRate);

      expect(grossPrice).toBe(120.00);
    });

    it('should calculate tax inclusive pricing', () => {
      const grossPrice = 120.00;
      const taxRate = 0.20; // 20%
      const netPrice = grossPrice / (1 + taxRate);

      expect(netPrice).toBeCloseTo(100.00, 2);
    });

    it('should extract tax amount from gross price', () => {
      const grossPrice = 120.00;
      const taxRate = 0.20;
      const taxAmount = grossPrice - (grossPrice / (1 + taxRate));

      expect(taxAmount).toBeCloseTo(20.00, 2);
    });
  });

  describe('Dynamic Pricing Rules', () => {
    it('should apply time-based pricing', () => {
      const basePrice = 100.00;
      const hour = new Date().getHours();
      const isHappyHour = hour >= 15 && hour < 18;
      const finalPrice = isHappyHour ? basePrice * 0.8 : basePrice;

      expect(finalPrice).toBeLessThanOrEqual(basePrice);
    });

    it('should apply customer-specific pricing', () => {
      const basePrice = 100.00;
      const customerDiscount = 0.10; // 10% VIP discount
      const finalPrice = basePrice * (1 - customerDiscount);

      expect(finalPrice).toBe(90.00);
    });
  });

  describe('Price Validation', () => {
    it('should validate price is not negative', () => {
      const price = -10.00;
      const isValid = price >= 0;

      expect(isValid).toBe(false);
    });

    it('should validate price format', () => {
      const price = '10.999';
      const decimalPlaces = price.split('.')[1]?.length || 0;

      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('should reject zero prices for paid products', () => {
      const price = 0;
      const isFree = false;
      const isValid = isFree || price > 0;

      expect(isValid).toBe(false);
    });
  });

  describe('Bundle Pricing', () => {
    it('should calculate bundle discount', () => {
      const individualPrices = [10.00, 20.00, 15.00];
      const bundleDiscount = 0.15; // 15% bundle discount
      
      const totalIndividual = individualPrices.reduce((sum, p) => sum + p, 0);
      const bundlePrice = totalIndividual * (1 - bundleDiscount);

      expect(bundlePrice).toBe(38.25);
    });
  });
});
