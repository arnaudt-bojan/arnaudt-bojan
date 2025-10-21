import { Module, forwardRef } from '@nestjs/common';
import { CartResolver } from './cart.resolver';
import { CartService } from './cart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { PricingModule } from '../pricing/pricing.module';
import { CartValidationModule } from '../cart-validation/cart-validation.module';

@Module({
  imports: [
    PrismaModule,
    DataloaderModule,
    WebSocketModule,
    PricingModule,
    forwardRef(() => CartValidationModule),
  ],
  providers: [CartResolver, CartService],
  exports: [CartService],
})
export class CartModule {}
