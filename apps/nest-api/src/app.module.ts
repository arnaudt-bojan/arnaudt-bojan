import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { GraphQLConfigModule } from './modules/graphql/graphql.module';
import { ProductsModule } from './modules/products/product.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CartModule } from './modules/cart/cart.module';
import { CartValidationModule } from './modules/cart-validation/cart-validation.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WholesaleModule } from './modules/wholesale/wholesale.module';
import { WholesaleRulesModule } from './modules/wholesale-rules/wholesale-rules.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { OrderPresentationModule } from './modules/order-presentation/order-presentation.module';
import { ProductPresentationModule } from './modules/product-presentation/product-presentation.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    GraphQLConfigModule,
    ProductsModule,
    AuthModule,
    IdentityModule,
    PricingModule,
    CartValidationModule,
    CartModule,
    OrdersModule,
    WholesaleRulesModule,
    WholesaleModule,
    QuotationsModule,
    WebSocketModule,
    OrderPresentationModule,
    ProductPresentationModule,
  ],
})
export class AppModule {}
