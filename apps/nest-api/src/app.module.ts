import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { GraphQLConfigModule } from './modules/graphql/graphql.module';
import { ProductsModule } from './modules/products/product.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    GraphQLConfigModule,
    ProductsModule,
    AuthModule,
    CartModule,
    OrdersModule,
  ],
})
export class AppModule {}
