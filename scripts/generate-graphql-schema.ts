import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsDir = path.join(__dirname, '..', 'contracts');
if (!fs.existsSync(contractsDir)) {
  fs.mkdirSync(contractsDir, { recursive: true });
}

console.log('🔍 Extracting GraphQL schema from NestJS...');

try {
  const nestApiDir = path.join(__dirname, '..', 'apps', 'nest-api');
  const schemaPath = path.join(__dirname, '..', 'docs', 'graphql-schema.graphql');
  
  if (!fs.existsSync(schemaPath)) {
    console.log('⚠️  GraphQL schema not found at docs/graphql-schema.graphql');
    console.log('📝 Note: GraphQL schema is generated when NestJS server starts');
    console.log('💡 To generate schema: Start the NestJS server (it auto-generates docs/graphql-schema.graphql)');
    
    const placeholderSchema = `# GraphQL Schema Placeholder
# This file will be auto-generated when the NestJS server starts
# The server is configured to output the schema to docs/graphql-schema.graphql

type Query {
  _placeholder: String
}
`;
    
    const outputPath = path.join(contractsDir, 'graphql-schema.graphql');
    fs.writeFileSync(outputPath, placeholderSchema);
    console.log(`📄 Created placeholder schema at: ${outputPath}`);
    process.exit(0);
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  const outputPath = path.join(contractsDir, 'graphql-schema.graphql');
  fs.writeFileSync(outputPath, schema);
  
  console.log('✅ GraphQL schema extracted successfully!');
  console.log(`📄 Output: ${outputPath}`);
  console.log(`📏 Schema size: ${schema.split('\n').length} lines`);
  
} catch (error: any) {
  console.error('❌ Failed to extract GraphQL schema:', error.message);
  process.exit(1);
}
