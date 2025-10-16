import type { IStorage } from '../storage';
import Papa from 'papaparse';

/**
 * CSV Format Types
 */
export type CSVFormat = 'woocommerce' | 'shopify' | 'generic';

/**
 * Preprocessing Result
 */
export interface PreprocessingResult {
  format: CSVFormat;
  originalRowCount: number;
  productCount: number;
  flattenedRows: Record<string, any>[];
  headers: string[];
  warnings: string[];
  diagnostics: {
    orphanedVariations?: number;
    missingParents?: number;
    duplicateHandles?: number;
  };
}

/**
 * Multi-Row Product Preprocessor Service
 * 
 * Handles WooCommerce and Shopify CSV formats that use multiple rows per product.
 * Normalizes them to single-row format compatible with AI mapping.
 */
export class MultiRowProductPreprocessor {
  constructor(private storage: IStorage) {}

  /**
   * Main preprocessing entry point
   */
  async preprocess(csvData: string): Promise<PreprocessingResult> {
    // Parse CSV
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
    }

    const rows = parseResult.data as Record<string, any>[];
    const headers = parseResult.meta.fields || [];

    // Detect format
    const format = this.detectFormat(headers, rows);

    // Process based on format
    let result: PreprocessingResult;
    
    switch (format) {
      case 'woocommerce':
        result = this.preprocessWooCommerce(rows, headers);
        break;
      case 'shopify':
        result = this.preprocessShopify(rows, headers);
        break;
      case 'generic':
      default:
        // No preprocessing needed - return as-is
        result = {
          format: 'generic',
          originalRowCount: rows.length,
          productCount: rows.length,
          flattenedRows: rows,
          headers: headers,
          warnings: [],
          diagnostics: {},
        };
    }

