import type { IStorage } from '../storage';
import { logger } from '../logger';

/**
 * SKU Generation Service
 * Handles automatic SKU generation for products and variants
 * Format: UPF-{SELLER_CODE}-{COUNTER}
 * Example: UPF-TEST-001, UPF-TEST-001-A, UPF-TEST-001-B
 */
export class SKUService {
  constructor(private storage: IStorage) {}

  /**
   * Generate a unique product SKU
   * @param sellerId - Seller ID to include in SKU
   * @param customSku - Optional custom SKU provided by seller
   * @returns Unique SKU string
   */
  async generateProductSKU(sellerId: string, customSku?: string): Promise<string> {
    // If seller provided a custom SKU, validate and use it
    if (customSku) {
      const normalized = this.normalizeSKU(customSku);
      
      // Check if SKU already exists
      const exists = await this.skuExists(normalized);
      if (exists) {
        throw new Error(`SKU "${normalized}" already exists. Please choose a unique SKU.`);
      }
      
      logger.info(`[SKU] Using custom SKU: ${normalized}`);
      return normalized;
    }

    // Auto-generate unique SKU
    const sellerCode = this.getSellerCode(sellerId);
    const counter = await this.getNextCounter(sellerCode);
    const sku = `UPF-${sellerCode}-${counter}`;
    
    logger.info(`[SKU] Auto-generated product SKU: ${sku}`, { sellerId });
    return sku;
  }

  /**
   * Generate variant SKUs based on master product SKU
   * @param masterSKU - Master product SKU
   * @param variants - Array of variants with optional custom SKUs
   * @returns Array of variants with assigned SKUs
   */
  async generateVariantSKUs<T extends { sku?: string; size?: string; color?: string }>(
    masterSKU: string,
    variants: T[]
  ): Promise<(T & { sku: string })[]> {
    const result: (T & { sku: string })[] = [];
    const usedSKUs = new Set<string>(); // Track ALL SKUs to prevent any collisions
    const usedSuffixes = new Set<string>(); // Track suffixes for batch collision detection
    
    // Add master SKU to prevent variants from using it
    usedSKUs.add(masterSKU.toUpperCase());
    
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      
      if (variant.sku) {
        // Use custom SKU if provided
        const normalized = this.normalizeSKU(variant.sku);
        
        // CRITICAL FIX: Reject if matches master SKU
        if (normalized === masterSKU.toUpperCase()) {
          throw new Error(`Variant SKU "${normalized}" cannot be the same as the product SKU.`);
        }
        
        // Check database
        const exists = await this.skuExists(normalized);
        if (exists) {
          throw new Error(`Variant SKU "${normalized}" already exists. Please choose a unique SKU.`);
        }
        
        // CRITICAL FIX: Check if already used in this batch
        if (usedSKUs.has(normalized)) {
          throw new Error(`Variant SKU "${normalized}" conflicts with another variant in this batch. Please choose a different SKU.`);
        }
        
        // Track suffix
        const suffix = normalized.replace(masterSKU.toUpperCase() + '-', '');
        usedSuffixes.add(suffix);
        usedSKUs.add(normalized);
        result.push({ ...variant, sku: normalized });
      } else {
        // Auto-generate: append variant identifier to master SKU
        let variantSuffix = this.getVariantSuffix(variant, i);
        let variantSKU = `${masterSKU}-${variantSuffix}`;
        
        // CRITICAL FIX: Check for suffix collision within current batch
        let attempt = 0;
        while (usedSuffixes.has(variantSuffix) || usedSKUs.has(variantSKU.toUpperCase())) {
          // Collision detected! Use index-based fallback
          attempt++;
          variantSuffix = `${String.fromCharCode(65 + i)}-${attempt}`; // A-1, B-2, etc.
          variantSKU = `${masterSKU}-${variantSuffix}`;
        }
        
        // Check database for existing SKU
        let dbExists = await this.skuExists(variantSKU);
        
        // CRITICAL FIX: If database collision, loop until we find a unique SKU
        let fallbackAttempt = 0;
        while (dbExists || usedSKUs.has(variantSKU.toUpperCase())) {
          fallbackAttempt++;
          // Use timestamp-based suffix with incrementing attempt
          variantSuffix = `V${i + 1}-${Date.now().toString(36).slice(-4)}-${fallbackAttempt}`;
          variantSKU = `${masterSKU}-${variantSuffix}`;
          
          // Re-check database for this new SKU
          dbExists = await this.skuExists(variantSKU);
          
          // Safety valve: prevent infinite loop
          if (fallbackAttempt > 100) {
            throw new Error('Unable to generate unique SKU after 100 attempts. Please contact support.');
          }
        }
        
        usedSuffixes.add(variantSuffix);
        usedSKUs.add(variantSKU.toUpperCase());
        result.push({ ...variant, sku: variantSKU });
      }
    }
    
