import { Resolver, Query, Args } from '@nestjs/graphql';
import { PricingService } from './pricing.service';

@Resolver()
export class PricingResolver {
  constructor(private pricingService: PricingService) {}

  @Query('getExchangeRate')
  async getExchangeRate(
    @Args('from') from: string,
    @Args('to') to: string,
  ) {
    return this.pricingService.getExchangeRateDetails(from, to);
  }

  @Query('calculatePrice')
  async calculatePrice(
    @Args('amount') amount: number,
    @Args('fromCurrency') fromCurrency: string,
    @Args('toCurrency') toCurrency: string,
  ): Promise<number> {
    return this.pricingService.convertPrice(amount, fromCurrency, toCurrency);
  }
}
