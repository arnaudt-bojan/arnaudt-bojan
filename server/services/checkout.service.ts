import { IStorage } from '../storage';
import { IPaymentProvider } from './payment/payment-provider.interface';
import { CartValidationService } from './cart-validation.service';
import { ShippingService } from './shipping.service';
import { InventoryService } from './inventory.service';
import { calculatePricing } from './pricing.service';
import { logger } from '../logger';

export interface CheckoutInitiateParams {
  items: Array<{
    productId: string;
    quantity: number;
    variant?: {
      size?: string;
      color?: string;
    };
  }>;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  customerEmail: string;
  customerName: string;
}

export interface CheckoutInitiateResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
  amountToCharge?: number;
  currency?: string;
  error?: string;
  errorCode?: string;
}

export class CheckoutService {
  constructor(
    private storage: IStorage,
    private paymentProvider: IPaymentProvider,
    private cartValidationService: CartValidationService,
    private shippingService: ShippingService,
    private inventoryService: InventoryService
  ) {}

  /**
   * Initiate checkout - Server-orchestrated payment intent creation
   * 
   * This replaces the old /api/create-payment-intent endpoint with proper:
   * - Idempotency handling
   * - Inventory reservation
   * - Payment intent storage
   * - Seller currency support
   */
  async initiateCheckout(params: CheckoutInitiateParams): Promise<CheckoutInitiateResult> {
    const checkoutSessionId = `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let successfulReservations: any[] = [];

    try {
      // Step 1: Cart validation
      const validation = await this.cartValidationService.validateCart(
        params.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      );

      if (!validation.valid) {
        return {
          success: false,
          error: 'Invalid cart items',
          errorCode: 'INVALID_CART',
        };
      }

      // Step 2: Get seller and verify payment setup
      const firstProduct = validation.items[0];
      if (!firstProduct) {
        return {
          success: false,
          error: 'No valid products in cart',
          errorCode: 'EMPTY_CART',
        };
      }

      const seller = await this.storage.getUser(firstProduct.sellerId);
      if (!seller) {
        return {
          success: false,
          error: 'Seller not found',
          errorCode: 'SELLER_NOT_FOUND',
        };
      }

      // Verify seller has Stripe account and charges enabled
      if (!seller.stripeConnectedAccountId) {
        return {
          success: false,
          error: 'This store has not set up payments yet',
          errorCode: 'NO_STRIPE_ACCOUNT',
        };
      }

      if (!seller.stripeChargesEnabled) {
        return {
          success: false,
          error: 'This store is still setting up payment processing',
          errorCode: 'STRIPE_CHARGES_DISABLED',
        };
      }

      // Get seller's currency - default to USD if no country set
      const sellerCountry = (seller as any).stripeCountry || 'US';
      const currency = this.getCurrencyFromCountry(sellerCountry);

      // Step 3: Calculate shipping
      const destination = {
        country: params.shippingAddress.country,
        state: params.shippingAddress.state,
        postalCode: params.shippingAddress.postalCode,
      };

      const shipping = await this.shippingService.calculateShipping(
        params.items.map(i => ({ id: i.productId, quantity: i.quantity })),
        destination
      );

      // Step 4: Calculate pricing
      const taxAmount = 0; // Tax will be calculated by Stripe Tax during payment
      const pricing = calculatePricing(
        validation.items,
        shipping.cost,
        taxAmount
      );

      // Step 5: Reserve inventory
      const reservationResult = await this.reserveInventory(
        params.items,
        validation.items,
        checkoutSessionId
      );

      if (!reservationResult.success) {
        return {
          success: false,
          error: 'Some items are no longer available',
          errorCode: 'INVENTORY_UNAVAILABLE',
        };
      }

      successfulReservations = reservationResult.reservations || [];

      // Step 6: Create payment intent with idempotency
      const idempotencyKey = `checkout_${checkoutSessionId}`;
      
      // Check if payment intent already exists for this checkout session
      const existingIntent = await this.storage.getPaymentIntentByIdempotencyKey(idempotencyKey);
      if (existingIntent) {
        logger.info(`[Checkout] Returning existing payment intent for session ${checkoutSessionId}`);
        return {
          success: true,
          clientSecret: existingIntent.clientSecret || undefined,
          paymentIntentId: existingIntent.providerIntentId,
          checkoutSessionId,
          amountToCharge: pricing.amountToCharge,
          currency,
        };
      }

      // Calculate platform fee (1.5%)
      const amountInCents = Math.round(pricing.amountToCharge * 100);
      const platformFeeInCents = Math.round(amountInCents * 0.015);

      // Create payment intent via provider
      const paymentIntent = await this.paymentProvider.createPaymentIntent({
        amount: pricing.amountToCharge,
        currency: currency.toLowerCase(),
        connectedAccountId: seller.stripeConnectedAccountId || undefined,
        applicationFeeAmount: platformFeeInCents / 100, // Provider expects dollars
        metadata: {
          checkoutSessionId,
          sellerId: seller.id,
          paymentType: pricing.payingDepositOnly ? 'deposit' : 'full',
          customerEmail: params.customerEmail,
          customerName: params.customerName,
        },
        idempotencyKey,
      });

      // Step 7: Store payment intent in database
      await this.storage.storePaymentIntent({
        providerName: paymentIntent.providerName,
        providerIntentId: paymentIntent.providerIntentId,
        idempotencyKey,
        clientSecret: paymentIntent.clientSecret || null,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata ? JSON.stringify(paymentIntent.metadata) : null,
      });

      logger.info(`[Checkout] Created payment intent ${paymentIntent.id} for session ${checkoutSessionId}`);

      return {
        success: true,
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.providerIntentId,
        checkoutSessionId,
        amountToCharge: pricing.amountToCharge,
        currency,
      };

    } catch (error) {
      logger.error('[Checkout] Failed to initiate checkout:', error);

      // Rollback inventory reservations on error
      if (successfulReservations.length > 0) {
        try {
          // TODO: Implement releaseReservationsBySession in InventoryService
          // For now, reservations will expire automatically after 15 minutes
          logger.warn(`[Checkout] Inventory rollback skipped - ${successfulReservations.length} reservations will auto-expire`);
        } catch (rollbackError) {
          logger.error('[Checkout] Failed to rollback inventory reservations:', rollbackError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate checkout',
        errorCode: 'CHECKOUT_FAILED',
      };
    }
  }

  private async reserveInventory(
    requestedItems: CheckoutInitiateParams['items'],
    validatedItems: any[],
    checkoutSessionId: string
  ): Promise<{
    success: boolean;
    reservations?: any[];
    errors?: string[];
  }> {
    const reservations: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < requestedItems.length; i++) {
      const requestedItem = requestedItems[i];
      const validatedItem = validatedItems[i];

      const variantId = requestedItem.variant
        ? this.inventoryService.getVariantId(
            requestedItem.variant.size,
            requestedItem.variant.color
          )
        : undefined;

      try {
        const reservation = await this.inventoryService.reserveStock(
          requestedItem.productId,
          requestedItem.quantity,
          checkoutSessionId,
          {
            variantId,
          }
        );

        reservations.push(reservation);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${validatedItem.name}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, reservations };
  }

  private getCurrencyFromCountry(country: string): string {
    // Map country codes to currencies (must match Stripe country selector)
    const currencyMap: Record<string, string> = {
      AE: 'AED', // United Arab Emirates
      AT: 'EUR', // Austria
      AU: 'AUD', // Australia
      BE: 'EUR', // Belgium
      BR: 'BRL', // Brazil
      CA: 'CAD', // Canada
      CH: 'CHF', // Switzerland
      DE: 'EUR', // Germany
      DK: 'DKK', // Denmark
      ES: 'EUR', // Spain
      FI: 'EUR', // Finland
      FR: 'EUR', // France
      GB: 'GBP', // United Kingdom
      HK: 'HKD', // Hong Kong
      IE: 'EUR', // Ireland
      IT: 'EUR', // Italy
      JP: 'JPY', // Japan
      MX: 'MXN', // Mexico
      NL: 'EUR', // Netherlands
      NO: 'NOK', // Norway
      NZ: 'NZD', // New Zealand
      PL: 'PLN', // Poland
      SE: 'SEK', // Sweden
      SG: 'SGD', // Singapore
      US: 'USD', // United States
    };

    return currencyMap[country] || 'USD';
  }
}
