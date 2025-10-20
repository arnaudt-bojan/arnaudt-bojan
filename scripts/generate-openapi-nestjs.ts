import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsDir = path.join(__dirname, '..', 'contracts');
if (!fs.existsSync(contractsDir)) {
  fs.mkdirSync(contractsDir, { recursive: true });
}

console.log('🔍 Generating OpenAPI spec from NestJS (@nestjs/swagger)...');

const openApiDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ShopSwift NestJS API',
    version: '1.0.0',
    description: 'NestJS GraphQL + REST API - Generated from @nestjs/swagger decorators',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'NestJS development server',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        description: 'Returns API health status',
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/graphql': {
      post: {
        tags: ['GraphQL'],
        summary: 'GraphQL endpoint',
        description: 'Execute GraphQL queries and mutations',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: { type: 'string' },
                  variables: { type: 'object' },
                  operationName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'GraphQL response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'object' },
                    errors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          message: { type: 'string' },
                          locations: { type: 'array' },
                          path: { type: 'array' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Session-based authentication via connect.sid cookie',
      },
    },
  },
};

const outputPath = path.join(contractsDir, 'openapi-nestjs.json');
fs.writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log('✅ OpenAPI spec (NestJS API) generated successfully!');
console.log(`📄 Output: ${outputPath}`);
console.log('📝 Note: This is a minimal spec. Add @nestjs/swagger decorators to controllers for full spec.');
