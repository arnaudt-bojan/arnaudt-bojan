import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { PrismaService } from '../prisma/prisma.service';
import {
  DepositCalculation,
  BalanceCalculation,
  MOQValidationResult,
  PaymentTermsValidation,
  MinimumValueValidation,
  WholesalePricing,
  WholesaleOrderValidation,
  WholesaleOrderItem,
} from './interfaces/wholesale-rules.interface';

@Injectable()
export class WholesaleRulesService {
  constructor(private prisma: PrismaService) {}

  async calculateDeposit(
    orderValue: number,
    depositPercentage: number,
  ): Promise<DepositCalculation> {
    if (orderValue < 0) {
      throw new Error('Order value cannot be negative');
    }

    if (depositPercentage < 0 || depositPercentage > 100) {
      throw new Error('Deposit percentage must be between 0 and 100');
    }

    const depositAmount = (orderValue * depositPercentage) / 100;
    const balanceAmount = orderValue - depositAmount;

    return {
      orderValue,
      depositPercentage,
      depositAmount: Math.round(depositAmount * 100) / 100,
      balanceAmount: Math.round(balanceAmount * 100) / 100,
    };
  }

  async calculateBalance(
    orderValue: number,
    depositPaid: number,
  ): Promise<BalanceCalculation> {
    if (orderValue < 0 || depositPaid < 0) {
      throw new Error('Values cannot be negative');
    }

    if (depositPaid > orderValue) {
      throw new Error('Deposit paid cannot exceed order value');
    }

    const balanceRemaining = orderValue - depositPaid;
    const balancePercentage = orderValue > 0 ? (balanceRemaining / orderValue) * 100 : 0;

    return {
      orderValue,
      depositPaid,
      balanceRemaining: Math.round(balanceRemaining * 100) / 100,
      balancePercentage: Math.round(balancePercentage * 100) / 100,
    };
  }

