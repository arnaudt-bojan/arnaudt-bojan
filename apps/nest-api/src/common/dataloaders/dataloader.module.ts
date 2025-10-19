import { Module } from '@nestjs/common';
import { SellerLoader } from './seller.loader';
import { BuyerLoader } from './buyer.loader';
import { PrismaModule } from '../../modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SellerLoader, BuyerLoader],
  exports: [SellerLoader, BuyerLoader],
})
export class DataloaderModule {}
