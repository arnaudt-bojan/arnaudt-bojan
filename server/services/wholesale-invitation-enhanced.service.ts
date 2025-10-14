/**
 * WholesaleInvitationEnhancedService - Enhanced wholesale invitation management
 * 
 * Follows Architecture 3: Service Layer Pattern with dependency injection
 * - Creates wholesale invitations with expiry
 * - Manages invitation acceptance and wholesale access grants
 * - Handles invitation lifecycle (pending, accepted, expired, revoked)
 */

import type { IStorage } from '../storage';
import type { 
  WholesaleInvitation, 
  InsertWholesaleInvitation,
  WholesaleAccessGrant,
  InsertWholesaleAccessGrant 
} from '@shared/schema';
import { logger } from '../logger';
import crypto from 'crypto';
import type { NotificationService } from '../notifications';

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateInvitationResult {
  success: boolean;
  invitation?: WholesaleInvitation;
  error?: string;
  statusCode?: number;
}

export interface AcceptInvitationResult {
  success: boolean;
  accessGrant?: WholesaleAccessGrant;
  error?: string;
  statusCode?: number;
}

export interface RevokeInvitationResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

export interface GetInvitationsResult {
  success: boolean;
  invitations?: WholesaleInvitation[];
  error?: string;
  statusCode?: number;
}

export interface CheckExpiredResult {
  success: boolean;
  expiredCount?: number;
  error?: string;
}

// ============================================================================
// WholesaleInvitationEnhancedService
// ============================================================================

export class WholesaleInvitationEnhancedService {
  constructor(
    private storage: IStorage,
    private notificationService?: NotificationService
  ) {}

  /**
   * Create wholesale invitation with expiry (default 7 days)
   */
  async createInvitation(
    sellerId: string,
    buyerEmail: string,
    expiryDays: number = 7,
    wholesaleTerms?: any
  ): Promise<CreateInvitationResult> {
    try {
      // Generate unique token
      const token = crypto.randomBytes(32).toString('hex');

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const invitationInsert: InsertWholesaleInvitation = {
        email: buyerEmail,
        sellerId,
        wholesaleTerms: wholesaleTerms as any,
        status: 'pending',
        token,
        expiresAt: expiresAt as any,
      };

      const invitation = await this.storage.createWholesaleInvitation(invitationInsert);

      if (!invitation) {
        return {
          success: false,
          error: 'Failed to create invitation',
          statusCode: 500,
        };
      }

      // Send invitation email (best effort)
      if (this.notificationService) {
        try {
          // TODO: Implement wholesale invitation email
          // await this.notificationService.sendWholesaleInvitation(invitation);
        } catch (emailError) {
          logger.error('[WholesaleInvitationService] Failed to send invitation email', emailError);
        }
      }

      logger.info('[WholesaleInvitationService] Invitation created', {
        invitationId: invitation.id,
        sellerId,
        buyerEmail,
        expiresAt: expiresAt.toISOString(),
      });

      return { success: true, invitation };
    } catch (error: any) {
      logger.error('[WholesaleInvitationService] Failed to create invitation', error);
      return {
        success: false,
        error: error.message || 'Failed to create invitation',
        statusCode: 500,
      };
    }
  }

  /**
   * Accept invitation and create wholesale access grant
   */
  async acceptInvitation(token: string, userId: string): Promise<AcceptInvitationResult> {
    try {
      // Find invitation by token
      const invitation = await this.storage.getWholesaleInvitationByToken(token);

      if (!invitation) {
        return {
          success: false,
          error: 'Invitation not found',
          statusCode: 404,
        };
      }

      // Check if already accepted
      if (invitation.status === 'accepted') {
        return {
          success: false,
          error: 'Invitation already accepted',
          statusCode: 400,
        };
      }

      // Check if expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        // Mark as expired
        await this.storage.updateWholesaleInvitationStatus(invitation.id, 'expired');

        return {
          success: false,
          error: 'Invitation has expired',
          statusCode: 400,
        };
      }

      // Check if cancelled
      if (invitation.status === 'cancelled') {
        return {
          success: false,
          error: 'Invitation has been cancelled',
          statusCode: 400,
        };
      }

      // Create wholesale access grant
      const accessGrantInsert: InsertWholesaleAccessGrant = {
        buyerId: userId,
        sellerId: invitation.sellerId,
        status: 'active',
        wholesaleTerms: invitation.wholesaleTerms as any,
      };

      const accessGrant = await this.storage.createWholesaleAccessGrant(accessGrantInsert);

      if (!accessGrant) {
        return {
          success: false,
          error: 'Failed to create access grant',
          statusCode: 500,
        };
      }

      // Update invitation status
      await this.storage.updateWholesaleInvitationStatus(invitation.id, 'accepted', new Date());

      logger.info('[WholesaleInvitationService] Invitation accepted', {
        invitationId: invitation.id,
        userId,
        sellerId: invitation.sellerId,
      });

      return { success: true, accessGrant };
    } catch (error: any) {
      logger.error('[WholesaleInvitationService] Failed to accept invitation', error);
      return {
        success: false,
        error: error.message || 'Failed to accept invitation',
        statusCode: 500,
      };
    }
  }

  /**
   * Revoke invitation
   */
  async revokeInvitation(invitationId: string): Promise<RevokeInvitationResult> {
    try {
      const invitation = await this.storage.getWholesaleInvitation(invitationId);

      if (!invitation) {
        return {
          success: false,
          error: 'Invitation not found',
          statusCode: 404,
        };
      }

      if (invitation.status === 'accepted') {
        return {
          success: false,
          error: 'Cannot revoke accepted invitation',
          statusCode: 400,
        };
      }

      await this.storage.updateWholesaleInvitationStatus(invitationId, 'cancelled');

      logger.info('[WholesaleInvitationService] Invitation revoked', {
        invitationId,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('[WholesaleInvitationService] Failed to revoke invitation', error);
      return {
        success: false,
        error: error.message || 'Failed to revoke invitation',
        statusCode: 500,
      };
    }
  }

  /**
   * Get all seller invitations
   */
  async getSellerInvitations(sellerId: string): Promise<GetInvitationsResult> {
    try {
      const invitations = await this.storage.getWholesaleInvitationsBySeller(sellerId);

      return { success: true, invitations };
    } catch (error: any) {
      logger.error('[WholesaleInvitationService] Failed to get seller invitations', error);
      return {
        success: false,
        error: error.message || 'Failed to get invitations',
        statusCode: 500,
      };
    }
  }

  /**
   * Check and mark expired invitations
   */
  async checkExpiredInvitations(): Promise<CheckExpiredResult> {
    try {
      const now = new Date();
      let expiredCount = 0;

      // Get all pending invitations
      const allInvitations = await this.storage.getAllWholesaleInvitations();
      const pendingInvitations = allInvitations.filter(
        (inv: any) => inv.status === 'pending' && inv.expiresAt
      );

      for (const invitation of pendingInvitations) {
        if (invitation.expiresAt && new Date(invitation.expiresAt) < now) {
          await this.storage.updateWholesaleInvitationStatus(invitation.id, 'expired');
          expiredCount++;

          logger.info('[WholesaleInvitationService] Invitation marked as expired', {
            invitationId: invitation.id,
            expiresAt: new Date(invitation.expiresAt).toISOString(),
          });
        }
      }

      return { success: true, expiredCount };
    } catch (error: any) {
      logger.error('[WholesaleInvitationService] Failed to check expired invitations', error);
      return {
        success: false,
        error: error.message || 'Failed to check expired invitations',
      };
    }
  }
}
