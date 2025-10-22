import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

interface ComponentInfo {
  name: string;
  file: string;
  requiredProps: string[];
  optionalProps: string[];
  hasContext: boolean;
}

function extractComponentInfo(filePath: string): ComponentInfo | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, path.extname(filePath));

  // Simple regex to find interface/type definitions for props
  const interfacePattern = /(?:interface|type)\s+(\w+Props)\s*[={]\s*\{([^}]+)\}/gs;
  const matches = [...content.matchAll(interfacePattern)];

  if (matches.length === 0) {
    return null;
  }

  const requiredProps: string[] = [];
  const optionalProps: string[] = [];

  // Parse all Props interfaces/types found
  matches.forEach(match => {
    const propsBody = match[2];
    
    // Parse props - handle multiline properly
    const propLines = propsBody.split(/[;\n]/).map(line => line.trim());
    
    for (const line of propLines) {
      if (!line || line.startsWith('//')) continue;
      
      // Match prop: type or prop?: type
      const propMatch = line.match(/^\s*(\w+)(\??)\s*:/);
      if (propMatch) {
        const propName = propMatch[1];
        const isOptional = propMatch[2] === '?';
        
        if (isOptional) {
          optionalProps.push(propName);
        } else {
          requiredProps.push(propName);
        }
      }
    }
  });

  // Check for context usage
  const hasContext = content.includes('useContext') || 
                    content.includes('createContext') ||
                    content.includes('Context.Provider');

  return {
    name: fileName,
    file: filePath,
    requiredProps: [...new Set(requiredProps)], // Remove duplicates
    optionalProps: [...new Set(optionalProps)],
    hasContext
  };
}

describe('Component Props & Context @frontend', () => {
  it('should document all component props', () => {
    const pagesDir = path.join(process.cwd(), 'client/src/pages');
    
    if (!fs.existsSync(pagesDir)) {
      console.warn('Pages directory not found, skipping test');
      return;
    }

    const pageFiles = fs.readdirSync(pagesDir)
      .filter(file => file.endsWith('.tsx'))
      .map(file => path.join(pagesDir, file));

    const components: ComponentInfo[] = [];

    for (const file of pageFiles) {
      const info = extractComponentInfo(file);
      if (info && (info.requiredProps.length > 0 || info.optionalProps.length > 0)) {
        components.push(info);
      }
    }

    // Output diagnostics
    if (components.length > 0) {
      console.log('\n=== Component Props Analysis ===\n');
      components.forEach(comp => {
        console.log(`Component: ${comp.name}`);
        console.log(`  Required props: ${comp.requiredProps.join(', ') || 'none'}`);
        console.log(`  Optional props: ${comp.optionalProps.join(', ') || 'none'}`);
        console.log(`  Uses context: ${comp.hasContext ? 'yes' : 'no'}`);
        console.log('');
      });
    } else {
      console.log('\n=== Component Props Analysis ===');
      console.log('No components with explicit Props interfaces found in pages/');
    }

    expect(true).toBe(true); // Informational test
  });

  it('should validate context providers exist', () => {
    const appPath = path.join(process.cwd(), 'client/src/App.tsx');
    
    if (!fs.existsSync(appPath)) {
      console.warn('App.tsx not found, skipping test');
      return;
    }

    const content = fs.readFileSync(appPath, 'utf-8');

    // Check for common providers
    const expectedProviders = [
      'QueryClientProvider',
      'TooltipProvider',
      'ThemeProvider',
      'CartProvider',
      'SocketProvider'
    ];

    const foundProviders = expectedProviders.filter(provider => 
      content.includes(provider)
    );

    console.log('\n=== Context Provider Validation ===');
    expectedProviders.forEach(provider => {
      const found = content.includes(provider);
      console.log(`${found ? '✓' : '✗'} ${provider}`);
    });

    expect(foundProviders.length).toBeGreaterThan(0);
  });

  it('should generate component diagnostics report', () => {
    const clientDir = path.join(process.cwd(), 'client/src');
    
    const report = {
      totalFiles: 0,
      componentsWithProps: 0,
      componentsWithContext: 0,
      totalRequiredProps: 0,
      totalOptionalProps: 0,
      contextProviders: [] as string[],
      contextConsumers: [] as string[]
    };

    // Recursively scan for components
    function scanDir(dir: string): void {
      if (!fs.existsSync(dir)) {
        return;
      }

      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDir(fullPath);
        } else if (file.endsWith('.tsx')) {
          report.totalFiles++;
          
          const info = extractComponentInfo(fullPath);
          if (info) {
            if (info.requiredProps.length > 0 || info.optionalProps.length > 0) {
              report.componentsWithProps++;
            }
            if (info.hasContext) {
              report.componentsWithContext++;
              
              // Check if it's a provider or consumer
              const content = fs.readFileSync(fullPath, 'utf-8');
              if (content.includes('Provider') && content.includes('createContext')) {
                report.contextProviders.push(info.name);
              } else if (content.includes('useContext')) {
                report.contextConsumers.push(info.name);
              }
            }
            report.totalRequiredProps += info.requiredProps.length;
            report.totalOptionalProps += info.optionalProps.length;
          }
        }
      }
    }

    scanDir(clientDir);

    console.log('\n=== Frontend Component Diagnostics ===');
    console.log(`Total TSX files: ${report.totalFiles}`);
    console.log(`Components with props: ${report.componentsWithProps}`);
    console.log(`Components using context: ${report.componentsWithContext}`);
    console.log(`  - Context providers: ${report.contextProviders.length}`);
    console.log(`  - Context consumers: ${report.contextConsumers.length}`);
    console.log(`Total required props: ${report.totalRequiredProps}`);
    console.log(`Total optional props: ${report.totalOptionalProps}`);

    if (report.contextProviders.length > 0) {
      console.log('\nContext Providers:');
      report.contextProviders.slice(0, 5).forEach(name => {
        console.log(`  - ${name}`);
      });
      if (report.contextProviders.length > 5) {
        console.log(`  ... and ${report.contextProviders.length - 5} more`);
      }
    }

    expect(report.totalFiles).toBeGreaterThan(0);
  });
});
