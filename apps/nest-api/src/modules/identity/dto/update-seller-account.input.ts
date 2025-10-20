import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsEmail } from 'class-validator';

@InputType()
export class UpdateSellerAccountInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  storeName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  businessName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  brandColor?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
