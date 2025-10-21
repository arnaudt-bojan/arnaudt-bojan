import { Injectable } from '@nestjs/common';
import { ProductPresentation } from './interfaces/product-presentation.interface';

@Injectable()
export class ProductPresentationService {
  getAvailabilityText(product: any): string {
    if (!product) return 'Unavailable';
    
    const status = (product.status || '').toLowerCase();
    const productType = (product.product_type || product.productType || '').toLowerCase();

    if (status !== 'active') {
      return 'Unavailable';
    }

    if (productType === 'made-to-order') {
      return 'Made to Order';
    }

    if (productType === 'pre-order') {
      return 'Pre-order';
    }

    const stock = product.stock_quantity || product.stockQuantity || 0;

    if (stock === 0) {
      return 'Out of Stock';
    }

    if (stock < 10) {
      return 'Low Stock';
    }

    return 'In Stock';
  }

  getProductBadges(product: any): string[] {
    if (!product) return [];
    
    const badges: string[] = [];
    const productType = (product.product_type || product.productType || '').toLowerCase();

    const createdAt = new Date(product.created_at || product.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (!isNaN(createdAt.getTime()) && createdAt > thirtyDaysAgo) {
      badges.push('New');
    }

    const compareAtPrice = product.compare_at_price || product.compareAtPrice;
    if (compareAtPrice && product.price < compareAtPrice) {
      badges.push('Sale');
    }

    if (productType === 'pre-order') {
      badges.push('Pre-order');
    }

    if (productType === 'made-to-order') {
      badges.push('Made to Order');
    }

    const stock = product.stock_quantity || product.stockQuantity || 0;
    if (stock > 0 && stock < 5) {
      badges.push('Low Stock');
    }

    return badges;
  }

  getStockLevelIndicator(stockQuantity: number): string {
    if (stockQuantity === 0) {
      return 'out-of-stock';
    }

    if (stockQuantity < 5) {
      return 'critical';
    }

    if (stockQuantity < 10) {
      return 'low';
    }

    if (stockQuantity < 50) {
      return 'medium';
    }

    return 'high';
  }

  isAvailableForPurchase(product: any): boolean {
    if (!product) return false;
    
    const status = (product.status || '').toLowerCase();
    const productType = (product.product_type || product.productType || '').toLowerCase();

    if (status !== 'active') {
      return false;
    }

    if (['made-to-order', 'pre-order'].includes(productType)) {
      return true;
    }

    const stock = product.stock_quantity || product.stockQuantity || 0;
    return stock > 0;
  }

  isVariantAvailable(product: any, variantId: string): boolean {
    if (!product || !product.variants || !Array.isArray(product.variants)) {
      return false;
    }

    const productType = (product.product_type || product.productType || '').toLowerCase();

    const variant = product.variants.find((v: any) => v.id === variantId);

    if (!variant) {
      return false;
    }

    if (['made-to-order', 'pre-order'].includes(productType)) {
      return true;
    }

    const variantStock = variant.stock_quantity || variant.stockQuantity || 0;
    return variantStock > 0;
  }

  getProductPresentation(product: any): ProductPresentation {
    if (!product) {
      return {
        availabilityText: 'Unavailable',
        badges: [],
        stockLevelIndicator: 'out-of-stock',
        availableForPurchase: false,
        isPreOrder: false,
        isMadeToOrder: false,
        isWholesale: false,
        stockQuantity: 0,
        lowStockThreshold: 10,
      };
    }

    const productType = (product.product_type || product.productType || '').toLowerCase();
    const stock = product.stock_quantity || product.stockQuantity || 0;
    
    return {
      availabilityText: this.getAvailabilityText(product),
      badges: this.getProductBadges(product),
      stockLevelIndicator: this.getStockLevelIndicator(stock),
      availableForPurchase: this.isAvailableForPurchase(product),
      isPreOrder: productType === 'pre-order',
      isMadeToOrder: productType === 'made-to-order',
      isWholesale: product.is_wholesale || product.isWholesale || false,
      stockQuantity: stock,
      lowStockThreshold: 10,
    };
  }
}
