/**
 * Bulk Product Upload Service
 * 
 * Handles CSV parsing, validation, and batch product creation
 * Architecture 3 compliant - all calculations on backend
 */

import { IStorage } from '../storage';
import { logger } from '../logger';
import { ProductService } from './product.service';
import { frontendProductSchema } from '@shared/schema';
import { fromZodError } from 'zod-validation-error';
import { CSV_TEMPLATE_FIELDS } from '@shared/bulk-upload-template';

export interface BulkUploadValidationMessage {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface BulkUploadRowData {
  [key: string]: string;
}

export interface ParsedProductData {
  // Basic fields
  name: string;
  description: string;
  price: string;
  sku?: string;
  productType: string;
  category: string;
  
  // Images
  image: string;
  images: string[];
  
  // Product type specific
  preOrderDate?: Date;
  madeToOrderDays?: number;
  depositAmount?: string;
  
  // Variants
  hasColors: number;
  variants?: any[];
  stock?: number;
  
  // Promotions
  discountPercentage?: string;
  promotionEndDate?: Date;
  promotionActive?: number;
  
  // Shipping
  shippingType?: string;
  flatShippingRate?: string;
  shippoWeight?: string;
  shippoLength?: string;
  shippoWidth?: string;
  shippoHeight?: string;
  
  // Status
  status?: string;
}

export class BulkUploadService {
  constructor(
    private storage: IStorage,
    private productService: ProductService
  ) {}

  /**
   * Parse CSV row and convert to product data
   * After AI mapping, rowData uses database column names
   */
  private parseProductFromRow(rowData: BulkUploadRowData): ParsedProductData {
    // Parse images - extract URL strings from various formats
    const images: string[] = [];
    
    const extractImageUrls = (value: any): string[] => {
      if (!value) return [];
      
      const extractUrl = (item: any): string | null => {
        if (typeof item === 'string' && item.trim()) {
          return item.trim();
        }
        
        if (typeof item === 'object' && item) {
          // Handle nested url.href structure
          if (typeof item.url === 'string') {
            return item.url.trim();
          }
          if (typeof item.url === 'object' && typeof item.url.href === 'string') {
            return item.url.href.trim();
          }
          // Handle direct href
          if (typeof item.href === 'string') {
            return item.href.trim();
          }
        }
        
        return null;
      };
      
      // String URL
      if (typeof value === 'string') {
        const url = extractUrl(value);
        return url ? [url] : [];
      }
      
      // Object with url property
      if (typeof value === 'object' && !Array.isArray(value)) {
        const url = extractUrl(value);
        return url ? [url] : [];
      }
      
      // Array of URLs or objects
      if (Array.isArray(value)) {
        return value.map(extractUrl).filter(Boolean) as string[];
      }
      
      return [];
    };
    
    if (rowData['images']) {
      if (typeof rowData['images'] === 'string') {
        const trimmed = rowData['images'].trim();
        
        // Try JSON parse (handles leading/trailing whitespace)
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            images.push(...extractImageUrls(parsed));
          } catch {
            // Fall through to comma-separated parsing
          }
        }
        
        // If not JSON or parsing failed, try comma-separated
        if (images.length === 0 && trimmed) {
          const imageUrls = trimmed.split(',').map((url: string) => url.trim()).filter(Boolean);
          images.push(...imageUrls);
        }
      } else {
        // Array or object
        images.push(...extractImageUrls(rowData['images']));
      }
    }
    
    // Fallback to single "image" column
    if (images.length === 0 && rowData['image']) {
      const imageUrls = extractImageUrls(rowData['image']);
      if (imageUrls.length > 0) {
        images.push(...imageUrls);
      }
    }
    
    // Parse variants - supports objects, JSON strings (with whitespace), arrays, and delimited strings
    let variants: any[] | undefined;
    
