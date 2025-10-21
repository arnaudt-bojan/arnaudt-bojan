import { gql } from '@/lib/apollo-client';

export const GET_CART = gql`
  query GetCart {
    cart: getCartBySession(sessionId: "") {
      id
      items {
        id
        productId
        variantId
        quantity
        unitPrice
        lineTotal
        product {
          id
          name
          price
          images
        }
      }
      totals {
        subtotal
        tax
        shipping
        total
      }
    }
  }
`;
