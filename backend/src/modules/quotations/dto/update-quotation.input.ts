import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
class QuotationLineItemInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field()
  @IsString()
  productId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field()
  quantity: number;

  @Field()
  unitPrice: number;
}

@InputType()
export class UpdateQuotationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  buyerName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  buyerEmail?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  buyerCompany?: string;

  @Field(() => [QuotationLineItemInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemInput)
  lineItems?: QuotationLineItemInput[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}
