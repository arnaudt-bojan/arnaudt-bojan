import { Module } from '@nestjs/common';
import { SellerLoader } from './seller.loader';
import { PrismaModule } from '../../modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SellerLoader],
  exports: [SellerLoader],
})
export class DataloaderModule {}
