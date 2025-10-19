import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

/**
 * Feature Flags Configuration
 * Supports hot-reloading for zero-downtime configuration changes
 */

export interface EndpointFlag {
  useGraphQL: boolean;
  shadowTraffic?: boolean;
  rolloutPercentage?: number;
}

export interface FeatureFlagsConfig {
  endpoints: Record<string, EndpointFlag>;
  globalSettings: {
    nestJsServiceUrl: string;
    enableShadowTraffic: boolean;
    defaultTimeout?: number;
  };
}

export class FeatureFlagsService {
  private config: FeatureFlagsConfig;
  private configPath: string;
  private watcher: fs.FSWatcher | null = null;
  private reloadDebounceTimer: NodeJS.Timeout | null = null;

  constructor(configPath: string = path.join(process.cwd(), 'config', 'feature-flags.json')) {
    this.configPath = configPath;
    this.config = this.loadConfig();
    this.setupWatcher();
  }

  /**
   * Load configuration from JSON file
   */
  private loadConfig(): FeatureFlagsConfig {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(configData);
      
      logger.info('[FeatureFlags] Configuration loaded', {
        endpointCount: Object.keys(parsed.endpoints || {}).length,
        nestJsUrl: parsed.globalSettings?.nestJsServiceUrl,
      });
      
      return parsed;
    } catch (error) {
      logger.error('[FeatureFlags] Failed to load config, using defaults', { errorMessage: error instanceof Error ? error.message : String(error) });
      
      // Return safe defaults
      return {
        endpoints: {},
        globalSettings: {
          nestJsServiceUrl: 'http://localhost:4000/graphql',
          enableShadowTraffic: false,
          defaultTimeout: 30000,
        },
      };
    }
  }

  /**
   * Set up file watcher for hot-reload
   */
  private setupWatcher(): void {
    try {
      this.watcher = fs.watch(this.configPath, (eventType) => {
        if (eventType === 'change') {
          // Debounce rapid file changes
          if (this.reloadDebounceTimer) {
            clearTimeout(this.reloadDebounceTimer);
          }
          
          this.reloadDebounceTimer = setTimeout(() => {
            logger.info('[FeatureFlags] Config file changed, reloading...');
            const oldConfig = { ...this.config };
            this.config = this.loadConfig();
            
            // Log what changed
            this.logConfigChanges(oldConfig, this.config);
          }, 500);
        }
      });
      
      logger.info('[FeatureFlags] File watcher enabled for hot-reload', {
        path: this.configPath,
      });
    } catch (error) {
      logger.warn('[FeatureFlags] Could not set up file watcher', { errorMessage: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Log configuration changes for observability
   */
  private logConfigChanges(oldConfig: FeatureFlagsConfig, newConfig: FeatureFlagsConfig): void {
    const changes: string[] = [];
    
    // Check endpoint flag changes
    for (const [endpoint, flags] of Object.entries(newConfig.endpoints)) {
      const oldFlags = oldConfig.endpoints[endpoint];
      if (!oldFlags || oldFlags.useGraphQL !== flags.useGraphQL) {
        changes.push(`${endpoint}: ${oldFlags?.useGraphQL || false} -> ${flags.useGraphQL}`);
      }
    }
    
    // Check global settings changes
    if (oldConfig.globalSettings.nestJsServiceUrl !== newConfig.globalSettings.nestJsServiceUrl) {
      changes.push(`nestJsServiceUrl: ${oldConfig.globalSettings.nestJsServiceUrl} -> ${newConfig.globalSettings.nestJsServiceUrl}`);
    }
    
    if (changes.length > 0) {
      logger.info('[FeatureFlags] Configuration changes detected', { changes: JSON.stringify(changes) });
    }
  }

  /**
   * Check if GraphQL is enabled for a specific endpoint
   */
  public isGraphQLEnabled(endpoint: string): boolean {
    const flag = this.config.endpoints[endpoint];
    if (!flag) {
      return false; // Default to REST if not configured
    }
    
    // Support gradual rollout via percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const rolloutHash = this.hashEndpoint(endpoint);
      const shouldUseGraphQL = rolloutHash < flag.rolloutPercentage;
      return shouldUseGraphQL && flag.useGraphQL;
    }
    
    return flag.useGraphQL;
  }

  /**
   * Check if shadow traffic is enabled for an endpoint
   */
  public isShadowTrafficEnabled(endpoint: string): boolean {
    const flag = this.config.endpoints[endpoint];
    return flag?.shadowTraffic || this.config.globalSettings.enableShadowTraffic;
  }

  /**
   * Get NestJS GraphQL service URL
   */
  public getNestJsServiceUrl(): string {
    return this.config.globalSettings.nestJsServiceUrl;
  }

  /**
   * Get request timeout for GraphQL requests
   */
  public getTimeout(): number {
    return this.config.globalSettings.defaultTimeout || 30000;
  }

  /**
   * Get all current configuration (for debugging)
   */
  public getConfig(): FeatureFlagsConfig {
    return { ...this.config };
  }

  /**
   * Hash endpoint path to support percentage-based rollouts
   */
  private hashEndpoint(endpoint: string): number {
    let hash = 0;
    for (let i = 0; i < endpoint.length; i++) {
      hash = ((hash << 5) - hash) + endpoint.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    
    if (this.reloadDebounceTimer) {
      clearTimeout(this.reloadDebounceTimer);
      this.reloadDebounceTimer = null;
    }
    
    logger.info('[FeatureFlags] Service destroyed');
  }
}

// Singleton instance
export const featureFlagsService = new FeatureFlagsService();
