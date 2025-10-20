import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ImportGraph {
  [file: string]: string[];
}

export function buildImportGraph(rootDir: string): ImportGraph {
  const graph: ImportGraph = {};
  
  // Find all TS/TSX files
  const files = glob.sync('**/*.{ts,tsx}', {
    cwd: rootDir,
    ignore: ['node_modules/**', 'dist/**', '**/*.spec.ts', '**/*.test.ts']
  });

  for (const file of files) {
    const fullPath = path.join(rootDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    const imports = extractImports(content, file, rootDir);
    graph[file] = imports;
  }

  return graph;
}

function extractImports(content: string, currentFile: string, rootDir: string): string[] {
  const imports: string[] = [];
  
  // Match import statements
  const importPattern = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    const importPath = match[1];
    
    // Only track relative imports (internal)
    if (importPath.startsWith('.')) {
      // Resolve relative path to absolute
      const currentDir = path.dirname(path.join(rootDir, currentFile));
      const resolvedPath = path.resolve(currentDir, importPath);
      const relativePath = path.relative(rootDir, resolvedPath);
      
      // Normalize and add to imports
      const normalizedPath = relativePath.replace(/\\/g, '/');
      imports.push(normalizedPath);
    } else if (importPath.startsWith('@/')) {
      // Handle @/ alias (maps to client/src)
      const withoutAlias = importPath.substring(2); // Remove '@/'
      imports.push(withoutAlias);
    }
  }

  return imports;
}

export function detectCircularDependencies(graph: ImportGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (recursionStack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), node]);
      }
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    recursionStack.add(node);

    const imports = graph[node] || [];
    for (const imp of imports) {
      // Try to find the import in the graph (with or without extension)
      let targetNode = imp;
      if (!graph[imp]) {
        // Try with .tsx extension
        if (graph[imp + '.tsx']) {
          targetNode = imp + '.tsx';
        } else if (graph[imp + '.ts']) {
          targetNode = imp + '.ts';
        } else if (graph[imp + '/index.tsx']) {
          targetNode = imp + '/index.tsx';
        } else if (graph[imp + '/index.ts']) {
          targetNode = imp + '/index.ts';
        }
      }
      
      if (graph[targetNode]) {
        dfs(targetNode, [...path, node]);
      }
    }

    recursionStack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  // Remove duplicate cycles
  const uniqueCycles = cycles.filter((cycle, index, self) => {
    const cycleStr = cycle.join(' → ');
    return index === self.findIndex(c => c.join(' → ') === cycleStr);
  });

  return uniqueCycles;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = path.join(process.cwd(), 'client/src');
  console.log('Building import graph...');
  const graph = buildImportGraph(rootDir);
  console.log(`✓ Analyzed ${Object.keys(graph).length} files`);
  
  console.log('Detecting circular dependencies...');
  const cycles = detectCircularDependencies(graph);

  if (cycles.length > 0) {
    console.error(`\n✗ Found ${cycles.length} circular dependencies:\n`);
    cycles.forEach((cycle, i) => {
      console.error(`Cycle ${i + 1}:`);
      console.error(`  ${cycle.join(' → ')}`);
      console.error('');
    });
    process.exit(1);
  } else {
    console.log('✓ No circular dependencies found');
  }
}
