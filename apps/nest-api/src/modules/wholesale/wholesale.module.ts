import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';
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
  imports: [PrismaModule, DataloaderModule],
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
