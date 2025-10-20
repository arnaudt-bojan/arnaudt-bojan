/**
 * Cart DTOs
 * 
 * Strongly-typed DTOs for cart endpoints
 * - AddToCartDto: POST /api/cart/add
 * - UpdateCartItemDto: PATCH /api/cart/:itemId
 * - RemoveFromCartDto: DELETE /api/cart/:itemId
 */

import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsPositiveInteger, IsUUIDv4 } from '../shared/decorators';

/**
 * Cart Item Variant nested DTO
 */
export class CartItemVariantDto {
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

/**
 * Add to Cart DTO - POST /api/cart/add
 */
export class AddToCartDto {
  @IsUUIDv4()
  productId!: string;

  @IsPositiveInteger()
  @Min(1)
  @Max(10000)
  quantity!: number;

  @IsOptional()
  @IsUUIDv4()
  variantId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CartItemVariantDto)
  variant?: CartItemVariantDto;
}

/**
 * Update Cart Item DTO - PATCH /api/cart/:itemId
 */
export class UpdateCartItemDto {
  @IsPositiveInteger()
  @Min(1)
  @Max(10000)
  quantity!: number;
}

/**
 * Clear Cart DTO - POST /api/cart/clear
 * (No body needed, but included for consistency)
 */
export class ClearCartDto {
  // Empty - just marks the endpoint
}
