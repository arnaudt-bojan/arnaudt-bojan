import { InputType, Field } from '@nestjs/graphql';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CalculateQuotationLineItemInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  description: string;

  @Field()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @Field()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}

@InputType()
export class CalculateQuotationTotalsInput {
  @Field(() => [CalculateQuotationLineItemInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculateQuotationLineItemInput)
  lineItems: CalculateQuotationLineItemInput[];

  @Field({ nullable: true })
  @IsInt()
  @Min(0)
  @Max(100)
  depositPercentage?: number;

  @Field({ nullable: true })
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @Field({ nullable: true })
  @IsNumber()
  @Min(0)
  shippingAmount?: number;
}
