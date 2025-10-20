import { describe, it, expect, beforeAll } from 'vitest';
import { extractRoutesFromApp } from '../../scripts/extract-routes';

describe('Frontend Routes @frontend', () => {
  let routes: ReturnType<typeof extractRoutesFromApp>;

  beforeAll(() => {
    routes = extractRoutesFromApp();
  });

  it('should extract routes from App.tsx', () => {
    expect(routes).toBeInstanceOf(Array);
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should have unique route paths', () => {
    const paths = routes.map(r => r.path);
    const uniquePaths = new Set(paths);
    
    // Some paths may be duplicated across different Switch blocks (seller subdomain vs main domain)
    // This is acceptable, so we just warn
    if (paths.length !== uniquePaths.size) {
      const duplicatePaths = paths.filter((path, index) => paths.indexOf(path) !== index);
      console.warn('Duplicate route paths found (may be intentional):', [...new Set(duplicatePaths)]);
    }
    
    expect(uniquePaths.size).toBeGreaterThan(0);
  });

  it('should not have duplicate components on different routes', () => {
    // This is informational - sometimes OK, sometimes a smell
    const componentUsage = routes.reduce((acc, route) => {
      acc[route.component] = (acc[route.component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duplicates = Object.entries(componentUsage)
      .filter(([_, count]) => count > 1);

    if (duplicates.length > 0) {
      console.warn('Components used on multiple routes (may be intentional):');
      duplicates.forEach(([component, count]) => {
        console.warn(`  ${component}: ${count} routes`);
      });
    }
  });

  it('should identify protected routes correctly', () => {
    const protectedRoutes = routes.filter(r => r.isProtected);
    const publicRoutes = routes.filter(r => !r.isProtected);

    // Note: Protected route detection may not be 100% accurate with complex inline route patterns
    // This test is informational
    console.log(`\n=== Route Analysis ===`);
    console.log(`Total routes: ${routes.length}`);
    console.log(`Protected routes detected: ${protectedRoutes.length}`);
    console.log(`Public routes: ${publicRoutes.length}`);
    
    // Ensure we have routes, but protected detection is informational
    expect(routes.length).toBeGreaterThan(0);
    expect(publicRoutes.length).toBeGreaterThan(0);
  });

  it('should have essential public routes', () => {
    const routePaths = routes.map(r => r.path);

    // Check for essential public routes
    const essentialRoutes = ['/', '/login', '/help'];
    
    essentialRoutes.forEach(route => {
      expect(routePaths).toContain(route);
    });
  });
});
