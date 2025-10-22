'use client';

import { HttpLink, ApolloLink } from '@apollo/client';
import {
  ApolloNextAppProvider,
  ApolloClient,
  InMemoryCache,
  SSRMultipartLink,
} from '@apollo/client-integration-nextjs';
import { ReactNode } from 'react';

// Re-export Apollo Client hooks for convenience
// These work fine in Client Components
// React hooks are in @apollo/client/react subpath in Apollo Client v4
export {
  useQuery,
  useMutation,
  useLazyQuery,
  useSubscription,
  useSuspenseQuery,
} from '@apollo/client/react';

// gql and types are in the core package
export { gql, type ApolloQueryResult, ApolloError } from '@apollo/client/core';

// Function to create Apollo Client instance for Next.js 14 App Router (Client Components/SSR)
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

// ApolloProvider wrapper component for Next.js 14 App Router (Client Components/SSR)
export function ApolloProvider({ children }: { children: ReactNode }) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
