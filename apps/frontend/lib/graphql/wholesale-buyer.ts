import { gql } from '@/lib/apollo-client';

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
        fullName
        email
        sellerAccount {
          businessName
          storeName
        }
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
          image
          images
          category
          sku
          stock
          status
          productType
          seller {
            id
            sellerAccount {
              businessName
              storeName
            }
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
      image
      images
      category
      sku
      stock
      status
      productType
      seller {
        id
        email
        sellerAccount {
          businessName
          storeName
        }
      }
    }
  }
`;

// Query to list wholesale orders for buyer
export const LIST_WHOLESALE_ORDERS = gql`
  query ListWholesaleOrders($first: Int, $after: String) {
    listWholesaleOrders(first: $first, after: $after) {
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
          balanceRequestedAt
          balancePaidAt
          createdAt
          updatedAt
          seller {
            id
            sellerAccount {
              businessName
              storeName
            }
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
      balanceRequestedAt
      balancePaidAt
      trackingNumber
      carrier
      createdAt
      updatedAt
      seller {
        id
        email
        sellerAccount {
          businessName
          storeName
        }
      }
      buyer {
        id
        fullName
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

// Query to get wholesale cart
export const GET_WHOLESALE_CART = gql`
  query GetWholesaleCart {
    getWholesaleCart {
      id
      sellerId
      buyerId
      items {
        id
        productId
        productName
        quantity
        unitPrice
        lineTotal
        product {
          id
          name
          price
          image
          stock
        }
      }
      subtotal
      itemCount
      updatedAt
    }
  }
`;

// Mutation to update wholesale cart item
export const UPDATE_WHOLESALE_CART_ITEM = gql`
  mutation UpdateWholesaleCartItem($input: UpdateWholesaleCartItemInput!) {
    updateWholesaleCartItem(input: $input) {
      id
      items {
        id
        productId
        quantity
        unitPrice
        lineTotal
      }
      subtotal
      itemCount
    }
  }
`;

// Mutation to remove from wholesale cart
export const REMOVE_FROM_WHOLESALE_CART = gql`
  mutation RemoveFromWholesaleCart($productId: ID!) {
    removeFromWholesaleCart(productId: $productId) {
      id
      items {
        id
        productId
        quantity
      }
      subtotal
      itemCount
    }
  }
`;

