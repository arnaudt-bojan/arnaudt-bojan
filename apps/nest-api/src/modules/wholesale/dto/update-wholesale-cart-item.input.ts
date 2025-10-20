import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsInt, IsString, Min } from 'class-validator';

@InputType()
export class UpdateWholesaleCartItemInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  itemId: string;

  @Field()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}
