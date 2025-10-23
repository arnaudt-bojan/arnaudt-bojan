/**
 * Bulk Product Upload CSV Template Generator
 * 
 * This module generates a CSV template for bulk product uploads with:
 * - All supported product fields
 * - Example data for different product types
 * - Clear field descriptions and instructions
 * 
 * Architecture 3 Compliant - All pricing calculations happen on backend
 */

export interface CSVTemplateField {
  name: string;
  required: boolean;
  description: string;
  example: string;
  acceptedValues?: string;
}

// Define all supported CSV fields
export const CSV_TEMPLATE_FIELDS: CSVTemplateField[] = [
  // Basic Product Information
  { 
    name: "Product Name", 
    required: true, 
    description: "The name of your product", 
    example: "Classic Cotton T-Shirt"
  },
  { 
    name: "Description", 
    required: true, 
    description: "Detailed product description", 
    example: "Premium 100% cotton t-shirt with comfortable fit"
  },
  { 
    name: "Price", 
    required: true, 
    description: "Base price (numbers only, no currency symbol)", 
    example: "29.99"
  },
  { 
    name: "SKU", 
    required: false, 
    description: "Stock Keeping Unit (auto-generated if empty)", 
    example: "TSHIRT-001"
  },
  
  // Product Type
  { 
    name: "Product Type", 
    required: false, 
    description: "Type of product (defaults to 'in-stock' for bulk uploads)", 
    example: "in-stock",
    acceptedValues: "in-stock, pre-order, made-to-order, wholesale"
  },
  
  // Product Type Specific Fields
  { 
    name: "Pre-Order Date", 
    required: false, 
    description: "Availability date for pre-order products (YYYY-MM-DD)", 
    example: "2025-12-25"
  },
  { 
    name: "Made To Order Days", 
    required: false, 
    description: "Lead time in days for made-to-order products", 
    example: "14"
  },
  
  // Deposit Configuration
  { 
    name: "Deposit Amount", 
    required: false, 
    description: "Deposit amount for pre-order/made-to-order (optional)", 
    example: "10.00"
  },
  
  // Images (consolidated into one column)
  { 
    name: "Images", 
    required: true, 
    description: "Product image URLs separated by commas (up to 8 images)", 
    example: "https://example.com/img1.jpg,https://example.com/img2.jpg"
  },
  
  // Category
  { 
    name: "Category", 
    required: true, 
    description: "Product category", 
    example: "Clothing"
  },
  
  // Variants - Size Only Mode
  { 
    name: "Has Colors", 
    required: false, 
    description: "Does product have color variants? (yes/no)", 
    example: "no",
    acceptedValues: "yes, no, true, false, 1, 0"
  },
  { 
    name: "Size Variants", 
    required: false, 
    description: "Size-only variants format: SIZE:STOCK:SKU|SIZE:STOCK:SKU", 
    example: "S:10:TSHIRT-S|M:20:TSHIRT-M|L:15:TSHIRT-L"
  },
  
  // Variants - Color Mode
  { 
    name: "Color Variants", 
    required: false, 
    description: "Color variants format: COLOR@@HEX@@IMAGE1,IMAGE2@@SIZE:STOCK:SKU|SIZE:STOCK:SKU;;NEXTCOLOR@@...", 
    example: "Red@@#FF0000@@https://img.jpg@@S:10:TSHIRT-RED-S|M:20:TSHIRT-RED-M;;Blue@@#0000FF@@https://img2.jpg@@M:15:TSHIRT-BLUE-M"
  },
  
  // Stock (for products without variants)
  { 
    name: "Stock", 
    required: false, 
    description: "Stock quantity (only for products WITHOUT variants)", 
    example: "100"
  },
  
  // Promotions
  { 
    name: "Discount Percentage", 
    required: false, 
    description: "Discount percentage (0-100)", 
    example: "15"
  },
  { 
    name: "Promotion End Date", 
    required: false, 
    description: "When promotion ends (YYYY-MM-DD) - leave empty for no expiration", 
    example: "2025-12-31"
  },
  
  // Shipping Configuration
  { 
    name: "Shipping Type", 
    required: false, 
    description: "Shipping method", 
    example: "flat",
    acceptedValues: "flat, matrix, shippo, free"
  },
  { 
    name: "Flat Shipping Rate", 
    required: false, 
    description: "Flat shipping cost (required if Shipping Type = flat)", 
    example: "5.99"
  },
  { 
    name: "Shippo Weight (lbs)", 
    required: false, 
    description: "Weight in pounds for Shippo real-time rates", 
    example: "0.5"
  },
  { 
    name: "Shippo Length (in)", 
    required: false, 
    description: "Length in inches for Shippo", 
    example: "12"
  },
  { 
    name: "Shippo Width (in)", 
    required: false, 
    description: "Width in inches for Shippo", 
    example: "8"
  },
  { 
    name: "Shippo Height (in)", 
    required: false, 
    description: "Height in inches for Shippo", 
    example: "2"
  },
  
  // Product Status
  { 
    name: "Status", 
    required: false, 
    description: "Product visibility status", 
    example: "active",
    acceptedValues: "active, draft, coming-soon, paused, out-of-stock, archived"
  },
];

