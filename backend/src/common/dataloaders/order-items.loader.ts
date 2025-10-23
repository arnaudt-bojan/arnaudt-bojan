import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { order_items } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class OrderItemsLoader {
  private loader: DataLoader<string, order_items[]>;

  constructor(private prisma: PrismaService) {
    this.loader = new DataLoader<string, order_items[]>(async (orderIds) => {
      const items = await this.prisma.order_items.findMany({
        where: { order_id: { in: [...orderIds] } },
      });
      
      const itemsByOrder = new Map<string, order_items[]>();
      for (const item of items) {
        if (!itemsByOrder.has(item.order_id)) {
          itemsByOrder.set(item.order_id, []);
        }
        itemsByOrder.get(item.order_id)!.push(item);
      }
      
      return orderIds.map(id => itemsByOrder.get(id) || []);
    });
  }

  load(orderId: string): Promise<order_items[]> {
    return this.loader.load(orderId);
  }
}
