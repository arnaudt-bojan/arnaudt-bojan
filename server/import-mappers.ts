/**
 * Canonical Product Mappers
 * 
 * Transforms external platform product data into Upfirst's product schema.
 * Supports: Shopify, BigCommerce, Etsy, WooCommerce
 */

import type { InsertProduct, FrontendProduct } from "@shared/schema";

// ============================================================================
// EXTERNAL PLATFORM TYPES
// ============================================================================

// Shopify Product Types
export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor?: string;
  product_type?: string;
  handle: string;
  price?: string;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku?: string;
    inventory_quantity: number;
    option1?: string;
    option2?: string;
    option3?: string;
    image_id?: number;
    weight?: number;
    weight_unit?: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    position: number;
    alt?: string;
  }>;
  image?: {
    src: string;
  };
  tags?: string;
  status?: string;
}

// BigCommerce Product Types
export interface BigCommerceProduct {
  id: number;
  name: string;
  description: string;
  sku?: string;
  price: number;
  cost_price?: number;
  retail_price?: number;
  sale_price?: number;
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
  inventory_level: number;
  inventory_tracking?: string;
  availability?: string;
  is_visible: boolean;
  categories?: number[];
  brand_id?: number;
  type?: string;
  condition?: string;
  images?: Array<{
    id: number;
    url_standard: string;
    url_thumbnail?: string;
    description?: string;
  }>;
}

// Etsy Product Types
export interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  quantity: number;
  sku?: string;
  url: string;
  state: string;
  taxonomy_id?: number;
  processing_min?: number;
  processing_max?: number;
  listing_image_ids?: number[];
  images?: Array<{
    listing_image_id: number;
    url_570xN: string;
    url_fullxfull: string;
  }>;
}

export interface EtsyInventory {
  products: Array<{
    product_id: number;
    sku?: string;
    offerings: Array<{
      price: {
        amount: number;
        divisor: number;
        currency_code: string;
      };
      quantity: number;
      is_enabled: boolean;
    }>;
    property_values?: Array<{
      property_name: string;
      values: string[];
    }>;
  }>;
}

// WooCommerce Product Types
export interface WooCommerceProduct {
  id: number;
  name: string;
  description: string;
  short_description?: string;
  type: string;
  status: string;
  sku?: string;
  price: string;
  regular_price: string;
  sale_price?: string;
  stock_quantity?: number;
  stock_status: string;
  manage_stock: boolean;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  categories?: Array<{ id: number; name: string }>;
  tags?: Array<{ id: number; name: string }>;
  images: Array<{
    id: number;
    src: string;
    name?: string;
    alt?: string;
  }>;
  variations?: number[];
  attributes?: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
}

// WooCommerce Product Variation (fetched separately for variable products)
export interface WooCommerceVariation {
  id: number;
  sku?: string;
  price: string;
  regular_price: string;
  sale_price?: string;
  stock_quantity?: number;
  stock_status: string;
  attributes: Array<{
    name: string;
    option: string;
  }>;
  image?: {
    src: string;
  };
}

// ============================================================================
// CANONICAL PRODUCT INTERFACE
// ============================================================================

/**
 * Canonical product representation (matches Upfirst schema without sellerId)
 */
export interface CanonicalProduct extends Omit<FrontendProduct, 'sellerId'> {
  externalId: string; // Original platform ID
  externalHandle?: string; // Original platform handle/slug
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Strip HTML tags from string
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Replace &amp; with &
    .replace(/&lt;/g, '<')   // Replace &lt; with <
    .replace(/&gt;/g, '>')   // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .trim();
}

/**
 * Extract first N images from image array
 */
function extractImages(images: { src: string }[], maxImages = 8): string[] {
  return images
    .slice(0, maxImages)
    .map(img => img.src)
    .filter(Boolean);
}

/**
 * Determine product type based on availability and processing time
 * 
 * Note: productType describes the fulfillment model, not current availability:
 * - "in-stock" = Ships from existing inventory (even if currently 0 stock)
 * - "pre-order" = Available for pre-order (not yet in stock)
 * - "made-to-order" = Made after order is placed
 * - "wholesale" = Wholesale products
 * 
 * The actual stock quantity is tracked separately in the stock field.
 */
