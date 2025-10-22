import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

interface ComponentTestResult {
  component: string;
  success: boolean;
  exports?: string[];
  error?: string;
}

interface PageTestResult {
  page: string;
  success: boolean;
  error?: string;
}

describe('Component Rendering @frontend @shallow', () => {
  it('should validate pages directory structure', () => {
    const pagesDir = path.join(process.cwd(), 'client/src/pages');
    
    expect(fs.existsSync(pagesDir)).toBe(true);
    
    const pageFiles = fs.readdirSync(pagesDir, { withFileTypes: true });
    const tsxFiles = pageFiles.filter(file => 
      file.isFile() && (file.name.endsWith('.tsx') || file.name.endsWith('.ts'))
    );
    
    expect(tsxFiles.length).toBeGreaterThan(0);
    
    console.log(`\n=== Pages Directory Analysis ===`);
    console.log(`Total page files: ${tsxFiles.length}`);
    console.log(`Subdirectories: ${pageFiles.filter(f => f.isDirectory()).length}`);
  });

  it('should validate components directory structure', () => {
    const componentsDir = path.join(process.cwd(), 'client/src/components');
    
    expect(fs.existsSync(componentsDir)).toBe(true);
    
    // Count TSX files recursively
    function countTsxFiles(dir: string): number {
      let count = 0;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          count += countTsxFiles(fullPath);
        } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
          count++;
        }
      }
      
      return count;
    }
    
    const componentCount = countTsxFiles(componentsDir);
    expect(componentCount).toBeGreaterThan(0);
    
    console.log(`\n=== Components Directory Analysis ===`);
    console.log(`Total component files: ${componentCount}`);
  });

  it('should have importable UI components', async () => {
    // Test a few key shadcn components exist and are importable
    const keyComponents = [
      'ui/button',
      'ui/card',
      'ui/input',
      'ui/toast',
      'ui/toaster'
    ];

    const results: ComponentTestResult[] = [];

    for (const component of keyComponents) {
      try {
        const modulePath = `../../client/src/components/${component}`;
        const module = await import(modulePath);
        
        // Components export named exports, not defaults
        const hasExports = Object.keys(module).length > 0;
        results.push({ component, success: hasExports, exports: Object.keys(module) });
      } catch (error) {
        results.push({ component, success: false, error: String(error) });
      }
    }

    console.log(`\n=== UI Component Import Test ===`);
    results.forEach(({ component, success, exports }) => {
      if (success) {
        console.log(`✓ ${component}: ${exports?.length || 0} exports`);
      } else {
        console.log(`✗ ${component}: Failed to import`);
      }
    });

    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBeGreaterThan(0);
  });

  it('should verify critical page imports', async () => {
    // Test that critical pages can be imported (not rendered, just imported)
    const criticalPages = [
      'home',
      'login',
      'not-found'
    ];

    const results: PageTestResult[] = [];

    for (const page of criticalPages) {
      try {
        const modulePath = `../../client/src/pages/${page}`;
        const module = await import(modulePath);
        const hasDefault = !!module.default;
        results.push({ page, success: hasDefault });
      } catch (error) {
        results.push({ page, success: false, error: String(error) });
      }
    }

    console.log(`\n=== Critical Page Import Test ===`);
    results.forEach(({ page, success }) => {
      console.log(`${success ? '✓' : '✗'} ${page}`);
    });

    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(criticalPages.length);
  });
});
