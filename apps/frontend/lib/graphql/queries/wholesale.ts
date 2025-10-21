import { gql } from '@/lib/apollo-client';

export const LIST_WHOLESALE_INVITATIONS = gql`
  query ListWholesaleInvitations {
    listWholesaleInvitations {
      edges {
        node {
          id
          buyerEmail
          status
          createdAt
          acceptedAt
          buyer {
            id
            email
            fullName
          }
        }
      }
    }
  }
`;
