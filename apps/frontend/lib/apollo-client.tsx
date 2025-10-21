'use client';

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloNextAppProvider } from '@apollo/experimental-nextjs-app-support/ssr';
import { ReactNode } from 'react';

// Function to create Apollo Client instance
function makeClient() {
  return new ApolloClient({
    link: new HttpLink({
      uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
      credentials: 'include',
      fetchOptions: {
        cache: 'no-store',
      },
    }),
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
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  });
}

// ApolloProvider wrapper component for Next.js 14 App Router
export function ApolloProvider({ children }: { children: ReactNode }) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
