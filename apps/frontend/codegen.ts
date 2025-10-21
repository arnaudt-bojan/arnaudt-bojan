import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * GraphQL Code Generator Configuration
 * 
 * Now that queries are consolidated into shared files, we can use the client preset
 * to generate fully typed hooks from both the schema and document operations.
 * 
 * Usage in components:
 *   import { useGetOrderQuery } from '@/lib/generated/graphql';
 *   const { data, loading, error } = useGetOrderQuery({ variables: { id: '123' } });
 */
const config: CodegenConfig = {
  // Point to your GraphQL schema
  schema: '../../docs/graphql-schema.graphql',
  
  // Scan shared query/mutation files and components
  documents: [
    'lib/graphql/queries/**/*.ts',
    'lib/graphql/mutations/**/*.ts',
    'app/**/*.tsx',
  ],
  
  // Use client preset for full type safety
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
          JSON: 'Record<string, any>',
        },
      },
    },
  },
};

export default config;
