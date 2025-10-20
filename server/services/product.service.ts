import type { IStorage } from '../storage';
import type { Product, InsertProduct, User } from '@shared/prisma-types';
import type { NotificationService } from '../notifications';
import type { SKUService } from './sku.service';
import { logger } from '../logger';
import { insertProductSchema } from '@shared/validation-schemas';
import { fromZodError } from 'zod-validation-error';
import { syncProductStockFromVariants } from '../utils/calculate-stock';
import type Stripe from 'stripe';
import { getCache, CacheTTL, CacheKeys } from '../cache';

// Service-specific logger with structured logging
const serviceLogger = logger.child({ service: 'ProductService' });

export interface CreateProductParams {
  productData: any;
  sellerId: string;
}

export interface CreateProductResult {
  success: boolean;
  product?: Product;
  error?: string;
}

export interface BulkCreateProductParams {
  products: any[];
  sellerId: string;
}

export interface BulkCreateProductResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export interface UpdateProductParams {
  productId: string;
  sellerId: string;
  updates: Partial<InsertProduct>;
}

export interface UpdateProductResult {
  success: boolean;
  product?: Product;
  error?: string;
}

export class ProductService {
  constructor(
    private storage: IStorage,
    private notificationService: NotificationService,
    private skuService: SKUService,
    private stripe?: Stripe
  ) {}

  /**
   * Create a single product with full orchestration
   * 
   * Steps:
   * 1. Sync currency from Stripe if connected
   * 2. Validate product data
   * 3. Generate SKUs (product + variants)
   * 4. Sync stock from variants
   * 5. Create product in database
   * 6. Send notifications (in-app + email)
   */
  async createProduct(params: CreateProductParams): Promise<CreateProductResult> {
    try {
      const { productData, sellerId } = params;
      
      // Step 1: Get user and sync currency from Stripe if connected
      const user = await this.storage.getUser(sellerId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      await this.syncCurrencyFromStripe(user);

      // Step 2: Sync image and images fields (Architecture 3 - match wholesale pattern)
      // If images array is provided but no single image, use first image from array
      const dataToValidate = { ...productData, sellerId };
      if (dataToValidate.images && dataToValidate.images.length > 0 && !dataToValidate.image) {
        dataToValidate.image = dataToValidate.images[0];
      }
      // If single image is provided but no images array, create array with single image
      else if (dataToValidate.image && (!dataToValidate.images || dataToValidate.images.length === 0)) {
        dataToValidate.images = [dataToValidate.image];
      }

      // Step 3: Validate product data
      const validationResult = insertProductSchema.safeParse(dataToValidate);

      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return { success: false, error: error.message };
      }

      // Step 4: Validate Shippo shipping requirements
      // If shippingType is "shippo", validate warehouse address is configured
      if (validationResult.data.shippingType === 'shippo') {
        const warehouseValid = await this.validateWarehouseAddress(sellerId);
        if (!warehouseValid.valid) {
          serviceLogger.warn('[ProductService] Shippo product creation blocked - no warehouse address', {
            sellerId,
            productName: validationResult.data.name
          });
          return { 
            success: false, 
            error: warehouseValid.error || 'Warehouse address required for Shippo shipping. Please configure your warehouse address in Settings > Warehouse before creating products with Shippo shipping.'
          };
        }
      }

      // Step 5: Generate SKUs using SKU service
      const productDataWithSKU = await this.generateSKUs(validationResult.data, sellerId);

      // Step 6: Sync stock from variants
      const syncedProductData = syncProductStockFromVariants(productDataWithSKU);

      // Step 7: Create product
      const product = await this.storage.createProduct(syncedProductData);

      // Step 8: Invalidate product list cache for this seller
      await this.invalidateProductCache(product.id, sellerId);

      // Step 9: Send notifications (don't fail if notifications fail)
      await this.sendProductListingNotifications(product, user).catch(error => {
        serviceLogger.error('[ProductService] Failed to send notifications:', { error });
      });

      serviceLogger.info('[ProductService] Product created successfully', { 
        productId: product.id, 
        sellerId 
      });

      return { success: true, product };
    } catch (error: any) {
      serviceLogger.error('[ProductService] Product creation failed:', { error });
      return { 
        success: false, 
        error: error.message || 'Failed to create product' 
      };
    }
  }