// Example rows for different product configurations
export const EXAMPLE_ROWS = [
  {
    "Product Name": "Basic White T-Shirt",
    "Description": "Classic white cotton t-shirt",
    "Price": "19.99",
    "SKU": "WHT-TSHIRT",
    "Product Type": "in-stock",
    "Pre-Order Date": "",
    "Made To Order Days": "",
    "Deposit Amount": "",
    "Images": "https://example.com/white-tshirt.jpg",
    "Category": "Clothing",
    "Has Colors": "no",
    "Size Variants": "S:10:WHT-TSHIRT-S|M:25:WHT-TSHIRT-M|L:15:WHT-TSHIRT-L|XL:8:WHT-TSHIRT-XL",
    "Color Variants": "",
    "Stock": "",
    "Discount Percentage": "10",
    "Promotion End Date": "2025-12-31",
    "Shipping Type": "flat",
    "Flat Shipping Rate": "4.99",
    "Shippo Weight (lbs)": "",
    "Shippo Length (in)": "",
    "Shippo Width (in)": "",
    "Shippo Height (in)": "",
    "Status": "active"
  },
  {
    "Product Name": "Designer Hoodie",
    "Description": "Premium hoodie with multiple color options",
    "Price": "59.99",
    "SKU": "HOODIE",
    "Product Type": "in-stock",
    "Pre-Order Date": "",
    "Made To Order Days": "",
    "Deposit Amount": "",
    "Images": "https://example.com/hoodie.jpg,https://example.com/hoodie2.jpg",
    "Category": "Clothing",
    "Has Colors": "yes",
    "Size Variants": "",
    "Color Variants": "Black@@#000000@@https://example.com/black-hoodie.jpg@@M:10:HOODIE-BLK-M|L:15:HOODIE-BLK-L|XL:8:HOODIE-BLK-XL;;Gray@@#808080@@https://example.com/gray-hoodie.jpg@@M:12:HOODIE-GRY-M|L:10:HOODIE-GRY-L",
    "Stock": "",
    "Discount Percentage": "",
    "Promotion End Date": "",
    "Shipping Type": "flat",
    "Flat Shipping Rate": "6.99",
    "Shippo Weight (lbs)": "",
    "Shippo Length (in)": "",
    "Shippo Width (in)": "",
    "Shippo Height (in)": "",
    "Status": "active"
  },
  {
    "Product Name": "Custom Artwork Print",
    "Description": "Made-to-order custom art print",
    "Price": "149.99",
    "SKU": "ART-PRINT",
    "Product Type": "made-to-order",
    "Pre-Order Date": "",
    "Made To Order Days": "7",
    "Deposit Amount": "50.00",
    "Images": "https://example.com/artwork.jpg",
    "Category": "Art",
    "Has Colors": "no",
    "Size Variants": "",
    "Color Variants": "",
    "Stock": "999",
    "Discount Percentage": "",
    "Promotion End Date": "",
    "Shipping Type": "shippo",
    "Flat Shipping Rate": "",
    "Shippo Weight (lbs)": "2.5",
    "Shippo Length (in)": "24",
    "Shippo Width (in)": "18",
    "Shippo Height (in)": "1",
    "Status": "active"
  }
];

