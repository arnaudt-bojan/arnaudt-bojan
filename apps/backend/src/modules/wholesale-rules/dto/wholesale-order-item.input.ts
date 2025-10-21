import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

@InputType()
export class WholesaleOrderItemInput {
  @Field()
  @IsString()
  productId: string;

  @Field()
  @IsNumber()
  @Min(1)
  quantity: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