  /**
   * Bulk create products (CSV import)
   * 
   * Processes each product individually to provide detailed error reporting
   */
  async bulkCreateProducts(params: BulkCreateProductParams): Promise<BulkCreateProductResult> {
    const { products, sellerId } = params;
    const results: BulkCreateProductResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      const rowNumber = i + 2; // +2 for header row and 0-indexing

      try {
        // Convert date strings to Date objects if present
        if (productData.preOrderDate && typeof productData.preOrderDate === 'string') {
          productData.preOrderDate = new Date(productData.preOrderDate);
        }

        const result = await this.createProduct({ productData, sellerId });

        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: result.error || 'Unknown error',
          });
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error',
        });
      }
    }

    serviceLogger.info('[ProductService] Bulk import completed', {
      sellerId,
      success: results.success,
      failed: results.failed,
    });

    return results;
  }

  /**
   * Update product
   * 
   * Validates ownership and syncs stock from variants if needed
   */
  async updateProduct(params: UpdateProductParams): Promise<UpdateProductResult> {
    try {
      const { productId, sellerId, updates } = params;

      // Verify ownership
      const product = await this.storage.getProduct(productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      if (product.seller_id !== sellerId) {
        return { success: false, error: 'Unauthorized' };
      }

      // Validate Shippo shipping requirements if changing to Shippo (ISSUE #1 FIX)
      if (updates.shipping_type === 'shippo') {
        const warehouseValid = await this.validateWarehouseAddress(sellerId);
        if (!warehouseValid.valid) {
          serviceLogger.warn('[ProductService] Shippo product update blocked - no warehouse address', {
            sellerId,
            productId,
            productName: product.name
          });
          return { 
            success: false, 
            error: warehouseValid.error || 'Warehouse address required for Shippo shipping. Please configure your warehouse address in Settings > Warehouse before updating products to use Shippo shipping.'
          };
        }
      }

      // Sync stock from variants if variants are being updated
      let finalUpdates = updates;
      if (updates.variants) {
        finalUpdates = syncProductStockFromVariants({ ...product, ...updates });
      }

      const updatedProduct = await this.storage.updateProduct(productId, finalUpdates);

      if (!updatedProduct) {
        return { success: false, error: 'Failed to update product' };
      }

      // Invalidate cache after update
      await this.invalidateProductCache(productId, sellerId);

      serviceLogger.info('[ProductService] Product updated', { productId, sellerId });

      return { success: true, product: updatedProduct };
    } catch (error: any) {
      serviceLogger.error('[ProductService] Product update failed:', { error });
      return { 
        success: false, 
        error: error.message || 'Failed to update product' 
      };
    }
  }

  /**
   * Update product status
   */
  async updateProductStatus(
    productId: string, 
    sellerId: string, 
    status: string
  ): Promise<UpdateProductResult> {
    return this.updateProduct({
      productId,
      sellerId,
      updates: { status },
    });
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string, sellerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify ownership
      const product = await this.storage.getProduct(productId);
      if (!product) {
        return { success: false, error: 'Product not found' };
      }

      if (product.seller_id !== sellerId) {
        return { success: false, error: 'Unauthorized' };
      }

      const deleted = await this.storage.deleteProduct(productId);

      if (!deleted) {
        return { success: false, error: 'Failed to delete product' };
      }

      // Invalidate cache after deletion
      await this.invalidateProductCache(productId, sellerId);

      serviceLogger.info('[ProductService] Product deleted', { productId, sellerId });

      return { success: true };
    } catch (error: any) {
      serviceLogger.error('[ProductService] Product deletion failed:', { error });
      return { 
        success: false, 
        error: error.message || 'Failed to delete product' 
      };
    }
  }

  /**
   * Get product with currency (enriched) - Cache-First Strategy
   * 
   * Uses production-grade caching with:
   * - 5-minute TTL for product data (configurable via CACHE_TTL_PRODUCTS)
   * - Graceful fallback to DB query on cache miss
   * - Automatic cache population
   */
  async getProductWithCurrency(productId: string, requesterId?: string): Promise<Product & { currency: string } | null> {
    const cache = getCache();
    const cacheKey = CacheKeys.product(productId);

    try {
      // Step 1: Try to get from cache (cache-first strategy)
      const cached = await cache.get<Product & { currency: string }>(cacheKey);
      
      if (cached) {
        // Verify visibility permissions
        const isOwner = requesterId && requesterId === cached.seller_id;
        if (!isOwner && cached.status !== 'active' && cached.status !== 'coming_soon') {
          return null;
        }
        
        serviceLogger.debug('[ProductService] Cache hit for product', { productId });
        return cached;
      }

      serviceLogger.debug('[ProductService] Cache miss for product, fetching from DB', { productId });
    } catch (error) {
      // Cache errors should not break the service
      serviceLogger.warn('[ProductService] Cache get error, fetching from DB:', { error: error as any });
    }

    // Step 2: Cache miss or error - fetch from DB
    try {
      const product = await this.storage.getProduct(productId);
      if (!product) {
        return null;
      }

      // Check visibility permissions
      const isOwner = requesterId && requesterId === product.seller_id;
      if (!isOwner && product.status !== 'active' && product.status !== 'coming_soon') {
        return null;
      }

      // Get seller's currency
      const seller = await this.storage.getUser(product.seller_id);
      const currency = seller?.listing_currency || 'USD';

      const enrichedProduct = {
        ...product,
        currency,
      };

      // Step 3: Populate cache for future requests (only for active/coming_soon products)
      if (product.status === 'active' || product.status === 'coming_soon') {
        try {
          await cache.set(cacheKey, enrichedProduct, CacheTTL.PRODUCTS);
          serviceLogger.debug('[ProductService] Product cached', { 
            productId,
            ttl: CacheTTL.PRODUCTS 
          });
        } catch (error) {
          // Cache errors should not break the service
          serviceLogger.warn('[ProductService] Cache set error:', { error: error as any });
        }
      }

      return enrichedProduct;
    } catch (error) {
      serviceLogger.error('[ProductService] Failed to get product:', { error });
      return null;
    }
  }

  /**
   * Invalidate product cache
   * 
   * Automatically called on product mutations (create, update, delete)
   */
  private async invalidateProductCache(productId: string, sellerId: string): Promise<void> {
    try {
      const cache = getCache();
      
      // Invalidate specific product cache
      await cache.delete(CacheKeys.product(productId));
      
      // Invalidate product list caches for this seller
      await cache.deletePattern(CacheKeys.productList(sellerId, '*'));
      
      // Invalidate pricing caches that might include this product
      await cache.deletePattern(CacheKeys.pricing(sellerId, '*'));
      
      serviceLogger.info('[ProductService] Product cache invalidated', { 
        productId, 
        sellerId 
      });
    } catch (error) {
      // Cache errors should not break the service
      serviceLogger.warn('[ProductService] Failed to invalidate product cache:', { error: error as any });
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Sync currency from Stripe account
   */
  private async syncCurrencyFromStripe(user: User): Promise<void> {
    if (!user.stripe_connected_account_id || !this.stripe) {
      return;
    }

    try {
      const account = await this.stripe.accounts.retrieve(user.stripe_connected_account_id);
      const stripeCurrency = account.default_currency?.toUpperCase() || 'USD';

      if (user.listing_currency !== stripeCurrency) {
        await this.storage.upsertUser({
          ...user,
          listing_currency: stripeCurrency,
        });
        serviceLogger.info('[ProductService] Synced currency from Stripe', { 
          userId: user.id, 
          currency: stripeCurrency 
        });
      }
    } catch (error) {
      serviceLogger.error('[ProductService] Failed to sync Stripe currency:', { error });
      // Don't fail the operation if currency sync fails
    }
  }

  /**
   * Generate SKUs for product and variants using SKU service
   */
  private async generateSKUs(productData: any, sellerId: string): Promise<any> {
    // Auto-generate product SKU if not provided (custom SKU supported)
    if (!productData.sku) {
      productData.sku = await this.skuService.generateProductSKU(sellerId, undefined);
    } else {
      // Validate custom product SKU
      const exists = await this.skuService.skuExists(productData.sku);
      if (exists) {
        throw new Error(`Product SKU "${productData.sku}" already exists. Please choose a unique SKU.`);
      }
    }

    // Generate variant SKUs if product has variants
    if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
      productData.variants = await this.skuService.generateVariantSKUs(
        productData.sku,
        productData.variants
      );
    }

    serviceLogger.info('[ProductService] SKUs generated', { 
      productSKU: productData.sku, 
      variantCount: productData.variants?.length || 0 
    });

    return productData;
  }

  /**
   * Send product listing notifications
   */
  private async sendProductListingNotifications(product: Product, user: User): Promise<void> {
    // Create in-app notification
    await this.notificationService.createNotification({
      user_id: user.id,
      type: 'product_listed',
      title: 'Product Listed Successfully!',
      message: `Your product "${product.name}" is now live on your store`,
      email_sent: 0,
      metadata: { 
        productId: product.id, 
        productName: product.name, 
        productPrice: product.price 
      },
    });

    // Send confirmation email
    if (!user.email) {
      return;
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Product Listed Successfully!</h2>
        <p>Hi ${user.first_name || 'there'},</p>
        <p>Your product has been successfully added to your Upfirst store:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${product.name}</h3>
          <p style="color: #6b7280; margin: 10px 0;">Price: $${product.price}</p>
          <p style="color: #6b7280; margin: 10px 0;">Type: ${product.product_type}</p>
          ${product.stock ? `<p style="color: #6b7280; margin: 10px 0;">Stock: ${product.stock} units</p>` : ''}
        </div>
        <p>Your product is now visible to customers on your storefront.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Best regards,<br>
          The Upfirst Team
        </p>
      </div>
    `;

    await this.notificationService.sendEmail({
      to: user.email,
      from: 'Upfirst <hello@upfirst.io>',
      subject: `Product Listed: ${product.name}`,
      html: emailHtml,
    });

    serviceLogger.info('[ProductService] Notifications sent', { 
      userId: user.id, 
      productId: product.id 
    });
  }

  /**
   * Validate warehouse address for Shippo shipping
   * Uses new warehouse_addresses table (multi-warehouse support)
   * 
   * @param sellerId - The seller user ID
   * @returns Validation result with valid flag and optional error message
   */
  private async validateWarehouseAddress(sellerId: string): Promise<{ valid: boolean; error?: string }> {
    // Check warehouse_addresses table (new multi-warehouse system)
    const warehouseAddresses = await this.storage.getWarehouseAddressesBySellerId(sellerId);
    
    if (warehouseAddresses.length === 0) {
      return {
        valid: false,
        error: 'No warehouse address configured. Please add a warehouse address in Settings > Warehouse.',
      };
    }

    // Check that at least one warehouse has all required fields
    const completeWarehouse = warehouseAddresses.find(warehouse => 
      warehouse.address_line1 &&
      warehouse.city &&
      warehouse.postal_code &&
      warehouse.country_code &&
      warehouse.country_name
    );

    if (!completeWarehouse) {
      return {
        valid: false,
        error: 'Warehouse address incomplete. Please ensure all required fields are filled in Settings > Warehouse.',
      };
    }

    return { valid: true };
  }
}
