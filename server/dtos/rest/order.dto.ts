/**
 * Order DTOs
 * 
 * Strongly-typed DTOs for order endpoints
 * - CreateOrderDto: POST /api/orders
 * - UpdateOrderDto: PATCH /api/orders/:id
 * - RefundOrderDto: POST /api/orders/:id/refund
 * - UpdateTrackingDto: PATCH /api/orders/:id/tracking
 */

import { 
  IsString, 
  IsEmail, 
  IsNumber, 
  IsOptional, 
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  IsCurrencyAmount, 
  IsPositiveInteger, 
  IsUUIDv4,
  IsCountryCode,
  IsPostalCode,
  IsTrackingNumber
} from '../shared/decorators';

/**
 * Address nested DTO
 */
export class AddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  state!: string;

  @IsPostalCode()
  postalCode!: string;

  @IsCountryCode()
  country!: string;
}

/**
 * Order item variant nested DTO
 */
export class OrderItemVariantDto {
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

/**
 * Order item nested DTO
 */
export class OrderItemDto {
  @IsUUIDv4()
  productId!: string;

  @IsPositiveInteger()
  @Min(1)
  @Max(10000)
  quantity!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderItemVariantDto)
  variant?: OrderItemVariantDto;

  @IsOptional()
  @IsUUIDv4()
  variantId?: string;
}

/**
 * Destination info for shipping calculation
 */
export class DestinationDto {
  @IsCountryCode()
  country!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsPostalCode()
  postalCode?: string;
}

/**
 * Create Order DTO - POST /api/orders
 */
export class CreateOrderDto {
  @IsEmail()
  customerEmail!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  customerName!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  customerAddress!: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ValidateNested()
  @Type(() => DestinationDto)
  destination!: DestinationDto;

  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @IsOptional()
  @IsString()
  amountPaid?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  taxAmount?: string;

  @IsOptional()
  @IsString()
  taxCalculationId?: string;

  @IsOptional()
  @IsObject()
  taxBreakdown?: any;

  @IsOptional()
  @IsString()
  subtotalBeforeTax?: string;
}

/**
 * Update Order Status DTO - PATCH /api/orders/:id/status
 */
export class UpdateOrderStatusDto {
  @IsString()
  @IsEnum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
  status!: string;
}

/**
 * Refund Item DTO (nested)
 */
export class RefundItemDto {
  @IsUUIDv4()
  itemId!: string;

  @IsPositiveInteger()
  @Min(1)
  quantity!: number;
}

/**
 * Refund Order DTO - POST /api/orders/:id/refund
 */
export class RefundOrderDto {
  @IsEnum(['full', 'item'])
  refundType!: 'full' | 'item';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  refundItems?: RefundItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Update Tracking DTO - PATCH /api/orders/:id/tracking
 */
export class UpdateTrackingDto {
  @IsOptional()
  @IsTrackingNumber()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  carrier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingUrl?: string;
}

/**
 * Create Balance Payment DTO - POST /api/orders/:id/balance-payment
 */
export class CreateBalancePaymentDto {
  @IsCurrencyAmount()
  amountCents!: number;
}
