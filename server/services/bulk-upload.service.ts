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
   */
  private parseProductFromRow(rowData: BulkUploadRowData): ParsedProductData {
    // Parse images - supports both consolidated "Images" column and individual "Image 1", "Image 2", etc.
    const images: string[] = [];
    
    // Try consolidated "Images" column first (comma-separated URLs)
    if (rowData['Images']?.trim()) {
      const imageUrls = rowData['Images'].split(',').map(url => url.trim()).filter(Boolean);
      images.push(...imageUrls);
    } else {
      // Fallback to individual Image columns for backwards compatibility
      for (let i = 1; i <= 8; i++) {
        const imageUrl = rowData[`Image ${i}`]?.trim();
        if (imageUrl) {
          images.push(imageUrl);
        }
      }
    }
    
    // Parse variants
    const hasColors = this.parseBoolean(rowData['Has Colors']);
    let variants: any[] | undefined;
    
    if (hasColors) {
      // Parse color variants
      variants = this.parseColorVariants(rowData['Color Variants'] || '');
    } else if (rowData['Size Variants']) {
      // Parse size-only variants
      variants = this.parseSizeVariants(rowData['Size Variants']);
    }
    
    // Parse dates
    const preOrderDate = rowData['Pre-Order Date']?.trim() 
      ? new Date(rowData['Pre-Order Date'].trim()) 
      : undefined;
    
    const promotionEndDate = rowData['Promotion End Date']?.trim()
      ? new Date(rowData['Promotion End Date'].trim())
      : undefined;
    
    // Build product data
    const productData: ParsedProductData = {
      name: rowData['Product Name']?.trim() || '',
      description: rowData['Description']?.trim() || '',
      price: rowData['Price']?.trim() || '0',
      sku: rowData['SKU']?.trim() || undefined,
      productType: rowData['Product Type']?.trim() || 'in-stock',
      category: rowData['Category']?.trim() || '',
      image: images[0] || '',
      images,
      hasColors: hasColors ? 1 : 0,
      variants,
      stock: variants ? undefined : parseInt(rowData['Stock'] || '0') || undefined,
      preOrderDate,
      madeToOrderDays: parseInt(rowData['Made To Order Days'] || '') || undefined,
      depositAmount: rowData['Deposit Amount']?.trim() || undefined,
      discountPercentage: rowData['Discount Percentage']?.trim() || undefined,
      promotionEndDate,
      promotionActive: rowData['Discount Percentage']?.trim() ? 1 : 0,
      shippingType: rowData['Shipping Type']?.trim() || 'flat',
      flatShippingRate: rowData['Flat Shipping Rate']?.trim() || undefined,
      shippoWeight: rowData['Shippo Weight (lbs)']?.trim() || undefined,
      shippoLength: rowData['Shippo Length (in)']?.trim() || undefined,
      shippoWidth: rowData['Shippo Width (in)']?.trim() || undefined,
      shippoHeight: rowData['Shippo Height (in)']?.trim() || undefined,
      status: rowData['Status']?.trim() || 'active',
    };
    
    return productData;
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
   * Parse size-only variants from string
   * Format: SIZE:STOCK:SKU|SIZE:STOCK:SKU
   */
  private parseSizeVariants(variantString: string): any[] {
    if (!variantString?.trim()) return [];
    
    const variants: any[] = [];
    const parts = variantString.split('|');
    
    for (const part of parts) {
      const [size, stock, sku] = part.split(':').map(s => s.trim());
      if (size) {
        variants.push({
          size,
          stock: parseInt(stock) || 0,
          sku: sku || undefined,
        });
      }
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
        
        if (size) {
          sizes.push({
            size,
            stock: parseInt(stock) || 0,
            sku: sku || undefined,
          });
        }
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
    
    // Validate using Zod schema
    const validationResult = frontendProductSchema.safeParse(productData);
    
    if (!validationResult.success) {
      const error = fromZodError(validationResult.error);
      const errorLines = error.message.split('\n');
      
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
    const validItems = items.filter(item => 
      item.validationStatus === 'valid' || item.validationStatus === 'warning'
    );
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Update job status
    await this.storage.updateBulkUploadJob(jobId, {
      status: 'importing' as any,
    });
    
    for (const item of validItems) {
      try {
        const rowData = item.rowData as BulkUploadRowData;
        const productData = this.parseProductFromRow(rowData);
        
        // Create product using ProductService (handles SKU generation, stock sync, etc.)
        const result = await this.productService.createProduct({
          productData: productData as any,
          sellerId,
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
