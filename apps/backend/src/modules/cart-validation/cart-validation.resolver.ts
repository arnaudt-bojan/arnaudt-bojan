import { Resolver, Query, Args } from '@nestjs/graphql';
import { CartValidationService } from './cart-validation.service';

@Resolver()
export class CartValidationResolver {
  constructor(private cartValidationService: CartValidationService) {}

  @Query('validateCart')
  async validateCart(@Args('cartId') cartId: string) {
    return this.cartValidationService.validateCart(cartId);
  }

  @Query('validateWholesaleCart')
  async validateWholesaleCart(@Args('cartId') cartId: string) {
    return this.cartValidationService.validateWholesaleCart(cartId);
  }
}
