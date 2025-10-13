import { storage } from '../storage';
import { StripeConnectService } from '../services/stripe-connect.service';
import Stripe from 'stripe';

async function syncStripeStatus(userEmail: string) {
  try {
    // Get user
    const user = await storage.getUserByEmail(userEmail);
    if (!user) {
      console.error(`User not found: ${userEmail}`);
      process.exit(1);
    }

    if (!user.stripeConnectedAccountId) {
      console.error(`User has no Stripe account: ${userEmail}`);
      process.exit(1);
    }

    console.log('Before sync:', {
      email: user.email,
      stripeAccountId: user.stripeConnectedAccountId,
      chargesEnabled: user.stripeChargesEnabled,
      payoutsEnabled: user.stripePayoutsEnabled,
      detailsSubmitted: user.stripeDetailsSubmitted,
    });

    // Initialize Stripe Connect service
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not found');
      process.exit(1);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const stripeConnectService = new StripeConnectService(storage, stripe);

    // Sync status
    const result = await stripeConnectService.getAccountStatus(user.id);
    
    if (!result.success) {
      console.error('Failed to sync status:', result.error);
      process.exit(1);
    }

    // Get updated user
    const updatedUser = await storage.getUserByEmail(userEmail);
    console.log('\nAfter sync:', {
      email: updatedUser?.email,
      stripeAccountId: updatedUser?.stripeConnectedAccountId,
      chargesEnabled: updatedUser?.stripeChargesEnabled,
      payoutsEnabled: updatedUser?.stripePayoutsEnabled,
      detailsSubmitted: updatedUser?.stripeDetailsSubmitted,
    });

    console.log('\n✅ Stripe status synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing Stripe status:', error);
    process.exit(1);
  }
}

// Run with email argument
const email = process.argv[2] || 'testseller@test.com';
syncStripeStatus(email);
