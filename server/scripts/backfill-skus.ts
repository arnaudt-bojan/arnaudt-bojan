/**
 * Backfill Script: Generate SKUs for existing products
 * 
 * This script generates SKUs for all products and variants that don't have them.
 * SKU format: UPF-{SELLER}-{COUNTER}
 * Example: UPF-TEST-001, UPF-TEST-001-A, UPF-TEST-001-B
 * 
 * The script is idempotent - it only updates products without SKUs.
 * 
 * Run with: npm run migrate:sku
 * Or: tsx server/scripts/backfill-skus.ts
 */

import { storage } from '../storage';
import { SKUService } from '../services/sku.service';

async function backfillSKUs() {
  console.log("🏷️  Starting SKU backfill...\n");

  const skuService = new SKUService(storage);

  try {
    // Get all products to show initial state
    const allProducts = await storage.getAllProducts();
    const productsWithoutSKU = allProducts.filter(p => !p.sku);
    
    console.log(`📦 Found ${allProducts.length} total products`);
    console.log(`🔍 ${productsWithoutSKU.length} products need SKU generation\n`);

    if (productsWithoutSKU.length === 0) {
      console.log("✨ All products already have SKUs!");
      return;
    }

    // Display products that will be updated
    console.log("Products to update:");
    productsWithoutSKU.forEach(p => {
      const variantCount = Array.isArray(p.variants) ? p.variants.length : 0;
      const variantInfo = variantCount > 0 ? ` (${variantCount} variants)` : '';
      console.log(`  - ${p.name} (${p.id})${variantInfo}`);
    });
    console.log();

    // Run the backfill using the SKU service method
    console.log("⚙️  Generating SKUs...\n");
    const result = await skuService.backfillMissingSKUs();

    // Display results
    console.log("\n📊 Backfill Summary:");
    console.log(`   ✅ Successfully updated: ${result.updated} products`);
    console.log(`   ❌ Errors: ${result.errors} products`);
    
    if (result.updated > 0) {
      console.log("\n🔍 Verifying results...");
      const updatedProducts = await storage.getAllProducts();
      const stillMissing = updatedProducts.filter(p => !p.sku);
      
      if (stillMissing.length === 0) {
        console.log("✨ All products now have SKUs!");
      } else {
        console.log(`⚠️  ${stillMissing.length} products still missing SKUs`);
        stillMissing.forEach(p => {
          console.log(`   - ${p.name} (${p.id})`);
        });
      }
    }

    if (result.errors > 0) {
      console.log("\n⚠️  Some products failed to update. Check logs above for details.");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  }
}

// Run the backfill
backfillSKUs()
  .then(() => {
    console.log("\n🎉 SKU backfill completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 SKU backfill failed:", error);
    process.exit(1);
  });
