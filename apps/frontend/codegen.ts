import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * GraphQL Code Generator Configuration
 * 
 * Generates TypeScript types from the GraphQL schema.
 * These types can be used to manually type useQuery/useMutation calls.
 * 
 * Usage in components:
 *   import { GetOrderQuery, GetOrderQueryVariables } from '@/lib/generated/graphql';
 *   const { data } = useQuery<GetOrderQuery>(GET_ORDER, { variables });
 */
const config: CodegenConfig = {
  // Point to your GraphQL schema
  schema: '../../docs/graphql-schema.graphql',
  
  // Generate schema types only (no document-based generation to avoid duplicate name issues)
  generates: {
    './lib/generated/graphql.ts': {
      plugins: ['typescript'],
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
