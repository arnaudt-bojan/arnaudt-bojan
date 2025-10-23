import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { wholesale_order_items } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class WholesaleOrderItemsLoader {
  private loader: DataLoader<string, wholesale_order_items[]>;

  constructor(private prisma: PrismaService) {
    this.loader = new DataLoader<string, wholesale_order_items[]>(async (wholesaleOrderIds) => {
      const items = await this.prisma.wholesale_order_items.findMany({
        where: { wholesale_order_id: { in: [...wholesaleOrderIds] } },
      });
      
      const itemsByOrder = new Map<string, wholesale_order_items[]>();
      for (const item of items) {
        if (!itemsByOrder.has(item.wholesale_order_id)) {
          itemsByOrder.set(item.wholesale_order_id, []);
        }
        itemsByOrder.get(item.wholesale_order_id)!.push(item);
      }
      
      return wholesaleOrderIds.map(id => itemsByOrder.get(id) || []);
    });
  }

  load(wholesaleOrderId: string): Promise<wholesale_order_items[]> {
    return this.loader.load(wholesaleOrderId);
  }
}
