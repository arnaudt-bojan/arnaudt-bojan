import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { trade_quotation_items } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class QuotationLineItemsLoader {
  private loader: DataLoader<string, trade_quotation_items[]>;

  constructor(private prisma: PrismaService) {
    this.loader = new DataLoader<string, trade_quotation_items[]>(async (quotationIds) => {
      const items = await this.prisma.trade_quotation_items.findMany({
        where: { quotation_id: { in: [...quotationIds] } },
        orderBy: { line_number: 'asc' },
      });
      
      const itemsByQuotation = new Map<string, trade_quotation_items[]>();
      for (const item of items) {
        if (!itemsByQuotation.has(item.quotation_id)) {
          itemsByQuotation.set(item.quotation_id, []);
        }
        itemsByQuotation.get(item.quotation_id)!.push(item);
      }
      
      return quotationIds.map(id => itemsByQuotation.get(id) || []);
    });
  }

  load(quotationId: string): Promise<trade_quotation_items[]> {
    return this.loader.load(quotationId);
  }
}
