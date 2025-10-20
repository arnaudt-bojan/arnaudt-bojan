import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { trade_payment_schedules } from '../../../../../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class QuotationPaymentsLoader {
  private loader: DataLoader<string, trade_payment_schedules[]>;

  constructor(private prisma: PrismaService) {
    this.loader = new DataLoader<string, trade_payment_schedules[]>(async (quotationIds) => {
      const payments = await this.prisma.trade_payment_schedules.findMany({
        where: { quotation_id: { in: [...quotationIds] } },
        orderBy: { created_at: 'asc' },
      });
      
      const paymentsByQuotation = new Map<string, trade_payment_schedules[]>();
      for (const payment of payments) {
        if (!paymentsByQuotation.has(payment.quotation_id)) {
          paymentsByQuotation.set(payment.quotation_id, []);
        }
        paymentsByQuotation.get(payment.quotation_id)!.push(payment);
      }
      
      return quotationIds.map(id => paymentsByQuotation.get(id) || []);
    });
  }

  load(quotationId: string): Promise<trade_payment_schedules[]> {
    return this.loader.load(quotationId);
  }
}
