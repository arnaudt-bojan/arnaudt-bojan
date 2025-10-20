'use client';

import { ApolloClient, InMemoryCache, HttpLink, ApolloProvider as BaseApolloProvider } from '@apollo/client';
import { ReactNode } from 'react';

// Create Apollo Client instance
const createApolloClient = () => {
  return new ApolloClient({
    link: new HttpLink({
      uri: 'http://localhost:4000/graphql',
      credentials: 'include',
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
};

// Export singleton client instance
export const apolloClient = createApolloClient();

// ApolloProvider wrapper component
export function ApolloProvider({ children }: { children: ReactNode }) {
  return (
    <BaseApolloProvider client={apolloClient}>
      {children}
    </BaseApolloProvider>
  );
}
