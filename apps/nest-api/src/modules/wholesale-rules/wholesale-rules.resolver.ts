import { Resolver, Query, Args } from '@nestjs/graphql';
import { WholesaleRulesService } from './wholesale-rules.service';

@Resolver()
export class WholesaleRulesResolver {
  constructor(private wholesaleRulesService: WholesaleRulesService) {}

  @Query('calculateWholesaleDeposit')
  async calculateWholesaleDeposit(
    @Args('orderValue') orderValue: number,
    @Args('depositPercentage') depositPercentage: number,
  ) {
    return this.wholesaleRulesService.calculateDeposit(orderValue, depositPercentage);
  }

  @Query('calculateWholesaleBalance')
  async calculateWholesaleBalance(
    @Args('orderValue') orderValue: number,
    @Args('depositPaid') depositPaid: number,
  ) {
    return this.wholesaleRulesService.calculateBalance(orderValue, depositPaid);
  }

  @Query('validateWholesaleOrder')
  async validateWholesaleOrder(
    @Args('invitationId') invitationId: string,
    @Args('items') items: any[],
    @Args('paymentTerms') paymentTerms: string,
  ) {
    return this.wholesaleRulesService.validateWholesaleOrder(invitationId, items, paymentTerms);
  }

  @Query('calculatePaymentDueDate')
  async calculatePaymentDueDate(
    @Args('orderDate') orderDate: string,
    @Args('paymentTerms') paymentTerms: string,
  ) {
    const dueDate = await this.wholesaleRulesService.calculatePaymentDueDate(
      new Date(orderDate),
      paymentTerms,
    );
    return dueDate.toISOString();
  }
}
