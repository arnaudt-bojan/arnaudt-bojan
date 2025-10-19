import { Module } from '@nestjs/common';
import { OrderPresentationService } from './order-presentation.service';

@Module({
  providers: [OrderPresentationService],
  exports: [OrderPresentationService],
})
export class OrderPresentationModule {}
