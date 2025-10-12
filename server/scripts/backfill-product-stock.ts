/**
 * Backfill Script: Fix product.stock drift from variants
 * 
 * This script recalculates product.stock from variant totals for all products
 * with variants to ensure the canonical source of truth is accurate.
 * 
 * Run with: tsx server/scripts/backfill-product-stock.ts
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { products } from "../../shared/schema";
import { calculateTotalStockFromVariants } from "../utils/calculate-stock";
import { eq } from "drizzle-orm";

neonConfig.webSocketConstructor = ws;

async function backfillProductStock() {
  console.log("🔧 Starting product.stock backfill...\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Get all products
    const allProducts = await db.select().from(products);
    console.log(`📦 Found ${allProducts.length} total products\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of allProducts) {
      try {
        // Skip products without variants
        if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
          skipped++;
          continue;
        }

        // Calculate correct stock from variants
        const calculatedStock = calculateTotalStockFromVariants(product.variants);
        const currentStock = product.stock || 0;

        // Only update if there's drift
        if (calculatedStock !== currentStock) {
          await db
            .update(products)
            .set({ stock: calculatedStock })
            .where(eq(products.id, product.id));

          console.log(`✅ Updated "${product.name}" (${product.id})`);
          console.log(`   Previous stock: ${currentStock}, Calculated: ${calculatedStock}\n`);
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error processing product ${product.id}:`, error);
        errors++;
      }
    }

    console.log("\n📊 Backfill Summary:");
    console.log(`   ✅ Updated: ${updated} products`);
    console.log(`   ⏭️  Skipped: ${skipped} products (no variants or already correct)`);
    console.log(`   ❌ Errors: ${errors} products\n`);

  } catch (error) {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the backfill
backfillProductStock()
  .then(() => {
    console.log("🎉 Backfill completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Backfill failed:", error);
    process.exit(1);
  });
