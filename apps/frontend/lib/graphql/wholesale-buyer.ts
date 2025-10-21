import { gql } from '@apollo/client';

// Query to get wholesale invitation by token
export const GET_WHOLESALE_INVITATION = gql`
  query GetWholesaleInvitation($token: String!) {
    getWholesaleInvitation(token: $token) {
      id
      sellerId
      buyerEmail
      buyerId
      status
      token
      expiresAt
      acceptedAt
      createdAt
      seller {
        id
        firstName
        lastName
        email
        businessName
        storeName
      }
    }
  }
`;

// Mutation to accept wholesale invitation
export const ACCEPT_WHOLESALE_INVITATION = gql`
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token) {
      id
      sellerId
      buyerId
      isActive
      grantedAt
    }
  }
`;

// Query to list wholesale products (for catalog)
export const LIST_WHOLESALE_PRODUCTS = gql`
  query ListWholesaleProducts(
    $filter: ProductFilterInput
    $sort: ProductSortInput
    $first: Int
    $after: String
  ) {
    listProducts(filter: $filter, sort: $sort, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          name
          description
          price
          compareAtPrice
          image
          images
          category
          sku
          stockQuantity
          status
          productType
          seller {
            id
            businessName
            storeName
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

// Query to get single wholesale product
export const GET_WHOLESALE_PRODUCT = gql`
  query GetWholesaleProduct($id: ID!) {
    getProduct(id: $id) {
      id
      name
      description
      price
      compareAtPrice
      image
      images
      category
      sku
      stockQuantity
      status
      productType
      seller {
        id
        businessName
        storeName
        email
      }
    }
  }
`;

// Query to list wholesale orders for buyer
export const LIST_WHOLESALE_ORDERS = gql`
  query ListWholesaleOrders($filter: WholesaleOrderFilterInput, $first: Int, $after: String) {
    listWholesaleOrders(filter: $filter, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          orderNumber
          sellerId
          buyerId
          status
          paymentStatus
          subtotal
          taxAmount
          totalAmount
          currency
          depositAmount
          depositPercentage
          balanceDue
          paymentTerms
          poNumber
          expectedShipDate
          balancePaymentDueDate
          createdAt
          updatedAt
          seller {
            id
            businessName
            storeName
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

// Query to get single wholesale order
export const GET_WHOLESALE_ORDER = gql`
  query GetWholesaleOrder($id: ID!) {
    getWholesaleOrder(id: $id) {
      id
      orderNumber
      sellerId
      buyerId
      status
      paymentStatus
      subtotal
      taxAmount
      totalAmount
      currency
      depositAmount
      depositPercentage
      balanceDue
      paymentTerms
      poNumber
      vatNumber
      incoterms
      buyerCompanyName
      buyerEmail
      buyerName
      expectedShipDate
      balancePaymentDueDate
      trackingNumber
      carrier
      createdAt
      updatedAt
      seller {
        id
        businessName
        storeName
        email
      }
      buyer {
        id
        firstName
        lastName
        email
      }
      items {
        id
        productId
        productName
        productSku
        quantity
        unitPrice
        lineTotal
        discountPercentage
      }
      calculatedDepositAmount
      calculatedBalanceAmount
    }
  }
`;

// Mutation to place wholesale order
export const PLACE_WHOLESALE_ORDER = gql`
  mutation PlaceWholesaleOrder($input: PlaceWholesaleOrderInput!) {
    placeWholesaleOrder(input: $input) {
      id
      orderNumber
      sellerId
      buyerId
      status
      totalAmount
      depositAmount
      balanceDue
      paymentTerms
      createdAt
    }
  }
`;

// ============================================
// WHOLESALE CART QUERIES AND MUTATIONS
// ============================================

// Cart fragment for reusability
export const WHOLESALE_CART_FRAGMENT = gql`
  fragment WholesaleCartFields on WholesaleCart {
    id
    buyerId
    sellerId
    subtotalCents
    depositCents
    balanceDueCents
    depositPercentage
    currency
    updatedAt
  }
`;

export const CART_ITEM_FRAGMENT = gql`
  fragment CartItemFields on WholesaleCartItem {
    id
    productId
    productName
    productSku
    productImage
    quantity
    unitPriceCents
    lineTotalCents
    moq
    moqCompliant
  }
`;

// Query to get wholesale cart with server-calculated totals
export const GET_WHOLESALE_CART = gql`
  ${WHOLESALE_CART_FRAGMENT}
  ${CART_ITEM_FRAGMENT}
  query GetWholesaleCart {
    wholesaleCart {
      ...WholesaleCartFields
      items {
        ...CartItemFields
      }
    }
  }
`;

// Mutation to add item to cart - returns full cart with recalculated totals
export const ADD_TO_WHOLESALE_CART = gql`
  ${WHOLESALE_CART_FRAGMENT}
  ${CART_ITEM_FRAGMENT}
  mutation AddToWholesaleCart($productId: ID!, $quantity: Int!) {
    addToWholesaleCart(productId: $productId, quantity: $quantity) {
      ...WholesaleCartFields
      items {
        ...CartItemFields
      }
    }
  }
`;

// Mutation to update cart item quantity - returns full cart with recalculated totals
export const UPDATE_WHOLESALE_CART_ITEM = gql`
  ${WHOLESALE_CART_FRAGMENT}
  ${CART_ITEM_FRAGMENT}
  mutation UpdateWholesaleCartItem($itemId: ID!, $quantity: Int!) {
    updateWholesaleCartItem(itemId: $itemId, quantity: $quantity) {
      ...WholesaleCartFields
      items {
        ...CartItemFields
      }
    }
  }
`;

// Mutation to remove item from cart - returns full cart with recalculated totals
export const REMOVE_FROM_WHOLESALE_CART = gql`
  ${WHOLESALE_CART_FRAGMENT}
  ${CART_ITEM_FRAGMENT}
  mutation RemoveFromWholesaleCart($itemId: ID!) {
    removeFromWholesaleCart(itemId: $itemId) {
      ...WholesaleCartFields
      items {
        ...CartItemFields
      }
    }
  }
`;

// Mutation to clear entire cart
export const CLEAR_WHOLESALE_CART = gql`
  mutation ClearWholesaleCart {
    clearWholesaleCart {
      success
    }
  }
`;
