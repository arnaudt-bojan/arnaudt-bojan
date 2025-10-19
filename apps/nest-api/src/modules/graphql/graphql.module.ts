import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

@Module({
  imports: [
    NestGraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: [join(__dirname, '../../../../../docs/graphql-schema.graphql')],
      playground: true,
      introspection: true,
      context: ({ req, res }) => ({ req, res }),
      autoSchemaFile: false,
      sortSchema: false,
      path: '/graphql',
    }),
  ],
})
export class GraphQLConfigModule {}
