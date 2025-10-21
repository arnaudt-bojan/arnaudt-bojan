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

export const LIST_WHOLESALE_BUYERS = gql`
  query ListWholesaleBuyers {
    listWholesaleBuyers {
      id
      buyerId
      sellerId
      status
      createdAt
      buyer {
        id
        email
        fullName
      }
    }
  }
`;

export const GET_SELLER_BY_USERNAME = gql`
  query GetSellerByUsername($username: String!) {
    getSellerByUsername(username: $username) {
      id
      displayName
      storeName
      description
      banner
      logo
    }
  }
`;
