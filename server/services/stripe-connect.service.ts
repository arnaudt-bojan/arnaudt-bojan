import type Stripe from "stripe";
import type { IStorage } from "../storage";
import { logger } from "../logger";

/**
 * Stripe Connect Service
 * 
 * Handles Stripe Connect account creation, onboarding, and status management.
 * Manages Express accounts, account sessions, and capability requests.
 */
export class StripeConnectService {
  constructor(
    private storage: IStorage,
    private stripe: Stripe | null
  ) {}

  /**
   * Create or get Stripe Express account
   */
  async createOrGetExpressAccount(params: {
    userId: string;
    reset?: boolean;
    country?: string;
  }): Promise<{
    success: boolean;
    data?: {
      accountId: string;
      chargesEnabled: boolean;
      payoutsEnabled: boolean;
      detailsSubmitted: boolean;
      currency?: string | null;
      capabilities?: any;
    };
    error?: string;
    errorCode?: string;
  }> {
    try {
      if (!this.stripe) {
        return { success: false, error: "Stripe is not configured" };
      }

      const { userId, reset = false, country } = params;
      const user = await this.storage.getUser(userId);

      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Reset account if requested
      if (user.stripeConnectedAccountId && reset) {
        await this.resetAccount(userId, user.stripeConnectedAccountId);
        user.stripeConnectedAccountId = null;
      }

      // Return existing account if present and not resetting
      if (user.stripeConnectedAccountId && !reset) {
        return await this.getExistingAccount(userId, user.stripeConnectedAccountId, user);
      }

      // Create new account
      return await this.createNewAccount(userId, user, country);
    } catch (error: any) {
      logger.error("Stripe Express account creation error", error);

      if (error.message && error.message.includes("signed up for Connect")) {
        return {
          success: false,
          error: "Stripe Connect Not Enabled",
          errorCode: "STRIPE_CONNECT_NOT_ENABLED",
        };
      }

      return {
        success: false,
        error: "Failed to create Express account",
        errorCode: "STRIPE_EXPRESS_CREATE_ERROR",
      };
    }
  }

  /**
   * Reset Stripe account
   */
  private async resetAccount(userId: string, accountId: string): Promise<void> {
    logger.info(`[Stripe Express] Resetting account for user ${userId}. Deleting old account ${accountId}...`);

    try {
      if (this.stripe) {
        await this.stripe.accounts.del(accountId);
        logger.info(`[Stripe Express] Successfully deleted old account ${accountId}`);
      }
    } catch (delError: any) {
      console.error(`[Stripe Express] Failed to delete old account:`, delError.message);
    }

    const user = await this.storage.getUser(userId);
    if (user) {
      await this.storage.upsertUser({
        ...user,
        stripeConnectedAccountId: null,
        stripeChargesEnabled: 0,
        stripePayoutsEnabled: 0,
        stripeDetailsSubmitted: 0,
      });
    }
  }

  /**
   * Get existing account and ensure capabilities
   */
  private async getExistingAccount(userId: string, accountId: string, user: any): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    if (!this.stripe) {
      return { success: false, error: "Stripe not configured" };
    }

    let account = await this.stripe.accounts.retrieve(accountId);

    // Check capabilities
    const hasCardPayments = account.capabilities?.card_payments === 'active' ||
      account.capabilities?.card_payments === 'pending';
    const hasTransfers = account.capabilities?.transfers === 'active' ||
      account.capabilities?.transfers === 'pending';