function determineProductType(params: {
  availability?: string;
  processingDays?: number;
  stockStatus?: string;
  stock?: number;
}): "in-stock" | "pre-order" | "made-to-order" | "wholesale" {
  const { availability, processingDays } = params;

  // Explicit pre-order detection (platform-specific availability status)
  if (availability === "preorder" || availability === "pre-order") {
    return "pre-order";
  }

  // Made-to-order detection (processing time > 3 days typically indicates made-to-order)
  if (processingDays && processingDays > 3) {
    return "made-to-order";
  }

  // Default to in-stock (regular fulfillment from inventory)
  // Stock level (including 0) is tracked separately in the stock field
  return "in-stock";
}

// ============================================================================
// SHOPIFY MAPPER
// ============================================================================

export function mapShopifyProduct(product: ShopifyProduct): CanonicalProduct {
  const firstVariant = product.variants[0];
  const images = extractImages(product.images);
  const primaryImage = images[0] || product.image?.src || "";

  // Determine stock from first variant
  const stock = firstVariant?.inventory_quantity || 0;

  // Map Shopify product type to Upfirst product type
  const productType = determineProductType({
    availability: product.status,
    stockStatus: stock > 0 ? "instock" : "outofstock",
  });

  return {
    externalId: String(product.id),
    externalHandle: product.handle,
    name: product.title,
    description: stripHtml(product.body_html || ""),
    price: firstVariant?.price || "0",
    image: primaryImage,
    images: images,
    category: product.product_type || "Uncategorized",
    productType: productType,
    stock: stock,
    depositAmount: undefined,
    requiresDeposit: 0,
    variants: product.variants.length > 1 ? product.variants.map(v => ({
      id: String(v.id),
      title: v.title,
      price: v.price,
      sku: v.sku,
      stock: v.inventory_quantity,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
    })) : undefined,
    madeToOrderDays: undefined,
    preOrderDate: undefined,
    discountPercentage: undefined,
    promotionActive: 0,
    promotionEndDate: undefined,
    shippingType: "flat",
    flatShippingRate: "0",
    shippoWeight: firstVariant?.weight ? String(firstVariant.weight) : undefined,
  };
}

// ============================================================================
// BIGCOMMERCE MAPPER
// ============================================================================

export function mapBigCommerceProduct(product: BigCommerceProduct): CanonicalProduct {
  const images = product.images 
    ? product.images.map(img => img.url_standard).filter(Boolean).slice(0, 8)
    : [];
  const primaryImage = images[0] || "";

  // Calculate discount percentage if on sale
  let discountPercentage: string | undefined;
  if (product.sale_price && product.price) {
    const discount = ((product.price - product.sale_price) / product.price) * 100;
    discountPercentage = discount.toFixed(2);
  }

  const productType = determineProductType({
    availability: product.availability,
    stockStatus: product.inventory_level > 0 ? "instock" : "outofstock",
    stock: product.inventory_level,
  });

  return {
    externalId: String(product.id),
    externalHandle: undefined,
    name: product.name,
    description: stripHtml(product.description || ""),
    price: String(product.sale_price || product.price || 0),
    image: primaryImage,
    images: images,
    category: "Uncategorized", // Will be mapped via categories array
    productType: productType,
    stock: product.inventory_level || 0,
    depositAmount: undefined,
    requiresDeposit: 0,
    variants: undefined,
    madeToOrderDays: undefined,
    preOrderDate: undefined,
    discountPercentage: discountPercentage,
    promotionActive: product.sale_price ? 1 : 0,
    promotionEndDate: undefined,
    shippingType: "flat",
    flatShippingRate: "0",
    shippoWeight: product.weight ? String(product.weight) : undefined,
    shippoLength: product.width ? String(product.width) : undefined,
    shippoWidth: product.depth ? String(product.depth) : undefined,
    shippoHeight: product.height ? String(product.height) : undefined,
  };
}

// ============================================================================
// ETSY MAPPER
// ============================================================================

