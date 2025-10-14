/**
 * EnvironmentToggleService - B2B/B2C environment toggle management
 * 
 * Follows Architecture 3: Service Layer Pattern with dependency injection
 * - Manages user environment (B2B wholesale vs B2C retail)
 * - Checks wholesale access permissions
 * - Determines user role in store context
 */

import type { IStorage } from '../storage';
import { logger } from '../logger';

// ============================================================================
// Interfaces
// ============================================================================

export type UserEnvironment = 'B2B' | 'B2C';

export interface GetEnvironmentResult {
  success: boolean;
  environment?: UserEnvironment;
  error?: string;
  statusCode?: number;
}

export interface SetEnvironmentResult {
  success: boolean;
  environment?: UserEnvironment;
  error?: string;
  statusCode?: number;
}

export interface CanAccessWholesaleResult {
  success: boolean;
  hasAccess: boolean;
  sellers?: string[]; // Seller IDs user has wholesale access to
  error?: string;
  statusCode?: number;
}

export interface GetStoreRoleResult {
  success: boolean;
  role?: 'buyer' | 'seller' | 'owner';
  error?: string;
  statusCode?: number;
}

// ============================================================================
// EnvironmentToggleService
// ============================================================================

export class EnvironmentToggleService {
  constructor(private storage: IStorage) {}

  /**
   * Get user's current environment (B2B or B2C)
   * 
   * Logic:
   * - Check user preferences/session for stored environment
   * - Default to B2C for regular users
   * - Check if user has wholesale access to determine available environments
   */
  async getUserEnvironment(userId: string): Promise<GetEnvironmentResult> {
    try {
      const user = await this.storage.getUser(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
        };
      }

      // Check if user has any wholesale access grants
      const accessGrants = await this.storage.getWholesaleAccessGrantsByBuyer(userId);

      // If user has wholesale access and user type is buyer, check stored preference
      // For now, default to B2C unless explicitly set to B2B
      // TODO: Store user environment preference in user settings or session

      const environment: UserEnvironment = accessGrants.length > 0 ? 'B2B' : 'B2C';

      logger.info('[EnvironmentToggleService] User environment retrieved', {
        userId,
        environment,
        hasWholesaleAccess: accessGrants.length > 0,
      });

      return { success: true, environment };
    } catch (error: any) {
      logger.error('[EnvironmentToggleService] Failed to get user environment', error);
      return {
        success: false,
        error: error.message || 'Failed to get environment',
        statusCode: 500,
      };
    }
  }

  /**
   * Set user's environment (B2B or B2C)
   * 
   * Note: User must have wholesale access to set B2B environment
   */
  async setUserEnvironment(
    userId: string,
    environment: UserEnvironment
  ): Promise<SetEnvironmentResult> {
    try {
      const user = await this.storage.getUser(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
        };
      }

      // If setting to B2B, verify user has wholesale access
      if (environment === 'B2B') {
        const accessGrants = await this.storage.getWholesaleAccessGrantsByBuyer(userId);

        if (accessGrants.length === 0) {
          return {
            success: false,
            error: 'User does not have wholesale access',
            statusCode: 403,
          };
        }
      }

      // TODO: Store environment preference in user settings or session
      // For now, just validate and return success

      logger.info('[EnvironmentToggleService] User environment set', {
        userId,
        environment,
      });

      return { success: true, environment };
    } catch (error: any) {
      logger.error('[EnvironmentToggleService] Failed to set user environment', error);
      return {
        success: false,
        error: error.message || 'Failed to set environment',
        statusCode: 500,
      };
    }
  }

  /**
   * Check if user has wholesale access
   * 
   * Returns list of seller IDs user has wholesale access to
   */
  async canAccessWholesale(userId: string): Promise<CanAccessWholesaleResult> {
    try {
      const user = await this.storage.getUser(userId);

      if (!user) {
        return {
          success: false,
          hasAccess: false,
          error: 'User not found',
          statusCode: 404,
        };
      }

      // Get active wholesale access grants
      const accessGrants = await this.storage.getWholesaleAccessGrantsByBuyer(userId);
      const activeGrants = accessGrants.filter(grant => grant.status === 'active');

      const sellerIds = activeGrants.map(grant => grant.sellerId);

      logger.info('[EnvironmentToggleService] Wholesale access checked', {
        userId,
        hasAccess: activeGrants.length > 0,
        sellerCount: sellerIds.length,
      });

      return {
        success: true,
        hasAccess: activeGrants.length > 0,
        sellers: sellerIds,
      };
    } catch (error: any) {
      logger.error('[EnvironmentToggleService] Failed to check wholesale access', error);
      return {
        success: false,
        hasAccess: false,
        error: error.message || 'Failed to check access',
        statusCode: 500,
      };
    }
  }

  /**
   * Get user's role in a specific store context
   * 
   * Determines if user is:
   * - owner: owns the store (sellerId === userId)
   * - seller: collaborator/team member (via user_store_memberships)
   * - buyer: purchases from store (regular customer or wholesale buyer)
   */
  async getUserStoreRole(
    userId: string,
    storeOwnerId: string
  ): Promise<GetStoreRoleResult> {
    try {
      const user = await this.storage.getUser(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
        };
      }

      // Check if user is the store owner
      if (userId === storeOwnerId) {
        return { success: true, role: 'owner' };
      }

      // Check if user is a collaborator (team member)
      const membership = await this.storage.getUserStoreMembership(userId, storeOwnerId);

      if (membership && membership.status === 'active') {
        return { success: true, role: 'seller' };
      }

      // Default: user is a buyer
      return { success: true, role: 'buyer' };
    } catch (error: any) {
      logger.error('[EnvironmentToggleService] Failed to get user store role', error);
      return {
        success: false,
        error: error.message || 'Failed to get role',
        statusCode: 500,
      };
    }
  }
}
