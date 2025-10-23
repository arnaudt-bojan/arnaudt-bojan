import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { trade_quotation_events } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class QuotationActivitiesLoader {
  private loader: DataLoader<string, trade_quotation_events[]>;

  constructor(private prisma: PrismaService) {
    this.loader = new DataLoader<string, trade_quotation_events[]>(async (quotationIds) => {
      const events = await this.prisma.trade_quotation_events.findMany({
        where: { quotation_id: { in: [...quotationIds] } },
        orderBy: { created_at: 'desc' },
      });
      
      const eventsByQuotation = new Map<string, trade_quotation_events[]>();
      for (const event of events) {
        if (!eventsByQuotation.has(event.quotation_id)) {
          eventsByQuotation.set(event.quotation_id, []);
        }
        eventsByQuotation.get(event.quotation_id)!.push(event);
      }
      
      return quotationIds.map(id => eventsByQuotation.get(id) || []);
    });
  }

  load(quotationId: string): Promise<trade_quotation_events[]> {
    return this.loader.load(quotationId);
  }
}
