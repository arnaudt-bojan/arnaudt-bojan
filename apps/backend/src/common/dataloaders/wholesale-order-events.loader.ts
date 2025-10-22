import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { wholesale_order_events } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class WholesaleOrderEventsLoader {
  private loader: DataLoader<string, wholesale_order_events[]>;

  constructor(private prisma: PrismaService) {
    this.loader = new DataLoader<string, wholesale_order_events[]>(async (wholesaleOrderIds) => {
      const events = await this.prisma.wholesale_order_events.findMany({
        where: { wholesale_order_id: { in: [...wholesaleOrderIds] } },
        orderBy: { occurred_at: 'desc' },
      });
      
      const eventsByOrder = new Map<string, wholesale_order_events[]>();
      for (const event of events) {
        if (!eventsByOrder.has(event.wholesale_order_id)) {
          eventsByOrder.set(event.wholesale_order_id, []);
        }
        eventsByOrder.get(event.wholesale_order_id)!.push(event);
      }
      
      return wholesaleOrderIds.map(id => eventsByOrder.get(id) || []);
    });
  }

  load(wholesaleOrderId: string): Promise<wholesale_order_events[]> {
    return this.loader.load(wholesaleOrderId);
  }
}
