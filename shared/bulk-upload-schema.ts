/**
 * Database Schema Field Definitions for AI-Powered Bulk Upload
 * 
 * Maps CSV headers directly to actual database fields for accurate importing
 * All products imported will be in-stock items
 */

export interface SchemaField {
  name: string;
  dbColumn: string;
  type: "string" | "number" | "array" | "json" | "boolean";
  required: boolean;
  description: string;
  example: string;
  acceptedValues?: string[];
  validation?: string;
}

/**
 * Product Table Fields - Direct mapping to database schema
 */
export const PRODUCT_SCHEMA_FIELDS: SchemaField[] = [
  // Core Product Fields
  {
    name: "Product Name",
    dbColumn: "name",
    type: "string",
    required: true,
    description: "Product name/title",
    example: "Classic Cotton T-Shirt",
  },
  {
    name: "Description",
    dbColumn: "description",
    type: "string",
    required: true,
    description: "Detailed product description",
    example: "Comfortable 100% cotton t-shirt with classic fit",
  },
  {
    name: "Price",
    dbColumn: "price",
    type: "number",
    required: true,
    description: "Product price in USD (decimal)",
    example: "29.99",
    validation: "Must be a positive number with up to 2 decimal places",
  },
  {
    name: "SKU",
    dbColumn: "sku",
    type: "string",
    required: false,
    description: "Stock Keeping Unit - auto-generated if not provided",
    example: "TSHIRT-001",
  },
  {
    name: "Category",
    dbColumn: "category",
    type: "string",
    required: true,
    description: "Product category",
    example: "Clothing",
  },
  {
    name: "Stock",
    dbColumn: "stock",
    type: "number",
    required: false,
    description: "Available stock quantity",
    example: "100",
    validation: "Must be a non-negative integer",
  },
  
  // Image Fields
  {
    name: "Image",
    dbColumn: "image",
    type: "string",
    required: false,
    description: "Primary product image URL (can be auto-extracted from Images field if provided)",
    example: "https://example.com/images/product.jpg",
  },
  {
    name: "Images",
    dbColumn: "images",
    type: "array",
    required: false,
    description: "Product images - can be single or multiple URLs (comma-separated). If Images is provided, first image will be used as primary Image.",
    example: "https://example.com/img1.jpg, https://example.com/img2.jpg",
  },
  
  // Variants - Size/Color variations with individual SKUs
  {
    name: "Variants",
    dbColumn: "variants",
    type: "json",
    required: false,
    description: "Product variants with size, color, stock, image, and SKU. Format: Size:Stock:SKU|Size:Stock:SKU OR Color@@HexCode@@Image@@Size:Stock:SKU;;Color@@HexCode@@Image@@Size:Stock:SKU",
    example: "S:10:SKU-S|M:20:SKU-M|L:15:SKU-L",
    validation: "Size-only: Size:Stock:SKU separated by | OR Color variants: Color@@#HEX@@Image@@Size:Stock:SKU separated by ;;",
  },
  
  // Shipping Fields
  {
    name: "Shipping Type",
    dbColumn: "shippingType",
    type: "string",
    required: false,
    description: "Shipping calculation method",
    example: "flat",
    acceptedValues: ["flat", "free", "matrix", "shippo"],
  },
  {
    name: "Flat Shipping Rate",
    dbColumn: "flatShippingRate",
    type: "number",
    required: false,
    description: "Flat shipping rate if shipping type is 'flat'",
    example: "5.99",
  },
  {
    name: "Shippo Weight",
    dbColumn: "shippoWeight",
    type: "number",
    required: false,
    description: "Package weight in lbs for Shippo rate calculation",
    example: "1.5",
  },
  
  // Promotion Fields
  {
    name: "Discount Percentage",
    dbColumn: "discountPercentage",
    type: "number",
    required: false,
    description: "Discount percentage (0-100)",
    example: "15",
    validation: "Must be between 0 and 100",
  },
  {
    name: "Promotion Active",
    dbColumn: "promotionActive",
    type: "boolean",
    required: false,
    description: "Whether promotion is currently active",
    example: "true",
    acceptedValues: ["true", "false", "1", "0"],
  },
];

/**
 * Variant-specific fields that can be mapped from CSV
 * These are extracted from the variants column JSON structure
 */
export const VARIANT_SCHEMA_FIELDS: SchemaField[] = [
  {
    name: "Variant SKU",
    dbColumn: "variants[].sku",
    type: "string",
    required: false,
    description: "SKU for specific variant - included in variants format",
    example: "TSHIRT-RED-M",
  },
  {
    name: "Variant Size",
    dbColumn: "variants[].size",
    type: "string",
    required: false,
    description: "Size option for variant",
    example: "M",
  },
  {
    name: "Variant Color",
    dbColumn: "variants[].color",
    type: "string",
    required: false,
    description: "Color option for variant",
    example: "Red",
  },
  {
    name: "Variant Stock",
    dbColumn: "variants[].stock",
    type: "number",
    required: false,
    description: "Stock quantity for specific variant",
    example: "50",
  },
  {
    name: "Variant Image",
    dbColumn: "variants[].image",
    type: "string",
    required: false,
    description: "Image URL for specific variant",
    example: "https://example.com/red-tshirt.jpg",
  },
];

/**
 * All schema fields combined for AI analysis
 */
export const ALL_SCHEMA_FIELDS = [
  ...PRODUCT_SCHEMA_FIELDS,
  ...VARIANT_SCHEMA_FIELDS,
];

/**
 * Required fields that must be mapped
 */
export const REQUIRED_FIELDS = ALL_SCHEMA_FIELDS
  .filter(f => f.required)
  .map(f => f.name);

/**
 * Get field by database column name
 */
export function getFieldByDbColumn(dbColumn: string): SchemaField | undefined {
  return ALL_SCHEMA_FIELDS.find(f => f.dbColumn === dbColumn);
}

/**
 * Get field by name
 */
export function getFieldByName(name: string): SchemaField | undefined {
  return ALL_SCHEMA_FIELDS.find(f => f.name === name);
}
