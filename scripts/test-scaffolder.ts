#!/usr/bin/env tsx
/**
 * Test Scaffolder - Integrated Test Generation
 * Combines detection, generation, and hooks
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { analyzeFiles } from './auto-coverage-detector';
import { generateStub } from './generate-test-stubs';

interface ScaffolderOptions {
  watch?: boolean;
  autoGenerate?: boolean;
  limit?: number;
}

async function scaffold(options: ScaffolderOptions = {}) {
  console.log('🏗️  Test Scaffolder Starting...\n');
  
  // 1. Detect files without tests
  console.log('Step 1: Detecting files without tests...');
  const directories = ['server', 'client/src'];
  const filesWithoutTests = await analyzeFiles(directories);
  
  console.log(`Found ${filesWithoutTests.length} files without tests\n`);
  
  if (filesWithoutTests.length === 0) {
    console.log('✨ All files have tests! Nothing to scaffold.\n');
    return;
  }
  
  // 2. Auto-generate stubs if requested
  if (options.autoGenerate) {
    console.log('Step 2: Auto-generating test stubs...');
    const limit = options.limit || 10;
    const toGenerate = filesWithoutTests.slice(0, limit);
    
    for (const file of toGenerate) {
      await generateStub(file);
    }
    
    console.log(`\n✅ Generated ${toGenerate.length} test stubs\n`);
  }
  
  // 3. Run type check
  console.log('Step 3: Running type check...');
  try {
    execSync('npm run check', { stdio: 'inherit' });
    console.log('✅ Type check passed\n');
  } catch (error) {
    console.log('❌ Type check failed - fix errors before continuing\n');
    process.exit(1);
  }
  
  // 4. Run tests to verify stubs work
  console.log('Step 4: Verifying generated tests...');
  try {
    execSync('npm test -- --run', { stdio: 'inherit' });
    console.log('✅ Tests verified\n');
  } catch (error) {
    console.log('⚠️  Some tests failed - review and fix\n');
  }
  
  // 5. Summary
  console.log('📊 Scaffolder Summary:');
  console.log(`   Files without tests: ${filesWithoutTests.length}`);
  console.log(`   Stubs generated: ${options.autoGenerate ? Math.min(options.limit || 10, filesWithoutTests.length) : 0}`);
  console.log(`   Remaining: ${filesWithoutTests.length - (options.autoGenerate ? Math.min(options.limit || 10, filesWithoutTests.length) : 0)}\n`);
  
  // 6. Watch mode
  if (options.watch) {
    console.log('👀 Starting watch mode...\n');
    execSync('tsx scripts/test-watcher.ts', { stdio: 'inherit' });
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  
  const options: ScaffolderOptions = {
    watch: args.includes('--watch'),
    autoGenerate: args.includes('--generate'),
    limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 10
  };
  
  await scaffold(options);
}

if (require.main === module) {
  main().catch(console.error);
}

export { scaffold };
