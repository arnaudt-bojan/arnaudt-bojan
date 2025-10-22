'use client';

import { HttpLink } from '@apollo/client';
import {
  ApolloNextAppProvider,
  ApolloClient,
  InMemoryCache,
  SSRMultipartLink,
} from '@apollo/experimental-nextjs-app-support';
import { ApolloLink } from '@apollo/client/core';
import { ReactNode } from 'react';

// Re-export Apollo Client hooks for convenience
export {
  useQuery,
  useMutation,
  useLazyQuery,
  useSubscription,
  useSuspenseQuery,
} from '@apollo/client';

// gql and types are in the core package  
export { gql, type ApolloQueryResult, ApolloError } from '@apollo/client/core';

// Function to create Apollo Client instance for Next.js 16 App Router
function makeClient() {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
    credentials: 'include',
    fetchOptions: {
      cache: 'no-store',
    },
  });

  return new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            listProducts: {
              keyArgs: ['filter', 'sort'],
              merge(existing, incoming) {
                if (!incoming) return existing;
                if (!existing) return incoming;
                
                return {
                  ...incoming,
                  edges: [...(existing.edges || []), ...(incoming.edges || [])],
                };
              },
            },
          },
        },
      },
    }),
    link:
      typeof window === 'undefined'
        ? ApolloLink.from([
            new SSRMultipartLink({ stripDefer: true }),
            httpLink,
          ])
        : httpLink,
  });
}

// ApolloProvider wrapper component for Next.js 16 App Router
export function ApolloProvider({ children }: { children: ReactNode }) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
