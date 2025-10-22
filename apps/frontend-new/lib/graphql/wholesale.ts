import { gql } from '@apollo/client';

// Wholesale Seller Queries
export const GET_WHOLESALE_STATS = gql`
  query GetWholesaleStats {
    wholesaleStats {
      totalProducts
      totalBuyers
      totalOrders
      totalRevenue
      pendingOrders
    }
  }
`;

export const GET_RECENT_WHOLESALE_ORDERS = gql`
  query GetRecentWholesaleOrders {
    listWholesaleOrders(first: 5) {
      edges {
        node {
          id
          orderNumber
          status
          totalAmount
          depositAmount
          balanceAmount
          createdAt
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
      edges {
        node {
          id
          buyerId
          sellerId
          isActive
          grantedAt
          buyer {
            id
            email
            fullName
          }
        }
      }
      totalCount
    }
  }
`;

export const GET_SELLER_BY_USERNAME = gql`
  query GetSellerByUsername($username: String!) {
    getSellerByUsername(username: $username) {
      id
      username
      email
      fullName
      sellerAccount {
        id
        businessName
        storeName
        storeSlug
      }
    }
  }
`;

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

// Wholesale Seller Mutations
export const CREATE_WHOLESALE_INVITATION = gql`
  mutation CreateWholesaleInvitation($input: CreateWholesaleInvitationInput!) {
    createWholesaleInvitation(input: $input) {
      id
      buyerEmail
      token
    }
  }
`;

export const CANCEL_INVITATION = gql`
  mutation CancelInvitation($invitationId: ID!) {
    cancelInvitation(invitationId: $invitationId) {
      id
      status
    }
  }
`;

export const DELETE_WHOLESALE_PRODUCT = gql`
  mutation DeleteWholesaleProduct($id: ID!) {
    deleteWholesaleProduct(id: $id) {
      success
    }
  }
`;

export const CREATE_WHOLESALE_PRODUCT = gql`
  mutation CreateWholesaleProduct($input: CreateWholesaleProductInput!) {
    createWholesaleProduct(input: $input) {
      id
      name
    }
  }
`;

export const LIST_WHOLESALE_ORDERS = gql`
  query ListWholesaleOrders($first: Int, $after: String, $filter: WholesaleOrderFilterInput) {
    listWholesaleOrders(first: $first, after: $after, filter: $filter) {
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
          balanceAmount
          paymentTerms
          poNumber
          balanceRequestedAt
          balancePaidAt
          createdAt
          updatedAt
          calculatedDepositAmount
          calculatedBalanceAmount
          items {
            id
          }
          seller {
            id
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
      balanceAmount
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
