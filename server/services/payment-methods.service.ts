/**
 * PaymentMethodsService - Manages saved payment methods and shipping addresses
 * 
 * Architecture 3 (Server-Side Only):
 * - All Stripe API calls happen server-side
 * - Ensures Stripe customer exists before saving payment methods
 * - Attaches payment methods to customer for future use
 * - Manages default payment method/address logic
 * 
 * PCI Compliance:
 * - NEVER stores raw card numbers or CVV
 * - Only stores Stripe Payment Method IDs (pm_xxx format)
 * - Only stores safe display information (brand, last4, expiry)
 */

import type { IStorage } from '../storage';
import type { InsertSavedPaymentMethod, SavedPaymentMethod, InsertSavedAddress, SavedAddress } from '@shared/schema';
import Stripe from 'stripe';
import { logger } from '../logger';

export interface ShippingAddressData {
  label?: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export class PaymentMethodsService {
  constructor(
    private storage: IStorage,
    private stripe: Stripe | null
  ) {}

  /**
   * Ensure Stripe customer exists for user
   * Creates a new customer if one doesn't exist
   * Returns the Stripe customer ID
   */
  async ensureStripeCustomer(userId: string): Promise<string> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Get user from storage
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId) {
      logger.info(`[PaymentMethods] User ${userId} already has Stripe customer: ${user.stripeCustomerId}`);
      return user.stripeCustomerId;
    }

    // Create new Stripe customer
    logger.info(`[PaymentMethods] Creating new Stripe customer for user ${userId}`);
    const customer = await this.stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        userId: userId,
        username: user.username || '',
      },
    });

    // Update user with Stripe customer ID
    await this.storage.updateUser(userId, {
      stripeCustomerId: customer.id,
    });

    logger.info(`[PaymentMethods] Created Stripe customer ${customer.id} for user ${userId}`);
    return customer.id;
  }

  /**
   * Save payment method for future use
   * 
   * Flow:
   * 1. Ensure Stripe customer exists
   * 2. Attach payment method to customer
   * 3. Retrieve payment method details from Stripe
   * 4. Store safe display information in database
   * 5. Handle default payment method logic
   */
  async savePaymentMethod(
    userId: string,
    stripePaymentMethodId: string,
    isDefault: boolean = false
  ): Promise<SavedPaymentMethod> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Step 1: Ensure Stripe customer exists
    const stripeCustomerId = await this.ensureStripeCustomer(userId);

    try {
      // Step 2: Attach payment method to customer
      logger.info(`[PaymentMethods] Attaching payment method ${stripePaymentMethodId} to customer ${stripeCustomerId}`);
      await this.stripe.paymentMethods.attach(stripePaymentMethodId, {
        customer: stripeCustomerId,
      });

      // Step 3: Retrieve payment method details
      const paymentMethod = await this.stripe.paymentMethods.retrieve(stripePaymentMethodId);

      // Step 4: Extract safe display information
      const cardDetails = paymentMethod.card;
      if (!cardDetails) {
        throw new Error('Payment method is not a card');
      }

      // Step 5: Handle default logic - if this is default, unset other defaults
      if (isDefault) {
        await this.storage.setDefaultPaymentMethod(userId, stripePaymentMethodId);
      }

      // Step 6: Save to database
      const savedPaymentMethod = await this.storage.createSavedPaymentMethod({
        userId,
        stripePaymentMethodId,
        cardBrand: cardDetails.brand || '',
        cardLast4: cardDetails.last4 || '',
        cardExpMonth: cardDetails.exp_month || 0,
        cardExpYear: cardDetails.exp_year || 0,
        isDefault: isDefault ? 1 : 0,
        label: null, // User can update label later if needed
      });

      logger.info(`[PaymentMethods] Saved payment method ${savedPaymentMethod.id} for user ${userId}`);
      return savedPaymentMethod;

    } catch (error: any) {
      logger.error(`[PaymentMethods] Error saving payment method: ${error.message}`);
      throw new Error(`Failed to save payment method: ${error.message}`);
    }
  }

  /**
   * List all saved payment methods for a user
   */
  async listPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
    return await this.storage.getSavedPaymentMethodsByUserId(userId);
  }

  /**
   * Set default payment method
   * Unsets all other payment methods as default
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    await this.storage.setDefaultPaymentMethod(userId, paymentMethodId);
    logger.info(`[PaymentMethods] Set payment method ${paymentMethodId} as default for user ${userId}`);
  }

  /**
   * Delete payment method
   * Also detaches from Stripe customer
   */
  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Get payment method from database first (to get Stripe PM ID)
    const paymentMethods = await this.storage.getSavedPaymentMethodsByUserId(userId);
    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // Verify this payment method belongs to this user
    if (paymentMethod.userId !== userId) {
      throw new Error('Unauthorized: This payment method does not belong to you');
    }

    try {
      // Detach from Stripe customer
      logger.info(`[PaymentMethods] Detaching payment method ${paymentMethod.stripePaymentMethodId} from Stripe`);
      await this.stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

      // Delete from database
      await this.storage.deleteSavedPaymentMethod(paymentMethodId);
      logger.info(`[PaymentMethods] Deleted payment method ${paymentMethodId} for user ${userId}`);

    } catch (error: any) {
      logger.error(`[PaymentMethods] Error deleting payment method: ${error.message}`);
      throw new Error(`Failed to delete payment method: ${error.message}`);
    }
  }

  /**
   * Save shipping address for future use
   */
  async saveShippingAddress(
    userId: string,
    address: ShippingAddressData,
    isDefault: boolean = false
  ): Promise<SavedAddress> {
    // Handle default logic - if this is default, unset other defaults
    if (isDefault) {
      // Note: This will be handled by storage layer via setDefaultAddress
      // We'll call it after creating the address
    }

    const savedAddress = await this.storage.createSavedAddress({
      userId,
      fullName: address.fullName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || null,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || null,
      isDefault: isDefault ? 1 : 0,
      label: address.label || null,
    });

    // If this should be default, set it now
    if (isDefault) {
      await this.storage.setDefaultAddress(userId, savedAddress.id);
    }

    logger.info(`[PaymentMethods] Saved shipping address ${savedAddress.id} for user ${userId}`);
    return savedAddress;
  }

  /**
   * List all saved shipping addresses for a user
   */
  async listShippingAddresses(userId: string): Promise<SavedAddress[]> {
    return await this.storage.getSavedAddressesByUserId(userId);
  }

  /**
   * Set default shipping address
   * Unsets all other addresses as default
   */
  async setDefaultShippingAddress(userId: string, addressId: string): Promise<void> {
    await this.storage.setDefaultAddress(userId, addressId);
    logger.info(`[PaymentMethods] Set address ${addressId} as default for user ${userId}`);
  }

  /**
   * Delete shipping address
   */
  async deleteShippingAddress(userId: string, addressId: string): Promise<void> {
    // Get address from database first
    const address = await this.storage.getSavedAddress(addressId);

    if (!address) {
      throw new Error('Address not found');
    }

    // Verify this address belongs to this user
    if (address.userId !== userId) {
      throw new Error('Unauthorized: This address does not belong to you');
    }

    await this.storage.deleteSavedAddress(addressId);
    logger.info(`[PaymentMethods] Deleted address ${addressId} for user ${userId}`);
  }
}
