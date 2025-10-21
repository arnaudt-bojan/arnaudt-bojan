import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsNumber, Min } from 'class-validator';

@InputType()
export class CreateWholesaleInvitationInput {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  buyerEmail: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  buyerName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  buyerCompany?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Min(100)
  discountPercentage?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderValue?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
