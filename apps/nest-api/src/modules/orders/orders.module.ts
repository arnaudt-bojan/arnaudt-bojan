import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { PricingModule } from '../pricing/pricing.module';
import { OrderPresentationModule } from '../order-presentation/order-presentation.module';
import { OrdersResolver } from './orders.resolver';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule, DataloaderModule, WebSocketModule, PricingModule, OrderPresentationModule],
  providers: [OrdersResolver, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
