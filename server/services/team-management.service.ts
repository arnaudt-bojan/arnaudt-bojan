import type { IStorage } from '../storage';
import type { StoreInvitation, UserStoreMembership, User } from '@shared/schema';
import { logger } from '../logger';
import crypto from 'crypto';

interface InviteCollaboratorParams {
  storeOwnerId: string;
  inviteeEmail: string;
  invitedByUserId: string;
}

interface AcceptInvitationParams {
  token: string;
  acceptingUserId?: string; // If already logged in
}

interface RevokeCollaboratorParams {
  membershipId: string;
  revokedByUserId: string;
}

export class TeamManagementService {
  constructor(private storage: IStorage) {}

  /**
   * Invite a collaborator to join the store team
   * Architecture 3: All business logic in service layer
   */
  async inviteCollaborator(params: InviteCollaboratorParams): Promise<{
    success: boolean;
    data?: { invitation: StoreInvitation; token: string };
    error?: string;
  }> {
    try {
      const { storeOwnerId, inviteeEmail, invitedByUserId } = params;

      // 1. Validate store ownership
      const storeOwner = await this.storage.getUser(storeOwnerId);
      if (!storeOwner) {
        return {
          success: false,
          error: "Store owner not found"
        };
      }

      // Verify the inviter has permission (must be store owner or existing collaborator)
      const inviter = await this.storage.getUser(invitedByUserId);
      if (!inviter) {
        return {
          success: false,
          error: "Inviter not found"
        };
      }

      // Check if inviter is the owner or has membership to this store
      if (invitedByUserId !== storeOwnerId) {
        // Check if inviter is a collaborator with active membership
        const inviterMembership = await this.storage.getUserStoreMembership(invitedByUserId, storeOwnerId);
        if (!inviterMembership || inviterMembership.status !== 'active') {
          return {
            success: false,
            error: "Only store owners and active collaborators can invite team members"
          };
        }
      }

      // 2. Check if user is already a team member
      const existingUser = await this.storage.getUserByEmail(inviteeEmail);
      if (existingUser) {
        const existingMembership = await this.storage.getUserStoreMembership(existingUser.id, storeOwnerId);
        if (existingMembership && existingMembership.status === 'active') {
          return {
            success: false,
            error: "This user is already a team member"
          };
        }
      }

      // 3. Check for existing pending invitation
      const existingInvitations = await this.storage.getPendingStoreInvitations(storeOwnerId);
      const pendingInvitation = existingInvitations.find(
        inv => inv.inviteeEmail.toLowerCase() === inviteeEmail.toLowerCase() && inv.status === 'pending'
      );

      if (pendingInvitation) {
        return {
          success: false,
          error: "A pending invitation already exists for this email"
        };
      }

      // 4. Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // 5. Create invitation
      const invitation = await this.storage.createStoreInvitation({
        storeOwnerId: storeOwnerId,
        inviteeEmail: inviteeEmail.toLowerCase().trim(),
        invitedByUserId,
        status: 'pending',
        token,
        expiresAt,
      });

      logger.info('[TeamManagement] Collaborator invitation created', {
        invitationId: invitation.id,
        storeOwnerId: storeOwnerId,
        inviteeEmail: inviteeEmail,
        invitedBy: invitedByUserId
      });

      return {
        success: true,
        data: { invitation, token }
      };
    } catch (error) {
      logger.error('[TeamManagement] Error creating invitation', error);
      return {
        success: false,
        error: "Failed to create invitation"
      };
    }
  }

