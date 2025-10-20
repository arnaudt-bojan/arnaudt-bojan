/**
 * Trade Quotation DTOs
 * 
 * Strongly-typed DTOs for quotation endpoints
 * - CreateQuotationDto: POST /api/quotations
 * - UpdateQuotationDto: PATCH /api/quotations/:id
 * - SendQuotationDto: POST /api/quotations/:id/send
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
  IsUrl,
  IsDateString,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  IsCurrencyAmount, 
  IsPositiveInteger,
  IsPercentage,
  IsUUIDv4
} from '../shared/decorators';

/**
 * Quotation Item nested DTO
 */
export class QuotationItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsUUIDv4()
  productId?: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsPositiveInteger()
  @Min(1)
  quantity!: number;
}

/**
 * Create Quotation DTO - POST /api/quotations
 */
export class CreateQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quotationNumber?: string;

  @IsEmail()
  buyerEmail!: string;

  @IsOptional()
  @IsUUIDv4()
  buyerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsPercentage()
  depositPercentage?: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deliveryTerms?: string;

  @IsOptional()
  @IsUrl()
  dataSheetUrl?: string;

  @IsOptional()
  @IsUrl()
  termsAndConditionsUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items!: QuotationItemDto[];
}

/**
 * Update Quotation DTO - PATCH /api/quotations/:id
 * All fields optional for partial updates
 */
export class UpdateQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quotationNumber?: string;

  @IsOptional()
  @IsEmail()
  buyerEmail?: string;

  @IsOptional()
  @IsUUIDv4()
  buyerId?: string;

  @IsOptional()
  @IsPercentage()
  depositPercentage?: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deliveryTerms?: string;

  @IsOptional()
  @IsUrl()
  dataSheetUrl?: string;

  @IsOptional()
  @IsUrl()
  termsAndConditionsUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items?: QuotationItemDto[];
}

/**
 * Send Quotation DTO - POST /api/quotations/:id/send
 */
export class SendQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customMessage?: string;

  @IsOptional()
  @IsEmail()
  ccEmail?: string;
}

/**
 * Update Quotation Status DTO - PATCH /api/quotations/:id/status
 */
export class UpdateQuotationStatusDto {
  @IsEnum(['draft', 'sent', 'viewed', 'accepted', 'deposit_paid', 'balance_due', 'fully_paid', 'completed', 'cancelled', 'expired'])
  status!: string;
}

/**
 * Accept Quotation DTO - POST /api/quotations/:id/accept
 */
export class AcceptQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
