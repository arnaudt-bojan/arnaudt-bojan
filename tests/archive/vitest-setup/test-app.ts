import { app } from '../../server/index.js';
import { registerRoutes } from '../../server/routes.js';
import type { Express } from 'express';
import type { Server } from 'http';

let appInitialized = false;
let httpServer: Server | null = null;

/**
 * Get the Express app with routes properly registered.
 * This ensures all routes are available before tests start.
 * 
 * The issue: server/index.ts exports `app` before calling registerRoutes(),
 * so tests that import app directly get an app without routes registered.
 * 
 * This helper ensures registerRoutes() is called before returning the app.
 */
export async function getTestApp(): Promise<Express> {
  if (!appInitialized) {
    // Register all routes (this is async and sets up auth, middleware, etc.)
    httpServer = await registerRoutes(app);
    appInitialized = true;
    console.log('✅ Test app initialized with routes registered');
  }
  
  return app;
}

/**
 * Get the HTTP server (for WebSocket testing, etc.)
 */
export function getTestServer(): Server | null {
  return httpServer;
}

/**
 * Reset the app initialization state (useful for test isolation)
 */
export function resetTestApp(): void {
  appInitialized = false;
  httpServer = null;
}
