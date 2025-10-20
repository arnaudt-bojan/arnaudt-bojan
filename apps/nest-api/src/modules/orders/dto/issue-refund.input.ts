import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

@InputType()
export class IssueRefundInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @Field()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
