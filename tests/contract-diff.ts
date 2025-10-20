import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsDir = path.join(__dirname, '..', 'contracts');
const baselineDir = path.join(contractsDir, 'baseline');

interface DiffResult {
  schema: string;
  hasBreakingChanges: boolean;
  changes: string[];
}

function compareJsonSchemas(currentPath: string, baselinePath: string, schemaName: string): DiffResult {
  if (!fs.existsSync(baselinePath)) {
    console.log(`⚠️  No baseline found for ${schemaName} - creating initial baseline`);
    return {
      schema: schemaName,
      hasBreakingChanges: false,
      changes: ['Initial baseline - no comparison possible'],
    };
  }

  if (!fs.existsSync(currentPath)) {
    console.error(`❌ Current schema not found: ${currentPath}`);
    return {
      schema: schemaName,
      hasBreakingChanges: true,
      changes: ['Schema file missing'],
    };
  }

  try {
    const current = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));

    const changes: string[] = [];
    let hasBreakingChanges = false;

    const currentPaths = Object.keys(current.paths || {});
    const baselinePaths = Object.keys(baseline.paths || {});

    const removedPaths = baselinePaths.filter(p => !currentPaths.includes(p));
    const addedPaths = currentPaths.filter(p => !baselinePaths.includes(p));

    if (removedPaths.length > 0) {
      hasBreakingChanges = true;
      changes.push('🔴 BREAKING CHANGES - Endpoints removed:');
      removedPaths.forEach(p => changes.push(`  - ${p}`));
    }

    if (addedPaths.length > 0) {
      changes.push('🟡 Non-breaking - New endpoints added:');
      addedPaths.slice(0, 10).forEach(p => changes.push(`  - ${p}`));
      if (addedPaths.length > 10) {
        changes.push(`  ... and ${addedPaths.length - 10} more`);
      }
    }

    for (const path of currentPaths) {
      if (baselinePaths.includes(path)) {
        const currentMethods = Object.keys(current.paths[path] || {});
        const baselineMethods = Object.keys(baseline.paths[path] || {});

        const removedMethods = baselineMethods.filter(m => !currentMethods.includes(m));
        
        if (removedMethods.length > 0) {
          hasBreakingChanges = true;
          changes.push(`🔴 BREAKING CHANGES - Methods removed from ${path}:`);
          removedMethods.forEach(m => changes.push(`  - ${m.toUpperCase()}`));
        }
      }
    }

    if (changes.length === 0) {
      changes.push('✅ No changes detected');
    }

    return {
      schema: schemaName,
      hasBreakingChanges,
      changes,
    };
  } catch (error: any) {
    console.error(`Error comparing ${schemaName}:`, error.message);
    return {
      schema: schemaName,
      hasBreakingChanges: true,
      changes: [`Error: ${error.message}`],
    };
  }
}

