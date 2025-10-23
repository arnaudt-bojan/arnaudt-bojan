import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

@InputType()
export class AddToCartInput {
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

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
