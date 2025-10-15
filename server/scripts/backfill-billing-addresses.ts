/**
 * Backfill Script: Populate billing addresses for existing orders
 * 
 * This script backfills billing address data for all orders that don't have it.
 * Historically, billing and shipping addresses were the same, so we copy shipping data.
 * 
 * Mapping:
 * - billingName = customerName
 * - billingEmail = customerEmail
 * - billingPhone = "" (no phone field on old orders)
 * - billingStreet = shippingStreet
 * - billingCity = shippingCity
 * - billingState = shippingState
 * - billingPostalCode = shippingPostalCode
 * - billingCountry = shippingCountry
 * 
 * The script is idempotent - it only updates orders without billing addresses.
 * 
 * Run with: tsx server/scripts/backfill-billing-addresses.ts
 */

import { storage } from '../storage';
import { logger } from '../logger';

async function backfillBillingAddresses() {
  console.log("📧 Starting billing address backfill...\n");

  try {
    // Get all orders to show initial state
    const allOrders = await storage.getAllOrders();
    const ordersWithoutBilling = allOrders.filter(o => !o.billingStreet);
    
    console.log(`📦 Found ${allOrders.length} total orders`);
    console.log(`🔍 ${ordersWithoutBilling.length} orders need billing address backfill\n`);

    if (ordersWithoutBilling.length === 0) {
      console.log("✨ All orders already have billing addresses!");
      return;
    }

    // Display sample of orders that will be updated
    console.log("Sample orders to update (first 5):");
    ordersWithoutBilling.slice(0, 5).forEach(o => {
      console.log(`  - Order ${o.id} for ${o.customerName} (${o.customerEmail})`);
    });
    if (ordersWithoutBilling.length > 5) {
      console.log(`  ... and ${ordersWithoutBilling.length - 5} more`);
    }
    console.log();

    // Process orders
    console.log("⚙️  Backfilling billing addresses...\n");
    
    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const order of ordersWithoutBilling) {
      try {
        // Skip orders that don't have shipping address data
        if (!order.shippingStreet || !order.shippingCity || !order.shippingCountry) {
          logger.warn(`⚠️  Order ${order.id} missing shipping data, skipping`);
          skipped++;
          continue;
        }

        // Update order with billing address from shipping address
        await storage.updateOrder(order.id, {
          billingName: order.customerName,
          billingEmail: order.customerEmail,
          billingPhone: "", // No phone field on legacy orders
          billingStreet: order.shippingStreet,
          billingCity: order.shippingCity,
          billingState: order.shippingState,
          billingPostalCode: order.shippingPostalCode,
          billingCountry: order.shippingCountry,
        });
        
        success++;
        logger.info(`✅ Backfilled billing for order ${order.id}`);
      } catch (error) {
        failed++;
        logger.error(`❌ Failed to backfill order ${order.id}:`, error);
      }
    }

    // Display results
    console.log("\n📊 Backfill Summary:");
    console.log(`   ✅ Successfully updated: ${success} orders`);
    if (skipped > 0) {
      console.log(`   ⏭️  Skipped (missing data): ${skipped} orders`);
    }
    console.log(`   ❌ Errors: ${failed} orders`);
    
    if (success > 0) {
      console.log("\n🔍 Verifying results...");
      const updatedOrders = await storage.getAllOrders();
      const stillMissing = updatedOrders.filter(o => !o.billingStreet);
      
      if (stillMissing.length === 0) {
        console.log("✨ All orders now have billing addresses!");
      } else {
        console.log(`⚠️  ${stillMissing.length} orders still missing billing addresses`);
        console.log("   (These may be orders without shipping data)");
      }
    }

    if (failed > 0) {
      console.log("\n⚠️  Some orders failed to update. Check logs above for details.");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ Backfill failed:", error);
    logger.error("Billing address backfill failed", error);
    process.exit(1);
  }
}

// Run the backfill
backfillBillingAddresses()
  .then(() => {
    console.log("\n🎉 Billing address backfill completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Billing address backfill failed:", error);
    process.exit(1);
  });
