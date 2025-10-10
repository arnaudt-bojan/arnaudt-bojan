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
import { eq, and } from "drizzle-orm";
import { 
  products, 
  productSourceMappings, 
  importJobs, 
  importSources,
  importJobErrors 
} from "@shared/schema";

const db = storage.db;

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
            await db.insert(importJobErrors).values({
              jobId: job.id,
              externalId: String(shopifyProduct.id),
              stage: "transform",
              errorCode: error.code || "UNKNOWN_ERROR",
              errorMessage: error.message || "Unknown error",
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
    const existingMapping = await db
      .select()
      .from(productSourceMappings)
      .where(
        and(
          eq(productSourceMappings.sourceId, this.source.id),
          eq(productSourceMappings.externalProductId, canonical.externalId)
        )
      )
      .limit(1);

    if (existingMapping.length > 0) {
      // Update existing product
      const mapping = existingMapping[0];
      
      await db
        .update(products)
        .set({
          ...canonical,
          sellerId: this.source.sellerId,
        })
        .where(eq(products.id, mapping.productId));

      // Update mapping
      await db
        .update(productSourceMappings)
        .set({
          lastSyncedAt: new Date(),
          syncState: "active",
        })
        .where(eq(productSourceMappings.id, mapping.id));

      console.log(`[ShopifyAdapter] Updated product ${mapping.productId} (external: ${canonical.externalId})`);
    } else {
      // Create new product
      const [newProduct] = await db
        .insert(products)
        .values({
          ...canonical,
          sellerId: this.source.sellerId,
        })
        .returning();

      // Create mapping
      await db.insert(productSourceMappings).values({
        productId: newProduct.id,
        sourceId: this.source.id,
        externalProductId: canonical.externalId,
        externalHandle: canonical.externalHandle,
        lastSyncedAt: new Date(),
        syncState: "active",
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
    await db
      .update(importJobs)
      .set({
        processedItems,
        lastCheckpoint: checkpoint || null,
      })
      .where(eq(importJobs.id, jobId));
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
  const [source] = await db
    .select()
    .from(importSources)
    .where(eq(importSources.id, job.sourceId))
    .limit(1);

  if (!source) {
    throw new Error(`Import source ${job.sourceId} not found`);
  }

  if (source.platform !== "shopify") {
    throw new Error(`Invalid platform for Shopify adapter: ${source.platform}`);
  }

  // Create adapter and run import
  const adapter = new ShopifyAdapter(source);
  await adapter.importProducts(job, abortSignal);
}
