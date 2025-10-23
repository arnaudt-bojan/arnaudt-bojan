import { Resolver, Query, Mutation, Args, ResolveField, Parent, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { IdentityService } from './identity.service';
import { GraphQLContext } from '../../types/context';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserTypeGuard } from '../auth/guards/user-type.guard';
import { RequireUserType } from '../auth/decorators/require-user-type.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileInput } from './dto/update-profile.input';
import { UpdateSellerAccountInput } from './dto/update-seller-account.input';

/**
 * IdentityResolver - Thin layer that delegates to IdentityService
 * Architecture 3 Compliance: All business logic moved to service
 */
@Resolver('User')
export class IdentityResolver {
  constructor(private identityService: IdentityService) {}

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
  @UseGuards(GqlAuthGuard)
  async getUser(
    @Args('id') id: string,
    @CurrentUser() currentUserId: string,
  ) {
    // CRITICAL FIX: Only allow users to query themselves (prevent PII enumeration)
    if (id !== currentUserId) {
      throw new GraphQLError('Access denied', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    return this.identityService.getUser(id);
  }

  @Query('getSeller')
  @UseGuards(GqlAuthGuard)
  async getSeller(
    @Args('id') id: string,
    @CurrentUser() currentUserId: string,
  ) {
    // CRITICAL FIX: Only allow sellers to query themselves (prevent business email/phone exposure)
    if (id !== currentUserId) {
      throw new GraphQLError('Access denied', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    return this.identityService.getSeller(id);
  }

  @Query('getStore')
  async getStore(@Args('slug') slug: string) {
    // PUBLIC QUERY: Returns only storefront-safe fields (no PII)
    return this.identityService.getStorePublicProfile(slug);
  }

  @Query('getSellerByUsername')
  async getSellerByUsername(@Args('username') username: string) {
    // PUBLIC QUERY: Returns seller user with public seller account info
    return this.identityService.getSellerByUsername(username);
  }

  @Query('getBuyerProfile')
  @UseGuards(GqlAuthGuard)
  async getBuyerProfile(
    @Args('userId') userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    // CRITICAL FIX: Only allow buyers to query themselves (prevent PII exposure)
    if (userId !== currentUserId) {
      throw new GraphQLError('Access denied', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
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
      // DELEGATE TO SERVICE: Business logic moved from resolver to service
      return this.identityService.getSellerAccountForUser(user.id, userData);
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
      phoneNumber: null, // TODO: Add phone_number field to users table
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
      phoneNumber: null, // TODO: Add phone_number field to users table
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
    };
  }
}
