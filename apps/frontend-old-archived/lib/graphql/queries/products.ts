import { gql } from '@/lib/apollo-client';

export const LIST_PRODUCTS = gql`
  query ListProducts($first: Int, $after: String, $filter: ProductFilterInput) {
    listProducts(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          name
          description
          price
          category
          productType
          image
          stock
          status
          createdAt
          presentation {
            availabilityText
            badges
            stockLevelIndicator
            availableForPurchase
            isPreOrder
            isMadeToOrder
            stockQuantity
          }
        }
        cursor
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

export const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    getProduct(id: $id) {
      id
      name
      description
      price
      category
      productType
      image
      images
      stock
      status
      createdAt
      presentation {
        availabilityText
        badges
        stockLevelIndicator
        availableForPurchase
        isPreOrder
        isMadeToOrder
        stockQuantity
      }
    }
  }
`;
