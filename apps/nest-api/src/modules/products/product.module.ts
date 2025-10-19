import { Module } from '@nestjs/common';
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';

@Module({
  imports: [PrismaModule, DataloaderModule],
  providers: [ProductResolver, ProductService],
})
export class ProductsModule {}
