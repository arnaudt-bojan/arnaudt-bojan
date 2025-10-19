/**
 * Shopify Product Import Adapter
 * 
 * Fetches products from Shopify REST Admin API and imports them into Upfirst.
 * Supports pagination, progress tracking, and abort handling.
 */

import { storage } from "../storage";
import { 
  mapShopifyProduct, 
  type ShopifyProduct 
} from "../import-mappers";
import type { ImportJob, ImportSource } from "@shared/schema";
import { prisma } from "../prisma";

interface ShopifyCredentials {
  shopName: string; // e.g., "mystore" (not mystore.myshopify.com)
  accessToken: string; // API access token
  apiVersion?: string; // e.g., "2025-10"
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

interface ShopifyPaginationLinks {
  next?: string;
  previous?: string;
}

/**
 * Shopify Product Import Adapter
 */
export class ShopifyAdapter {
  private source: ImportSource;
  private credentials: ShopifyCredentials;
  private apiVersion: string;

  constructor(source: ImportSource) {
    this.source = source;
    this.credentials = source.credentialsJson as ShopifyCredentials;
    this.apiVersion = this.credentials.apiVersion || "2025-10";
  }

  /**
   * Main import method called by the job processor
   */
  async importProducts(job: ImportJob, abortSignal: AbortSignal): Promise<void> {
    console.log(`[ShopifyAdapter] Starting import for job ${job.id}`);

    let cursor: string | undefined = job.lastCheckpoint || undefined;
    let processedCount = 0;
    let errorCount = 0;

    try {
      while (!abortSignal.aborted) {
        // Fetch batch of products
        const { products: shopifyProducts, nextCursor } = await this.fetchBatch(
          cursor,
          abortSignal
        );

        if (shopifyProducts.length === 0) {
          // No more products to process
          break;
        }

        // Process each product
        for (const shopifyProduct of shopifyProducts) {
          if (abortSignal.aborted) break;

          try {
            await this.processProduct(shopifyProduct, job);
            processedCount++;
          } catch (error: any) {
            errorCount++;
            console.error(
              `[ShopifyAdapter] Error processing product ${shopifyProduct.id}:`,
              error
            );

            // Log error to import_job_errors
            await prisma.import_job_errors.create({
              data: {
                job_id: job.id,
                external_id: String(shopifyProduct.id),
                stage: "transform",
                error_code: error.code || "UNKNOWN_ERROR",
                error_message: error.message || "Unknown error",
              }
            });
          }
        }

        // Update progress
        await this.updateProgress(job.id, processedCount, nextCursor);

        // Check if there are more products
        if (!nextCursor) {
          break; // No more pages
        }

        cursor = nextCursor;
      }

      console.log(
        `[ShopifyAdapter] Import completed. Processed: ${processedCount}, Errors: ${errorCount}`
      );
    } catch (error: any) {
      console.error(`[ShopifyAdapter] Fatal error during import:`, error);
      throw error;
    }
  }

  /**
   * Fetch a batch of products from Shopify
   */
  private async fetchBatch(
    cursor?: string,
    abortSignal?: AbortSignal
  ): Promise<{ products: ShopifyProduct[]; nextCursor?: string }> {
    const { shopName, accessToken } = this.credentials;
    
    // Build URL with pagination
    let url = `https://${shopName}.myshopify.com/admin/api/${this.apiVersion}/products.json?limit=250`;
    
    if (cursor) {
      url = cursor; // cursor is the full next URL from Link header
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Shopify API error (${response.status}): ${errorText}`
      );
    }

    const data: ShopifyProductsResponse = await response.json();

    // Parse Link header for pagination
    const linkHeader = response.headers.get("Link");
    const nextCursor = this.parseNextCursor(linkHeader);

    return {
      products: data.products || [],
      nextCursor,
    };
  }

  /**
   * Parse Shopify's Link header to extract next page URL
   */
  private parseNextCursor(linkHeader: string | null): string | undefined {
    if (!linkHeader) return undefined;

    // Shopify Link header format: <URL>; rel="next", <URL>; rel="previous"
    const links = linkHeader.split(",");
    
    for (const link of links) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) {
        return match[1]; // Return the next URL
      }
    }

    return undefined;
  }

  /**
   * Process a single Shopify product
   */
  private async processProduct(
    shopifyProduct: ShopifyProduct,
    job: ImportJob
  ): Promise<void> {
    // Transform to canonical format
    const canonical = mapShopifyProduct(shopifyProduct);

    // Check if product already exists (via mapping)
    const existingMapping = await prisma.product_source_mappings.findFirst({
      where: {
        source_id: this.source.id,
        external_product_id: canonical.externalId,
      }
    });

    if (existingMapping) {
      // Update existing product
      await prisma.products.update({
        where: { id: existingMapping.product_id },
        data: {
          ...canonical,
          seller_id: this.source.sellerId,
        }
      });

      // Update mapping
      await prisma.product_source_mappings.update({
        where: { id: existingMapping.id },
        data: {
          last_synced_at: new Date(),
          sync_state: "active",
        }
      });

      console.log(`[ShopifyAdapter] Updated product ${existingMapping.product_id} (external: ${canonical.externalId})`);
    } else {
      // Create new product
      const newProduct = await prisma.products.create({
        data: {
          ...canonical,
          seller_id: this.source.sellerId,
        }
      });

      // Create mapping
      await prisma.product_source_mappings.create({
        data: {
          product_id: newProduct.id,
          source_id: this.source.id,
          external_product_id: canonical.externalId,
          external_handle: canonical.externalHandle,
          last_synced_at: new Date(),
          sync_state: "active",
        }
      });

      console.log(`[ShopifyAdapter] Created product ${newProduct.id} (external: ${canonical.externalId})`);
    }
  }

  /**
   * Update job progress
   */
  private async updateProgress(
    jobId: string,
    processedItems: number,
    checkpoint?: string
  ): Promise<void> {
    await prisma.import_jobs.update({
      where: { id: jobId },
      data: {
        processed_items: processedItems,
        last_checkpoint: checkpoint || null,
      }
    });
  }
}

/**
 * Job processor function for Shopify imports
 * Registered with the import queue
 */
export async function processShopifyImport(
  job: ImportJob,
  abortSignal: AbortSignal
): Promise<void> {
  // Fetch the import source
  const source = await prisma.import_sources.findUnique({
    where: { id: job.sourceId }
  });

  if (!source) {
    throw new Error(`Import source ${job.sourceId} not found`);
  }

  if (source.platform !== "shopify") {
    throw new Error(`Invalid platform for Shopify adapter: ${source.platform}`);
  }

  // Create adapter and run import
  const adapter = new ShopifyAdapter(source as any);
  await adapter.importProducts(job, abortSignal);
}
