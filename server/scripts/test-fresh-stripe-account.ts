import Stripe from "stripe";

/**
 * Test creating a fresh Stripe account with complete onboarding data
 * to verify if programmatic onboarding works in test mode
 */

async function testFreshAccount() {
  const stripeKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  
  if (!stripeKey) {
    throw new Error("No Stripe key found");
  }

  if (!stripeKey.startsWith('sk_test_')) {
    throw new Error(`Requires TEST key. Found: ${stripeKey.substring(0, 15)}...`);
  }

  console.log("✅ Using Stripe TEST key:", stripeKey.substring(0, 20) + "...");

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-09-30.clover",
  });

  console.log("\n🎯 Creating FRESH Express account with COMPLETE onboarding data...");
  console.log("   Using Stripe test mode magic values for instant verification");
  
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: 'fresh-test@example.com',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    // Skip business_profile.url - may cause validation errors even in test mode
    individual: {
      first_name: 'Fresh',
      last_name: 'Test',
      email: 'fresh-test@example.com',
      // Stripe test mode MAGIC values
      dob: { 
        day: 1, 
        month: 1, 
        year: 1901  // Magic DOB - instant verification
      },
      phone: '+16505551234',
      address: {
        line1: 'address_full_match',  // Magic test token - enables charges & payouts
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94102',
        country: 'US',
      },
      ssn_last_4: '0000',
      id_number: '000000000',  // Magic SSN - passes verification
    },
    external_account: {
      object: 'bank_account',
      country: 'US',
      currency: 'usd',
      account_holder_name: 'Fresh Test',
      account_holder_type: 'individual',
      routing_number: '110000000',  // Test routing
      account_number: '000123456789',  // Test account - succeeds immediately
    },
    // NOTE: Cannot accept TOS for Express accounts programmatically!
    // Express accounts require the account holder to accept TOS via Stripe's onboarding
  });

  console.log(`\n✅ Created account: ${account.id}`);
  console.log(`📊 Initial status:`);
  console.log(`   - charges_enabled: ${account.charges_enabled}`);
  console.log(`   - payouts_enabled: ${account.payouts_enabled}`);
  console.log(`   - details_submitted: ${account.details_submitted}`);
  
  // Wait for Stripe to process verification
  console.log(`\n⏳ Waiting 3 seconds for Stripe verification...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const verified = await stripe.accounts.retrieve(account.id);
  console.log(`\n📊 After verification:`);
  console.log(`   - charges_enabled: ${verified.charges_enabled}`);
  console.log(`   - payouts_enabled: ${verified.payouts_enabled}`);
  console.log(`   - details_submitted: ${verified.details_submitted}`);
  
  if (verified.requirements?.currently_due && verified.requirements.currently_due.length > 0) {
    console.log(`\n⚠️  Outstanding requirements:`);
    verified.requirements.currently_due.forEach(req => {
      console.log(`   - ${req}`);
    });
  } else {
    console.log(`\n✅ No outstanding requirements!`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  if (verified.charges_enabled) {
    console.log(`🎉 SUCCESS! Programmatic onboarding WORKS!`);
    console.log(`   Charges are ENABLED on a fresh account with magic test values`);
  } else {
    console.log(`❌ FAILED: Programmatic onboarding did NOT enable charges`);
    console.log(`   Manual onboarding required even with magic values`);
  }
  console.log(`${'='.repeat(60)}`);
  
  // Clean up test account
  console.log(`\n🧹 Cleaning up test account...`);
  await stripe.accounts.del(account.id);
  console.log(`✅ Test account deleted`);
  
  // Return result for programmatic use
  return verified.charges_enabled;
}

// Run test
testFreshAccount()
  .then((success) => {
    if (success) {
      console.log("\n✅ Test passed: Programmatic onboarding is POSSIBLE");
      console.log("\n📋 Recommendation:");
      console.log("   - Delete existing test seller Stripe accounts from DB");
      console.log("   - Re-run setup script to create fresh accounts");
      console.log("   - Fresh accounts will have charges enabled immediately");
      process.exit(0);
    } else {
      console.log("\n❌ Test failed: Programmatic onboarding NOT possible");
      console.log("\n📋 Recommendation:");
      console.log("   - Accept manual onboarding requirement");
      console.log("   - Document clear 2-3 minute manual step");
      console.log("   - User must complete onboarding via Settings > Payment");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("\n❌ Error during test:", error);
    process.exit(1);
  });
