import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IdentityService {
  constructor(private prisma: PrismaService) {}

  async getUser(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapUserFromPrisma(user);
  }

  async getCurrentUser(userId: string) {
    return this.getUser(userId);
  }

  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      username?: string;
      phoneNumber?: string;
      profileImageUrl?: string;
    }
  ) {
    const existing = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const updateData: any = {};
    
    if (data.fullName !== undefined) {
      const parts = data.fullName.trim().split(' ');
      updateData.first_name = parts[0] || '';
      updateData.last_name = parts.slice(1).join(' ') || null;
    }
    
    if (data.username !== undefined) {
      updateData.username = data.username;
    }
    
    if (data.phoneNumber !== undefined) {
      updateData.phone_number = data.phoneNumber;
    }
    
    if (data.profileImageUrl !== undefined) {
      updateData.profile_image_url = data.profileImageUrl;
    }

    const user = await this.prisma.users.update({
      where: { id: userId },
      data: updateData,
    });

    return this.mapUserFromPrisma(user);
  }

  async updateSellerAccount(
    userId: string,
    data: {
      storeName?: string;
      businessName?: string;
      businessEmail?: string;
      brandColor?: string;
      logoUrl?: string;
    }
  ) {
    const existing = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (existing.role !== 'seller' && existing.user_type !== 'seller') {
      throw new GraphQLError('User is not a seller', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const updateData: any = {};
    
    if (data.storeName !== undefined) {
      updateData.username = data.storeName;
    }
    
    if (data.businessName !== undefined) {
      updateData.company_name = data.businessName;
    }
    
    if (data.businessEmail !== undefined) {
      updateData.contact_email = data.businessEmail;
    }
    
    if (data.brandColor !== undefined) {
      updateData.store_banner = data.brandColor;
    }
    
    if (data.logoUrl !== undefined) {
      updateData.store_logo = data.logoUrl;
    }

    const user = await this.prisma.users.update({
      where: { id: userId },
      data: updateData,
    });

    return this.mapSellerAccountFromPrisma(user);
  }

  async getSeller(sellerId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: sellerId },
    });

    if (!user) {
      throw new GraphQLError('Seller not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (user.role !== 'seller' && user.user_type !== 'seller') {
      throw new GraphQLError('User is not a seller', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.mapSellerAccountFromPrisma(user);
  }

  async getStore(slug: string) {
    const user = await this.prisma.users.findFirst({
      where: { 
        username: slug,
      },
    });

    if (!user) {
      throw new GraphQLError('Store not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapSellerAccountFromPrisma(user);
  }

  async getStorePublicProfile(slug: string) {
    // CRITICAL FIX: Public-safe version that only returns storefront data (no PII)
    const user = await this.prisma.users.findFirst({
      where: { 
        username: slug,
      },
    });

    if (!user) {
      throw new GraphQLError('Store not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // PUBLIC-SAFE: Only return fields appropriate for public storefronts
    return {
      id: user.id,
      userId: user.id,
      storeName: user.username || '',
      storeSlug: user.username || '',
      businessName: user.company_name,
      // EXCLUDED: businessEmail (PII)
      // EXCLUDED: businessPhone (PII)
      // EXCLUDED: stripeAccountId (sensitive)
      subscriptionTier: this.mapSubscriptionTier(user.subscription_plan),
      brandColor: user.store_banner,
      logoUrl: user.store_logo,
      notificationSettings: null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async getBuyerProfile(userId: string) {
    const buyerProfile = await this.prisma.buyer_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!buyerProfile) {
      throw new GraphQLError('Buyer profile not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapBuyerProfileFromPrisma(buyerProfile);
  }

  /**
   * Get seller account for @ResolveField
   * NEW METHOD: Extracted from resolver to service
   */
  async getSellerAccountForUser(userId: string, userData: any) {
    if (!userData) return null;
    
    return {
      id: userData.id,
      userId: userData.id,
      storeName: userData.username || '',
      storeSlug: userData.username || '',
      businessName: userData.company_name,
      businessEmail: userData.contact_email,
      businessPhone: userData.business_phone,
      stripeAccountId: userData.stripe_connected_account_id,
      subscriptionTier: this.mapSubscriptionTier(userData.subscription_plan),
      brandColor: userData.store_banner,
      logoUrl: userData.store_logo,
      notificationSettings: null,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };
  }

  private mapUserFromPrisma(user: any) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
      userType: user.user_type || (user.role === 'seller' ? 'SELLER' : 'BUYER'),
      profileImageUrl: user.profile_image_url,
      phoneNumber: user.phone_number || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  private mapSellerAccountFromPrisma(user: any) {
    return {
      id: user.id,
      userId: user.id,
      storeName: user.username || '',
      storeSlug: user.username || '',
      businessName: user.company_name,
      businessEmail: user.contact_email,
      businessPhone: user.business_phone,
      stripeAccountId: user.stripe_connected_account_id,
      subscriptionTier: this.mapSubscriptionTier(user.subscription_plan),
      brandColor: user.store_banner,
      logoUrl: user.store_logo,
      notificationSettings: null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  private mapBuyerProfileFromPrisma(profile: any) {
    return {
      id: profile.id,
      userId: profile.user_id,
      companyName: profile.company_name,
      vatNumber: profile.vat_number,
      billingAddress: profile.billing_address,
      shippingAddress: profile.shipping_address,
      defaultPaymentTerms: profile.default_payment_terms,
      creditLimit: profile.credit_limit,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  /**
   * Map subscription tier helper
   * MOVED FROM RESOLVER: This is business logic
   */
  mapSubscriptionTier(plan: string | null): string {
    if (!plan) return 'FREE';
    const upperPlan = plan.toUpperCase();
    if (['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(upperPlan)) {
      return upperPlan;
    }
    return 'FREE';
  }
}
