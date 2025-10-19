import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { GraphQLConfigModule } from './modules/graphql/graphql.module';
import { ProductsModule } from './modules/products/product.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    GraphQLConfigModule,
    ProductsModule,
  ],
})
export class AppModule {}
