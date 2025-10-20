#!/usr/bin/env tsx
/**
 * Test File Watcher
 * Watches for new/changed files and alerts if tests are missing
 */

import { watch } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { analyzeFiles } from './auto-coverage-detector';

const WATCH_DIRS = ['server', 'client/src'];
const DEBOUNCE_MS = 1000;

let debounceTimer: NodeJS.Timeout | null = null;

async function checkFile(filePath: string): Promise<void> {
  // Skip if it's a test file
  if (filePath.includes('.spec.ts') || filePath.includes('.test.ts')) {
    return;
  }
  
  // Skip excluded patterns
  if (filePath.includes('node_modules') || 
      filePath.includes('dist') || 
      filePath.endsWith('.d.ts') ||
      filePath.endsWith('index.ts') ||
      filePath.endsWith('types.ts')) {
    return;
  }
  
  console.log(`\n📝 File changed: ${filePath}`);
  
  // Re-analyze to check if test exists
  const files = await analyzeFiles(WATCH_DIRS);
  const missingTest = files.find(f => f.path === filePath);
  
  if (missingTest) {
    console.log(`⚠️  WARNING: No test file found!`);
    console.log(`   Expected: ${missingTest.suggestedTestPath}`);
    console.log(`   Run: npm run generate:test-stubs -- --limit 1`);
  } else {
    console.log(`✅ Test file exists`);
  }
}

function handleFileChange(eventType: string, filename: string | null, watchDir: string) {
  if (!filename || eventType !== 'change') return;
  
  const filePath = path.join(watchDir, filename);
  
  // Debounce rapid changes
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    checkFile(filePath).catch(console.error);
  }, DEBOUNCE_MS);
}

async function main() {
  console.log('👀 Starting test file watcher...\n');
  console.log(`Watching directories:`);
  WATCH_DIRS.forEach(dir => console.log(`  - ${dir}`));
  console.log('\nPress Ctrl+C to stop\n');
  
  for (const dir of WATCH_DIRS) {
    try {
      await fs.access(dir);
      
      watch(dir, { recursive: true }, (eventType, filename) => {
        handleFileChange(eventType, filename, dir);
      });
      
      console.log(`✅ Watching: ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to watch ${dir}:`, error);
    }
  }
  
  console.log('\n✨ Watcher active!\n');
}

if (require.main === module) {
  main().catch(console.error);
}
