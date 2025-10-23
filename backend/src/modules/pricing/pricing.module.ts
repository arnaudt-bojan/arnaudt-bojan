import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingResolver } from './pricing.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PricingService, PricingResolver],
  exports: [PricingService],
})
export class PricingModule {}
