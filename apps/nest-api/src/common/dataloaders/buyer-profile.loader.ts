import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { buyer_profiles } from '../../../../../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class BuyerProfileLoader {
  private loader: DataLoader<string, buyer_profiles | null>;

  constructor(private prisma: PrismaService) {
    this.loader = new DataLoader<string, buyer_profiles | null>(async (userIds) => {
      const profiles = await this.prisma.buyer_profiles.findMany({
        where: { user_id: { in: [...userIds] } },
      });
      
      const profileMap = new Map(profiles.map(profile => [profile.user_id, profile]));
      return userIds.map(id => profileMap.get(id) || null);
    });
  }

  load(userId: string): Promise<buyer_profiles | null> {
    return this.loader.load(userId);
  }

  loadMany(userIds: string[]): Promise<(buyer_profiles | null)[]> {
    return this.loader.loadMany(userIds) as Promise<(buyer_profiles | null)[]>;
  }
}
