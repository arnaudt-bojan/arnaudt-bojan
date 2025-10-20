import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';
import { PricingModule } from '../pricing/pricing.module';
import { WholesaleRulesModule } from '../wholesale-rules/wholesale-rules.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { 
  WholesaleInvitationResolver,
  WholesaleAccessGrantResolver,
  WholesaleOrderResolver,
  WholesaleOrderItemResolver,
  WholesaleQueryResolver,
  WholesaleMutationResolver,
} from './wholesale.resolver';
import { WholesaleService } from './wholesale.service';

@Module({
  imports: [
    PrismaModule, 
    DataloaderModule, 
    PricingModule,
    forwardRef(() => WholesaleRulesModule),
    forwardRef(() => WebSocketModule),
  ],
  providers: [
    WholesaleService,
    WholesaleInvitationResolver,
    WholesaleAccessGrantResolver,
    WholesaleOrderResolver,
    WholesaleOrderItemResolver,
    WholesaleQueryResolver,
    WholesaleMutationResolver,
  ],
  exports: [WholesaleService],
})
export class WholesaleModule {}
