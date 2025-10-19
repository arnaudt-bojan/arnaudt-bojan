import { Module } from '@nestjs/common';
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';
import { ProductPresentationModule } from '../product-presentation/product-presentation.module';

@Module({
  imports: [PrismaModule, DataloaderModule, ProductPresentationModule],
  providers: [ProductResolver, ProductService],
})
export class ProductsModule {}
