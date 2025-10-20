/**
 * Product DTOs
 * 
 * Strongly-typed DTOs for product endpoints
 * - CreateProductDto: POST /api/products
 * - UpdateProductDto: PATCH /api/products/:id
 * - BulkCreateProductDto: POST /api/products/bulk
 */

import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsUrl,
  IsInt
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  IsCurrencyAmount,
  IsNonNegativeInteger,
  IsSKU,
  IsUUIDv4
} from '../shared/decorators';

/**
 * Product Variant nested DTO
 */
export class ProductVariantDto {
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsSKU()
  sku?: string;

  @IsOptional()
  @IsNonNegativeInteger()
  stock?: number;

  @IsOptional()
  @IsCurrencyAmount()
  priceCents?: number;

  @IsOptional()
  @IsString()
  image?: string;
}

/**
 * Shipping Dimensions nested DTO
 */
export class ShippingDimensionsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsString()
  weightUnit?: string;

  @IsOptional()
  @IsString()
  dimensionUnit?: string;
}

/**
 * Create Product DTO - POST /api/products
 */
export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsCurrencyAmount()
  priceCents!: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsNonNegativeInteger()
  stock?: number;

  @IsOptional()
  @IsSKU()
  productSku?: string;

  @IsOptional()
  @IsEnum(['physical', 'digital', 'service'])
  productType?: string;

  @IsOptional()
  @IsEnum(['flat_rate', 'free', 'calculated', 'shippo'])
  shippingType?: string;

  @IsOptional()
  @IsCurrencyAmount()
  shippingCostCents?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingDimensionsDto)
  shippingDimensions?: ShippingDimensionsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  promotionPercentage?: number;

  @IsOptional()
  @IsBoolean()
  promotionActive?: boolean;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  metaKeywords?: string;
}

/**
 * Update Product DTO - PATCH /api/products/:id
 * All fields optional for partial updates
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsCurrencyAmount()
  priceCents?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsNonNegativeInteger()
  stock?: number;

  @IsOptional()
  @IsSKU()
  productSku?: string;

  @IsOptional()
  @IsEnum(['physical', 'digital', 'service'])
  productType?: string;

  @IsOptional()
  @IsEnum(['flat_rate', 'free', 'calculated', 'shippo'])
  shippingType?: string;

  @IsOptional()
  @IsCurrencyAmount()
  shippingCostCents?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingDimensionsDto)
  shippingDimensions?: ShippingDimensionsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  promotionPercentage?: number;

  @IsOptional()
  @IsBoolean()
  promotionActive?: boolean;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  metaKeywords?: string;
}

/**
 * Bulk Create Products DTO - POST /api/products/bulk
 */
export class BulkCreateProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products!: CreateProductDto[];
}
