import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../docs/graphql-schema.graphql',
  generates: {
    './src/types/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        contextType: '../context#GraphQLContext',
        mappers: {
          Product: '../../../../../generated/prisma#products',
          User: '../../../../../generated/prisma#users',
        },
      },
    },
  },
};

export default config;
