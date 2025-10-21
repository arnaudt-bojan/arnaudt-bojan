import { gql } from '@/lib/apollo-client';

export const ADD_TO_CART = gql`
  mutation AddToCart($input: AddToCartInput!) {
    addToCart(input: $input) {
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
          image
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

export const UPDATE_CART_ITEM = gql`
  mutation UpdateCartItem($cartId: ID!, $input: UpdateCartItemInput!) {
    updateCartItem(cartId: $cartId, input: $input) {
      id
      items {
        productId
        variantId
        quantity
        unitPrice
        lineTotal
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

export const REMOVE_FROM_CART = gql`
  mutation RemoveFromCart($cartId: ID!, $productId: ID!, $variantId: ID) {
    removeFromCart(cartId: $cartId, productId: $productId, variantId: $variantId) {
      id
      items {
        productId
        variantId
        quantity
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

export const CLEAR_CART = gql`
  mutation ClearCart($cartId: ID!) {
    clearCart(cartId: $cartId)
  }
`;
