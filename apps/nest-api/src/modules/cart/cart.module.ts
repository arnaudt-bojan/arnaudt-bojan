import { Module } from '@nestjs/common';
import { CartResolver } from './cart.resolver';
import { CartService } from './cart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PrismaModule, DataloaderModule, WebSocketModule, PricingModule],
  providers: [CartResolver, CartService],
  exports: [CartService],
})
export class CartModule {}
