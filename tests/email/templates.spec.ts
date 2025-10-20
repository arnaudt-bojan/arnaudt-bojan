import { describe, it, expect } from 'vitest';
import { 
  generateEmailBaseLayout,
  generateUpfirstHeader,
  generateUpfirstFooter,
  generateProductThumbnail,
  generateCTAButton
} from '../../server/utils/email-templates';

describe('Email Templates @email', () => {
  it('should render basic email layout', () => {
    const html = generateEmailBaseLayout({
      header: generateUpfirstHeader(),
      content: '<p>Test content</p>',
      footer: generateUpfirstFooter(),
      preheader: 'Test email'
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Test content');
    expect(html).toContain('UPPFIRST');
  });

  it('should generate Upfirst header correctly', () => {
    const header = generateUpfirstHeader();

    expect(header).toContain('UPPFIRST');
    expect(header).toContain('background-color: #000000');
  });

  it('should generate Upfirst footer correctly', () => {
    const footer = generateUpfirstFooter();

    expect(footer).toContain('UPPFIRST SG PTE LTD');
    expect(footer).toContain('6001 BEACH ROAD');
    expect(footer).toContain('support@upfirst.io');
  });

  it('should generate product thumbnail with all details', () => {
    const product = {
      id: 'prod_123',
      name: 'Test Product',
      price: '99.99',
      image: '/test-image.jpg',
      sellerId: 'seller_123',
      category: 'Test',
      description: 'Test description',
      productType: 'physical',
      status: 'active',
      stock: 10,
      images: []
    } as any;

    const html = generateProductThumbnail(product, 2, { size: 'M', color: 'Blue' });

    expect(html).toContain('Test Product');
    expect(html).toContain('Quantity: 2');
    expect(html).toContain('Size: M');
    expect(html).toContain('Color: Blue');
  });

  it('should generate product thumbnail without variants', () => {
    const product = {
      id: 'prod_123',
      name: 'Simple Product',
      price: '49.99',
      image: null,
      sellerId: 'seller_123',
      category: 'Test',
      description: 'Test',
      productType: 'physical',
      status: 'active',
      stock: 5,
      images: []
    } as any;

    const html = generateProductThumbnail(product, 1, null);

    expect(html).toContain('Simple Product');
    expect(html).not.toContain('Size:');
    expect(html).not.toContain('Color:');
  });

  it('should generate CTA button with correct structure', () => {
    const button = generateCTAButton(
      'View Order',
      'https://example.com/order/123',
      '#6366f1'
    );

    expect(button).toContain('View Order');
    expect(button).toContain('https://example.com/order/123');
    expect(button).toContain('background-color: #6366f1');
  });

  it('should handle missing optional email fields', () => {
    const html = generateEmailBaseLayout({
      header: generateUpfirstHeader(),
      content: '<p>Minimal content</p>',
      footer: generateUpfirstFooter()
    });

    expect(html).toBeDefined();
    expect(html).toContain('Minimal content');
  });

  it('should include dark mode safety styles', () => {
    const html = generateEmailBaseLayout({
      header: generateUpfirstHeader(),
      content: '<p>Content</p>',
      footer: generateUpfirstFooter(),
      darkModeSafe: true
    });

    expect(html).toContain('color-scheme: light only');
    expect(html).toContain('prefers-color-scheme: dark');
  });
});