/**
 * Generate CSV content from template fields and example rows
 */
export function generateCSVTemplate(): string {
  const headers = CSV_TEMPLATE_FIELDS.map(field => field.name);
  const headerRow = headers.join(',');
  
  const exampleRows = EXAMPLE_ROWS.map(row => {
    return headers.map(header => {
      const value = row[header as keyof typeof row] || '';
      // Escape values containing commas or quotes
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [headerRow, ...exampleRows].join('\n');
}

/**
 * Generate a detailed instruction sheet
 */
export function generateInstructionsText(): string {
  return `
BULK PRODUCT UPLOAD INSTRUCTIONS
=================================

This CSV template allows you to upload multiple products at once to Upfirst.

REQUIRED FIELDS:
${CSV_TEMPLATE_FIELDS.filter(f => f.required).map(f => `- ${f.name}: ${f.description}`).join('\n')}

OPTIONAL FIELDS:
${CSV_TEMPLATE_FIELDS.filter(f => !f.required).map(f => `- ${f.name}: ${f.description}${f.acceptedValues ? ` (${f.acceptedValues})` : ''}`).join('\n')}

PRODUCT VARIANTS:
----------------
There are two ways to add variants:

1. SIZE-ONLY VARIANTS (Has Colors = no):
   Use "Size Variants" field with format: SIZE:STOCK:SKU|SIZE:STOCK:SKU
   Example: S:10:PROD-S|M:20:PROD-M|L:15:PROD-L

2. COLOR VARIANTS (Has Colors = yes):
   Use "Color Variants" field with format: COLOR@@HEX@@IMAGES@@SIZE:STOCK:SKU|SIZE:STOCK:SKU;;NEXTCOLOR@@...
   Example: Red@@#FF0000@@img1.jpg,img2.jpg@@S:10:PROD-RED-S|M:20:PROD-RED-M;;Blue@@#0000FF@@img3.jpg@@M:15:PROD-BLUE-M
   
   - Separate colors with double semicolon (;;)
   - Separate size variants within a color with pipe (|)
   - Separate multiple images for a color with comma (,)
   - Use double at-sign (@@) to separate color metadata (works with https:// URLs)

PRODUCT TYPES:
-------------
- in-stock: Regular products available immediately
- pre-order: Products available on a future date (requires "Pre-Order Date")
- made-to-order: Products created after order (requires "Made To Order Days")
- wholesale: B2B wholesale products

SHIPPING TYPES:
--------------
- flat: Fixed shipping rate (requires "Flat Shipping Rate")
- matrix: Zone-based shipping (set up matrix first in dashboard)
- shippo: Real-time carrier rates (requires weight and dimensions)
- free: Free shipping

TIPS:
-----
1. SKUs are auto-generated if left empty
2. Leave "Stock" empty for products with variants (stock is set per variant)
3. Discounts without "Promotion End Date" never expire
4. All prices should be numbers without currency symbols (e.g., 19.99 not $19.99)
5. Dates should be in YYYY-MM-DD format
6. Image URLs must be publicly accessible
7. You can use the field mapping tool to match your CSV columns to these fields

EXAMPLE ROWS:
------------
See the example rows in the template for reference configurations.
`.trim();
}

/**
 * Field mapping helper - maps user CSV headers to expected fields
 */
export function getFieldMappingOptions() {
  return CSV_TEMPLATE_FIELDS.map(field => ({
    value: field.name,
    label: field.name,
    required: field.required,
    description: field.description,
  }));
}
