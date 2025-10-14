/**
 * Migration Script: Populate Balance Requests for Existing Pre-Order Orders
 * 
 * This script creates balance_requests for existing orders that:
 * 1. Have depositAmountCents and balanceDueCents
 * 2. Have partially_paid payment status
 * 3. Don't already have a balance_request
 * 
 * Run with: npx tsx server/scripts/migrate-balance-requests.ts
 */

import { db } from "../db";
import { eq, and, isNull, gt } from "drizzle-orm";
import { orders, balanceRequests } from "@shared/schema";
import { logger } from "../logger";
import { BalancePaymentService } from "../services/balance-payment.service";
import { PricingCalculationService } from "../services/pricing-calculation.service";
import { ShippingService } from "../services/shipping.service";
import { createPostgresStorage } from "../storage";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })
  : undefined;

async function migrateBalanceRequests() {
  console.log('🚀 Starting balance request migration...\n');

  const storage = createPostgresStorage(db);
  const shippingService = new ShippingService(storage, stripe);
  const pricingService = new PricingCalculationService(storage, shippingService);
  const balanceService = new BalancePaymentService(storage, pricingService, shippingService, stripe);

  try {
    // Find orders that need balance requests
    const eligibleOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          gt(orders.balanceDueCents, 0),
          eq(orders.paymentStatus, 'partially_paid')
        )
      );

    console.log(`Found ${eligibleOrders.length} orders with partial payments\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const order of eligibleOrders) {
      // Check if balance request already exists
      const existing = await db
        .select()
        .from(balanceRequests)
        .where(eq(balanceRequests.orderId, order.id))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  Skipping order ${order.id} - balance request already exists`);
        skipped++;
        continue;
      }

      // Create balance request
      try {
        const result = await balanceService.requestBalancePayment(
          order.id,
          'migration_script'
        );

        if (result.success) {
          console.log(`✅ Created balance request for order ${order.id}`);
          console.log(`   Balance due: ${(order.balanceDueCents / 100).toFixed(2)} ${order.currency}`);
          console.log(`   Session token: ${result.sessionToken?.substring(0, 20)}...`);
          console.log(`   Magic link: ${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/balance-payment?token=${result.sessionToken}\n`);
          created++;
        } else {
          console.log(`❌ Failed to create balance request for order ${order.id}: ${result.error}\n`);
          errors++;
        }
      } catch (error: any) {
        console.log(`❌ Error processing order ${order.id}: ${error.message}\n`);
        errors++;
      }
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors:  ${errors}`);
    console.log(`   Total:   ${eligibleOrders.length}\n`);

    console.log('✨ Migration complete!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    logger.error('[Migration] Balance request migration failed', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run migration
migrateBalanceRequests();
