import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IdentityResolver, SellerAccountResolver, BuyerProfileResolver } from './identity.resolver';
import { IdentityService } from './identity.service';

@Module({
  imports: [PrismaModule],
  providers: [IdentityResolver, SellerAccountResolver, BuyerProfileResolver, IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
