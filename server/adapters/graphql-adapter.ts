import type { Request, Response } from 'express';

/**
 * GraphQL Adapter
 * 
 * Translates REST API requests/responses to/from GraphQL
 * Phase 1: Stub implementation with interfaces
 * Phase 3: Full implementation when NestJS GraphQL service is ready
 */

/**
 * REST request context to be transformed into GraphQL
 */
export interface RestRequestContext {
  method: string;
  path: string;
  query: Record<string, any>;
  body: Record<string, any>;
  headers: Record<string, string>;
  params: Record<string, string>;
  user?: {
    id: string;
    email: string;
    userType: string;
  };
}

/**
 * GraphQL query/mutation to be sent to NestJS service
 */
export interface GraphQLRequest {
  query: string;
  variables: Record<string, any>;
  operationName?: string;
}

/**
 * GraphQL response from NestJS service
 */
export interface GraphQLResponse {
  data?: any;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
}

/**
 * REST response format to be sent to client
 */
export interface RestResponse {
  statusCode: number;
  body: any;
  headers?: Record<string, string>;
}

/**
 * GraphQL Adapter Service
 * Handles translation between REST and GraphQL protocols
 */
export class GraphQLAdapter {
  /**
   * Convert REST request to GraphQL query/mutation
   * 
   * @param req - Express request object
   * @returns GraphQL request with query and variables
   */
  public restToGraphQL(req: Request): GraphQLRequest {
    // Stub implementation - will be expanded in Phase 3
    const context: RestRequestContext = {
      method: req.method,
      path: req.path,
      query: req.query as Record<string, any>,
      body: req.body,
      headers: req.headers as Record<string, string>,
      params: req.params,
      user: (req as any).user,
    };

    // Generate GraphQL query based on REST endpoint and method
    const { query, variables, operationName } = this.buildGraphQLQuery(context);

    return {
      query,
      variables,
      operationName,
    };
  }

  /**
   * Convert GraphQL response to REST response
   * 
   * @param graphqlResponse - GraphQL response from NestJS
   * @param originalRequest - Original REST request for context
   * @returns REST-compatible response
   */
  public graphQLToRest(graphqlResponse: GraphQLResponse, originalRequest: Request): RestResponse {
    // Stub implementation - will be expanded in Phase 3
    
    // Handle GraphQL errors
    if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
      const firstError = graphqlResponse.errors[0];
      return {
        statusCode: this.mapGraphQLErrorToHttpStatus(firstError),
        body: {
          message: firstError.message,
          errors: graphqlResponse.errors,
        },
      };
    }

    // Success response
    return {
      statusCode: 200,
      body: this.transformGraphQLDataToRest(graphqlResponse.data, originalRequest),
    };
  }

  /**
   * Build GraphQL query based on REST endpoint
   * 
   * @private
   * @param context - REST request context
   * @returns GraphQL query, variables, and operation name
   */
  private buildGraphQLQuery(context: RestRequestContext): {
    query: string;
    variables: Record<string, any>;
    operationName?: string;
  } {
    // Stub implementation
    // In Phase 3, this will use a mapping table or intelligent routing
    
    // Example mapping (to be expanded):
    const routeMapping: Record<string, (ctx: RestRequestContext) => any> = {
      'GET:/api/products': this.buildProductsQuery,
      'GET:/api/products/:id': this.buildProductQuery,
      'POST:/api/products': this.buildCreateProductMutation,
      'GET:/api/orders': this.buildOrdersQuery,
      'GET:/api/orders/:id': this.buildOrderQuery,
      // Add more mappings as needed
    };

    const routeKey = `${context.method}:${context.path}`;
    const builder = routeMapping[routeKey];

    if (builder) {
      return builder.call(this, context);
    }

    // Fallback: generic query
    return {
      query: `query { __typename }`,
      variables: {},
    };
  }

  /**
   * Example query builders (stubs for Phase 3 implementation)
   */
  private buildProductsQuery(context: RestRequestContext) {
    return {
      query: `
        query GetProducts($sellerId: ID, $limit: Int, $offset: Int) {
          products(sellerId: $sellerId, limit: $limit, offset: $offset) {
            edges {
              node {
                id
                name
                description
                price
                currency
                inventoryQuantity
                status
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      variables: {
        sellerId: context.query.sellerId,
        limit: parseInt(context.query.limit as string) || 50,
        offset: parseInt(context.query.offset as string) || 0,
      },
      operationName: 'GetProducts',
    };
  }

  private buildProductQuery(context: RestRequestContext) {
    return {
      query: `
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            name
            description
            price
            currency
            inventoryQuantity
            status
            images
            variants {
              id
              name
              price
              sku
            }
          }
        }
      `,
      variables: {
        id: context.params.id,
      },
      operationName: 'GetProduct',
    };
  }

  private buildCreateProductMutation(context: RestRequestContext) {
    return {
      query: `
        mutation CreateProduct($input: CreateProductInput!) {
          createProduct(input: $input) {
            id
            name
            price
            status
          }
        }
      `,
      variables: {
        input: context.body,
      },
      operationName: 'CreateProduct',
    };
  }

  private buildOrdersQuery(context: RestRequestContext) {
    return {
      query: `
        query GetOrders($sellerId: ID, $buyerId: ID, $status: OrderStatus) {
          orders(sellerId: $sellerId, buyerId: $buyerId, status: $status) {
            edges {
              node {
                id
                orderNumber
                status
                total
                currency
                createdAt
              }
            }
          }
        }
      `,
      variables: {
        sellerId: context.query.sellerId,
        buyerId: context.query.buyerId,
        status: context.query.status,
      },
      operationName: 'GetOrders',
    };
  }

  private buildOrderQuery(context: RestRequestContext) {
    return {
      query: `
        query GetOrder($id: ID!) {
          order(id: $id) {
            id
            orderNumber
            status
            total
            currency
            items {
              id
              productName
              quantity
              price
            }
            shippingAddress {
              fullName
              addressLine1
              city
              state
              postalCode
              country
            }
          }
        }
      `,
      variables: {
        id: context.params.id,
      },
      operationName: 'GetOrder',
    };
  }

  /**
   * Transform GraphQL data to REST format
   * 
   * @private
   * @param data - GraphQL response data
   * @param req - Original request for context
   * @returns REST-compatible data
   */
  private transformGraphQLDataToRest(data: any, req: Request): any {
    // Stub implementation
    // In Phase 3, this will handle pagination, field mapping, etc.
    
    if (!data) {
      return null;
    }

    // If data has Relay-style edges, unwrap them
    if (data.edges && Array.isArray(data.edges)) {
      return data.edges.map((edge: any) => edge.node);
    }

    return data;
  }

  /**
   * Map GraphQL error to HTTP status code
   * 
   * @private
   * @param error - GraphQL error
   * @returns HTTP status code
   */
  private mapGraphQLErrorToHttpStatus(error: { message: string; locations?: Array<{ line: number; column: number }>; path?: string[]; extensions?: Record<string, any> }): number {
    const errorCode = error.extensions?.code;

    const statusMap: Record<string, number> = {
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      BAD_USER_INPUT: 400,
      INTERNAL_SERVER_ERROR: 500,
    };

    return statusMap[errorCode] || 500;
  }
}

// Singleton instance
export const graphqlAdapter = new GraphQLAdapter();
