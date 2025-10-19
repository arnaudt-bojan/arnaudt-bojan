# GraphQL Contract Tests

## Overview

This document outlines the contract testing strategy for the Upfirst GraphQL API. Contract tests ensure:

1. **REST/GraphQL Parity**: GraphQL API returns same data as REST API
2. **Pagination Behavior**: Cursor-based pagination works correctly
3. **Filter/Sort Behavior**: Filtering and sorting produce expected results
4. **Schema Contracts**: Schema changes don't break existing clients
5. **Authorization Contracts**: Permissions enforced consistently

## Testing Framework

### Tools

- **Testing Library**: Jest + GraphQL Testing Library
- **Schema Validation**: `graphql-schema-linter`
- **Type Safety**: TypeScript with generated types
- **Contract Testing**: Pact for consumer-driven contracts

### Test Structure

```
tests/graphql/
├── contracts/
│   ├── rest-parity/          # REST vs GraphQL parity tests
│   ├── pagination/           # Pagination behavior tests
│   ├── filtering/            # Filter/sort behavior tests
│   └── authorization/        # Permission tests
├── integration/              # End-to-end GraphQL tests
├── performance/              # Load and performance tests
└── schema/                   # Schema validation tests
```

---

## 1. REST vs GraphQL Parity Tests

### Objective

Ensure GraphQL queries return identical data to their REST counterparts.

### Test Cases

#### 1.1 Product Retrieval Parity

**REST Endpoint**: `GET /api/products/:id`
**GraphQL Query**: `getProduct(id: ID!): Product`

```typescript
describe('Product Retrieval Parity', () => {
  it('should return same product data from REST and GraphQL', async () => {
    const productId = 'test-product-123';
    
    // Fetch via REST
    const restResponse = await fetch(`/api/products/${productId}`);
    const restData = await restResponse.json();
    
    // Fetch via GraphQL
    const graphqlQuery = gql`
      query GetProduct($id: ID!) {
        getProduct(id: $id) {
          id
          name
          description
          price
          image
          images
          category
          stock
          status
          sellerId
          createdAt
          updatedAt
        }
      }
    `;
    
    const graphqlResponse = await graphqlClient.query({
      query: graphqlQuery,
      variables: { id: productId }
    });
    
    const graphqlData = graphqlResponse.data.getProduct;
    
    // Assert equality
    expect(graphqlData.id).toBe(restData.id);
    expect(graphqlData.name).toBe(restData.name);
    expect(graphqlData.description).toBe(restData.description);
    expect(graphqlData.price).toBe(restData.price);
    expect(graphqlData.stock).toBe(restData.stock);
    
    // Assert timestamps are equivalent
    expect(new Date(graphqlData.createdAt).getTime())
      .toBe(new Date(restData.created_at).getTime());
  });
  
  it('should handle product not found consistently', async () => {
    const invalidId = 'nonexistent-product';
    
    // REST should return 404
    const restResponse = await fetch(`/api/products/${invalidId}`);
    expect(restResponse.status).toBe(404);
    
    // GraphQL should return null or error
    const graphqlQuery = gql`
      query GetProduct($id: ID!) {
        getProduct(id: $id) {
          id
        }
      }
    `;
    
    const graphqlResponse = await graphqlClient.query({
      query: graphqlQuery,
      variables: { id: invalidId }
    });
    
    expect(graphqlResponse.data.getProduct).toBeNull();
  });
});
```

#### 1.2 Order Retrieval Parity

**REST Endpoint**: `GET /api/orders/:id`
**GraphQL Query**: `getOrder(id: ID!): Order`

