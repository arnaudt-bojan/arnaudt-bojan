import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { SellerLoader } from '../../common/dataloaders/seller.loader';
import { DataloaderModule } from '../../common/dataloaders/dataloader.module';

@Module({
  imports: [
    DataloaderModule,
    NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataloaderModule],
      inject: [SellerLoader],
      useFactory: (sellerLoader: SellerLoader) => ({
        typePaths: [join(__dirname, '../../../../../docs/graphql-schema.graphql')],
        playground: true,
        introspection: true,
        autoSchemaFile: false,
        sortSchema: false,
        path: '/graphql',
        context: ({ req }) => ({
          req,
          sellerLoader,
        }),
      }),
    }),
  ],
})
export class GraphQLConfigModule {}
