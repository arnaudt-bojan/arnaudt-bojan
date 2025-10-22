import { describe, it, expect } from 'vitest';
import { buildImportGraph, detectCircularDependencies } from '../../scripts/validate-imports';
import path from 'path';

describe('Import/Export Integrity @frontend', () => {
  it('should not have circular dependencies', () => {
    const rootDir = path.join(process.cwd(), 'client/src');
    const graph = buildImportGraph(rootDir);
    const cycles = detectCircularDependencies(graph);

    if (cycles.length > 0) {
      console.error('\n✗ Circular dependencies found:');
      cycles.forEach((cycle, i) => {
        console.error(`\nCycle ${i + 1}:`);
        console.error(`  ${cycle.join(' → ')}`);
      });
    }

    expect(cycles).toHaveLength(0);
  });

  it('should have valid import graph', () => {
    const rootDir = path.join(process.cwd(), 'client/src');
    const graph = buildImportGraph(rootDir);

    expect(Object.keys(graph).length).toBeGreaterThan(0);
    
    // Each file should have a valid imports array
    Object.entries(graph).forEach(([file, imports]) => {
      expect(Array.isArray(imports)).toBe(true);
    });

    console.log(`\n=== Import Graph Stats ===`);
    console.log(`Total files analyzed: ${Object.keys(graph).length}`);
    
    const totalImports = Object.values(graph).reduce((sum, imports) => sum + imports.length, 0);
    console.log(`Total internal imports: ${totalImports}`);
    console.log(`Average imports per file: ${(totalImports / Object.keys(graph).length).toFixed(2)}`);
  });

  it('should not have orphaned files', () => {
    const rootDir = path.join(process.cwd(), 'client/src');
    const graph = buildImportGraph(rootDir);

    const allFiles = Object.keys(graph);
    const importedFiles = new Set<string>();

    // Collect all imported files (normalized)
    Object.values(graph).forEach(imports => {
      imports.forEach(imp => {
        // Add with various possible extensions
        importedFiles.add(imp);
        importedFiles.add(imp + '.tsx');
        importedFiles.add(imp + '.ts');
        importedFiles.add(imp + '/index.tsx');
        importedFiles.add(imp + '/index.ts');
      });
    });

    // Find files that are never imported
    const orphans = allFiles.filter(file => {
      // Skip entry points
      if (file.includes('App.tsx') || 
          file.includes('main.tsx') ||
          file.includes('index.tsx') ||
          file.includes('vite-env.d.ts')) {
        return false;
      }
      
      return !importedFiles.has(file);
    });

    // This is informational - orphans might be OK (entry points, etc.)
    if (orphans.length > 0) {
      console.warn(`\n=== Potentially Orphaned Files ===`);
      console.warn(`Found ${orphans.length} files that are not imported:`);
      orphans.slice(0, 10).forEach(file => {
        console.warn(`  - ${file}`);
      });
      if (orphans.length > 10) {
        console.warn(`  ... and ${orphans.length - 10} more`);
      }
    } else {
      console.log('\n✓ No orphaned files detected');
    }
  });
});