  /**
   * Accept a team invitation
   * Architecture 3: Handles user creation, type promotion, and membership creation
   */
  async acceptInvitation(params: AcceptInvitationParams): Promise<{
    success: boolean;
    data?: { membership: UserStoreMembership; user: User; requiresLogin: boolean };
    error?: string;
  }> {
    try {
      const { token, acceptingUserId } = params;

      // 1. Verify token and check expiry
      const invitation = await this.storage.getStoreInvitationByToken(token);
      if (!invitation) {
        return {
          success: false,
          error: "Invitation not found"
        };
      }

      if (invitation.status !== 'pending') {
        return {
          success: false,
          error: `Invitation has already been ${invitation.status}`
        };
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        await this.storage.updateStoreInvitationStatus(invitation.id, 'expired');
        return {
          success: false,
          error: "Invitation has expired"
        };
      }

      // 2. Get or create user for invitee email
      let user = await this.storage.getUserByEmail(invitation.inviteeEmail);
      let requiresLogin = false;

      if (!user) {
        // New user - create account
        const newUserId = `user_${crypto.randomBytes(16).toString('hex')}`;
        user = await this.storage.upsertUser({
          id: newUserId,
          email: invitation.inviteeEmail.toLowerCase().trim(),
          password: null,
          userType: 'seller', // Collaborators are sellers
          firstName: null,
          lastName: null,
          username: null,
          storeDescription: null,
          storeBanner: null,
          storeLogo: null,
          storeActive: null,
          shippingCost: null,
          instagramUsername: null,
          role: 'admin', // Collaborators have admin access to the store
          sellerId: invitation.storeOwnerId, // Link collaborator to store owner
        });
        requiresLogin = true;
        logger.info('[TeamManagement] New user created from invitation', { userId: user.id, email: user.email, sellerId: invitation.storeOwnerId });
      } else if (acceptingUserId && acceptingUserId !== user.id) {
        return {
          success: false,
          error: "This invitation is for a different email address"
        };
      } else {
        // 3. If user is buyer, promote to seller and set sellerId
        if (user.userType === 'buyer' || !user.sellerId) {
          user = await this.storage.upsertUser({
            ...user,
            userType: 'seller',
            sellerId: invitation.storeOwnerId // Link collaborator to store owner
          });
          logger.info('[TeamManagement] User promoted to seller/collaborator', { userId: user.id, sellerId: invitation.storeOwnerId });
        }
      }

      // 4. Create membership with accessLevel='collaborator', status='active'
      const existingMembership = await this.storage.getUserStoreMembership(user.id, invitation.storeOwnerId);
      
      let membership: UserStoreMembership;
      if (existingMembership) {
        // Reactivate existing membership
        membership = await this.storage.updateUserStoreMembership(existingMembership.id, {
          status: 'active',
          accessLevel: 'collaborator',
          invitedBy: invitation.invitedByUserId,
        });
      } else {
        // Create new membership
        membership = await this.storage.createUserStoreMembership({
          userId: user.id,
          storeOwnerId: invitation.storeOwnerId,
          accessLevel: 'collaborator',
          invitedBy: invitation.invitedByUserId,
          status: 'active',
        });
      }

      // 5. Mark invitation as accepted
      await this.storage.updateStoreInvitationStatus(invitation.id, 'accepted');

      logger.info('[TeamManagement] Invitation accepted', {
        invitationId: invitation.id,
        userId: user.id,
        storeOwnerId: invitation.storeOwnerId,
        membershipId: membership.id
      });

      return {
        success: true,
        data: { membership, user, requiresLogin }
      };
    } catch (error) {
      logger.error('[TeamManagement] Error accepting invitation', error);
      return {
        success: false,
        error: "Failed to accept invitation"
      };
    }
  }

  /**
   * Revoke a collaborator's access to the store
   * Architecture 3: Validates permissions and updates membership status
   */
  async revokeCollaborator(params: RevokeCollaboratorParams): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { membershipId, revokedByUserId } = params;

      // Get the membership
      const membership = await this.storage.getUserStoreMembershipById(membershipId);
      if (!membership) {
        return {
          success: false,
          error: "Membership not found"
        };
      }

      // 1. Verify requester is store owner or has permission
      const revoker = await this.storage.getUser(revokedByUserId);
      if (!revoker) {
        return {
          success: false,
          error: "Revoker not found"
        };
      }

