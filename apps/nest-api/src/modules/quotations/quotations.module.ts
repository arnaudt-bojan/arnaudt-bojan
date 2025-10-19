import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';
import { PricingModule } from '../pricing/pricing.module';
import { QuotationsResolver } from './quotations.resolver';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [PrismaModule, DataloaderModule, PricingModule],
  providers: [QuotationsResolver, QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
