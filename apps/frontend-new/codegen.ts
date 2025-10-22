import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * GraphQL Code Generator Configuration for Next.js 16 Frontend
 * 
 * Generates TypeScript types and typed hooks from GraphQL schema and documents.
 * Uses the 'client' preset for full type safety with Apollo Client.
 */
const config: CodegenConfig = {
  schema: '../../docs/graphql-schema.graphql',
  
  // Scan GraphQL documents from shared queries/mutations and app pages
  documents: [
    'lib/graphql/**/*.ts',
    'app/**/*.tsx',
  ],
  
  generates: {
    './lib/generated/': {
      preset: 'client',
      config: {
        // Use consistent naming
        namingConvention: {
          typeNames: 'change-case-all#pascalCase',
          enumValues: 'change-case-all#upperCase',
        },
        // Make nullable fields easier to work with
        maybeValue: 'T | null',
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
        },
        // Add useful scalar types
        scalars: {
          DateTime: 'string',
          Decimal: 'string',
          JSON: 'Record<string, any>',
          URL: 'string',
        },
        // Client preset generates typed document nodes automatically
        withHooks: false,
      },
    },
  },
  
  ignoreNoDocuments: false,
};

export default config;
