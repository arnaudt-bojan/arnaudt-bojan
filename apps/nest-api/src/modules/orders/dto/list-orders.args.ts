import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum OrderStatus {
  Pending = 'pending',
  Processing = 'processing',
  Paid = 'paid',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Refunded = 'refunded'
}

export enum OrderSortField {
  CreatedAt = 'created_at',
  UpdatedAt = 'updated_at',
  Total = 'total',
  Status = 'status'
}

export enum OrderSortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

@InputType()
export class OrderFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

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
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

@InputType()
export class OrderSortInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(OrderSortField)
  field?: OrderSortField;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(OrderSortDirection)
  direction?: OrderSortDirection;
}
