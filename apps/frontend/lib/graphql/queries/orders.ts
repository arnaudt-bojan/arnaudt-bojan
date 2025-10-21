import { gql } from '@/lib/apollo-client';

export const LIST_ORDERS = gql`
  query ListOrders($filter: OrderFilterInput, $sort: OrderSortInput, $first: Int, $after: String) {
    listOrders(filter: $filter, sort: $sort, first: $first, after: $after) {
      id
      orderNumber
      status
      fulfillmentStatus
      paymentStatus
      totalAmount
      currency
      customerName
      customerEmail
      createdAt
      buyer {
        id
        email
        fullName
      }
    }
  }
`;

export const GET_ORDER = gql`
  query GetOrder($id: ID!) {
    getOrder(id: $id) {
      id
      orderNumber
      status
      fulfillmentStatus
      paymentStatus
      subtotal
      shippingCost
      taxAmount
      totalAmount
      currency
      customerName
      customerEmail
      customerPhone
      shippingAddress {
        fullName
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
        phone
      }
      billingAddress {
        fullName
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
        phone
      }
      trackingNumber
      carrier
      trackingUrl
      estimatedDeliveryDate
      createdAt
      updatedAt
      paidAt
      buyer {
        id
        email
        fullName
      }
      items {
        id
        productId
        productName
        productImage
        quantity
        unitPrice
        lineTotal
        totalPrice
        fulfillmentStatus
        variantId
        product {
          id
          name
          images
        }
      }
    }
  }
`;