function compareGraphQLSchema(): DiffResult {
  const schemaName = 'graphql-schema.graphql';
  const currentPath = path.join(contractsDir, schemaName);
  const baselinePath = path.join(baselineDir, schemaName);

  if (!fs.existsSync(baselinePath)) {
    console.log(`⚠️  No baseline found for ${schemaName} - creating initial baseline`);
    return {
      schema: schemaName,
      hasBreakingChanges: false,
      changes: ['Initial baseline - no comparison possible'],
    };
  }

  if (!fs.existsSync(currentPath)) {
    console.error(`❌ Current schema not found: ${currentPath}`);
    return {
      schema: schemaName,
      hasBreakingChanges: true,
      changes: ['Schema file missing'],
    };
  }

  try {
    const currentSchema = fs.readFileSync(currentPath, 'utf-8');
    const baselineSchema = fs.readFileSync(baselinePath, 'utf-8');

    const changes: string[] = [];
    let hasBreakingChanges = false;

    if (currentSchema === baselineSchema) {
      changes.push('✅ No changes detected');
    } else {
      const currentLines = currentSchema.split('\n').length;
      const baselineLines = baselineSchema.split('\n').length;
      const lineDiff = currentLines - baselineLines;

      const currentTypes = (currentSchema.match(/type \w+/g) || []).length;
      const baselineTypes = (baselineSchema.match(/type \w+/g) || []).length;
      const typeDiff = currentTypes - baselineTypes;

      const currentQueries = (currentSchema.match(/type Query \{[\s\S]*?\n\}/g)?.[0]?.match(/\n  \w+/g) || []).length;
      const baselineQueries = (baselineSchema.match(/type Query \{[\s\S]*?\n\}/g)?.[0]?.match(/\n  \w+/g) || []).length;

      if (typeDiff < 0 || currentQueries < baselineQueries) {
        hasBreakingChanges = true;
        changes.push('🔴 POTENTIAL BREAKING CHANGES:');
        if (typeDiff < 0) {
          changes.push(`  - Types removed: ${Math.abs(typeDiff)}`);
        }
        if (currentQueries < baselineQueries) {
          changes.push(`  - Queries removed: ${baselineQueries - currentQueries}`);
        }
      }

      if (typeDiff > 0 || lineDiff > 0 || currentQueries > baselineQueries) {
        changes.push('🟡 Non-breaking changes:');
        if (typeDiff > 0) {
          changes.push(`  - Types added: +${typeDiff}`);
        }
        if (currentQueries > baselineQueries) {
          changes.push(`  - Queries added: +${currentQueries - baselineQueries}`);
        }
        if (lineDiff !== 0) {
          changes.push(`  - Schema size: ${lineDiff > 0 ? '+' : ''}${lineDiff} lines (${baselineLines} → ${currentLines})`);
        }
      }

      if (changes.length === 0) {
        changes.push('🟡 Schema modified (manual review recommended)');
      }
    }

    return {
      schema: schemaName,
      hasBreakingChanges,
      changes,
    };
  } catch (error: any) {
    console.error(`Error comparing GraphQL schema:`, error.message);
    return {
      schema: schemaName,
      hasBreakingChanges: true,
      changes: [`Error: ${error.message}`],
    };
  }
}

async function main() {
  console.log('🔍 Checking API contract changes...\n');

  if (!fs.existsSync(contractsDir)) {
    console.error('❌ contracts/ directory not found. Run contract generation first.');
    process.exit(1);
  }

  if (!fs.existsSync(baselineDir)) {
    console.log('📁 Creating baseline directory...');
    fs.mkdirSync(baselineDir, { recursive: true });
  }

  const results: DiffResult[] = [];

  console.log('📊 Checking OpenAPI specs...\n');
  results.push(compareJsonSchemas(
    path.join(contractsDir, 'openapi-express.json'),
    path.join(baselineDir, 'openapi-express.json'),
    'openapi-express.json'
  ));
  
  results.push(compareJsonSchemas(
    path.join(contractsDir, 'openapi-nestjs.json'),
    path.join(baselineDir, 'openapi-nestjs.json'),
    'openapi-nestjs.json'
  ));

  console.log('\n📊 Checking GraphQL schema...\n');
  results.push(compareGraphQLSchema());

  console.log('\n' + '='.repeat(80));
  console.log('📋 CONTRACT DIFF SUMMARY');
  console.log('='.repeat(80) + '\n');

  let totalBreakingChanges = 0;

  for (const result of results) {
    console.log(`\n📄 ${result.schema}`);
    console.log('-'.repeat(80));
    
    for (const change of result.changes) {
      console.log(change);
    }

    if (result.hasBreakingChanges) {
      totalBreakingChanges++;
    }
  }

  console.log('\n' + '='.repeat(80));

  if (totalBreakingChanges > 0) {
    console.log(`\n❌ FAILED: ${totalBreakingChanges} schema(s) with breaking changes detected!`);
    console.log('\nTo update baselines after reviewing changes:');
    console.log('  ./scripts/contracts.sh update-baseline\n');
    process.exit(1);
  } else {
    console.log('\n✅ SUCCESS: No breaking changes detected!');
    console.log('All API contracts are backward compatible.\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