  async validatePaymentTerms(
    invitationId: string,
    paymentTerm: string,
  ): Promise<PaymentTermsValidation> {
    const invitation = await this.prisma.wholesale_invitations.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new GraphQLError('Wholesale invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const allowedTerms = ['Net 30', 'Net 60', 'Net 90', 'Immediate'];
    
    let customAllowedTerms = allowedTerms;
    if (invitation.wholesale_terms && typeof invitation.wholesale_terms === 'object') {
      const terms = invitation.wholesale_terms as any;
      if (terms.allowedPaymentTerms && Array.isArray(terms.allowedPaymentTerms)) {
        customAllowedTerms = terms.allowedPaymentTerms;
      }
    }

    const valid = customAllowedTerms.includes(paymentTerm);

    return {
      valid,
      allowedTerms: customAllowedTerms,
      requestedTerm: paymentTerm,
      error: valid ? undefined : `Payment term '${paymentTerm}' is not allowed`,
    };
  }

  async calculatePaymentDueDate(
    orderDate: Date,
    paymentTerms: string,
  ): Promise<Date> {
    const dueDate = new Date(orderDate);

    switch (paymentTerms) {
      case 'Net 30':
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      case 'Net 60':
        dueDate.setDate(dueDate.getDate() + 60);
        break;
      case 'Net 90':
        dueDate.setDate(dueDate.getDate() + 90);
        break;
      case 'Immediate':
        break;
      default:
        throw new Error(`Unknown payment terms: ${paymentTerms}`);
    }

    return dueDate;
  }

  async validateWholesaleMOQ(
    invitationId: string,
    items: WholesaleOrderItem[],
  ): Promise<MOQValidationResult> {
    const errors: string[] = [];
    const itemsFailingMOQ: Array<{
      productId: string;
      productName: string;
      requiredQuantity: number;
      providedQuantity: number;
    }> = [];

    const invitation = await this.prisma.wholesale_invitations.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new GraphQLError('Wholesale invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const productIds = items.map(item => item.productId);
    const wholesaleProducts = await this.prisma.wholesale_products.findMany({
      where: {
        seller_id: invitation.seller_id,
        product_id: { in: productIds },
      },
    });

    const wholesaleProductMap = new Map(
      wholesaleProducts.map(wp => [wp.product_id, wp])
    );

    for (const item of items) {
      const wholesaleProduct = wholesaleProductMap.get(item.productId);

      if (!wholesaleProduct) {
        errors.push(`Wholesale product ${item.productId} not found for this seller`);
        continue;
      }

      const requiredMOQ = wholesaleProduct.moq || 1;

      if (item.quantity < requiredMOQ) {
        errors.push(
          `${wholesaleProduct.name} requires minimum quantity of ${requiredMOQ}, but only ${item.quantity} provided`,
        );

        itemsFailingMOQ.push({
          productId: item.productId,
          productName: wholesaleProduct.name,
          requiredQuantity: requiredMOQ,
          providedQuantity: item.quantity,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      itemsFailingMOQ,
    };
  }

  private validateMOQWithFetchedData(
    items: WholesaleOrderItem[],
    wholesaleProductMap: Map<string, any>,
  ): MOQValidationResult {
    const errors: string[] = [];
    const itemsFailingMOQ: Array<{
      productId: string;
      productName: string;
      requiredQuantity: number;
      providedQuantity: number;
    }> = [];

    for (const item of items) {
      const wp = wholesaleProductMap.get(item.productId);

      if (!wp) {
        errors.push(`Product ${item.productId} not found in wholesale catalog`);
        continue;
      }

      const requiredMOQ = wp.moq || 1;

      if (item.quantity < requiredMOQ) {
        errors.push(
          `${wp.name} requires minimum quantity of ${requiredMOQ}, but only ${item.quantity} provided`,
        );

        itemsFailingMOQ.push({
          productId: item.productId,
          productName: wp.name,
          requiredQuantity: requiredMOQ,
          providedQuantity: item.quantity,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      itemsFailingMOQ,
    };
  }

  async validateMinimumOrderValue(
    invitationId: string,
    orderValue: number,
  ): Promise<MinimumValueValidation> {
    const invitation = await this.prisma.wholesale_invitations.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new GraphQLError('Wholesale invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    let minimumValue = 1000;
    
    if (invitation.wholesale_terms && typeof invitation.wholesale_terms === 'object') {
      const terms = invitation.wholesale_terms as any;
      if (terms.minimumOrderValue && typeof terms.minimumOrderValue === 'number') {
        minimumValue = terms.minimumOrderValue;
      }
    }

    const met = orderValue >= minimumValue;
    const shortfall = met ? 0 : minimumValue - orderValue;

    return {
      met,
      minimumValue,
      currentValue: orderValue,
      shortfall: Math.round(shortfall * 100) / 100,
    };
  }

  async getWholesalePricing(
    invitationId: string,
    productId: string,
    quantity: number,
  ): Promise<WholesalePricing> {
    const invitation = await this.prisma.wholesale_invitations.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new GraphQLError('Wholesale invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const wholesaleProduct = await this.prisma.wholesale_products.findFirst({
      where: {
        seller_id: invitation.seller_id,
        product_id: productId,
      },
    });

    if (!wholesaleProduct) {
      throw new GraphQLError('Wholesale product not found for this seller', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const basePrice = parseFloat(wholesaleProduct.rrp.toString());
    const wholesalePrice = parseFloat(wholesaleProduct.wholesale_price.toString());
    const discount = basePrice > 0 ? ((basePrice - wholesalePrice) / basePrice) * 100 : 0;
    const total = wholesalePrice * quantity;

    return {
      productId,
      basePrice,
      wholesalePrice,
      discount: Math.round(discount * 100) / 100,
      quantity,
      total: Math.round(total * 100) / 100,
    };
  }

  async validateWholesaleOrder(
    invitationId: string,
    items: WholesaleOrderItem[],
    paymentTerms: string,
  ): Promise<WholesaleOrderValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const invitation = await this.prisma.wholesale_invitations.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new GraphQLError('Wholesale invitation not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const productIds = items.map(item => item.productId);
    const wholesaleProducts = await this.prisma.wholesale_products.findMany({
      where: {
        product_id: { in: productIds },
        seller_id: invitation.seller_id,
      },
    });

    const wholesaleProductMap = new Map(
      wholesaleProducts.map(wp => [wp.product_id, wp])
    );

    let totalValue = 0;
    const pricingErrors: string[] = [];

    for (const item of items) {
      const wholesaleProduct = wholesaleProductMap.get(item.productId);

      if (!wholesaleProduct) {
        pricingErrors.push(
          `Product ${item.productId} is not available for wholesale`
        );
        continue;
      }

      const price = parseFloat(wholesaleProduct.wholesale_price.toString());
      totalValue += price * item.quantity;
    }

    errors.push(...pricingErrors);

    if (pricingErrors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
        moqValidation: { valid: false, errors: pricingErrors, itemsFailingMOQ: [] },
        paymentTermsValidation: { valid: false, allowedTerms: [], requestedTerm: paymentTerms },
        minimumValueValidation: { met: false, minimumValue: 0, currentValue: 0, shortfall: 0 },
        depositCalculation: { orderValue: 0, depositPercentage: 0, depositAmount: 0, balanceAmount: 0 },
        totalValue: 0,
      };
    }

    const moqValidation = this.validateMOQWithFetchedData(items, wholesaleProductMap);
    errors.push(...moqValidation.errors);

    const paymentTermsValidation = await this.validatePaymentTerms(
      invitationId,
      paymentTerms,
    );
    if (!paymentTermsValidation.valid) {
      errors.push(paymentTermsValidation.error!);
    }

    let minimumValue = 1000;
    if (invitation.wholesale_terms && typeof invitation.wholesale_terms === 'object') {
      const terms = invitation.wholesale_terms as any;
      if (terms.minimumOrderValue && typeof terms.minimumOrderValue === 'number') {
        minimumValue = terms.minimumOrderValue;
      }
    }

    const minimumValueValidation = {
      met: totalValue >= minimumValue,
      minimumValue,
      currentValue: totalValue,
      shortfall: totalValue >= minimumValue ? 0 : minimumValue - totalValue,
    };

    if (!minimumValueValidation.met) {
      errors.push(
        `Minimum order value not met. Required: $${minimumValue}, Current: $${totalValue.toFixed(2)}, Shortfall: $${minimumValueValidation.shortfall.toFixed(2)}`
      );
    }

    let depositPercentage = 30;
    if (invitation.wholesale_terms && typeof invitation.wholesale_terms === 'object') {
      const terms = invitation.wholesale_terms as any;
      if (terms.depositPercentage && typeof terms.depositPercentage === 'number') {
        depositPercentage = terms.depositPercentage;
      }
    }

    const depositCalculation = await this.calculateDeposit(
      totalValue,
      depositPercentage,
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      moqValidation,
      paymentTermsValidation,
      minimumValueValidation,
      depositCalculation,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }
}