    if (rowData['variants']) {
      let rawVariants: any[] | undefined;
      
      // Extract raw variants first
      if (Array.isArray(rowData['variants'])) {
        rawVariants = rowData['variants'];
      } else if (typeof rowData['variants'] === 'string') {
        const trimmed = rowData['variants'].trim();
        
        // Try JSON parse first (handles leading/trailing whitespace and multiline)
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              rawVariants = parsed;
            } else if (parsed && typeof parsed === 'object') {
              rawVariants = [parsed]; // Single object variant
            }
          } catch {
            // Fall through to delimited parsing
          }
        }
        
        // If not JSON or parsing failed, try delimited format
        if (!rawVariants && trimmed) {
          rawVariants = this.parseVariantsString(trimmed);
        }
      } else if (rowData['variants'] && typeof rowData['variants'] === 'object') {
        // Single object variant
        rawVariants = [rowData['variants']];
      }
      
      // Normalize AI-provided variants to expected schema
      if (rawVariants && rawVariants.length > 0) {
        const normalizedList: any[] = [];
        
        for (const v of rawVariants) {
          if (!v || typeof v !== 'object') continue;
          
          // Check if this is a color variant with nested sizes
          const hasColorInfo = v.color !== undefined || v.colorName !== undefined;
          const hasSizesArray = Array.isArray(v.sizes) && v.sizes.length > 0;
          
          if (hasColorInfo && hasSizesArray) {
            // Flatten color variant with sizes array
            const colorName = (v.colorName || v.color)?.toString().trim();
            const colorHex = (v.colorHex || v.hex)?.toString().trim();
            const colorImages = extractImageUrls(v.images || v.image);
            
            for (const sizeItem of v.sizes) {
              if (!sizeItem || typeof sizeItem !== 'object') continue;
              
              const stock = this.parseStock(sizeItem.stock);
              if (stock === undefined) continue; // Reject invalid stock
              
              normalizedList.push({
                colorName,
                colorHex,
                size: sizeItem.size?.toString().trim(),
                stock,
                sku: sizeItem.sku?.toString().trim() || undefined,
                image: colorImages[0] || undefined,
              });
            }
          } else {
            // Simple size variant or flat color variant
            const normalized: any = {};
            
            // Size (required for size variants)
            if (v.size !== undefined) {
              normalized.size = v.size.toString().trim();
            }
            
            // Color info (for color variants)
            if (hasColorInfo) {
              normalized.colorName = (v.colorName || v.color)?.toString().trim();
              if (v.colorHex !== undefined || v.hex !== undefined) {
                normalized.colorHex = (v.colorHex || v.hex)?.toString().trim();
              }
            }
            
            // Stock (must be non-negative integer)
            if (v.stock !== undefined) {
              const stock = this.parseStock(v.stock);
              if (stock === undefined) continue; // Reject invalid stock
              normalized.stock = stock;
            } else {
              normalized.stock = 0; // Default for variants without stock specified
            }
            
            // SKU (optional)
            if (v.sku !== undefined) {
              normalized.sku = v.sku.toString().trim();
            }
            
            // Image (optional)
            if (v.image !== undefined) {
              const urls = extractImageUrls(v.image);
              if (urls.length > 0) {
                normalized.image = urls[0];
              }
            }
            
            // Must have at least size or colorName
            if (!normalized.size && !normalized.colorName) {
              continue;
            }
            
            normalizedList.push(normalized);
          }
        }
        
        variants = normalizedList.length > 0 ? normalizedList : undefined;
      }
    }
    
    // Detect hasColors from variant structure (check for colorName or color property)
    const hasColors = variants && variants.some(v => v.colorName || v.color) ? 1 : 0;
    
    // Build product data using database column names
    const productData: ParsedProductData = {
      name: rowData['name']?.toString().trim() || '',
      description: rowData['description']?.toString().trim() || '',
      price: rowData['price']?.toString().trim() || '0',
      sku: rowData['sku']?.toString().trim() || undefined,
      productType: 'in-stock', // ALL bulk uploads are in-stock items only
      category: rowData['category']?.toString().trim() || '',
      image: images[0] || '',
      images,
      hasColors,
      variants,
      stock: variants ? undefined : this.parseStock(rowData['stock']),
      // Shipping fields - default to 'flat' for bulk uploads when not specified
      shippingType: (rowData['shippingType']?.toString().trim() as any) || 'flat',
      flatShippingRate: rowData['flatShippingRate']?.toString().trim() || undefined,
      shippoWeight: rowData['shippoWeight']?.toString().trim() || undefined,
      shippoLength: rowData['shippoLength']?.toString().trim() || undefined,
      shippoWidth: rowData['shippoWidth']?.toString().trim() || undefined,
      shippoHeight: rowData['shippoHeight']?.toString().trim() || undefined,
      // Promotion fields
      discountPercentage: rowData['discountPercentage']?.toString().trim() || undefined,
      promotionActive: this.parseBoolean(rowData['promotionActive']?.toString()) ? 1 : 0,
      // Status
      status: rowData['status']?.toString().trim() || 'active',
    };
    
    return productData;
  }
  
  /**
   * Parse variants string in various formats
   * Supports: SIZE:STOCK:SKU|SIZE:STOCK:SKU or COLOR@@HEX@@IMAGE@@SIZE:STOCK:SKU;;...
   */
  private parseVariantsString(variantString: string): any[] {
    if (!variantString?.trim()) return [];
    
    // Detect format - color variants use ;; separator
    if (variantString.includes(';;')) {
      return this.parseColorVariants(variantString);
    } else if (variantString.includes('|')) {
      return this.parseSizeVariants(variantString);
    }
    
    return [];
  }

  /**
   * Parse boolean values from CSV
   */
  private parseBoolean(value?: string): boolean {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === 'yes' || normalized === 'true' || normalized === '1';
  }

  /**
   * Parse stock quantity - distinguishes between "not provided" and actual 0
   * Rejects negative numbers and non-integers
   */
  private parseStock(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined; // Not provided
    }
    
    const str = value.toString().trim();
    const num = Number(str);
    
    // Reject if: NaN, not an integer, or negative
    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      return undefined;
    }
    
    return num; // Can be 0 or positive integer
  }

  /**
   * Parse size-only variants from string
   * Format: SIZE:STOCK:SKU|SIZE:STOCK:SKU
   */
  private parseSizeVariants(variantString: string): any[] {
    if (!variantString?.trim()) return [];
    
    const variants: any[] = [];
    const parts = variantString.split('|');
    
    for (const part of parts) {
      const [size, stock, sku] = part.split(':').map(s => s.trim());
      if (!size) continue;
      
      const validStock = this.parseStock(stock);
      if (validStock === undefined) continue; // Skip variants with invalid stock
      
      variants.push({
        size,
        stock: validStock,
        sku: sku || undefined,
      });
    }
    
    return variants;
  }

  /**
   * Parse color variants from string
   * Format: COLOR@@HEX@@IMAGE1,IMAGE2@@SIZE:STOCK:SKU|SIZE:STOCK:SKU;;NEXTCOLOR@@...
   * Using @@ delimiter to avoid conflicts with https:// URLs
   */
  private parseColorVariants(variantString: string): any[] {
    if (!variantString?.trim()) return [];
    
    const colorVariants: any[] = [];
    const colorParts = variantString.split(';;');  // Split colors on ;;
    
    for (const colorPart of colorParts) {
      const sections = colorPart.split('@@');  // Split metadata on @@
      if (sections.length < 3) continue;
      
      const colorName = sections[0]?.trim();
      const colorHex = sections[1]?.trim();
      const imagesStr = sections[2]?.trim();
      const images = imagesStr ? imagesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
      
      // Parse sizes for this color (still using : delimiter within size data)
      const sizes: any[] = [];
      const sizesStr = sections[3]?.trim() || '';
      const sizeParts = sizesStr.split('|');  // Each size separated by |
      
      for (const sizePart of sizeParts) {
        const [size, stock, sku] = sizePart.split(':').map(s => s.trim());
        
        if (!size) continue;
        
        const validStock = this.parseStock(stock);
        if (validStock === undefined) continue; // Skip variants with invalid stock
        
        sizes.push({
          size,
          stock: validStock,
          sku: sku || undefined,
        });
      }
      
      if (colorName && sizes.length > 0) {
        colorVariants.push({
          colorName,
          colorHex: colorHex || '#000000',
          images,
          sizes,
        });
      }
    }
    
    return colorVariants;
  }

  /**
   * Validate product data against schema
   */
  async validateProductData(
    productData: ParsedProductData,
    sellerId: string
  ): Promise<{ valid: boolean; messages: BulkUploadValidationMessage[] }> {
    const messages: BulkUploadValidationMessage[] = [];
    
    // DEBUG: Log parsed product data
    logger.info('[BulkUploadService] Validating product data', {
      name: productData.name,
      price: productData.price,
      category: productData.category,
      hasVariants: !!productData.variants,
      variantCount: productData.variants?.length || 0
    });
    
    // Validate using Zod schema
    const validationResult = frontendProductSchema.safeParse(productData);
    
    if (!validationResult.success) {
      const error = fromZodError(validationResult.error);
      const errorLines = error.message.split('\n');
      
      // DEBUG: Log Zod validation errors with full details
      logger.error('[BulkUploadService] Zod validation failed', {
        product: productData.name,
        zodIssues: validationResult.error.issues,
        errorMessage: error.message,
        productData: JSON.stringify(productData, null, 2)
      });
      
      for (const line of errorLines) {
        // Extract field name and message
        const match = line.match(/(.+):\s*(.+)/);
        if (match) {
          messages.push({
            field: match[1].trim(),
            message: match[2].trim(),
            severity: 'error',
          });
        } else {
          messages.push({
            field: 'general',
            message: line.trim(),
            severity: 'error',
          });
        }
      }
    }
    
    // Business logic validations
    if (productData.productType === 'pre-order' && !productData.preOrderDate) {
      messages.push({
        field: 'preOrderDate',
        message: 'Pre-order date is required for pre-order products',
        severity: 'error',
      });
    }
    
    if (productData.productType === 'made-to-order' && (!productData.madeToOrderDays || productData.madeToOrderDays <= 0)) {
      messages.push({
        field: 'madeToOrderDays',
        message: 'Lead time days is required for made-to-order products',
        severity: 'error',
      });
    }
    
    if (productData.shippingType === 'flat' && !productData.flatShippingRate) {
      messages.push({
        field: 'flatShippingRate',
        message: 'Flat shipping rate is required when shipping type is flat',
        severity: 'warning',
      });
    }
    
    // Check for variants
    if (!productData.variants || productData.variants.length === 0) {
      if (!productData.stock && productData.productType === 'in-stock') {
        messages.push({
          field: 'stock',
          message: 'Stock quantity is required for in-stock products without variants',
          severity: 'warning',
        });
      }
    }
    
    const hasErrors = messages.some(m => m.severity === 'error');
    return {
      valid: !hasErrors,
      messages,
    };
  }

  /**
   * Validate all rows in a bulk upload job
   */
  async validateBulkUpload(
    jobId: string,
    sellerId: string
  ): Promise<{ totalValid: number; totalErrors: number; totalWarnings: number }> {
    const items = await this.storage.getBulkUploadItemsByJob(jobId);
    
    let totalValid = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    
    for (const item of items) {
      const rowData = item.rowData as BulkUploadRowData;
      const productData = this.parseProductFromRow(rowData);
      const validation = await this.validateProductData(productData, sellerId);
      
      const hasErrors = validation.messages.some(m => m.severity === 'error');
      const hasWarnings = validation.messages.some(m => m.severity === 'warning');
      
      if (hasErrors) {
        totalErrors++;
        await this.storage.updateBulkUploadItem(item.id, {
          validationStatus: 'error' as any,
          validationMessages: validation.messages as any,
        });
      } else if (hasWarnings) {
        totalWarnings++;
        await this.storage.updateBulkUploadItem(item.id, {
          validationStatus: 'warning' as any,
          validationMessages: validation.messages as any,
        });
      } else {
        totalValid++;
        await this.storage.updateBulkUploadItem(item.id, {
          validationStatus: 'valid' as any,
          validationMessages: [] as any,
        });
      }
    }
    
    // Update job stats
    await this.storage.updateBulkUploadJob(jobId, {
      status: 'validated' as any,
      successCount: totalValid,
      errorCount: totalErrors,
      warningCount: totalWarnings,
    });
    
    return { totalValid, totalErrors, totalWarnings };
  }

  /**
   * Import products from validated bulk upload job
   */
  async importProducts(
    jobId: string,
    sellerId: string
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    const items = await this.storage.getBulkUploadItemsByJob(jobId);
    
    // DEBUG: Log validation statuses
    logger.info('[BulkUploadService] Import starting', { 
      jobId, 
      totalItems: items.length,
      statuses: JSON.stringify(items.map(i => i.validationStatus))
    });
    
    const validItems = items.filter(item => 
      item.validationStatus === 'valid' || item.validationStatus === 'warning'
    );
    
    // Count items that were skipped due to validation errors
    const validationErrorCount = items.filter(item => 
      item.validationStatus === 'error'
    ).length;
    
    logger.info('[BulkUploadService] Valid items filtered', { 
      validCount: validItems.length,
      validationErrorCount
    });
    
    let successCount = 0;
    let errorCount = validationErrorCount; // Start with validation errors
    const errors: string[] = [];
    
    // Update job status
    await this.storage.updateBulkUploadJob(jobId, {
      status: 'importing' as any,
    });
    
    for (const item of validItems) {
      try {
        const rowData = item.rowData as BulkUploadRowData;
        const productData = this.parseProductFromRow(rowData);
        
        logger.info('[BulkUploadService] Parsed product data', { 
          name: productData.name,
          hasVariants: !!productData.variants,
          variantsLength: productData.variants?.length 
        });
        
        // Create product using ProductService (handles SKU generation, stock sync, etc.)
        const result = await this.productService.createProduct({
          productData: productData as any,
          sellerId,
        });
        
        logger.info('[BulkUploadService] Product creation result', { 
          success: result.success,
          error: result.error 
        });
        
        if (result.success && result.product) {
          successCount++;
          await this.storage.updateBulkUploadItem(item.id, {
            validationStatus: 'imported' as any,
            productId: result.product.id,
          });
          
          // Update progress
          await this.storage.updateBulkUploadJob(jobId, {
            processedRows: successCount + errorCount,
          });
        } else {
          errorCount++;
          errors.push(`Row ${item.rowNumber}: ${result.error || 'Unknown error'}`);
          await this.storage.updateBulkUploadItem(item.id, {
            validationStatus: 'failed' as any,
            validationMessages: [
              {
                field: 'general',
                message: result.error || 'Failed to create product',
                severity: 'error',
              },
            ] as any,
          });
        }
      } catch (error: any) {
        errorCount++;
        errors.push(`Row ${item.rowNumber}: ${error.message}`);
        logger.error('[BulkUploadService] Import error:', error);
        
        await this.storage.updateBulkUploadItem(item.id, {
          validationStatus: 'failed' as any,
          validationMessages: [
            {
              field: 'general',
              message: error.message || 'Unexpected error',
              severity: 'error',
            },
          ] as any,
        });
      }
    }
    
    // Update final job status
    const finalStatus = errorCount > 0 ? 'completed_with_errors' : 'completed';
    await this.storage.updateBulkUploadJob(jobId, {
      status: finalStatus as any,
      successCount,
      errorCount,
      processedRows: successCount + errorCount,
      completedAt: new Date(),
    });
    
    logger.info('[BulkUploadService] Import completed', {
      jobId,
      successCount,
      errorCount,
    });
    
    return { successCount, errorCount, errors };
  }

  /**
   * Rollback bulk upload - delete all products created in this job
   */
  async rollbackBulkUpload(jobId: string): Promise<{ deletedCount: number }> {
    const items = await this.storage.getBulkUploadItemsByJob(jobId);
    const importedItems = items.filter(item => item.productId);
    
    let deletedCount = 0;
    
    for (const item of importedItems) {
      if (item.productId) {
        try {
          await this.storage.deleteProduct(item.productId);
          deletedCount++;
        } catch (error) {
          logger.error('[BulkUploadService] Rollback error:', error);
        }
      }
    }
    
    // Update job status
    await this.storage.updateBulkUploadJob(jobId, {
      status: 'rolled_back' as any,
      completedAt: new Date(),
    });
    
    logger.info('[BulkUploadService] Rollback completed', {
      jobId,
      deletedCount,
    });
    
    return { deletedCount };
  }
}
