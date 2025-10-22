import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WholesaleService } from './wholesale.service';
import { PricingService } from '../pricing/pricing.service';
import { GraphQLContext } from '../../types/context';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserTypeGuard } from '../auth/guards/user-type.guard';
import { RequireUserType } from '../auth/decorators/require-user-type.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateWholesaleInvitationInput } from './dto/create-wholesale-invitation.input';
import { PlaceWholesaleOrderInput } from './dto/place-wholesale-order.input';
import { AddToWholesaleCartInput } from './dto/add-to-wholesale-cart.input';
import { UpdateWholesaleCartItemInput } from './dto/update-wholesale-cart-item.input';
import { WholesaleOrderFilterInput } from './dto/list-wholesale-orders.args';

@Resolver('WholesaleInvitation')
export class WholesaleInvitationResolver {
  constructor(private wholesaleService: WholesaleService) {}

  @ResolveField('seller')
  async seller(@Parent() invitation: any, @Context() context: GraphQLContext) {
    return context.sellerLoader.load(invitation.sellerId);
  }

  @ResolveField('buyer')
  async buyer(@Parent() invitation: any, @Context() context: GraphQLContext) {
    if (!invitation.buyerId) return null;
    return context.buyerLoader.load(invitation.buyerId);
  }
}

@Resolver('WholesaleAccessGrant')
export class WholesaleAccessGrantResolver {
  constructor(private wholesaleService: WholesaleService) {}

  @ResolveField('seller')
  async seller(@Parent() grant: any, @Context() context: GraphQLContext) {
    return context.sellerLoader.load(grant.sellerId);
  }

  @ResolveField('buyer')
  async buyer(@Parent() grant: any, @Context() context: GraphQLContext) {
    return context.buyerLoader.load(grant.buyerId);
  }

  @ResolveField('pricingTier')
  async pricingTier(@Parent() grant: any) {
    return null;
  }
}

@Resolver('WholesaleOrder')
export class WholesaleOrderResolver {
  constructor(
    private wholesaleService: WholesaleService,
    private pricingService: PricingService,
  ) {}

  @ResolveField('seller')
  async seller(@Parent() order: any, @Context() context: GraphQLContext) {
    return context.sellerLoader.load(order.sellerId);
  }

  @ResolveField('buyer')
  async buyer(@Parent() order: any, @Context() context: GraphQLContext) {
    return context.buyerLoader.load(order.buyerId);
  }

  @ResolveField('items')
  async items(@Parent() order: any, @Context() context: GraphQLContext) {
    return context.wholesaleOrderItemsLoader.load(order.id);
  }

  @ResolveField('events')
  async events(@Parent() order: any, @Context() context: GraphQLContext) {
    return context.wholesaleOrderEventsLoader.load(order.id);
  }

  @ResolveField('invoice')
  async invoice(@Parent() order: any) {
    return null;
  }

  @ResolveField('packingSlip')
  async packingSlip(@Parent() order: any) {
    return null;
  }

  @ResolveField('calculatedDepositAmount')
  async calculatedDepositAmount(@Parent() order: any, @Context() context: GraphQLContext): Promise<number> {
    const items = await context.wholesaleOrderItemsLoader.load(order.id);
    const mappedItems = items.map(item => ({
      price: item.unit_price_cents / 100,
      quantity: item.quantity,
    }));
    return this.pricingService.calculateWholesaleDeposit(
      mappedItems,
      order.depositPercentage || 50
    );
  }

  @ResolveField('calculatedBalanceAmount')
  async calculatedBalanceAmount(@Parent() order: any): Promise<number> {
    return this.pricingService.calculateWholesaleBalance(order.id);
  }
}

@Resolver('WholesaleOrderItem')
export class WholesaleOrderItemResolver {
  constructor(private wholesaleService: WholesaleService) {}

  @ResolveField('product')
  async product(@Parent() item: any, @Context() context: GraphQLContext) {
    return null;
  }
}

@Resolver('Query')
export class WholesaleQueryResolver {
  constructor(private wholesaleService: WholesaleService) {}