    // Request missing capabilities
    if (!hasCardPayments || !hasTransfers) {
      console.log(`[Stripe] Account ${account.id} missing capabilities. card_payments: ${account.capabilities?.card_payments}, transfers: ${account.capabilities?.transfers}`);
      logger.info(`[Stripe] Requesting card_payments and transfers for account ${account.id}...`);

      try {
        await this.stripe.accounts.update(accountId, {
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

        account = await this.stripe.accounts.retrieve(accountId);
        console.log(`[Stripe] Capabilities updated for account ${account.id}. card_payments: ${account.capabilities?.card_payments}, transfers: ${account.capabilities?.transfers}`);
      } catch (capError: any) {
        console.error(`[Stripe] Failed to request capabilities for account ${account.id}:`, capError.message);
        return {
          success: false,
          error: "Failed to update Stripe account capabilities",
        };
      }
    }

    // Update user with latest status
    await this.storage.upsertUser({
      ...user,
      stripeChargesEnabled: account.charges_enabled ? 1 : 0,
      stripePayoutsEnabled: account.payouts_enabled ? 1 : 0,
      stripeDetailsSubmitted: account.details_submitted ? 1 : 0,
      listingCurrency: account.default_currency?.toUpperCase() || 'USD',
    });

    return {
      success: true,
      data: {
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currency: account.default_currency,
        capabilities: account.capabilities,
      },
    };
  }

  /**
   * Create new Stripe Express account
   */
  private async createNewAccount(userId: string, user: any, country?: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    if (!this.stripe) {
      return { success: false, error: "Stripe not configured" };
    }

    const accountCountry = country || 'US';
    logger.info(`[Stripe Express] Creating Express account for user ${userId} with country: ${accountCountry}`);

    const account = await this.stripe.accounts.create({
      type: 'express',
      country: accountCountry,
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
    });

    await this.storage.upsertUser({
      ...user,
      stripeConnectedAccountId: account.id,
      stripeChargesEnabled: account.charges_enabled ? 1 : 0,
      stripePayoutsEnabled: account.payouts_enabled ? 1 : 0,
      stripeDetailsSubmitted: account.details_submitted ? 1 : 0,
      listingCurrency: account.default_currency?.toUpperCase() || user.listingCurrency || 'USD',
    });

    logger.info(`[Stripe Express] Created account ${account.id} for user ${userId}`);

    return {
      success: true,
      data: {
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currency: account.default_currency,
      },
    };
  }

  /**
   * Create account session for embedded onboarding
   */
  async createAccountSession(params: {
    userId: string;
    purpose?: 'onboarding' | 'payouts';
  }): Promise<{
    success: boolean;
    data?: {
      clientSecret: string;
      accountId: string;
      country?: string | null;
    };
    error?: string;
  }> {
    try {
      if (!this.stripe) {
        return { success: false, error: "Stripe is not configured" };
      }

      const { userId, purpose = 'onboarding' } = params;
      const user = await this.storage.getUser(userId);

      if (!user || !user.stripeConnectedAccountId) {
        return { success: false, error: "No Stripe account found. Create one first." };
      }

      const account = await this.stripe.accounts.retrieve(user.stripeConnectedAccountId);
      console.log(`[Stripe Account Session] Account ${account.id} country: ${account.country}, default_currency: ${account.default_currency}`);

      const components: any = {
        account_onboarding: {
          enabled: true,
        },
      };

      if (purpose === 'payouts') {
        components.account_onboarding.features = {
          external_account_collection: true,
        };
      }

      const accountSession = await this.stripe.accountSessions.create({
        account: user.stripeConnectedAccountId,
        components,
      });

      return {
        success: true,
        data: {
          clientSecret: accountSession.client_secret!,
          accountId: user.stripeConnectedAccountId,
          country: account.country,
        },
      };
    } catch (error: any) {
      logger.error("Stripe Account Session error", error);
      return { success: false, error: "Failed to create account session" };
    }
  }

  /**
   * Create account link for onboarding
   */
  async createAccountLink(params: {
    userId: string;
    type?: 'account_onboarding' | 'account_update';
    baseUrl: string;
  }): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      if (!this.stripe) {
        return { success: false, error: "Stripe is not configured" };
      }

      const { userId, type = 'account_onboarding', baseUrl } = params;
      const user = await this.storage.getUser(userId);

      if (!user || !user.stripeConnectedAccountId) {
        return { success: false, error: "No Stripe account found. Create one first." };
      }

      const accountLink = await this.stripe.accountLinks.create({
        account: user.stripeConnectedAccountId,
        refresh_url: `${baseUrl}/settings?stripe=refresh`,
        return_url: `${baseUrl}/settings?stripe=connected`,
        type: type,
      });

      return { success: true, url: accountLink.url };
    } catch (error: any) {
      logger.error("Stripe Account Link error", error);
      return { success: false, error: "Failed to generate account link" };
    }
  }

  /**
   * Get account status and auto-populate user fields
   */
  async getAccountStatus(userId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      if (!this.stripe) {
        return { success: false, error: "Stripe is not configured" };
      }

      const user = await this.storage.getUser(userId);

      if (!user || !user.stripeConnectedAccountId) {
        return {
          success: true,
          data: {
            connected: false,
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
          },
        };
      }

      const account = await this.stripe.accounts.retrieve(user.stripeConnectedAccountId);

      // Auto-populate fields from Stripe
      const stripeCompanyName = account.business_profile?.name?.trim() || account.company?.name?.trim() || '';
      const companyName = !user.companyName && stripeCompanyName ? stripeCompanyName : user.companyName;
      const businessType = !user.businessType && account.business_type ? account.business_type : user.businessType;

      // Auto-populate warehouse address
      const stripeAddress = account.individual?.address || account.company?.address;

      logger.info(`[Stripe] Warehouse auto-population check for account ${account.id}`, {
        currentWarehouseStreet: user.warehouseStreet ?? 'empty',
        stripeAddressAvailable: !!stripeAddress,
        stripeAddressLine1: stripeAddress?.line1 ?? 'none',
      });

      const warehouseStreet = !user.warehouseStreet && stripeAddress?.line1 ? stripeAddress.line1 : (user.warehouseStreet || undefined);
      const warehouseCity = !user.warehouseCity && stripeAddress?.city ? stripeAddress.city : (user.warehouseCity || undefined);
      const warehouseState = !user.warehouseState && stripeAddress?.state ? stripeAddress.state : (user.warehouseState || undefined);
      const warehousePostalCode = !user.warehousePostalCode && stripeAddress?.postal_code ? stripeAddress.postal_code : (user.warehousePostalCode || undefined);
      const warehouseCountry = !user.warehouseCountry && stripeAddress?.country ? stripeAddress.country : (user.warehouseCountry || undefined);

      if (!user.warehouseStreet && stripeAddress?.line1) {
        logger.info(`[Stripe] Auto-populating warehouse address from Stripe account ${account.id}`, {
          warehouseStreet,
          warehouseCity,
          warehouseState,
          warehousePostalCode,
          warehouseCountry,
        });
      }

      // Update user with latest status and auto-populated fields
      await this.storage.upsertUser({
        ...user,
        stripeChargesEnabled: account.charges_enabled ? 1 : 0,
        stripePayoutsEnabled: account.payouts_enabled ? 1 : 0,
        stripeDetailsSubmitted: account.details_submitted ? 1 : 0,
        listingCurrency: account.default_currency?.toUpperCase() || 'USD',
        companyName,
        businessType,
        warehouseStreet,
        warehouseCity,
        warehouseState,
        warehousePostalCode,
        warehouseCountry,
      });

      return {
        success: true,
        data: {
          connected: true,
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          currency: account.default_currency,
          country: account.country,
          requirements: account.requirements,
          capabilities: {
            card_payments: account.capabilities?.card_payments || 'inactive',
            transfers: account.capabilities?.transfers || 'inactive',
          },
          businessProfile: {
            name: account.business_profile?.name,
            url: account.business_profile?.url,
            supportEmail: account.business_profile?.support_email,
            supportPhone: account.business_profile?.support_phone,
          },
          payoutSchedule: {
            interval: account.settings?.payouts?.schedule?.interval || 'manual',
            delayDays: account.settings?.payouts?.schedule?.delay_days || 0,
          },
          individual: account.individual ? {
            firstName: account.individual.first_name,
            lastName: account.individual.last_name,
            email: account.individual.email,
            phone: account.individual.phone,
            address: account.individual.address ? {
              line1: account.individual.address.line1,
              line2: account.individual.address.line2,
              city: account.individual.address.city,
              state: account.individual.address.state,
              postalCode: account.individual.address.postal_code,
              country: account.individual.address.country,
            } : null,
          } : null,
          company: account.company ? {
            name: account.company.name,
            address: account.company.address ? {
              line1: account.company.address.line1,
              line2: account.company.address.line2,
              city: account.company.address.city,
              state: account.company.address.state,
              postalCode: account.company.address.postal_code,
              country: account.company.address.country,
            } : null,
          } : null,
        },
      };
    } catch (error: any) {
      logger.error("Stripe account status error", error);
      return { success: false, error: "Failed to retrieve account status" };
    }
  }
}
