import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class CalculatedQuotationLineItem {
  @Field()
  description: string;

  @Field()
  unitPrice: number;

  @Field()
  quantity: number;

  @Field()
  lineTotal: number;
}

@ObjectType()
export class CalculatedQuotationTotals {
  @Field(() => [CalculatedQuotationLineItem])
  lineItems: CalculatedQuotationLineItem[];

  @Field()
  subtotal: number;

  @Field()
  taxAmount: number;

  @Field()
  shippingAmount: number;

  @Field()
  total: number;

  @Field()
  depositAmount: number;

  @Field()
  depositPercentage: number;

  @Field()
  balanceAmount: number;
}
