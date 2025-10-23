import { Module } from '@nestjs/common';
import { CartValidationService } from './cart-validation.service';
import { CartValidationResolver } from './cart-validation.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CartValidationService, CartValidationResolver],
  exports: [CartValidationService],
})
export class CartValidationModule {}
