import { Resolver, Query, Mutation, Args, ResolveField, Parent, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { GraphQLContext } from '../../types/context';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserTypeGuard } from '../auth/guards/user-type.guard';
import { RequireUserType } from '../auth/decorators/require-user-type.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
    @Args('fullName') fullName?: string,
    @Args('username') username?: string,
    @Args('phoneNumber') phoneNumber?: string,
    @Args('profileImageUrl') profileImageUrl?: string,
    @CurrentUser() userId?: string,
  ) {
    return this.identityService.updateProfile(userId!, {
      fullName,
      username,
      phoneNumber,
      profileImageUrl,
    });
  }

  @Mutation('updateSellerAccount')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async updateSellerAccount(
    @Args('storeName') storeName?: string,
    @Args('businessName') businessName?: string,
    @Args('businessEmail') businessEmail?: string,
    @Args('brandColor') brandColor?: string,
    @Args('logoUrl') logoUrl?: string,
    @CurrentUser() userId?: string,
  ) {
    return this.identityService.updateSellerAccount(userId!, {
      storeName,
      businessName,
      businessEmail,
      brandColor,
      logoUrl,
    });
  }

  @ResolveField('sellerAccount')
  async sellerAccount(@Parent() user: any) {
    if (user.userType === 'SELLER' || user.role === 'seller') {
      return this.identityService.getSeller(user.id);
    }
    return null;
  }

  @ResolveField('buyerProfile')
  async buyerProfile(@Parent() user: any) {
    if (user.userType === 'BUYER' || user.role === 'buyer' || user.role === 'customer') {
      try {
        return await this.identityService.getBuyerProfile(user.id);
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
  async user(@Parent() sellerAccount: any) {
    return this.identityService.getUser(sellerAccount.userId);
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
  async user(@Parent() buyerProfile: any) {
    return this.identityService.getUser(buyerProfile.userId);
  }
}
