import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';
import { PricingModule } from '../pricing/pricing.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { QuotationsResolver } from './quotations.resolver';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [PrismaModule, DataloaderModule, PricingModule, forwardRef(() => WebSocketModule)],
  providers: [QuotationsResolver, QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
