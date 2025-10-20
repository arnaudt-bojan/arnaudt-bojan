import { describe, it, expect } from 'vitest';

describe('Tax & Currency Calculations @payments', () => {
  function calculateTax(subtotal: number, taxRate: number): number {
    return Math.round(subtotal * taxRate * 100) / 100;
  }

  function extractVAT(priceIncVAT: number, vatRate: number): { netPrice: number; vatAmount: number } {
    const netPrice = Math.round((priceIncVAT / (1 + vatRate)) * 100) / 100;
    const vatAmount = Math.round((priceIncVAT - netPrice) * 100) / 100;
    return { netPrice, vatAmount };
  }

  function convertCurrency(amount: number, fromCurrency: string, toCurrency: string, rate: number): number {
    return Math.round(amount * rate * 100) / 100;
  }

  function calculateOrderTotal(items: Array<{ price: number; quantity: number; tax: number }>): number {
    return items.reduce((sum, item) => {
      const subtotal = item.price * item.quantity;
      const tax = Math.round(subtotal * item.tax * 100) / 100;
      return Math.round((sum + subtotal + tax) * 100) / 100;
    }, 0);
  }

  it('should calculate tax correctly (US sales tax)', () => {
    const subtotal = 99.99;
    const taxRate = 0.0875;
    
    const tax = calculateTax(subtotal, taxRate);
    expect(tax).toBe(8.75);
  });

  it('should handle VAT-inclusive pricing (EU)', () => {
    const priceIncVAT = 120.00;
    const vatRate = 0.20;
    
    const result = extractVAT(priceIncVAT, vatRate);
    expect(result.netPrice).toBe(100.00);
    expect(result.vatAmount).toBe(20.00);
  });

  it('should handle VAT-inclusive pricing with rounding', () => {
    const priceIncVAT = 123.45;
    const vatRate = 0.20;
    
    const result = extractVAT(priceIncVAT, vatRate);
    expect(result.netPrice).toBe(102.88);
    expect(result.vatAmount).toBe(20.57);
    expect(Math.round((result.netPrice + result.vatAmount) * 100) / 100).toBe(123.45);
  });

  it('should handle currency conversion rounding', () => {
    const usdAmount = 99.99;
    const eurRate = 0.85;
    
    const converted = convertCurrency(usdAmount, 'USD', 'EUR', eurRate);
    expect(converted).toBe(84.99);
  });

  it('should prevent rounding errors in multi-item orders', () => {
    const items = [
      { price: 9.99, quantity: 3, tax: 0.0875 },
      { price: 19.99, quantity: 2, tax: 0.0875 },
      { price: 4.50, quantity: 5, tax: 0.0875 }
    ];

    const total = calculateOrderTotal(items);
    
    const manualSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const manualTax = Math.round(manualSubtotal * items[0].tax * 100) / 100;
    const manualTotal = Math.round((manualSubtotal + manualTax) * 100) / 100;

    expect(total).toBe(manualTotal);
  });

  it('should handle complex tax scenarios with precision', () => {
    const subtotal = 123.456;
    const taxRate = 0.0725;
    
    const tax = calculateTax(subtotal, taxRate);
    expect(tax).toBe(8.95);
    
    const total = Math.round((subtotal + tax) * 100) / 100;
    expect(total).toBe(132.41);
  });

  it('should handle zero tax rate', () => {
    const subtotal = 99.99;
    const taxRate = 0;
    
    const tax = calculateTax(subtotal, taxRate);
    expect(tax).toBe(0);
  });

  it('should handle high tax rates correctly', () => {
    const subtotal = 100.00;
    const taxRate = 0.25;
    
    const tax = calculateTax(subtotal, taxRate);
    expect(tax).toBe(25.00);
  });
});
