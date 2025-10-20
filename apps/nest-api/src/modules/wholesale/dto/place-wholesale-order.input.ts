import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsArray, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
class WholesaleOrderItemInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  productId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  variantId?: string;

  @Field()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

@InputType()
class WholesaleShippingAddressInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  addressLine1: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  city: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  state: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  country: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;
}

@InputType()
export class PlaceWholesaleOrderInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  sellerId: string;

  @Field(() => [WholesaleOrderItemInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WholesaleOrderItemInput)
  items: WholesaleOrderItemInput[];

  @Field(() => WholesaleShippingAddressInput)
  @ValidateNested()
  @Type(() => WholesaleShippingAddressInput)
  shippingAddress: WholesaleShippingAddressInput;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositPercentage?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
