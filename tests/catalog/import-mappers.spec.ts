import { describe, it, expect } from 'vitest';

describe('Catalog Import Mappers @catalog', () => {
  describe('Shopify Mapper', () => {
    function mapShopifyProduct(shopifyProduct: any) {
      return {
        name: shopifyProduct.title,
        variants: shopifyProduct.variants.map((v: any) => ({
          price: parseFloat(v.price),
          sku: v.sku,
          inventory: v.inventory_quantity
        })),
        images: shopifyProduct.images.map((img: any) => img.src)
      };
    }

    it('should map Shopify product to internal format', () => {
      const shopifyProduct = {
        id: 123456,
        title: 'Test Product',
        variants: [
          { id: 1, price: '99.99', sku: 'TEST-SKU-1', inventory_quantity: 10 }
        ],
        images: [{ src: 'https://example.com/image.jpg' }]
      };

      const mapped = mapShopifyProduct(shopifyProduct);

      expect(mapped.name).toBe('Test Product');
      expect(mapped.variants).toHaveLength(1);
      expect(mapped.variants[0].price).toBe(99.99);
      expect(mapped.variants[0].sku).toBe('TEST-SKU-1');
      expect(mapped.images[0]).toBe('https://example.com/image.jpg');
    });

    it('should handle multiple variants', () => {
      const shopifyProduct = {
        id: 123456,
        title: 'Multi-Variant Product',
        variants: [
          { id: 1, price: '99.99', sku: 'TEST-S', inventory_quantity: 5 },
          { id: 2, price: '99.99', sku: 'TEST-M', inventory_quantity: 10 },
          { id: 3, price: '99.99', sku: 'TEST-L', inventory_quantity: 3 }
        ],
        images: [{ src: 'https://example.com/image.jpg' }]
      };

      const mapped = mapShopifyProduct(shopifyProduct);

      expect(mapped.variants).toHaveLength(3);
      expect(mapped.variants[1].sku).toBe('TEST-M');
    });
  });

  describe('Etsy Mapper', () => {
    function mapEtsyListing(etsyListing: any) {
      return {
        name: etsyListing.title,
        price: parseFloat(etsyListing.price),
        inventory_count: etsyListing.quantity,
        images: etsyListing.images.map((img: any) => img.url_570xN)
      };
    }

    it('should map Etsy listing to internal format', () => {
      const etsyListing = {
        listing_id: 789012,
        title: 'Handmade Item',
        price: '49.99',
        quantity: 5,
        images: [{ url_570xN: 'https://example.com/etsy.jpg' }]
      };

      const mapped = mapEtsyListing(etsyListing);

      expect(mapped.name).toBe('Handmade Item');
      expect(mapped.price).toBe(49.99);
      expect(mapped.inventory_count).toBe(5);
    });

    it('should handle multiple images', () => {
      const etsyListing = {
        listing_id: 789012,
        title: 'Handmade Item',
        price: '49.99',
        quantity: 5,
        images: [
          { url_570xN: 'https://example.com/1.jpg' },
          { url_570xN: 'https://example.com/2.jpg' }
        ]
      };

      const mapped = mapEtsyListing(etsyListing);

      expect(mapped.images).toHaveLength(2);
    });
  });

  describe('Joor Mapper (B2B)', () => {
    function mapJoorProduct(joorProduct: any) {
      return {
        name: joorProduct.name,
        wholesale_price: joorProduct.wholesale_price,
        minimum_order_quantity: joorProduct.moq
      };
    }

    it('should map Joor product to internal format', () => {
      const joorProduct = {
        id: 'JOOR-123',
        name: 'Wholesale Item',
        wholesale_price: 29.99,
        moq: 50
      };

      const mapped = mapJoorProduct(joorProduct);

      expect(mapped.name).toBe('Wholesale Item');
      expect(mapped.wholesale_price).toBe(29.99);
      expect(mapped.minimum_order_quantity).toBe(50);
    });

    it('should handle higher MOQs', () => {
      const joorProduct = {
        id: 'JOOR-456',
        name: 'Bulk Wholesale Item',
        wholesale_price: 9.99,
        moq: 500
      };

      const mapped = mapJoorProduct(joorProduct);

      expect(mapped.minimum_order_quantity).toBe(500);
    });
  });

  describe('Generic CSV Mapper', () => {
    function mapCSVRow(row: any) {
      return {
        name: row['Product Name'] || row.name,
        price: parseFloat(row.price || row.Price),
        sku: row.SKU || row.sku,
        stock: parseInt(row.Stock || row.stock || '0')
      };
    }

    it('should handle different CSV header formats', () => {
      const row1 = {
        'Product Name': 'Product A',
        'Price': '19.99',
        'SKU': 'PROD-A',
        'Stock': '100'
      };

      const row2 = {
        name: 'Product B',
        price: '29.99',
        sku: 'PROD-B',
        stock: '50'
      };

      const mapped1 = mapCSVRow(row1);
      const mapped2 = mapCSVRow(row2);

      expect(mapped1.name).toBe('Product A');
      expect(mapped2.name).toBe('Product B');
      expect(mapped1.price).toBe(19.99);
      expect(mapped2.price).toBe(29.99);
    });
  });
});
