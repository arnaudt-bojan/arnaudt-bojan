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
import { OrdersService } from './orders.service';
import { PricingService } from '../pricing/pricing.service';
import { OrderPresentationService } from '../order-presentation/order-presentation.service';
import { GraphQLContext } from '../../types/context';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserTypeGuard } from '../auth/guards/user-type.guard';
import { RequireUserType } from '../auth/decorators/require-user-type.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderInput } from './dto/create-order.input';
import { UpdateFulfillmentInput } from './dto/update-fulfillment.input';
import { IssueRefundInput } from './dto/issue-refund.input';
import { GqlRateLimitGuard, RateLimit } from '../auth/guards/gql-rate-limit.guard';

@Resolver('Order')
export class OrdersResolver {
  constructor(
    private ordersService: OrdersService,
    private pricingService: PricingService,
    private orderPresentationService: OrderPresentationService,
  ) {}

  @Query('getOrder')
  @UseGuards(GqlAuthGuard)
  async getOrder(
    @Args('id') id: string,
    @CurrentUser() userId: string,
  ) {
    // CRITICAL FIX: Pass userId for ownership validation
    return this.ordersService.getOrder(id, userId);
  }

  @Query('listOrders')
  @UseGuards(GqlAuthGuard, UserTypeGuard, GqlRateLimitGuard)
  @RequireUserType('seller')
  @RateLimit({ limit: 50, ttl: 60 })
  async listOrders(
    @Args('filter') filter?: any,
    @Args('sort') sort?: any,
    @Args('first') first?: number,
    @Args('after') after?: string,
    @CurrentUser() userId?: string,
  ) {
    const status = filter?.status;

    return this.ordersService.listOrders({
      sellerId: userId,
      buyerId: undefined,
      status,
      first,
      after,
    });
  }

  @Query('getOrdersByBuyer')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('buyer')
  async getOrdersByBuyer(@CurrentUser() userId: string) {
    return this.ordersService.getOrdersByBuyer(userId);
  }

  @Query('getOrdersBySeller')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async getOrdersBySeller(@CurrentUser() userId: string) {
    return this.ordersService.getOrdersBySeller(userId);
  }

  @Mutation('createOrder')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('buyer')
  async createOrder(
    @Args('input') input: CreateOrderInput,
    @CurrentUser() userId: string,
  ) {
    return this.ordersService.createOrder(input, userId);
  }

  @Mutation('updateFulfillment')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async updateFulfillment(
    @Args('input') input: UpdateFulfillmentInput,
    @CurrentUser() userId: string,
  ) {
    return this.ordersService.updateOrderFulfillment(input, userId);
  }

  @Mutation('issueRefund')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async issueRefund(
    @Args('input') input: IssueRefundInput,
    @CurrentUser() userId: string,
  ) {
    return this.ordersService.issueRefund(input, userId);
  }

  @ResolveField('seller')
  async seller(@Parent() order: any, @Context() context: GraphQLContext) {
    if (!order.sellerId) return null;
    return context.sellerLoader.load(order.sellerId);
  }

  @ResolveField('buyer')
  async buyer(@Parent() order: any, @Context() context: GraphQLContext) {
    if (!order.buyerId) return null;
    return context.buyerLoader.load(order.buyerId);
  }

  @ResolveField('items')
  async items(@Parent() order: any, @Context() context: GraphQLContext) {
    return context.orderItemsLoader.load(order.id);
  }

  @ResolveField('events')
  async events(@Parent() order: any) {
    return [];
  }

  @ResolveField('refunds')
  async refunds(@Parent() order: any) {
    return [];
  }

  @ResolveField('calculatedTotal')
  async calculatedTotal(@Parent() order: any): Promise<number> {
    return this.pricingService.calculateOrderTotal(order.id);
  }

  @ResolveField('calculatedTax')
  async calculatedTax(@Parent() order: any): Promise<number> {
    return this.pricingService.calculateTaxForOrder(order.id);
  }

  @ResolveField('presentation')
  async presentation(@Parent() order: any) {
    return this.orderPresentationService.getOrderPresentation(order);
  }
}
