import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

@InputType()
export class UpdateCartItemInput {
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
  @Min(0)
  quantity: number;
}
