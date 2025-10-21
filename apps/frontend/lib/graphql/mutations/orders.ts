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
