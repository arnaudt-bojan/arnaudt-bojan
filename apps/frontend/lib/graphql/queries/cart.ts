import { gql } from '@/lib/apollo-client';

export const GET_CART = gql`
  query GetCart {
    cart: getCartBySession(sessionId: "") {
      id
      items {
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
        total
        currency
      }
    }
  }
`;
