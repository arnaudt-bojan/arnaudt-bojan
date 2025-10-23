import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * GraphQL Code Generator Configuration
 * 
 * Generates TypeScript types and typed hooks from GraphQL schema and documents.
 * Uses the 'client' preset for full type safety with Apollo Client.
 * 
 * Note: Some pages are excluded due to schema mismatches that need backend work:
 * - meta-ads/** (queries non-existent campaign fields)
 * - wholesale/products/** (queries non-existent wholesale product fields)
 * - wholesale/preview/** (queries non-existent wholesale product fields)
 * - wholesale/dashboard/** (queries non-existent wholesale stats fields)
 * 
 * Invalid queries/mutations have been commented out in the shared GraphQL files:
 * - lib/graphql/mutations/orders.ts (CANCEL_ORDER, REORDER_ITEMS commented out)
 * - lib/graphql/mutations/wholesale.ts (CANCEL_INVITATION commented out)
 * - lib/graphql/queries/wholesale.ts (GET_SELLER_BY_USERNAME, LIST_WHOLESALE_BUYERS commented out)
 * - lib/graphql/trade-quotations.ts (SEND_QUOTATION, GET_QUOTATION_BY_TOKEN, CALCULATE_QUOTATION_TOTALS commented out)
 * - lib/graphql/wholesale-buyer.ts (GET_WHOLESALE_CART, UPDATE_WHOLESALE_CART_ITEM, REMOVE_FROM_WHOLESALE_CART commented out)
 */
const config: CodegenConfig = {
  schema: '../../docs/graphql-schema.graphql',
  
  // Scan GraphQL documents from shared queries/mutations and app pages
  // Exclude pages with schema validation errors (invalid queries in shared files are commented out)
  documents: [
    'lib/graphql/**/*.ts',
    'app/**/*.tsx',
    '!app/meta-ads/**/*.tsx',
    '!app/wholesale/products/**/*.tsx',
    '!app/wholesale/preview/**/*.tsx',
    '!app/wholesale/dashboard/**/*.tsx',
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
        // Generate typed hooks for Apollo Client
        withHooks: false, // Client preset generates useQuery hooks automatically
      },
    },
  },
  
  ignoreNoDocuments: false,
};

export default config;
