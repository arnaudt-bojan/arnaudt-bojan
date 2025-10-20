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
import { QuotationsService } from './quotations.service';
import { PricingService } from '../pricing/pricing.service';
import { GraphQLContext } from '../../types/context';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { UserTypeGuard } from '../auth/guards/user-type.guard';
import { RequireUserType } from '../auth/decorators/require-user-type.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver('Quotation')
export class QuotationsResolver {
  constructor(
    private quotationsService: QuotationsService,
    private pricingService: PricingService,
  ) {}

  @Query('getQuotation')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async getQuotation(
    @Args('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.quotationsService.getQuotation(id);
  }

  @Query('getQuotationByToken')
  async getQuotationByToken(@Args('token') token: string) {
    return this.quotationsService.getQuotationByToken(token);
  }

  @Query('listQuotations')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async listQuotations(@CurrentUser() userId: string) {
    return this.quotationsService.listQuotations(userId);
  }

  @Mutation('createQuotation')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async createQuotation(
    @Args('input') input: any,
    @CurrentUser() userId: string,
  ) {
    return this.quotationsService.createQuotation(input, userId);
  }

  @Mutation('updateQuotation')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async updateQuotation(
    @Args('id') id: string,
    @Args('input') input: any,
    @CurrentUser() userId: string,
  ) {
    return this.quotationsService.updateQuotation(id, input, userId);
  }

  @Mutation('sendQuotation')
  @UseGuards(GqlAuthGuard, UserTypeGuard)
  @RequireUserType('seller')
  async sendQuotation(
    @Args('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.quotationsService.sendQuotation(id, userId);
  }

  @Mutation('acceptQuotation')
  async acceptQuotation(
    @Args('token') token: string,
    @Args('buyerInfo') buyerInfo?: any,
  ) {
    return this.quotationsService.acceptQuotation(token, buyerInfo);
  }

  @ResolveField('seller')
  async seller(@Parent() quotation: any, @Context() context: GraphQLContext) {
    if (!quotation.sellerId) return null;
    return context.sellerLoader.load(quotation.sellerId);
  }

  @ResolveField('buyer')
  async buyer(@Parent() quotation: any, @Context() context: GraphQLContext) {
    if (!quotation.buyerId) return null;
    return context.buyerLoader.load(quotation.buyerId);
  }

  @ResolveField('items')
  async items(@Parent() quotation: any, @Context() context: GraphQLContext) {
    return context.quotationLineItemsLoader.load(quotation.id);
  }

  @ResolveField('activities')
  async activities(@Parent() quotation: any, @Context() context: GraphQLContext) {
    return context.quotationActivitiesLoader.load(quotation.id);
  }

  @ResolveField('payments')
  async payments(@Parent() quotation: any, @Context() context: GraphQLContext) {
    return context.quotationPaymentsLoader.load(quotation.id);
  }

  @ResolveField('order')
  async order(@Parent() quotation: any) {
    return null;
  }

  @ResolveField('calculatedGrandTotal')
  async calculatedGrandTotal(@Parent() quotation: any): Promise<number> {
    return this.pricingService.calculateQuotationGrandTotal(quotation.id);
  }

  @ResolveField('calculatedSubtotal')
  async calculatedSubtotal(@Parent() quotation: any): Promise<number> {
    return this.pricingService.calculateQuotationSubtotal(quotation.id);
  }
}
