import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';

export enum ProductSortField {
  CreatedAt = 'created_at',
  UpdatedAt = 'updated_at',
  Price = 'price',
  Name = 'name',
  Stock = 'stock'
}

export enum ProductSortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

@InputType()
export class ProductFilterInput {
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
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}

@InputType()
export class ProductSortInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(ProductSortField)
  field?: ProductSortField;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(ProductSortDirection)
  direction?: ProductSortDirection;
}
