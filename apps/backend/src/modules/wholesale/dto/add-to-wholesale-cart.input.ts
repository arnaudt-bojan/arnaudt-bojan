import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsInt, IsString, Min } from 'class-validator';

@InputType()
export class AddToWholesaleCartInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  productId: string;

  @Field()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;

  @Field()
  @IsNotEmpty()
  @IsString()
  sellerId: string;
}
