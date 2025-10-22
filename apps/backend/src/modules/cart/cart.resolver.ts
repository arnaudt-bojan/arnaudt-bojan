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
import { GraphQLError } from 'graphql';
import { CartService } from './cart.service';
import { PricingService } from '../pricing/pricing.service';
import { GraphQLContext } from '../../types/context';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddToCartInput } from './dto/add-to-cart.input';
import { UpdateCartItemInput } from './dto/update-cart-item.input';
import { DomainError } from '../../common/errors/domain-error';

@Resolver('Cart')
export class CartResolver {
  constructor(
    private cartService: CartService,
    private pricingService: PricingService,
  ) {}

  @Query('getCart')
  @UseGuards(GqlAuthGuard)
  async getCart(
    @Args('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.cartService.getCart(id, user.id);
  }

  @Query('getCartBySession')
  async getCartBySession(@Args('sessionId') sessionId: string) {
    return this.cartService.getCartBySessionId(sessionId);
  }

  @Mutation('addToCart')
  async addToCart(
    @Args('input') input: AddToCartInput,
    @Context() context: GraphQLContext,
  ) {
    // Extract sessionId from context if available
    const sessionId = input.sessionId || context.req?.session?.id;
    return this.cartService.addToCart(input, sessionId);
  }

  @Mutation('updateCartItem')
  @UseGuards(GqlAuthGuard)
  async updateCartItem(
    @Args('cartId') cartId: string,
    @Args('input') input: UpdateCartItemInput,
    @CurrentUser() user: any,
  ) {
    return this.cartService.updateCartItem(cartId, input, user.id);
  }

  @Mutation('removeFromCart')
  @UseGuards(GqlAuthGuard)
  async removeFromCart(
    @Args('cartId') cartId: string,
    @Args('productId') productId: string,
    @Args('variantId') variantId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.cartService.removeFromCart(cartId, productId, variantId, user.id);
  }

  @Mutation('clearCart')
  @UseGuards(GqlAuthGuard)
  async clearCart(
    @Args('cartId') cartId: string,
    @CurrentUser() user: any,
  ) {
    return this.cartService.clearCart(cartId, user.id);
  }

  @ResolveField('seller')
  async seller(@Parent() cart: any, @Context() context: GraphQLContext) {
    if (!cart.sellerId) return null;
    return context.sellerLoader.load(cart.sellerId);
  }

  @ResolveField('buyer')
  async buyer(@Parent() cart: any, @Context() context: GraphQLContext) {
    if (!cart.buyerId) return null;
    return context.buyerLoader.load(cart.buyerId);
  }

  @ResolveField('items')
  async items(@Parent() cart: any) {
    return (cart.items || []).map((item: any) => ({
      productId: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.price,
      lineTotal: (parseFloat(item.price) * item.quantity).toFixed(2),
    }));
  }

  @ResolveField('totals')
  async totals(@Parent() cart: any) {
    try {
      return await this.pricingService.calculateCartTotals(cart.id);
    } catch (error) {
      // Let GraphQLExceptionFilter handle DomainErrors with proper codes
      if (error instanceof DomainError) {
        throw error;
      }
      // Wrap unexpected errors
      throw new GraphQLError('Failed to calculate cart totals', {
        extensions: {
          code: 'CART_CALCULATION_ERROR',
          httpStatus: 500,
        },
      });
    }
  }
}
