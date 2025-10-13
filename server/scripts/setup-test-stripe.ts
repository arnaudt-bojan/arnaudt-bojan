import Stripe from "stripe";
import { storage } from "../storage";
import { logger } from "../logger";

/**
 * Setup Test Seller Stripe Connect Account
 * 
 * This script creates a Stripe Express test account for test sellers
 * to enable payment testing without manual onboarding.
 * 
 * Usage:
 *   NODE_ENV=test tsx server/scripts/setup-test-stripe.ts
 */

async function setupTestSellerStripe() {
  try {
    // Use TESTING keys if available, otherwise use regular keys (which should be test keys)
    const stripeKey = process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      throw new Error("No Stripe secret key found. Set TESTING_STRIPE_SECRET_KEY or STRIPE_SECRET_KEY");
    }

    // Verify we're using test keys
    if (!stripeKey.startsWith('sk_test_')) {
      throw new Error(`ERROR: This script requires TEST keys (sk_test_...). Found: ${stripeKey.substring(0, 15)}...`);
    }

    console.log("✅ Using Stripe TEST key:", stripeKey.substring(0, 20) + "...");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-09-30.clover",
    });

    // Test sellers to set up
    const testSellers = [
      { email: "testseller@test.com", userId: "local-testseller@test.com" },
      { email: "mirtorabi+testseller@gmail.com", userId: null }, // Will look up by email
    ];

    for (const testSellerInfo of testSellers) {
      console.log(`\n🔧 Setting up Stripe for: ${testSellerInfo.email}`);
      
      // Get user
      let user;
      if (testSellerInfo.userId) {
        user = await storage.getUser(testSellerInfo.userId);
      } else {
        const allUsers = await storage.getAllUsers();
        user = allUsers.find(u => u.email === testSellerInfo.email);
      }

      if (!user) {
        console.log(`⚠️  User not found: ${testSellerInfo.email} - skipping`);
        continue;
      }

      console.log(`   Found user: ${user.id} (${user.email})`);

      // Check if already has Stripe account
      if (user.stripeConnectedAccountId) {
        console.log(`   Already has Stripe account: ${user.stripeConnectedAccountId}`);
        
        // Verify account exists and update status
        try {
          const account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
          console.log(`   Account status: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`);
          
          // Update user with current status
          await storage.upsertUser({
            ...user,
            stripeChargesEnabled: account.charges_enabled ? 1 : 0,
            stripePayoutsEnabled: account.payouts_enabled ? 1 : 0,
            stripeDetailsSubmitted: account.details_submitted ? 1 : 0,
            listingCurrency: account.default_currency?.toUpperCase() || 'USD',
          });
          
          console.log(`   ✅ Updated user with current Stripe status`);
          
          // If charges not enabled, try programmatic onboarding with test magic values
          if (!account.charges_enabled) {
            console.log(`   🔧 Charges not enabled, attempting programmatic onboarding...`);
            
            try {
              // Try to update with complete test data
              // Note: This may fail if account already started onboarding (Account Link created)
              await stripe.accounts.update(account.id, {
                business_type: 'individual',
                business_profile: {
                  url: 'https://example.com',
                  mcc: '5734',
                  product_description: 'Digital products and services',
                },
                individual: {
                  first_name: user.firstName || 'Test',
                  last_name: user.lastName || 'Seller',
                  email: user.email || undefined,
                  dob: { day: 1, month: 1, year: 1901 },  // Magic DOB
                  phone: '+16505551234',
                  address: {
                    line1: 'address_full_match',  // Magic test token
                    city: 'San Francisco',
                    state: 'CA',
                    postal_code: '94102',
                    country: 'US',
                  },
                  ssn_last_4: '0000',
                  id_number: '000000000',
                },
                tos_acceptance: {
                  date: Math.floor(Date.now() / 1000),
                  ip: '8.8.8.8',
                },
              });
              
              // Try to add external account if not present
              if (!account.external_accounts || account.external_accounts.data.length === 0) {
                console.log(`   💳 Adding test bank account...`);
                await stripe.accounts.createExternalAccount(account.id, {
                  external_account: {
                    object: 'bank_account',
                    country: 'US',
                    currency: 'usd',
                    account_holder_name: `${user.firstName || 'Test'} ${user.lastName || 'Seller'}`,
                    account_holder_type: 'individual',
                    routing_number: '110000000',
                    account_number: '000123456789',
                  },
                });
              }
              
              // Wait for processing
              console.log(`   ⏳ Waiting for verification...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const updatedAccount = await stripe.accounts.retrieve(account.id);
              console.log(`   📊 Updated status: charges=${updatedAccount.charges_enabled}, payouts=${updatedAccount.payouts_enabled}`);
              
              if (updatedAccount.requirements?.currently_due && updatedAccount.requirements.currently_due.length > 0) {
                console.log(`   ⚠️  Outstanding requirements: ${updatedAccount.requirements.currently_due.join(', ')}`);
              } else {
                console.log(`   ✅ No outstanding requirements!`);
              }
              
              await storage.upsertUser({
                ...user,
                stripeChargesEnabled: updatedAccount.charges_enabled ? 1 : 0,
                stripePayoutsEnabled: updatedAccount.payouts_enabled ? 1 : 0,
                stripeDetailsSubmitted: updatedAccount.details_submitted ? 1 : 0,
              });
              
              if (updatedAccount.charges_enabled) {
                console.log(`   🎉 SUCCESS! Charges are now ENABLED!`);
              } else {
                console.log(`   ⚠️  Programmatic update failed. Manual onboarding required.`);
                console.log(`   💡 Login as seller → Settings → Payment → Complete Setup`);
              }
            } catch (error: any) {
              console.log(`   ⚠️  Error during programmatic update: ${error.message}`);
              console.log(`   💡 Account may have locked fields. Manual onboarding required.`);
              console.log(`   🔗 Login as seller → Settings → Payment → Complete Setup`);
              
              // Still try to request capabilities
              await stripe.accounts.update(account.id, {
                capabilities: {
                  card_payments: { requested: true },
                  transfers: { requested: true },
                },
              });
            }
          }
          
          continue;
        } catch (error: any) {
          console.log(`   ⚠️  Account doesn't exist in Stripe, will create new one`);
          // Account doesn't exist, will create new one below
        }
      }

      // Create new Stripe Express account WITH COMPLETE ONBOARDING DATA
      // Using Stripe test mode magic values to enable charges immediately
      console.log(`   🎯 Creating Stripe Express TEST account with full onboarding data...`);
      
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            debit_negative_balances: true,
          },
        },
        business_type: 'individual',
        business_profile: {
          url: 'https://example.com',
          mcc: '5734', // Computer software stores
          product_description: 'Digital products and services',
        },
        individual: {
          first_name: user.firstName || 'Test',
          last_name: user.lastName || 'Seller',
          email: user.email || undefined,
          // Test mode magic values for instant verification
          dob: { 
            day: 1, 
            month: 1, 
            year: 1901  // Magic DOB for test mode - passes verification
          },
          phone: '+16505551234',
          address: {
            line1: 'address_full_match',  // Magic test token - enables charges & payouts
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94102',
            country: 'US',
          },
          ssn_last_4: '0000',  // Test SSN
          id_number: '000000000',  // Full test SSN - passes verification
        },
        external_account: {
          object: 'bank_account',
          country: 'US',
          currency: 'usd',
          account_holder_name: `${user.firstName || 'Test'} ${user.lastName || 'Seller'}`,
          account_holder_type: 'individual',
          routing_number: '110000000',  // Test routing number
          account_number: '000123456789',  // Test account - succeeds immediately
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: '8.8.8.8',  // Test IP
        },
      });

      console.log(`   ✅ Created Stripe account: ${account.id}`);
      console.log(`   📊 Initial status: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`);

      // Wait a moment for Stripe to process the verification
      console.log(`   ⏳ Waiting for Stripe verification...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retrieve account to get updated status
      const verifiedAccount = await stripe.accounts.retrieve(account.id);
      console.log(`   📊 Verified status: charges=${verifiedAccount.charges_enabled}, payouts=${verifiedAccount.payouts_enabled}`);
      
      // Check requirements
      if (verifiedAccount.requirements?.currently_due && verifiedAccount.requirements.currently_due.length > 0) {
        console.log(`   ⚠️  Outstanding requirements: ${verifiedAccount.requirements.currently_due.join(', ')}`);
      } else {
        console.log(`   ✅ No outstanding requirements!`);
      }

      // Update user with Stripe account
      await storage.upsertUser({
        ...user,
        stripeConnectedAccountId: verifiedAccount.id,
        stripeChargesEnabled: verifiedAccount.charges_enabled ? 1 : 0,
        stripePayoutsEnabled: verifiedAccount.payouts_enabled ? 1 : 0,
        stripeDetailsSubmitted: verifiedAccount.details_submitted ? 1 : 0,
        listingCurrency: verifiedAccount.default_currency?.toUpperCase() || 'USD',
      });

      console.log(`   ✅ Updated user with Stripe account details`);

      // Report final status
      if (verifiedAccount.charges_enabled) {
        console.log(`   🎉 SUCCESS! Charges are ENABLED - test seller can accept payments!`);
      } else {
        console.log(`   ⚠️  Charges still disabled. May need manual verification.`);
        console.log(`   💡 Alternative: Login as seller → Settings → Payment → Complete Setup`);
      }
    }

    console.log("\n✅ Test seller Stripe setup complete!");
    console.log("\n📋 Next Steps:");
    console.log("1. Verify STRIPE_SECRET_KEY is a TEST key (sk_test_...)");
    console.log("2. Add STRIPE_WEBHOOK_SECRET to Secrets (generate with: stripe listen --print-secret)");
    console.log("3. Test payment flow with test card: 4242 4242 4242 4242");
    console.log("\n💡 To enable charges immediately in test mode:");
    console.log("   Login as test seller → Settings → Payment → Complete onboarding");
    
  } catch (error) {
    console.error("❌ Error setting up test seller Stripe:", error);
    logger.error("Test Stripe setup error", error);
    process.exit(1);
  }
}

// Run setup
setupTestSellerStripe().then(() => {
  console.log("\n✅ Script completed successfully");
  process.exit(0);
}).catch((error) => {
  console.error("\n❌ Script failed:", error);
  process.exit(1);
});