    return result;
  }

  /**
   * Detect CSV format based on headers and data patterns
   */
  private detectFormat(headers: string[], rows: Record<string, any>[]): CSVFormat {
    const headerSet = new Set(headers.map(h => h.toLowerCase()));

    // WooCommerce detection: Has "Type" and "Parent" columns
    const hasType = headerSet.has('type');
    const hasParent = headerSet.has('parent');
    
    if (hasType && hasParent) {
      // Verify with data: check if any rows have Type=variation
      const hasVariations = rows.some(row => 
        row.Type?.toLowerCase() === 'variation' || 
        row.type?.toLowerCase() === 'variation'
      );
      if (hasVariations) {
        return 'woocommerce';
      }
    }

    // Shopify detection: Has "Handle" column with repeated values
    const hasHandle = headerSet.has('handle');
    
    if (hasHandle) {
      // Check if Handle values repeat (indicating multi-row products)
      const handleCounts = new Map<string, number>();
      rows.forEach(row => {
        const handle = row.Handle || row.handle;
        if (handle) {
          handleCounts.set(handle, (handleCounts.get(handle) || 0) + 1);
        }
      });
      
      // If any handle appears more than once, it's Shopify format
      const hasRepeatedHandles = Array.from(handleCounts.values()).some(count => count > 1);
      if (hasRepeatedHandles) {
        return 'shopify';
      }
    }

    // Default to generic (single-row products)
    return 'generic';
  }

  /**
   * Preprocess WooCommerce format
   * Groups variable/variation rows into single products
   */
  private preprocessWooCommerce(rows: Record<string, any>[], headers: string[]): PreprocessingResult {
    const warnings: string[] = [];
    const diagnostics = {
      orphanedVariations: 0,
      missingParents: 0,
    };

    // Separate parent (variable/simple) and variation rows
    const parents = new Map<string, Record<string, any>>();
    const variations = new Map<string, Record<string, any>[]>();
    const simpleProducts: Record<string, any>[] = [];

    rows.forEach((row, index) => {
      const type = (row.Type || row.type || '').toLowerCase();
      const id = row.ID || row.id || `row-${index}`;
      const parent = row.Parent || row.parent || '';

      if (type === 'simple') {
        // Simple products - no variations
        simpleProducts.push(row);
      } else if (type === 'variable') {
        // Parent product - store by raw ID (normalized)
        const parentKey = id.toString();
        parents.set(parentKey, row);
      } else if (type === 'variation') {
        // Variation - group by parent
        if (!parent) {
          warnings.push(`Row ${index + 2}: Variation without parent reference`);
          diagnostics.orphanedVariations++;
        } else {
          // Normalize parent reference
          const normalizedParent = parent.replace(/^id:/, '').trim();
          
          if (!variations.has(normalizedParent)) {
            variations.set(normalizedParent, []);
          }
          variations.get(normalizedParent)!.push(row);
        }
      }
    });

    // Flatten products
    const flattenedRows: Record<string, any>[] = [];

    // Add simple products as-is
    flattenedRows.push(...simpleProducts);

    // Process variable products with variations
    parents.forEach((parentRow, parentId) => {
      const productVariations = variations.get(parentId) || [];
      
      if (productVariations.length === 0) {
        warnings.push(`Product "${parentRow.Name || parentRow.name}" has no variations`);
      }

      // Flatten to single row
      const flattened = this.flattenWooCommerceProduct(parentRow, productVariations);
      flattenedRows.push(flattened);
    });

    // Check for orphaned variations (variations without parents)
    variations.forEach((vars, parentRef) => {
      if (!parents.has(parentRef)) {
        warnings.push(`Found ${vars.length} variations for missing parent ${parentRef}`);
        diagnostics.missingParents++;
      }
    });

    // Extract headers from all flattened rows (union of all keys)
    const headerSet = new Set<string>();
    flattenedRows.forEach(row => {
      Object.keys(row).forEach(key => headerSet.add(key));
    });
    const flattenedHeaders = Array.from(headerSet);
    
    return {
      format: 'woocommerce',
      originalRowCount: rows.length,
      productCount: flattenedRows.length,
      flattenedRows,
      headers: flattenedHeaders.length > 0 ? flattenedHeaders : headers,
      warnings,
      diagnostics,
    };
  }

  /**
   * Flatten WooCommerce product (parent + variations) to single row
   */
  private flattenWooCommerceProduct(
    parent: Record<string, any>,
    variations: Record<string, any>[]
  ): Record<string, any> {
    // Start with parent data
    const flattened: Record<string, any> = { ...parent };

    // Collect all images (from parent and variations)
    const imageSet = new Set<string>();
    
    // Parent images
    const parentImages = (parent.Images || parent.images || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    parentImages.forEach((img: string) => imageSet.add(img));

    // Variation images
    variations.forEach(v => {
      const varImages = (v.Images || v.images || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      varImages.forEach((img: string) => imageSet.add(img));
    });

    flattened.images = Array.from(imageSet).join(', ');

    // Build variants array from variations
    const variantsArray = variations.map(v => {
      const variant: any = {};

      // Extract attributes (Color, Size, etc.)
      // WooCommerce uses "Attribute 1 name", "Attribute 1 value(s)", etc.
      for (let i = 1; i <= 3; i++) {
        const attrName = v[`Attribute ${i} name`] || v[`attribute ${i} name`];
        const attrValue = v[`Attribute ${i} value(s)`] || v[`attribute ${i} value(s)`];
        
        if (attrName && attrValue) {
          const normalizedName = attrName.toLowerCase();
          
          if (normalizedName.includes('color') || normalizedName.includes('colour')) {
            variant.colorName = attrValue;
          } else if (normalizedName.includes('size')) {
            variant.size = attrValue;
          } else {
            // Generic attribute
            variant[attrName] = attrValue;
          }
        }
      }

      // Stock
      const stock = v.Stock || v.stock || v['In stock?'] || v['in stock?'];
      variant.stock = stock ? parseInt(stock) : 0;

      // SKU
      variant.sku = v.SKU || v.sku || '';

      // Price (use "Regular price" if available, otherwise generic price)
      const price = v['Regular price'] || v['regular price'] || v.Price || v.price;
      if (price) {
        variant.price = price;
      }

      // Image (variation-specific)
      const varImage = v.Images || v.images;
      if (varImage) {
        const imgs = varImage.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (imgs.length > 0) {
          variant.image = imgs[0];
        }
      }

      return variant;
    });

    // Serialize variants as JSON string
    flattened.variants = JSON.stringify(variantsArray);

    // Use parent name (preserve original column name)
    flattened.Name = parent.Name || parent.name || '';
    flattened.name = flattened.Name; // Also set lowercase
    
    // Extract price from variations if parent price is empty
    let basePrice = parent['Regular price'] || parent['regular price'] || parent.Price || parent.price || '';
    
    if (!basePrice && variantsArray.length > 0) {
      // Get first non-empty variation price (as string, no parsing needed)
      const firstVariantPrice = variantsArray.find(v => v.price)?.price;
      if (firstVariantPrice) {
        basePrice = String(firstVariantPrice);
      }
    }
    
    // Populate ALL possible price field names that CSV might use
    if (basePrice) {
      flattened['Regular price'] = basePrice;
      flattened['regular price'] = basePrice;
      flattened.Price = basePrice;
      flattened.price = basePrice;
    }
    
    // Extract stock from variations if parent stock is empty
    let baseStock = parent.Stock || parent.stock || '';
    
    if (!baseStock && variantsArray.length > 0) {
      // Sum all variation stock values
      const totalStock = variantsArray.reduce((sum, v) => {
        const stockNum = typeof v.stock === 'number' ? v.stock : parseInt(String(v.stock || 0));
        return sum + (isNaN(stockNum) ? 0 : stockNum);
      }, 0);
      
      if (totalStock > 0) {
        baseStock = String(totalStock);
      }
    }
    
    // Populate ALL possible stock field names that CSV might use
    if (baseStock) {
      flattened.Stock = baseStock;
      flattened.stock = baseStock;
      flattened['In stock?'] = baseStock;
    }

    return flattened;
  }

  /**
   * Preprocess Shopify format
   * Groups rows by Handle into single products
   */
  private preprocessShopify(rows: Record<string, any>[], headers: string[]): PreprocessingResult {
    const warnings: string[] = [];
    const diagnostics = {
      duplicateHandles: 0,
    };

    // Group rows by Handle
    const productGroups = new Map<string, Record<string, any>[]>();

    rows.forEach(row => {
      const handle = row.Handle || row.handle;
      if (!handle) {
        warnings.push(`Row without Handle found`);
        return;
      }

      if (!productGroups.has(handle)) {
        productGroups.set(handle, []);
      }
      productGroups.get(handle)!.push(row);
    });

    // Flatten products
    const flattenedRows: Record<string, any>[] = [];

    productGroups.forEach((groupRows, handle) => {
      const flattened = this.flattenShopifyProduct(groupRows);
      flattenedRows.push(flattened);
    });

    // Extract headers from all flattened rows (union of all keys)
    const headerSet = new Set<string>();
    flattenedRows.forEach(row => {
      Object.keys(row).forEach(key => headerSet.add(key));
    });
    const flattenedHeaders = Array.from(headerSet);
    
    return {
      format: 'shopify',
      originalRowCount: rows.length,
      productCount: flattenedRows.length,
      flattenedRows,
      headers: flattenedHeaders.length > 0 ? flattenedHeaders : headers,
      warnings,
      diagnostics,
    };
  }

  /**
   * Flatten Shopify product (multiple rows with same Handle) to single row
   */
  private flattenShopifyProduct(rows: Record<string, any>[]): Record<string, any> {
    // First row has full product details
    const firstRow = rows[0];
    const flattened: Record<string, any> = { ...firstRow };

    // Collect all unique images
    const imageSet = new Set<string>();
    rows.forEach(row => {
      const imgSrc = row['Image Src'] || row['image src'];
      if (imgSrc && imgSrc.trim()) {
        imageSet.add(imgSrc.trim());
      }
    });
    flattened.images = Array.from(imageSet).join(', ');

    // Build variants array
    const variantsArray = rows.map(row => {
      const variant: any = {};

      // Shopify uses Option1/Option2/Option3 for variant attributes
      const option1Name = row['Option1 Name'] || row['option1 name'];
      const option1Value = row['Option1 Value'] || row['option1 value'];
      const option2Name = row['Option2 Name'] || row['option2 name'];
      const option2Value = row['Option2 Value'] || row['option2 value'];

      // Map options to standard fields
      if (option1Name && option1Value) {
        const normalized = option1Name.toLowerCase();
        if (normalized.includes('color') || normalized.includes('colour')) {
          variant.colorName = option1Value;
        } else if (normalized.includes('size')) {
          variant.size = option1Value;
        } else {
          variant[option1Name] = option1Value;
        }
      }

      if (option2Name && option2Value) {
        const normalized = option2Name.toLowerCase();
        if (normalized.includes('color') || normalized.includes('colour')) {
          variant.colorName = option2Value;
        } else if (normalized.includes('size')) {
          variant.size = option2Value;
        } else {
          variant[option2Name] = option2Value;
        }
      }

      // Stock
      const stock = row['Variant Inventory Qty'] || row['variant inventory qty'];
      variant.stock = stock ? parseInt(stock) : 0;

      // SKU
      variant.sku = row['Variant SKU'] || row['variant sku'] || '';

      // Price
      const price = row['Variant Price'] || row['variant price'];
      if (price) {
        variant.price = price;
      }

      // Image (variant-specific)
      const varImage = row['Variant Image'] || row['variant image'];
      if (varImage) {
        variant.image = varImage;
      }

      return variant;
    });

    // Serialize variants as JSON string
    flattened.variants = JSON.stringify(variantsArray);

    // Use first row's title as name
    flattened.name = firstRow.Title || firstRow.title || '';

    // Use first row's price as base price
    flattened.price = firstRow['Variant Price'] || firstRow['variant price'] || '';

    return flattened;
  }
}
