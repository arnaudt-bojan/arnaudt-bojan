/**
 * Checkout DTOs
 * 
 * Strongly-typed DTOs for checkout endpoints
 * - InitiateCheckoutDto: POST /api/checkout/initiate
 * - CompleteCheckoutDto: POST /api/checkout/complete
 */

import { 
  IsString, 
  IsEmail,
  IsOptional, 
  ValidateNested,
  MinLength,
  MaxLength,
  IsBoolean,
  IsEnum
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  IsCountryCode, 
  IsPostalCode, 
  IsPhoneNumber,
  IsUUIDv4
} from '../shared/decorators';

/**
 * Checkout Address DTO
 */
export class CheckoutAddressDto {
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
 * Initiate Checkout DTO - POST /api/checkout/initiate
 */
export class InitiateCheckoutDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  shippingAddress!: CheckoutAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  billingAddress?: CheckoutAddressDto;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  saveAddress?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Complete Checkout DTO - POST /api/checkout/complete
 */
export class CompleteCheckoutDto {
  @IsString()
  paymentIntentId!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  shippingAddress?: CheckoutAddressDto;

  @IsOptional()
  @IsBoolean()
  savePaymentMethod?: boolean;
}

/**
 * Create Payment Intent DTO - POST /api/checkout/payment-intent
 */
export class CreatePaymentIntentDto {
  @IsOptional()
  @IsString()
  savedPaymentMethodId?: string;

  @IsOptional()
  @IsBoolean()
  savePaymentMethod?: boolean;
}
