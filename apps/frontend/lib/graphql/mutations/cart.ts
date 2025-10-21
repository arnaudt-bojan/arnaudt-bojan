import { gql } from '@/lib/apollo-client';

export const UPDATE_CART_ITEM = gql`
  mutation UpdateCartItem($cartId: ID!, $itemId: ID!, $quantity: Int!) {
    updateCartItem(cartId: $cartId, input: { itemId: $itemId, quantity: $quantity }) {
      success
      message
      cart {
        id
        items {
          id
          quantity
          lineTotal
        }
        totals {
          subtotal
          tax
          shipping
          total
        }
      }
    }
  }
`;

export const REMOVE_FROM_CART = gql`
  mutation RemoveFromCart($cartId: ID!, $productId: ID!, $variantId: ID) {
    removeFromCart(cartId: $cartId, productId: $productId, variantId: $variantId) {
      success
      message
      cart {
        id
        items {
          id
        }
        totals {
          subtotal
          tax
          shipping
          total
        }
      }
    }
  }
`;

export const ADD_TO_CART = gql`
  mutation AddToCart($cartId: ID, $productId: ID!, $variantId: ID, $quantity: Int!) {
    addToCart(cartId: $cartId, productId: $productId, variantId: $variantId, quantity: $quantity) {
      success
      message
      cart {
        id
        items {
          id
          productId
          variantId
          quantity
          unitPrice
          lineTotal
        }
        totals {
          subtotal
          tax
          shipping
          total
        }
      }
    }
  }
`;
