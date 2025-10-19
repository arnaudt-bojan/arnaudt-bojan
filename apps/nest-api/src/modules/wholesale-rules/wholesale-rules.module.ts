import { Module } from '@nestjs/common';
import { WholesaleRulesService } from './wholesale-rules.service';
import { WholesaleRulesResolver } from './wholesale-rules.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WholesaleRulesService, WholesaleRulesResolver],
  exports: [WholesaleRulesService],
})
export class WholesaleRulesModule {}