```typescript
describe('Order Retrieval Parity', () => {
  it('should return same order data with nested relationships', async () => {
    const orderId = 'test-order-456';
    
    // REST
    const restResponse = await fetch(`/api/orders/${orderId}`);
    const restData = await restResponse.json();
    
    // GraphQL with nested items
    const graphqlQuery = gql`
      query GetOrder($id: ID!) {
        getOrder(id: $id) {
          id
          orderNumber
          status
          paymentStatus
          totalAmount
          items {
            id
            productName
            quantity
            unitPrice
            lineTotal
          }
          buyer {
            id
            email
          }
        }
      }
    `;
    
    const graphqlResponse = await graphqlClient.query({
      query: graphqlQuery,
      variables: { id: orderId }
    });
    
    const graphqlData = graphqlResponse.data.getOrder;
    
    // Assert top-level fields
    expect(graphqlData.id).toBe(restData.id);
    expect(graphqlData.orderNumber).toBe(restData.order_number);
    expect(graphqlData.status).toBe(restData.status.toUpperCase());
    expect(graphqlData.totalAmount).toBe(restData.total_amount);
    
    // Assert nested items
    expect(graphqlData.items.length).toBe(restData.items.length);
    expect(graphqlData.items[0].productName).toBe(restData.items[0].product_name);
    
    // Assert nested buyer
    expect(graphqlData.buyer.id).toBe(restData.buyer_id);
  });
});
```

#### 1.3 List Operations Parity

**REST Endpoint**: `GET /api/products?seller_id=X&page=1&limit=20`
**GraphQL Query**: `listProducts(filter, pagination): ProductConnection`

