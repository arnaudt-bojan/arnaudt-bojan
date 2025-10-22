#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractsDir = path.join(__dirname, '..', 'contracts');
const baselineDir = path.join(contractsDir, 'baseline');

interface DiffResult {
  file: string;
  hasChanges: boolean;
  breaking: string[];
  nonBreaking: string[];
}

function compareJSON(current: any, baseline: any, path: string = ''): { breaking: string[]; nonBreaking: string[] } {
  const breaking: string[] = [];
  const nonBreaking: string[] = [];

  if (!baseline) {
    nonBreaking.push(`${path}: New content added`);
    return { breaking, nonBreaking };
  }

  if (typeof current === 'object' && typeof baseline === 'object') {
    for (const key in baseline) {
      if (!(key in current)) {
        breaking.push(`${path}.${key}: Removed (BREAKING)`);
      } else if (typeof baseline[key] !== typeof current[key]) {
        breaking.push(`${path}.${key}: Type changed from ${typeof baseline[key]} to ${typeof current[key]} (BREAKING)`);
      } else if (typeof baseline[key] === 'object') {
        const nested = compareJSON(current[key], baseline[key], `${path}.${key}`);
        breaking.push(...nested.breaking);
        nonBreaking.push(...nested.nonBreaking);
      }
    }

    for (const key in current) {
      if (!(key in baseline)) {
        nonBreaking.push(`${path}.${key}: Added`);
      }
    }
  } else if (current !== baseline) {
    breaking.push(`${path}: Value changed (BREAKING)`);
  }

  return { breaking, nonBreaking };
}

function compareGraphQL(current: string, baseline: string): { breaking: string[]; nonBreaking: string[] } {
  const breaking: string[] = [];
  const nonBreaking: string[] = [];

  const currentLines = new Set(current.split('\n').filter(l => l.trim()));
  const baselineLines = new Set(baseline.split('\n').filter(l => l.trim()));

  for (const line of Array.from(baselineLines)) {
    if (!currentLines.has(line) && !line.startsWith('#')) {
      breaking.push(`Removed: ${line.trim()} (BREAKING)`);
    }
  }

  for (const line of Array.from(currentLines)) {
    if (!baselineLines.has(line) && !line.startsWith('#')) {
      nonBreaking.push(`Added: ${line.trim()}`);
    }
  }

  return { breaking, nonBreaking };
}

function checkContracts(): DiffResult[] {
  const results: DiffResult[] = [];

  if (!fs.existsSync(baselineDir)) {
    console.log('⚠️  No baseline contracts found. Run: npm run contracts:update-baseline');
    console.log('');
    process.exit(1);
  }

  const files = [
    'openapi-express.json',
    'openapi-nestjs.json',
    'graphql-schema.graphql'
  ];

  for (const file of files) {
    const currentPath = path.join(contractsDir, file);
    const baselinePath = path.join(baselineDir, file);

    if (!fs.existsSync(currentPath)) {
      console.log(`⚠️  Current contract not found: ${file}`);
      continue;
    }

    if (!fs.existsSync(baselinePath)) {
      results.push({
        file,
        hasChanges: true,
        breaking: [],
        nonBreaking: [`New contract file: ${file}`]
      });
      continue;
    }

    let diff: { breaking: string[]; nonBreaking: string[] };

    if (file.endsWith('.json')) {
      const current = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      diff = compareJSON(current, baseline, file);
    } else {
      const current = fs.readFileSync(currentPath, 'utf-8');
      const baseline = fs.readFileSync(baselinePath, 'utf-8');
      diff = compareGraphQL(current, baseline);
    }

    if (diff.breaking.length > 0 || diff.nonBreaking.length > 0) {
      results.push({
        file,
        hasChanges: true,
        breaking: diff.breaking,
        nonBreaking: diff.nonBreaking
      });
    } else {
      results.push({
        file,
        hasChanges: false,
        breaking: [],
        nonBreaking: []
      });
    }
  }

  return results;
}

console.log('🔍 Checking API contracts for breaking changes...\n');

const results = checkContracts();
let hasBreakingChanges = false;
let hasAnyChanges = false;

for (const result of results) {
  if (result.hasChanges) {
    hasAnyChanges = true;
    console.log(`📄 ${result.file}:`);

    if (result.breaking.length > 0) {
      hasBreakingChanges = true;
      console.log('  ❌ BREAKING CHANGES:');
      result.breaking.forEach(change => console.log(`     - ${change}`));
    }

    if (result.nonBreaking.length > 0) {
      console.log('  ✅ Non-breaking changes:');
      result.nonBreaking.forEach(change => console.log(`     - ${change}`));
    }

    console.log('');
  } else {
    console.log(`✅ ${result.file}: No changes`);
  }
}

if (!hasAnyChanges) {
  console.log('\n✅ All API contracts match baseline - no changes detected!\n');
  process.exit(0);
}

if (hasBreakingChanges) {
  console.log('\n❌ BREAKING CHANGES DETECTED!');
  console.log('');
  console.log('Action required:');
  console.log('  1. Review all breaking changes above');
  console.log('  2. If changes are intentional, update baselines:');
  console.log('     npm run contracts:update-baseline');
  console.log('  3. Document breaking changes in CHANGELOG.md');
  console.log('  4. Consider versioning your API (e.g., /api/v2)');
  console.log('');
  process.exit(1);
} else {
  console.log('\n✅ No breaking changes detected - all changes are backward compatible!\n');
  process.exit(0);
}
