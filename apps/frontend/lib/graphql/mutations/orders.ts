import { gql } from '@/lib/apollo-client';

export const UPDATE_FULFILLMENT = gql`
  mutation UpdateFulfillment($input: UpdateOrderFulfillmentInput!) {
    updateFulfillment(input: $input) {
      id
      orderNumber
      status
      fulfillmentStatus
      trackingNumber
      carrier
    }
  }
`;

export const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      orderNumber
      status
      totalAmount
    }
  }
`;

// TODO: Backend schema gap - these mutations don't exist yet
// export const CANCEL_ORDER = gql`
//   mutation CancelOrder($orderId: ID!) {
//     cancelOrder(orderId: $orderId) {
//       id
//       orderNumber
//       status
//     }
//   }
// `;

// export const REORDER_ITEMS = gql`
//   mutation ReorderItems($orderId: ID!) {
//     reorderItems(orderId: $orderId) {
//       id
//       items {
//         id
//         productId
//         quantity
//       }
//     }
//   }
// `;