      // Only store owner can revoke memberships
      if (revokedByUserId !== membership.storeOwnerId) {
        return {
          success: false,
          error: "Only the store owner can revoke team members"
        };
      }

      // 2. Update membership status to 'revoked'
      await this.storage.updateUserStoreMembership(membershipId, {
        status: 'revoked'
      });

      logger.info('[TeamManagement] Collaborator access revoked', {
        membershipId,
        revokedBy: revokedByUserId,
        userId: membership.userId,
        storeOwnerId: membership.storeOwnerId
      });

      return {
        success: true
      };
    } catch (error) {
      logger.error('[TeamManagement] Error revoking collaborator', error);
      return {
        success: false,
        error: "Failed to revoke collaborator"
      };
    }
  }

  /**
   * List all active collaborators for a store
   * Architecture 3: Returns enriched membership data with user info
   */
  async listCollaborators(storeOwnerId: string): Promise<{
    success: boolean;
    data?: Array<UserStoreMembership & { user: User }>;
    error?: string;
  }> {
    try {
      const memberships = await this.storage.getStoreCollaborators(storeOwnerId);
      
      // Enrich with user data
      const enrichedMemberships = await Promise.all(
        memberships.map(async (membership) => {
          const user = await this.storage.getUser(membership.userId);
          return {
            ...membership,
            user: user!
          };
        })
      );

      return {
        success: true,
        data: enrichedMemberships.filter(m => m.user) // Filter out any null users
      };
    } catch (error) {
      logger.error('[TeamManagement] Error listing collaborators', error);
      return {
        success: false,
        error: "Failed to list collaborators"
      };
    }
  }

  /**
   * Get pending invitations for a store
   */
  async getPendingInvitations(storeOwnerId: string): Promise<{
    success: boolean;
    data?: StoreInvitation[];
    error?: string;
  }> {
    try {
      const invitations = await this.storage.getPendingStoreInvitations(storeOwnerId);
      
      return {
        success: true,
        data: invitations
      };
    } catch (error) {
      logger.error('[TeamManagement] Error fetching pending invitations', error);
      return {
        success: false,
        error: "Failed to fetch pending invitations"
      };
    }
  }

  /**
   * Cancel a pending invitation
   * Architecture 3: Includes authorization checks
   */
  async cancelInvitation(params: {
    invitationId: string;
    cancelledByUserId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { invitationId, cancelledByUserId } = params;

      // 1. Get the invitation to verify ownership
      const invitation = await this.storage.getStoreInvitationById(invitationId);
      if (!invitation) {
        return {
          success: false,
          error: "Invitation not found"
        };
      }

      // 2. Verify the user has permission to cancel this invitation
      // Only the store owner or an active collaborator can cancel invitations
      if (cancelledByUserId !== invitation.storeOwnerId) {
        const membership = await this.storage.getUserStoreMembership(
          cancelledByUserId,
          invitation.storeOwnerId
        );
        if (!membership || membership.status !== 'active') {
          return {
            success: false,
            error: "Only the store owner and active collaborators can cancel invitations"
          };
        }
      }

      // 3. Verify the invitation is still pending
      if (invitation.status !== 'pending') {
        return {
          success: false,
          error: `Cannot cancel invitation with status: ${invitation.status}`
        };
      }

      // 4. Update invitation status to 'revoked'
      await this.storage.updateStoreInvitationStatus(invitationId, 'revoked');

      logger.info('[TeamManagement] Invitation cancelled', {
        invitationId,
        cancelledBy: cancelledByUserId,
        inviteeEmail: invitation.inviteeEmail,
        storeOwnerId: invitation.storeOwnerId
      });

      return {
        success: true
      };
    } catch (error) {
      logger.error('[TeamManagement] Error cancelling invitation', error);
      return {
        success: false,
        error: "Failed to cancel invitation"
      };
    }
  }
}
