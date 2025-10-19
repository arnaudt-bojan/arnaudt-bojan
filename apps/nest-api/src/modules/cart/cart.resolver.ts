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
import { CartService } from './cart.service';
import { GraphQLContext } from '../../types/context';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver('Cart')
export class CartResolver {
  constructor(private cartService: CartService) {}

  @Query('getCart')
  async getCart(@Args('id') id: string) {
    return this.cartService.getCart(id);
  }

  @Query('getCartBySession')
  async getCartBySession(@Args('sessionId') sessionId: string) {
    return this.cartService.getCartBySessionId(sessionId);
  }

  @Mutation('addToCart')
  async addToCart(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    // Extract sessionId from context if available
    const sessionId = input.sessionId || context.req?.session?.id;
    return this.cartService.addToCart(input, sessionId);
  }

  @Mutation('updateCartItem')
  async updateCartItem(
    @Args('cartId') cartId: string,
    @Args('input') input: any,
  ) {
    return this.cartService.updateCartItem(cartId, input);
  }

  @Mutation('removeFromCart')
  async removeFromCart(
    @Args('cartId') cartId: string,
    @Args('productId') productId: string,
    @Args('variantId') variantId?: string,
  ) {
    return this.cartService.removeFromCart(cartId, productId, variantId);
  }

  @Mutation('clearCart')
  async clearCart(@Args('cartId') cartId: string) {
    return this.cartService.clearCart(cartId);
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
}