    logger.info(`[SKU] Generated ${result.length} variant SKUs from master ${masterSKU}`);
    return result;
  }

  /**
   * Normalize SKU: uppercase and trim
   */
  private normalizeSKU(sku: string): string {
    return sku.trim().toUpperCase();
  }

  /**
   * Check if SKU already exists in database (public for validation)
   */
  async skuExists(sku: string): Promise<boolean> {
    try {
      // Check product-level SKUs
      const allProducts = await this.storage.getAllProducts();
      const productSkuExists = allProducts.some(p => p.sku?.toUpperCase() === sku);
      
      if (productSkuExists) {
        return true;
      }

      // Check variant-level SKUs
      for (const product of allProducts) {
        if (product.variants && Array.isArray(product.variants)) {
          const variantSkuExists = product.variants.some((v: any) => 
            v.sku?.toUpperCase() === sku
          );
          if (variantSkuExists) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('[SKU] Error checking SKU existence:', error);
      return false;
    }
  }

  /**
   * Get seller code from seller ID
   * Uses first 4 characters of seller ID or username
   */
  private getSellerCode(sellerId: string): string {
    // Remove common prefixes
    const cleaned = sellerId.replace(/^(local-|test-)/i, '');
    
    // Take first 4 alphanumeric characters, uppercase
    const code = cleaned
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();
    
    return code || 'XXXX';
  }

  /**
   * Get next counter for seller
   * Finds highest existing counter and increments
   */
  private async getNextCounter(sellerCode: string): Promise<string> {
    try {
      const allProducts = await this.storage.getAllProducts();
      const prefix = `UPF-${sellerCode}-`;
      
      // Find all SKUs for this seller
      const sellerSKUs = allProducts
        .filter(p => p.sku?.startsWith(prefix))
        .map(p => p.sku!)
        .concat(
          allProducts.flatMap(p => 
            (p.variants as any[] || [])
              .filter((v: any) => v.sku?.startsWith(prefix))
              .map((v: any) => v.sku)
          )
        );

      // Extract counters and find max
      const counters = sellerSKUs
        .map(sku => {
          const match = sku.match(/UPF-[A-Z0-9]+-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));

      const maxCounter = counters.length > 0 ? Math.max(...counters) : 0;
      const nextCounter = maxCounter + 1;

      // Format with leading zeros (3 digits)
      return nextCounter.toString().padStart(3, '0');
    } catch (error) {
      logger.error('[SKU] Error getting next counter:', error);
      return '001'; // Fallback to 001
    }
  }

  /**
   * Get variant suffix based on variant properties
   * Returns letter (A, B, C...) or combination based on size/color
   */
  private getVariantSuffix(variant: { size?: string; color?: string }, index: number): string {
    // If variant has identifiable properties, use them
    if (variant.size && variant.color) {
      // Use first letter of size and color
      const sizeChar = variant.size.charAt(0).toUpperCase();
      const colorChar = variant.color.charAt(0).toUpperCase();
      return `${sizeChar}${colorChar}`;
    } else if (variant.size) {
      // Use size as suffix
      return variant.size.toUpperCase().slice(0, 2);
    } else if (variant.color) {
      // Use color as suffix
      return variant.color.toUpperCase().slice(0, 2);
    }
    
    // Fallback to letter index: A, B, C...
    return String.fromCharCode(65 + index); // 65 = 'A'
  }

  /**
   * Backfill SKUs for existing products without them
   * Used for migration
   */
  async backfillMissingSKUs(): Promise<{ updated: number; errors: number }> {
    logger.info('[SKU] Starting backfill for products without SKUs');
    
    try {
      const allProducts = await this.storage.getAllProducts();
      let updated = 0;
      let errors = 0;

      for (const product of allProducts) {
        try {
          let needsUpdate = false;
          const updates: any = {};

          // Generate product SKU if missing
          if (!product.sku) {
            updates.sku = await this.generateProductSKU(product.sellerId);
            needsUpdate = true;
          }

          // Generate variant SKUs if missing
          if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
            const variants = product.variants as any[];
            const hasSkuMissing = variants.some(v => !v.sku);
            
            if (hasSkuMissing) {
              const masterSKU = updates.sku || product.sku || await this.generateProductSKU(product.sellerId);
              updates.variants = await this.generateVariantSKUs(masterSKU, variants);
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            await this.storage.updateProduct(product.id, updates);
            updated++;
            logger.info(`[SKU] Backfilled SKU for product ${product.id}`);
          }
        } catch (error) {
          errors++;
          logger.error(`[SKU] Error backfilling product ${product.id}:`, error);
        }
      }

      logger.info(`[SKU] Backfill complete: ${updated} updated, ${errors} errors`);
      return { updated, errors };
    } catch (error) {
      logger.error('[SKU] Backfill failed:', error);
      throw error;
    }
  }
}
