import fs from 'fs';
import path from 'path';

interface RouteInfo {
  path: string;
  component: string;
  file: string;
  isProtected?: boolean;
}

export function extractRoutesFromApp(): RouteInfo[] {
  const appFilePath = path.join(process.cwd(), 'client/src/App.tsx');
  const content = fs.readFileSync(appFilePath, 'utf-8');

  const routes: RouteInfo[] = [];

  // Extract <Route path="..." component={...} /> patterns (wouter syntax)
  const componentPattern = /<Route\s+path="([^"]+)"\s+component=\{([^}]+)\}/g;
  let match;

  while ((match = componentPattern.exec(content)) !== null) {
    routes.push({
      path: match[1],
      component: match[2],
      file: appFilePath,
      isProtected: false
    });
  }

  // Extract inline function patterns with component names
  // Pattern: <Route path="/some-path">...{() => (...<ComponentName />...)}...
  const inlinePattern = /<Route\s+path="([^"]+)"[^>]*>\s*\{[^}]*<(\w+)\s*\/>/g;
  
  while ((match = inlinePattern.exec(content)) !== null) {
    const pathValue = match[1];
    const componentName = match[2];
    
    // Check if it's a ProtectedRoute wrapper
    const isProtected = componentName === 'ProtectedRoute';
    
    // If it's ProtectedRoute, try to find the actual component
    if (isProtected) {
      const contextStart = match.index;
      const contextEnd = Math.min(contextStart + 300, content.length);
      const context = content.substring(contextStart, contextEnd);
      
      // Look for component after ProtectedRoute
      const innerComponentMatch = /<(\w+)\s*\/?>/.exec(context.substring(context.indexOf('ProtectedRoute')));
      if (innerComponentMatch && innerComponentMatch[1] !== 'ProtectedRoute') {
        routes.push({
          path: pathValue,
          component: innerComponentMatch[1],
          file: appFilePath,
          isProtected: true
        });
      }
    } else if (componentName !== 'Redirect') {
      routes.push({
        path: pathValue,
        component: componentName,
        file: appFilePath,
        isProtected: false
      });
    }
  }

  // Remove duplicates (same path and component)
  const uniqueRoutes = routes.filter((route, index, self) => 
    index === self.findIndex((r) => r.path === route.path && r.component === route.component)
  );

  return uniqueRoutes;
}

export function saveRoutesManifest(routes: RouteInfo[], outputPath: string) {
  fs.writeFileSync(outputPath, JSON.stringify(routes, null, 2));
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const routes = extractRoutesFromApp();
  const outputPath = path.join(process.cwd(), 'tests/frontend/routes-manifest.json');
  
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  saveRoutesManifest(routes, outputPath);
  
  console.log(`✓ Extracted ${routes.length} routes to ${outputPath}`);
  console.log(`  - Protected routes: ${routes.filter(r => r.isProtected).length}`);
  console.log(`  - Public routes: ${routes.filter(r => !r.isProtected).length}`);
}
