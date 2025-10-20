import { Module, forwardRef } from '@nestjs/common';
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';
import { ProductPresentationModule } from '../product-presentation/product-presentation.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, DataloaderModule, ProductPresentationModule, forwardRef(() => WebSocketModule)],
  providers: [ProductResolver, ProductService],
})
export class ProductsModule {}
