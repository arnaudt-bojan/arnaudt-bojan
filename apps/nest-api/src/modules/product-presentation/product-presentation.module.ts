import { Module } from '@nestjs/common';
import { ProductPresentationService } from './product-presentation.service';

@Module({
  providers: [ProductPresentationService],
  exports: [ProductPresentationService],
})
export class ProductPresentationModule {}
