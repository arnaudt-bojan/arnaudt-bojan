import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsArray, IsNumber, IsEmail, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
class QuotationLineItemInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  productId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @Field()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

@InputType()
export class CreateQuotationInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  buyerName: string;

  @Field()
  @IsNotEmpty()
  @IsEmail()
  buyerEmail: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  buyerCompany?: string;

  @Field(() => [QuotationLineItemInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemInput)
  lineItems: QuotationLineItemInput[];

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
