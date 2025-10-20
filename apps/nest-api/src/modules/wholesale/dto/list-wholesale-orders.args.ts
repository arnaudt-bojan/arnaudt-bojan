import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum WholesaleOrderStatus {
  Pending = 'pending',
  DepositPaid = 'deposit_paid',
  InProduction = 'in_production',
  ReadyToShip = 'ready_to_ship',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

@InputType()
export class WholesaleOrderFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  buyerId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(WholesaleOrderStatus)
  status?: WholesaleOrderStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
