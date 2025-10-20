/**
 * Wholesale DTOs
 * 
 * Strongly-typed DTOs for wholesale B2B endpoints
 * - CreateInvitationDto: POST /api/wholesale/invitations
 * - CreateWholesaleOrderDto: POST /api/wholesale/orders
 * - CreateDepositPaymentDto: POST /api/wholesale/orders/:id/deposit
 */

import { 
  IsString, 
  IsEmail,
  IsNumber, 
  IsOptional, 
  IsEnum,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsDateString,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  IsCurrencyAmount, 
  IsPositiveInteger,
  IsPercentage,
  IsCountryCode,
  IsPostalCode,
  IsPhoneNumber,
  IsUUIDv4
} from '../shared/decorators';

/**
 * Wholesale Invitation DTO - POST /api/wholesale/invitations
 */
export class CreateWholesaleInvitationDto {
  @IsEmail()
  buyerEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  buyerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  buyerCompanyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customMessage?: string;

  @IsOptional()
  @IsPercentage()
  discountPercentage?: number;

  @IsOptional()
  @IsPositiveInteger()
  minimumOrderValue?: number;
}

/**
 * Wholesale Product Item nested DTO
 */
export class WholesaleOrderItemDto {
  @IsUUIDv4()
  productId!: string;

  @IsString()
  @MinLength(1)
  productName!: string;

  @IsOptional()
  @IsString()
  productImage?: string;

  @IsOptional()
  @IsString()
  productSku?: string;

  @IsPositiveInteger()
  @Min(1)
  quantity!: number;

  @IsPositiveInteger()
  @Min(1)
  moq!: number;

  @IsCurrencyAmount()
  unitPriceCents!: number;

  @IsCurrencyAmount()
  subtotalCents!: number;

  @IsOptional()
  variant?: any;
}

/**
 * Wholesale Order Data nested DTO
 */
export class WholesaleOrderDataDto {
  @IsCurrencyAmount()
  subtotalCents!: number;

  @IsOptional()
  @IsCurrencyAmount()
  taxAmountCents?: number;

  @IsCurrencyAmount()
  totalCents!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  exchangeRate?: string;

  @IsCurrencyAmount()
  depositAmountCents!: number;

  @IsCurrencyAmount()
  balanceAmountCents!: number;

  @IsOptional()
  @IsPercentage()
  depositPercentage?: number;

  @IsOptional()
  @IsPercentage()
  balancePercentage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentTerms?: string;

  @IsOptional()
  @IsDateString()
  expectedShipDate?: string;

  @IsOptional()
  @IsDateString()
  balancePaymentDueDate?: string;

  @IsOptional()
  @IsDateString()
  orderDeadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  poNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  vatNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  incoterms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  buyerCompanyName?: string;

  @IsEmail()
  buyerEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  buyerName?: string;
}

/**
 * Create Wholesale Order DTO - POST /api/wholesale/orders
 */
export class CreateWholesaleOrderDto {
  @ValidateNested()
  @Type(() => WholesaleOrderDataDto)
  orderData!: WholesaleOrderDataDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WholesaleOrderItemDto)
  items!: WholesaleOrderItemDto[];
}

/**
 * Create Deposit Payment DTO - POST /api/wholesale/orders/:id/deposit
 */
export class CreateDepositPaymentDto {
  @IsCurrencyAmount()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

/**
 * Create Balance Payment DTO - POST /api/wholesale/orders/:id/balance
 */
export class CreateBalancePaymentDto {
  @IsCurrencyAmount()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

/**
 * Update Wholesale Order Status DTO - PATCH /api/wholesale/orders/:id/status
 */
export class UpdateWholesaleOrderStatusDto {
  @IsEnum(['pending', 'deposit_paid', 'balance_due', 'fully_paid', 'processing', 'shipped', 'delivered', 'cancelled'])
  status!: string;
}

/**
 * Wholesale Cart Add Item DTO - POST /api/wholesale/cart/add
 */
export class AddToWholesaleCartDto {
  @IsUUIDv4()
  productId!: string;

  @IsPositiveInteger()
  @Min(1)
  @Max(100000)
  quantity!: number;

  @IsOptional()
  @IsUUIDv4()
  variantId?: string;
}
