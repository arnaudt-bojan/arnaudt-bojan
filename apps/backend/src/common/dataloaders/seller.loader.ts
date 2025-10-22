import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { users } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class SellerLoader {
  private loader: DataLoader<string, users | null>;

  constructor(private prisma: PrismaService) {
    this.loader = new DataLoader<string, users | null>(async (ids): Promise<(users | null)[]> => {
      const usersData = await this.prisma.users.findMany({
        where: { id: { in: [...ids] } },
      });
      
      const userMap = new Map(usersData.map(user => [user.id, user]));
      return ids.map(id => userMap.get(id) || null);
    });
  }

  load(id: string): Promise<users | null> {
    return this.loader.load(id);
  }

  loadMany(ids: string[]): Promise<(users | null)[]> {
    return this.loader.loadMany(ids) as Promise<(users | null)[]>;
  }
}
