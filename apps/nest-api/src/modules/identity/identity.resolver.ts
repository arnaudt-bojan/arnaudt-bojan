import { Resolver, Query, Mutation, Args, ResolveField, Parent, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { GraphQLContext } from '../../types/context';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserTypeGuard } from '../auth/guards/user-type.guard';
import { RequireUserType } from '../auth/decorators/require-user-type.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileInput } from './dto/update-profile.input';
import { UpdateSellerAccountInput } from './dto/update-seller-account.input';

@Resolver('User')
export class IdentityResolver {
  constructor(private identityService: IdentityService) {}

  private mapSubscriptionTier(plan: string | null): string {
    if (!plan) return 'FREE';
    const upperPlan = plan.toUpperCase();
    if (['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(upperPlan)) {
      return upperPlan;
    }
    return 'FREE';
  }

  @Query('whoami')
  @UseGuards(GqlAuthGuard)
  async whoami(@CurrentUser() userId: string): Promise<string> {
    return userId;
  }

  @Query('getCurrentUser')
  @UseGuards(GqlAuthGuard)
  async getCurrentUser(@CurrentUser() userId: string) {
    return this.identityService.getCurrentUser(userId);
  }

  @Query('getUser')
  async getUser(@Args('id') id: string) {
    return this.identityService.getUser(id);
  }

  @Query('getSeller')
  async getSeller(@Args('id') id: string) {
    return this.identityService.getSeller(id);
  }

  @Query('getStore')
  async getStore(@Args('slug') slug: string) {
    return this.identityService.getStore(slug);
  }

  @Query('getBuyerProfile')
  async getBuyerProfile(@Args('userId') userId: string) {
    return this.identityService.getBuyerProfile(userId);
  }

  @Mutation('updateProfile')
  @UseGuards(GqlAuthGuard)
  async updateProfile(
    @Args('input') input: UpdateProfileInput,
    @CurrentUser() userId: string,
  ) {
    return this.identityService.updateProfile(userId, input);
  }

  @Mutation('updateSellerAccount')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async updateSellerAccount(
    @Args('input') input: UpdateSellerAccountInput,
    @CurrentUser() userId: string,
  ) {
    return this.identityService.updateSellerAccount(userId, input);
  }

  @ResolveField('sellerAccount')
  async sellerAccount(@Parent() user: any, @Context() context: GraphQLContext) {
    if (user.userType === 'SELLER' || user.role === 'seller') {
      const userData = await context.userLoader.load(user.id);
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
    return null;
  }

  @ResolveField('buyerProfile')
  async buyerProfile(@Parent() user: any, @Context() context: GraphQLContext) {
    if (user.userType === 'BUYER' || user.role === 'buyer' || user.role === 'customer') {
      try {
        const profile = await context.buyerProfileLoader.load(user.id);
        if (!profile) return null;
        
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
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  @ResolveField('teamMemberships')
  async teamMemberships(@Parent() user: any) {
    return [];
  }
}

@Resolver('SellerAccount')
export class SellerAccountResolver {
  constructor(private identityService: IdentityService) {}

  @ResolveField('user')
  async user(@Parent() sellerAccount: any, @Context() context: GraphQLContext) {
    const userData = await context.userLoader.load(sellerAccount.userId);
    if (!userData) return null;
    
    return {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      fullName: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || null,
      userType: userData.user_type || (userData.role === 'seller' ? 'SELLER' : 'BUYER'),
      profileImageUrl: userData.profile_image_url,
      phoneNumber: userData.phone_number || null,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };
  }

  @ResolveField('homepage')
  async homepage(@Parent() sellerAccount: any) {
    return null;
  }

  @ResolveField('domains')
  async domains(@Parent() sellerAccount: any) {
    return [];
  }
}

@Resolver('BuyerProfile')
export class BuyerProfileResolver {
  constructor(private identityService: IdentityService) {}

  @ResolveField('user')
  async user(@Parent() buyerProfile: any, @Context() context: GraphQLContext) {
    const userData = await context.userLoader.load(buyerProfile.userId);
    if (!userData) return null;
    
    return {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      fullName: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || null,
      userType: userData.user_type || (userData.role === 'seller' ? 'SELLER' : 'BUYER'),
      profileImageUrl: userData.profile_image_url,
      phoneNumber: userData.phone_number || null,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };
  }
}