  @Query('listWholesaleInvitations')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async listWholesaleInvitations(
    @Args('sellerId') sellerId: string | undefined,
    @Args('status') status: string | undefined,
    @Args('first') first: number | undefined,
    @Args('after') after: string | undefined,
    @CurrentUser() userId: string,
  ) {
    const actualSellerId = sellerId || userId;
    const invitations = await this.wholesaleService.getWholesaleInvitations(actualSellerId);

    const filteredInvitations = status
      ? invitations.filter(inv => inv.status === status.toUpperCase())
      : invitations;

    return {
      edges: filteredInvitations.map(node => ({
        cursor: Buffer.from(JSON.stringify({ id: node.id })).toString('base64'),
        node,
      })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: filteredInvitations.length,
    };
  }

  @Query('getWholesaleInvitation')
  async getWholesaleInvitation(@Args('token') token: string) {
    return this.wholesaleService.getWholesaleInvitationByToken(token);
  }

  @Query('listWholesaleOrders')
  @UseGuards(GqlAuthGuard)
  async listWholesaleOrders(
    @Args('filter', { nullable: true }) filter: WholesaleOrderFilterInput,
    @Args('first') first: number | undefined,
    @Args('after') after: string | undefined,
    @CurrentUser() userId: string,
  ) {
    // Service now returns connection-shaped response with proper pagination
    return this.wholesaleService.getWholesaleOrders({
      sellerId: filter?.sellerId,
      buyerId: filter?.buyerId,
      status: filter?.status,
      first,
      after,
    });
  }

  @Query('getWholesaleOrder')
  @UseGuards(GqlAuthGuard)
  async getWholesaleOrder(
    @Args('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.wholesaleService.getWholesaleOrder(id);
  }

  @Query('getWholesaleCart')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('buyer')
  async getWholesaleCart(
    @CurrentUser() userId: string,
    @Args('sellerId') sellerId?: string,
  ) {
    return this.wholesaleService.getWholesaleCart(userId, sellerId);
  }

  @Query('listWholesaleBuyers')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async listWholesaleBuyers(@CurrentUser() userId: string) {
    return this.wholesaleService.listWholesaleBuyers(userId);
  }
}

@Resolver('Mutation')
export class WholesaleMutationResolver {
  constructor(private wholesaleService: WholesaleService) {}

  @Mutation('createWholesaleInvitation')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async createWholesaleInvitation(
    @Args('input') input: CreateWholesaleInvitationInput,
    @CurrentUser() userId: string,
  ) {
    return this.wholesaleService.createWholesaleInvitation(input, userId);
  }

  @Mutation('acceptInvitation')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('buyer')
  async acceptInvitation(
    @Args('token') token: string,
    @CurrentUser() userId: string,
  ) {
    return this.wholesaleService.acceptWholesaleInvitation(token, userId);
  }

  @Mutation('rejectInvitation')
  async rejectInvitation(@Args('token') token: string) {
    return this.wholesaleService.rejectWholesaleInvitation(token);
  }

  @Mutation('placeWholesaleOrder')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('buyer')
  async placeWholesaleOrder(
    @Args('input') input: PlaceWholesaleOrderInput,
    @CurrentUser() userId: string,
  ) {
    return this.wholesaleService.placeWholesaleOrder(input, userId);
  }

  @Mutation('addToWholesaleCart')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('buyer')
  async addToWholesaleCart(
    @Args('input') input: AddToWholesaleCartInput,
    @CurrentUser() userId: string,
  ) {
    return this.wholesaleService.addToWholesaleCart({
      buyerId: userId,
      sellerId: input.sellerId,
      productId: input.productId,
      quantity: input.quantity,
    });
  }

  @Mutation('updateWholesaleCartItem')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('buyer')
  async updateWholesaleCartItem(
    @Args('input') input: UpdateWholesaleCartItemInput,
    @CurrentUser() userId: string,
  ) {
    return this.wholesaleService.updateWholesaleCartItem(
      input.itemId,
      input.quantity,
      userId,
    );
  }

  @Mutation('removeFromWholesaleCart')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('buyer')
  async removeFromWholesaleCart(
    @Args('itemId') itemId: string,
    @CurrentUser() userId: string,
  ) {
    return this.wholesaleService.removeFromWholesaleCart(itemId, userId);
  }

  @Mutation('cancelInvitation')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async cancelInvitation(
    @Args('invitationId') invitationId: string,
    @CurrentUser() userId: string,
  ) {
    return this.wholesaleService.cancelInvitation(invitationId, userId);
  }
}