```typescript
describe('Product List Parity', () => {
  it('should return same products with REST pagination vs GraphQL cursor', async () => {
    const sellerId = 'seller-123';
    
    // REST with page/limit
    const restResponse = await fetch(
      `/api/products?seller_id=${sellerId}&page=1&limit=20`
    );
    const restData = await restResponse.json();
    
    // GraphQL with cursor pagination
    const graphqlQuery = gql`
      query ListProducts($sellerId: ID!, $first: Int) {
        listProducts(
          filter: { sellerId: $sellerId }
          first: $first
        ) {
          edges {
            node {
              id
              name
              price
              stock
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `;
    
    const graphqlResponse = await graphqlClient.query({
      query: graphqlQuery,
      variables: { sellerId, first: 20 }
    });
    
    const graphqlData = graphqlResponse.data.listProducts;
    
    // Should have same number of results
    expect(graphqlData.edges.length).toBe(restData.products.length);
    
    // Should have same total count
    expect(graphqlData.totalCount).toBe(restData.total);
    
    // First product should match
    expect(graphqlData.edges[0].node.id).toBe(restData.products[0].id);
  });
});
```

#### 1.4 Mutation Parity

**REST Endpoint**: `POST /api/products`
**GraphQL Mutation**: `createProduct(input): Product`

```typescript
describe('Product Creation Parity', () => {
  it('should create product with same data via REST and GraphQL', async () => {
    const productInput = {
      name: 'Test Product',
      description: 'Test Description',
      price: 29.99,
      image: 'https://example.com/image.jpg',
      category: 'Electronics',
      productType: 'Physical',
      stock: 100
    };
    
    // Create via REST
    const restResponse = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productInput)
    });
    const restProduct = await restResponse.json();
    
    // Create via GraphQL
    const graphqlMutation = gql`
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
          name
          description
          price
          stock
          sku
        }
      }
    `;
    
    const graphqlResponse = await graphqlClient.mutate({
      mutation: graphqlMutation,
      variables: { input: productInput }
    });
    
    const graphqlProduct = graphqlResponse.data.createProduct;
    
    // Both should create products with same structure
    expect(restProduct.name).toBe(graphqlProduct.name);
    expect(restProduct.price).toBe(graphqlProduct.price);
    expect(graphqlProduct.sku).toBeDefined(); // SKU auto-generated
  });
});
```

---

## 2. Pagination Behavior Tests

### Objective

Validate cursor-based pagination works correctly in all scenarios.

### Test Cases

#### 2.1 Forward Pagination

```typescript
describe('Forward Pagination', () => {
  it('should paginate forward through all products', async () => {
    const query = gql`
      query ListProducts($first: Int, $after: String) {
        listProducts(first: $first, after: $after) {
          edges {
            node {
              id
              name
            }
            cursor
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            endCursor
          }
        }
      }
    `;
    
    // Page 1
    const page1 = await graphqlClient.query({
      query,
      variables: { first: 10 }
    });
    
    expect(page1.data.listProducts.edges.length).toBe(10);
    expect(page1.data.listProducts.pageInfo.hasNextPage).toBe(true);
    expect(page1.data.listProducts.pageInfo.hasPreviousPage).toBe(false);
    
    const page1EndCursor = page1.data.listProducts.pageInfo.endCursor;
    
    // Page 2
    const page2 = await graphqlClient.query({
      query,
      variables: { first: 10, after: page1EndCursor }
    });
    
    expect(page2.data.listProducts.edges.length).toBe(10);
    expect(page2.data.listProducts.pageInfo.hasPreviousPage).toBe(true);
    
    // Should have different products
    expect(page2.data.listProducts.edges[0].node.id)
      .not.toBe(page1.data.listProducts.edges[0].node.id);
  });
  
  it('should handle last page correctly', async () => {
    // Assume we have 25 total products
    const query = gql`
      query ListProducts($first: Int, $after: String) {
        listProducts(first: $first, after: $after) {
          edges {
            node {
              id
            }
          }
          pageInfo {
            hasNextPage
          }
          totalCount
        }
      }
    `;
    
    // Navigate to last page
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;
    
    while (hasNextPage) {
      const response = await graphqlClient.query({
        query,
        variables: { first: 10, after: cursor }
      });
      
      const data = response.data.listProducts;
      hasNextPage = data.pageInfo.hasNextPage;
      cursor = data.pageInfo.endCursor;
      pageCount++;
      
      if (!hasNextPage) {
        // Last page should have remaining items (5 items)
        expect(data.edges.length).toBe(5);
      }
    }
    
    expect(pageCount).toBe(3); // 10 + 10 + 5 = 25
  });
});
```

#### 2.2 Backward Pagination

```typescript
describe('Backward Pagination', () => {
  it('should paginate backward using "last" and "before"', async () => {
    const query = gql`
      query ListProducts($last: Int, $before: String) {
        listProducts(last: $last, before: $before) {
          edges {
            node {
              id
              name
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
          }
        }
      }
    `;
    
    // Get last 10 products
    const lastPage = await graphqlClient.query({
      query,
      variables: { last: 10 }
    });
    
    expect(lastPage.data.listProducts.edges.length).toBe(10);
    expect(lastPage.data.listProducts.pageInfo.hasNextPage).toBe(false);
    expect(lastPage.data.listProducts.pageInfo.hasPreviousPage).toBe(true);
    
    const startCursor = lastPage.data.listProducts.pageInfo.startCursor;
    
    // Get previous 10 products
    const previousPage = await graphqlClient.query({
      query,
      variables: { last: 10, before: startCursor }
    });
    
    expect(previousPage.data.listProducts.edges.length).toBe(10);
    
    // Should be different products
    expect(previousPage.data.listProducts.edges[0].node.id)
      .not.toBe(lastPage.data.listProducts.edges[0].node.id);
  });
});
```

#### 2.3 Cursor Stability

```typescript
describe('Cursor Stability', () => {
  it('should return same results when using same cursor multiple times', async () => {
    const query = gql`
      query ListProducts($first: Int, $after: String) {
        listProducts(first: $first, after: $after) {
          edges {
            node {
              id
            }
          }
          pageInfo {
            endCursor
          }
        }
      }
    `;
    
    // Get first page
    const page1_attempt1 = await graphqlClient.query({
      query,
      variables: { first: 10 }
    });
    
    const cursor = page1_attempt1.data.listProducts.pageInfo.endCursor;
    
    // Get second page - attempt 1
    const page2_attempt1 = await graphqlClient.query({
      query,
      variables: { first: 10, after: cursor }
    });
    
    // Get second page - attempt 2 (reuse cursor)
    const page2_attempt2 = await graphqlClient.query({
      query,
      variables: { first: 10, after: cursor }
    });
    
    // Should return identical results
    expect(page2_attempt1.data.listProducts.edges)
      .toEqual(page2_attempt2.data.listProducts.edges);
  });
});
```

#### 2.4 Empty Results

```typescript
describe('Empty Pagination Results', () => {
  it('should handle empty results gracefully', async () => {
    const query = gql`
      query ListProducts($filter: ProductFilterInput, $first: Int) {
        listProducts(filter: $filter, first: $first) {
          edges {
            node {
              id
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
          totalCount
        }
      }
    `;
    
    const response = await graphqlClient.query({
      query,
      variables: {
        filter: { category: 'NonexistentCategory' },
        first: 10
      }
    });
    
    const data = response.data.listProducts;
    
    expect(data.edges).toEqual([]);
    expect(data.pageInfo.hasNextPage).toBe(false);
    expect(data.pageInfo.hasPreviousPage).toBe(false);
    expect(data.totalCount).toBe(0);
  });
});
```

---

## 3. Filter & Sort Behavior Tests

### Objective

Validate filtering and sorting produce expected, consistent results.

### Test Cases

#### 3.1 Single Filter

```typescript
describe('Product Filtering', () => {
  it('should filter products by seller ID', async () => {
    const sellerId = 'seller-123';
    
    const query = gql`
      query ListProducts($filter: ProductFilterInput) {
        listProducts(filter: $filter) {
          edges {
            node {
              id
              sellerId
            }
          }
        }
      }
    `;
    
    const response = await graphqlClient.query({
      query,
      variables: {
        filter: { sellerId }
      }
    });
    
    const products = response.data.listProducts.edges;
    
    // All products should belong to seller
    products.forEach(edge => {
      expect(edge.node.sellerId).toBe(sellerId);
    });
  });
  
  it('should filter products by category', async () => {
    const category = 'Electronics';
    
    const query = gql`
      query ListProducts($filter: ProductFilterInput) {
        listProducts(filter: $filter) {
          edges {
            node {
              id
              category
            }
          }
        }
      }
    `;
    
    const response = await graphqlClient.query({
      query,
      variables: {
        filter: { category }
      }
    });
    
    const products = response.data.listProducts.edges;
    
    products.forEach(edge => {
      expect(edge.node.category).toBe(category);
    });
  });
});
```

#### 3.2 Multiple Filters

```typescript
describe('Multiple Filters', () => {
  it('should apply AND logic for multiple filters', async () => {
    const query = gql`
      query ListProducts($filter: ProductFilterInput) {
        listProducts(filter: $filter) {
          edges {
            node {
              id
              sellerId
              category
              status
              price
            }
          }
        }
      }
    `;
    
    const response = await graphqlClient.query({
      query,
      variables: {
        filter: {
          sellerId: 'seller-123',
          category: 'Electronics',
          status: 'ACTIVE',
          priceMin: 10.00,
          priceMax: 100.00
        }
      }
    });
    
    const products = response.data.listProducts.edges;
    
    products.forEach(edge => {
      expect(edge.node.sellerId).toBe('seller-123');
      expect(edge.node.category).toBe('Electronics');
      expect(edge.node.status).toBe('ACTIVE');
      expect(edge.node.price).toBeGreaterThanOrEqual(10.00);
      expect(edge.node.price).toBeLessThanOrEqual(100.00);
    });
  });
});
```

#### 3.3 Text Search

```typescript
describe('Text Search', () => {
  it('should search products by name', async () => {
    const searchTerm = 'Laptop';
    
    const query = gql`
      query ListProducts($filter: ProductFilterInput) {
        listProducts(filter: $filter) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;
    
    const response = await graphqlClient.query({
      query,
      variables: {
        filter: { search: searchTerm }
      }
    });
    
    const products = response.data.listProducts.edges;
    
    products.forEach(edge => {
      expect(edge.node.name.toLowerCase()).toContain(searchTerm.toLowerCase());
    });
  });
});
```

#### 3.4 Sorting

```typescript
describe('Product Sorting', () => {
  it('should sort products by price ascending', async () => {
    const query = gql`
      query ListProducts($sort: ProductSortInput) {
        listProducts(sort: $sort, first: 20) {
          edges {
            node {
              id
              name
              price
            }
          }
        }
      }
    `;
    
    const response = await graphqlClient.query({
      query,
      variables: {
        sort: {
          field: 'PRICE',
          direction: 'ASC'
        }
      }
    });
    
    const products = response.data.listProducts.edges;
    const prices = products.map(edge => edge.node.price);
    
    // Prices should be in ascending order
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });
  
  it('should sort products by created date descending', async () => {
    const query = gql`
      query ListProducts($sort: ProductSortInput) {
        listProducts(sort: $sort, first: 20) {
          edges {
            node {
              id
              createdAt
            }
          }
        }
      }
    `;
    
    const response = await graphqlClient.query({
      query,
      variables: {
        sort: {
          field: 'CREATED_AT',
          direction: 'DESC'
        }
      }
    });
    
    const products = response.data.listProducts.edges;
    const dates = products.map(edge => new Date(edge.node.createdAt).getTime());
    
    // Dates should be in descending order (newest first)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });
});
```

#### 3.5 Combined Filter + Sort

```typescript
describe('Filter and Sort Combined', () => {
  it('should filter by category and sort by price', async () => {
    const query = gql`
      query ListProducts($filter: ProductFilterInput, $sort: ProductSortInput) {
        listProducts(filter: $filter, sort: $sort) {
          edges {
            node {
              id
              category
              price
            }
          }
        }
      }
    `;
    
    const response = await graphqlClient.query({
      query,
      variables: {
        filter: { category: 'Electronics' },
        sort: { field: 'PRICE', direction: 'ASC' }
      }
    });
    
    const products = response.data.listProducts.edges;
    
    // All should be Electronics
    products.forEach(edge => {
      expect(edge.node.category).toBe('Electronics');
    });
    
    // Should be sorted by price
    const prices = products.map(edge => edge.node.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    });
  });
});
```

---

## 4. Authorization Contract Tests

### Objective

Ensure authorization rules are consistently enforced across all operations.

### Test Cases

#### 4.1 Unauthenticated Access

```typescript
describe('Unauthenticated Access', () => {
  it('should reject unauthenticated user accessing getCurrentUser', async () => {
    const query = gql`
      query {
        getCurrentUser {
          id
          email
        }
      }
    `;
    
    // Make request without auth token
    await expect(
      unauthenticatedClient.query({ query })
    ).rejects.toThrow('Not authenticated');
  });
  
  it('should allow unauthenticated access to public product listing', async () => {
    const query = gql`
      query {
        listProducts(first: 10) {
          edges {
            node {
              id
              name
              price
            }
          }
        }
      }
    `;
    
    // Public products should be accessible
    const response = await unauthenticatedClient.query({ query });
    expect(response.data.listProducts.edges.length).toBeGreaterThan(0);
  });
});
```

#### 4.2 Seller-Only Operations

```typescript
describe('Seller-Only Operations', () => {
  it('should allow seller to create product', async () => {
    const mutation = gql`
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
          name
        }
      }
    `;
    
    const response = await sellerClient.mutate({
      mutation,
      variables: {
        input: {
          name: 'Test Product',
          description: 'Test',
          price: 29.99,
          image: 'https://example.com/img.jpg',
          category: 'Test',
          productType: 'Physical',
          stock: 10
        }
      }
    });
    
    expect(response.data.createProduct.id).toBeDefined();
  });
  
  it('should reject buyer creating product', async () => {
    const mutation = gql`
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
        }
      }
    `;
    
    await expect(
      buyerClient.mutate({
        mutation,
        variables: {
          input: {
            name: 'Test Product',
            description: 'Test',
            price: 29.99,
            image: 'https://example.com/img.jpg',
            category: 'Test',
            productType: 'Physical',
            stock: 10
          }
        }
      })
    ).rejects.toThrow('Not authorized');
  });
});
```

#### 4.3 Resource Ownership

```typescript
describe('Resource Ownership', () => {
  it('should allow seller to update own product', async () => {
    const productId = await createTestProduct(sellerClient);
    
    const mutation = gql`
      mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
        updateProduct(id: $id, input: $input) {
          id
          name
        }
      }
    `;
    
    const response = await sellerClient.mutate({
      mutation,
      variables: {
        id: productId,
        input: { name: 'Updated Name' }
      }
    });
    
    expect(response.data.updateProduct.name).toBe('Updated Name');
  });
  
  it('should reject seller updating another seller\'s product', async () => {
    const otherSellerProductId = 'other-seller-product-id';
    
    const mutation = gql`
      mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
        updateProduct(id: $id, input: $input) {
          id
        }
      }
    `;
    
    await expect(
      sellerClient.mutate({
        mutation,
        variables: {
          id: otherSellerProductId,
          input: { name: 'Hacked Name' }
        }
      })
    ).rejects.toThrow('Not authorized');
  });
});
```

#### 4.4 Field-Level Authorization

```typescript
describe('Field-Level Authorization', () => {
  it('should hide seller notes from buyers', async () => {
    const productId = 'test-product-123';
    
    const query = gql`
      query GetProduct($id: ID!) {
        getProduct(id: $id) {
          id
          name
          sellerNotes
        }
      }
    `;
    
    // Seller can see notes
    const sellerResponse = await sellerClient.query({
      query,
      variables: { id: productId }
    });
    expect(sellerResponse.data.getProduct.sellerNotes).toBeDefined();
    
    // Buyer cannot see notes
    const buyerResponse = await buyerClient.query({
      query,
      variables: { id: productId }
    });
    expect(buyerResponse.data.getProduct.sellerNotes).toBeNull();
  });
});
```

---

## 5. Schema Contract Tests

### Objective

Prevent breaking changes to the GraphQL schema.

### Test Cases

#### 5.1 Backward Compatibility

```typescript
describe('Schema Backward Compatibility', () => {
  it('should maintain all existing queries', async () => {
    const schema = await loadGraphQLSchema();
    const queryType = schema.getQueryType();
    
    const requiredQueries = [
      'getCurrentUser',
      'getProduct',
      'listProducts',
      'getOrder',
      'listOrders',
      'getCart'
    ];
    
    requiredQueries.forEach(queryName => {
      const field = queryType.getFields()[queryName];
      expect(field).toBeDefined();
    });
  });
  
  it('should maintain all existing mutations', async () => {
    const schema = await loadGraphQLSchema();
    const mutationType = schema.getMutationType();
    
    const requiredMutations = [
      'createProduct',
      'updateProduct',
      'addToCart',
      'createOrder',
      'issueRefund'
    ];
    
    requiredMutations.forEach(mutationName => {
      const field = mutationType.getFields()[mutationName];
      expect(field).toBeDefined();
    });
  });
  
  it('should not remove fields from existing types', async () => {
    const schema = await loadGraphQLSchema();
    const productType = schema.getType('Product');
    
    const requiredFields = [
      'id',
      'name',
      'description',
      'price',
      'image',
      'stock',
      'createdAt'
    ];
    
    requiredFields.forEach(fieldName => {
      const field = productType.getFields()[fieldName];
      expect(field).toBeDefined();
    });
  });
});
```

#### 5.2 Input Validation

```typescript
describe('Input Validation', () => {
  it('should reject invalid price values', async () => {
    const mutation = gql`
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
        }
      }
    `;
    
    await expect(
      sellerClient.mutate({
        mutation,
        variables: {
          input: {
            name: 'Test',
            description: 'Test',
            price: -10.00, // Invalid negative price
            image: 'https://example.com/img.jpg',
            category: 'Test',
            productType: 'Physical',
            stock: 10
          }
        }
      })
    ).rejects.toThrow('Price must be positive');
  });
  
  it('should reject missing required fields', async () => {
    const mutation = gql`
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
        }
      }
    `;
    
    await expect(
      sellerClient.mutate({
        mutation,
        variables: {
          input: {
            // Missing required fields
            name: 'Test'
          }
        }
      })
    ).rejects.toThrow();
  });
});
```

---

## 6. Performance Contract Tests

### Objective

Ensure GraphQL queries perform within acceptable limits.

### Test Cases

#### 6.1 Query Complexity

```typescript
describe('Query Complexity', () => {
  it('should reject overly complex queries', async () => {
    // Deeply nested query exceeding complexity limit
    const query = gql`
      query {
        listProducts(first: 100) {
          edges {
            node {
              id
              seller {
                id
                products(first: 100) {
                  edges {
                    node {
                      id
                      seller {
                        id
                        products(first: 100) {
                          edges {
                            node {
                              id
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    await expect(
      graphqlClient.query({ query })
    ).rejects.toThrow('Query complexity exceeds maximum');
  });
});
```

#### 6.2 Response Time

```typescript
describe('Response Time', () => {
  it('should return product list within 500ms', async () => {
    const query = gql`
      query {
        listProducts(first: 20) {
          edges {
            node {
              id
              name
              price
            }
          }
        }
      }
    `;
    
    const start = Date.now();
    await graphqlClient.query({ query });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
  
  it('should return order with nested data within 1000ms', async () => {
    const query = gql`
      query GetOrder($id: ID!) {
        getOrder(id: $id) {
          id
          items {
            id
            product {
              id
              name
            }
          }
          buyer {
            id
            email
          }
          invoice {
            id
            documentUrl
          }
        }
      }
    `;
    
    const start = Date.now();
    await graphqlClient.query({
      query,
      variables: { id: 'test-order-123' }
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
  });
});
```

---

## 7. Real-Time Subscription Tests

### Objective

Validate WebSocket subscriptions deliver updates correctly.

### Test Cases

#### 7.1 Order Status Updates

```typescript
describe('Order Status Subscription', () => {
  it('should receive order status updates', (done) => {
    const subscription = gql`
      subscription OnOrderStatusUpdate($orderId: ID!) {
        orderStatusUpdated(orderId: $orderId) {
          id
          status
          updatedAt
        }
      }
    `;
    
    const orderId = 'test-order-123';
    let updateReceived = false;
    
    const observable = graphqlClient.subscribe({
      query: subscription,
      variables: { orderId }
    });
    
    const subscriptionClient = observable.subscribe({
      next: (result) => {
        expect(result.data.orderStatusUpdated.id).toBe(orderId);
        expect(result.data.orderStatusUpdated.status).toBe('FULFILLED');
        updateReceived = true;
      },
      error: done,
      complete: () => {
        expect(updateReceived).toBe(true);
        done();
      }
    });
    
    // Trigger status update
    setTimeout(async () => {
      await updateOrderStatus(orderId, 'FULFILLED');
      subscriptionClient.unsubscribe();
    }, 100);
  });
});
```

#### 7.2 Cart Sync

```typescript
describe('Cart Sync Subscription', () => {
  it('should sync cart across devices', (done) => {
    const subscription = gql`
      subscription OnCartSync($cartId: ID!) {
        cartSynced(cartId: $cartId) {
          id
          items {
            productId
            quantity
          }
          updatedAt
        }
      }
    `;
    
    const cartId = 'test-cart-456';
    let syncReceived = false;
    
    const observable = graphqlClient.subscribe({
      query: subscription,
      variables: { cartId }
    });
    
    const subscriptionClient = observable.subscribe({
      next: (result) => {
        expect(result.data.cartSynced.id).toBe(cartId);
        expect(result.data.cartSynced.items.length).toBeGreaterThan(0);
        syncReceived = true;
      },
      error: done,
      complete: () => {
        expect(syncReceived).toBe(true);
        done();
      }
    });
    
    // Add item to cart from different client
    setTimeout(async () => {
      await addToCartViaREST(cartId, 'product-123', 2);
      subscriptionClient.unsubscribe();
    }, 100);
  });
});
```

---

## 8. Error Handling Contract Tests

### Objective

Ensure errors are returned in a consistent, predictable format.

### Test Cases

#### 8.1 Validation Errors

```typescript
describe('Validation Errors', () => {
  it('should return structured validation errors', async () => {
    const mutation = gql`
      mutation CreateProduct($input: CreateProductInput!) {
        createProduct(input: $input) {
          id
        }
      }
    `;
    
    try {
      await sellerClient.mutate({
        mutation,
        variables: {
          input: {
            name: '', // Empty name
            description: 'Test',
            price: -5, // Negative price
            image: 'invalid-url', // Invalid URL
            category: 'Test',
            productType: 'Physical',
            stock: -1 // Negative stock
          }
        }
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.graphQLErrors[0].extensions.code).toBe('VALIDATION_ERROR');
      expect(error.graphQLErrors[0].extensions.fields).toMatchObject({
        name: 'Name is required',
        price: 'Price must be positive',
        image: 'Invalid URL format',
        stock: 'Stock cannot be negative'
      });
    }
  });
});
```

#### 8.2 Not Found Errors

```typescript
describe('Not Found Errors', () => {
  it('should return null for non-existent resources', async () => {
    const query = gql`
      query GetProduct($id: ID!) {
        getProduct(id: $id) {
          id
        }
      }
    `;
    
    const response = await graphqlClient.query({
      query,
      variables: { id: 'nonexistent-product' }
    });
    
    expect(response.data.getProduct).toBeNull();
    expect(response.errors).toBeUndefined();
  });
});
```

---

## Test Execution

### Running Tests

```bash
# Run all contract tests
npm run test:graphql:contracts

# Run specific test suite
npm run test:graphql:pagination
npm run test:graphql:parity
npm run test:graphql:authorization

# Run with coverage
npm run test:graphql:contracts -- --coverage
```

### CI/CD Integration

```yaml
# .github/workflows/graphql-contracts.yml
name: GraphQL Contract Tests

on:
  pull_request:
    paths:
      - 'graphql/**'
      - 'server/services/**'
      - 'docs/graphql-schema.graphql'

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run contract tests
        run: npm run test:graphql:contracts
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results/
```

---

## Continuous Monitoring

### Contract Test Dashboard

Monitor contract test health in production:

1. **REST/GraphQL Parity**: % of matching responses
2. **Pagination Accuracy**: Cursor stability score
3. **Authorization Coverage**: % of endpoints tested
4. **Performance SLA**: % of queries under threshold
5. **Schema Stability**: Breaking change detection

### Alerts

Trigger alerts when:
- Parity tests fail (data mismatch between REST and GraphQL)
- Pagination returns incorrect results
- Authorization bypass detected
- Performance degradation >20%
- Schema breaking changes introduced

---

## Summary

This contract testing strategy ensures the GraphQL API is:

1. **Consistent**: Returns same data as REST API
2. **Reliable**: Pagination always works correctly
3. **Predictable**: Filters and sorts behave as expected
4. **Secure**: Authorization enforced consistently
5. **Stable**: Schema changes don't break existing clients
6. **Performant**: Queries complete within SLA

Contract tests should be run:
- On every pull request
- Before deploying to production
- Continuously in production (smoke tests)
- After any schema changes

By maintaining comprehensive contract tests, we ensure the GraphQL API remains a reliable, consistent interface for all client applications.
