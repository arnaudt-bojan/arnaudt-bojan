#!/usr/bin/env tsx
/**
 * Auto-Coverage Detector
 * Detects files without corresponding tests and generates stubs
 */

import { promises as fs } from 'fs';
import path from 'path';

interface FileInfo {
  path: string;
  type: 'service' | 'component' | 'page' | 'middleware' | 'route' | 'socket' | 'hook' | 'context' | 'dto' | 'workflow';
  hasTest: boolean;
  suggestedTestPath: string;
}

const PATTERNS = {
  service: /server\/services\/.*\.ts$/,
  component: /client\/src\/components\/.*\.tsx$/,
  page: /client\/src\/pages\/.*\.tsx$/,
  middleware: /server\/middleware\/.*\.ts$/,
  route: /server\/routes\/.*\.ts$/,
  socket: /server\/.*socket.*\.ts$/,
  hook: /client\/src\/hooks\/.*\.ts$/,
  context: /client\/src\/contexts\/.*\.tsx$/,
  dto: /server\/dtos\/.*\.ts$/,
  workflow: /server\/services\/workflows\/.*\.ts$/
};

const EXCLUDED_PATTERNS = [
  /\.spec\.ts$/,
  /\.test\.ts$/,
  /node_modules/,
  /dist/,
  /\.d\.ts$/,
  /index\.ts$/,
  /types\.ts$/,
  /interfaces\.ts$/
];

async function getAllFiles(dir: string, fileList: string[] = []): Promise<string[]> {
  const files = await fs.readdir(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      await getAllFiles(filePath, fileList);
    } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx'))) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function getFileType(filePath: string): FileInfo['type'] | null {
  for (const [type, pattern] of Object.entries(PATTERNS)) {
    if (pattern.test(filePath)) {
      return type as FileInfo['type'];
    }
  }
  return null;
}

function shouldExclude(filePath: string): boolean {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath));
}

function getTestPath(filePath: string, type: FileInfo['type']): string {
  const relativePath = filePath.replace(/^(server|client\/src)\//, '');
  const withoutExt = relativePath.replace(/\.(ts|tsx)$/, '');
  
  switch (type) {
    case 'service':
      return `tests/services/${path.basename(withoutExt)}.spec.ts`;
    case 'component':
      return `tests/frontend/components/${path.basename(withoutExt)}.spec.ts`;
    case 'page':
      return `tests/frontend/pages/${path.basename(withoutExt)}.spec.ts`;
    case 'middleware':
      return `tests/middleware/${path.basename(withoutExt)}.spec.ts`;
    case 'route':
      return `tests/api/${path.basename(withoutExt)}.spec.ts`;
    case 'socket':
      return `tests/socket/${path.basename(withoutExt)}.spec.ts`;
    case 'hook':
      return `tests/frontend/hooks/${path.basename(withoutExt)}.spec.ts`;
    case 'context':
      return `tests/frontend/contexts/${path.basename(withoutExt)}.spec.ts`;
    case 'dto':
      return `tests/dtos/${path.basename(withoutExt)}.spec.ts`;
    case 'workflow':
      return `tests/workflows/${path.basename(withoutExt)}.spec.ts`;
  }
}

async function testExists(testPath: string): Promise<boolean> {
  try {
    await fs.access(testPath);
    return true;
  } catch {
    return false;
  }
}

async function analyzeFiles(directories: string[]): Promise<FileInfo[]> {
  const filesWithoutTests: FileInfo[] = [];
  
  for (const dir of directories) {
    const files = await getAllFiles(dir);
    
    for (const file of files) {
      if (shouldExclude(file)) continue;
      
      const type = getFileType(file);
      if (!type) continue;
      
      const suggestedTestPath = getTestPath(file, type);
      const hasTest = await testExists(suggestedTestPath);
      
      if (!hasTest) {
        filesWithoutTests.push({
          path: file,
          type,
          hasTest,
          suggestedTestPath
        });
      }
    }
  }
  
  return filesWithoutTests;
}

async function generateReport(files: FileInfo[]): Promise<void> {
  const grouped = files.reduce((acc, file) => {
    if (!acc[file.type]) acc[file.type] = [];
    acc[file.type].push(file);
    return acc;
  }, {} as Record<string, FileInfo[]>);
  
  console.log('\n📊 AUTO-COVERAGE DETECTION REPORT');
  console.log('=================================\n');
  
  let totalFiles = 0;
  
  for (const [type, items] of Object.entries(grouped)) {
    console.log(`\n${type.toUpperCase()}S (${items.length} files without tests):`);
    console.log('─'.repeat(50));
    
    for (const item of items.slice(0, 10)) { // Show first 10
      console.log(`  ❌ ${item.path}`);
      console.log(`     → ${item.suggestedTestPath}`);
    }
    
    if (items.length > 10) {
      console.log(`  ... and ${items.length - 10} more`);
    }
    
    totalFiles += items.length;
  }
  
  console.log(`\n\nTOTAL FILES WITHOUT TESTS: ${totalFiles}\n`);
  
  // Save to JSON for automation
  const reportPath = 'reports/missing-tests.json';
  await fs.mkdir('reports', { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify({ files, summary: grouped }, null, 2));
  console.log(`📝 Detailed report saved to: ${reportPath}\n`);
}

async function main() {
  console.log('🔍 Scanning for files without tests...\n');
  
  const directories = ['server', 'client/src'];
  const filesWithoutTests = await analyzeFiles(directories);
  
  await generateReport(filesWithoutTests);
  
  // Exit with error code if files missing tests (for CI)
  if (filesWithoutTests.length > 0 && process.env.CI === 'true') {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { analyzeFiles, FileInfo };