export function mapEtsyListing(listing: EtsyListing, inventory?: EtsyInventory): CanonicalProduct {
  const images = listing.images
    ? listing.images.map(img => img.url_fullxfull || img.url_570xN).filter(Boolean).slice(0, 8)
    : [];
  const primaryImage = images[0] || "";

  // Calculate price from Etsy's amount/divisor format
  const price = String(listing.price.amount / listing.price.divisor);

  // Determine if made-to-order based on processing time
  const processingDays = listing.processing_max || listing.processing_min || 0;
  const productType = determineProductType({
    processingDays: processingDays,
    stockStatus: listing.quantity > 0 ? "instock" : "outofstock",
    stock: listing.quantity,
  });

  // Map variants from inventory data
  let variants: any[] | undefined;
  if (inventory && inventory.products.length > 1) {
    variants = inventory.products.map((product, index) => {
      const offering = product.offerings[0];
      const variantPrice = String(offering.price.amount / offering.price.divisor);
      
      // Build variant title from property values
      const properties = product.property_values || [];
      const title = properties.map(p => p.values.join(", ")).join(" / ") || `Variant ${index + 1}`;

      return {
        id: String(product.product_id),
        title: title,
        price: variantPrice,
        sku: product.sku,
        stock: offering.quantity,
      };
    });
  }

  return {
    externalId: String(listing.listing_id),
    externalHandle: undefined,
    name: listing.title,
    description: stripHtml(listing.description || ""),
    price: price,
    image: primaryImage,
    images: images,
    category: "Uncategorized", // Will be mapped via taxonomy_id
    productType: productType,
    stock: listing.quantity,
    depositAmount: undefined,
    requiresDeposit: 0,
    variants: variants,
    madeToOrderDays: productType === "made-to-order" ? processingDays : undefined,
    preOrderDate: undefined,
    discountPercentage: undefined,
    promotionActive: 0,
    promotionEndDate: undefined,
    shippingType: "flat",
    flatShippingRate: "0",
  };
}

// ============================================================================
// WOOCOMMERCE MAPPER
// ============================================================================

export function mapWooCommerceProduct(
  product: WooCommerceProduct,
  variations?: WooCommerceVariation[]
): CanonicalProduct {
  const images = extractImages(product.images);
  const primaryImage = images[0] || "";

  // Calculate discount percentage if on sale
  let discountPercentage: string | undefined;
  if (product.sale_price && product.regular_price) {
    const regular = parseFloat(product.regular_price);
    const sale = parseFloat(product.sale_price);
    const discount = ((regular - sale) / regular) * 100;
    discountPercentage = discount.toFixed(2);
  }

  const productType = determineProductType({
    stockStatus: product.stock_status,
    stock: product.stock_quantity || 0,
  });

  // Map WooCommerce categories to primary category
  const primaryCategory = product.categories && product.categories.length > 0
    ? product.categories[0].name
    : "Uncategorized";

  return {
    externalId: String(product.id),
    externalHandle: undefined,
    name: product.name,
    description: stripHtml(product.description || ""),
    price: product.price,
    image: primaryImage,
    images: images,
    category: primaryCategory,
    productType: productType,
    stock: product.stock_quantity || 0,
    depositAmount: undefined,
    requiresDeposit: 0,
    variants: variations && variations.length > 0 ? variations.map(v => {
      // Build variant title from attributes
      const title = v.attributes.map(a => a.option).join(" / ") || "Default";
      return {
        id: String(v.id),
        title: title,
        price: v.price,
        sku: v.sku,
        stock: v.stock_quantity || 0,
        image: v.image?.src,
      };
    }) : undefined,
    madeToOrderDays: undefined,
    preOrderDate: undefined,
    discountPercentage: discountPercentage,
    promotionActive: product.sale_price ? 1 : 0,
    promotionEndDate: undefined,
    shippingType: "flat",
    flatShippingRate: "0",
    shippoWeight: product.weight,
    shippoLength: product.dimensions?.length,
    shippoWidth: product.dimensions?.width,
    shippoHeight: product.dimensions?.height,
  };
}

// ============================================================================
// UNIFIED MAPPER (Platform Detection)
// ============================================================================

export type ExternalProduct = 
  | { platform: "shopify"; data: ShopifyProduct }
  | { platform: "bigcommerce"; data: BigCommerceProduct }
  | { platform: "etsy"; data: EtsyListing; inventory?: EtsyInventory }
  | { platform: "woocommerce"; data: WooCommerceProduct; variations?: WooCommerceVariation[] };

/**
 * Universal product mapper - detects platform and applies appropriate transformation
 */
export function mapExternalProduct(external: ExternalProduct): CanonicalProduct {
  switch (external.platform) {
    case "shopify":
      return mapShopifyProduct(external.data);
    case "bigcommerce":
      return mapBigCommerceProduct(external.data);
    case "etsy":
      return mapEtsyListing(external.data, external.inventory);
    case "woocommerce":
      return mapWooCommerceProduct(external.data, external.variations);
    default:
      throw new Error(`Unsupported platform: ${(external as any).platform}`);
  }
}
