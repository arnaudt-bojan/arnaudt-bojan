import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

enum FulfillmentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@InputType()
export class UpdateFulfillmentInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @Field()
  @IsNotEmpty()
  @IsEnum(FulfillmentStatus)
  status: FulfillmentStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  carrier?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
