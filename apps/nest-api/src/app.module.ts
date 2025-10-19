import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { GraphQLConfigModule } from './modules/graphql/graphql.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    GraphQLConfigModule,
  ],
})
export class AppModule {}
