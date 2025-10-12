import type { IStorage } from '../storage';
import { logger } from '../logger';

interface CreateInvitationInput {
  email: string;
  role: string;
  inviterId: string;
  protocol: string;
  host: string;
}

interface AcceptInvitationInput {
  token: string;
}

interface UpdateRoleInput {
  userId: string;
  role: string;
  currentUserId: string;
}

interface DeleteMemberInput {
  userId: string;
  currentUserId: string;
}

export class TeamManagementService {
  constructor(
    private storage: IStorage,
    private notificationService: any // NotificationService type
  ) {}

  async createInvitation(input: CreateInvitationInput) {
    try {
      const { email, role, inviterId, protocol, host } = input;

      // Validate role
      if (!["admin", "editor", "viewer"].includes(role)) {
        return { 
          success: false, 
          error: "Invalid role. Valid roles: admin, editor, viewer",
          statusCode: 400
        };
      }

      // Check if user already exists
      const existingUser = await this.storage.getUserByEmail(email);
      if (existingUser) {
        return { 
          success: false, 
          error: "User with this email already exists",
          statusCode: 400
        };
      }

      // Generate unique token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await this.storage.createInvitation({
        email,
        role,
        invitedBy: inviterId,
        status: "pending",
        token,
        expiresAt,
      });

      const invitationLink = `${protocol}://${host}/accept-invitation?token=${token}`;

      return { 
        success: true, 
        data: { 
          invitation, 
          invitationLink 
        } 
      };
    } catch (error) {
      logger.error("TeamManagementService: Error creating invitation", error);
      return { 
        success: false, 
        error: "Failed to create invitation",
        statusCode: 500
      };
    }
  }

  async getInvitations(userId: string) {
    try {
      const allInvitations = await this.storage.getAllInvitations();
      // Filter to only return invitations created by this user (seller scoping)
      const userInvitations = allInvitations.filter(inv => inv.invitedBy === userId);
      return { success: true, data: userInvitations };
    } catch (error) {
      logger.error("TeamManagementService: Error fetching invitations", error);
      return { 
        success: false, 
        error: "Failed to fetch invitations",
        statusCode: 500
      };
    }
  }

  async acceptInvitation(input: AcceptInvitationInput) {
    try {
      const { token } = input;

      const invitation = await this.storage.getInvitationByToken(token);
      if (!invitation) {
        return { 
          success: false, 
          error: "Invitation not found",
          statusCode: 404
        };
      }

      if (invitation.status !== "pending") {
        return { 
          success: false, 
          error: "Invitation already used or expired",
          statusCode: 400
        };
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        await this.storage.updateInvitationStatus(invitation.token, "expired");
        return { 
          success: false, 
          error: "Invitation has expired",
          statusCode: 400
        };
      }

      // Get the inviter to determine sellerId
      const inviter = await this.storage.getUser(invitation.invitedBy);
      if (!inviter) {
        return { 
          success: false, 
          error: "Inviter not found",
          statusCode: 400
        };
      }

      // Get canonical owner ID
      const canonicalOwnerId = inviter.sellerId || inviter.id;
      if (!canonicalOwnerId) {
        return { 
          success: false, 
          error: "Could not determine store owner",
          statusCode: 400
        };
      }

      // Check if user exists
      let user = await this.storage.getUserByEmail(invitation.email);
      
      if (user) {
        // User exists - update their role and sellerId
        await this.storage.upsertUser({
          ...user,
          role: invitation.role,
          sellerId: canonicalOwnerId,
        });
      } else {
        // New user - create account
        const newUserId = `usr_${Math.random().toString(36).substring(2, 15)}`;
        user = await this.storage.upsertUser({
          id: newUserId,
          email: invitation.email.toLowerCase().trim(),
          password: null,
          role: invitation.role,
          sellerId: canonicalOwnerId,
          firstName: null,
          lastName: null,
          username: null,
          storeDescription: null,
          storeBanner: null,
          storeLogo: null,
          storeActive: null,
          shippingCost: null,
          instagramUsername: null,
        });
      }

      // Mark invitation as accepted
      await this.storage.updateInvitationStatus(invitation.token, "accepted");

      // Generate auth token for auto-login
      const authToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const authExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      await this.storage.createAuthToken({
        email: invitation.email,
        token: authToken,
        expiresAt: authExpiresAt,
        used: 0,
        sellerContext: null,
      });

      // Generate magic link URL
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : `http://localhost:${process.env.PORT || 5000}`;
      const magicLink = `${baseUrl}/api/auth/email/verify-magic-link?token=${authToken}&redirect=/seller-dashboard`;

      // Send magic link for auto-login
      await this.notificationService.sendMagicLink(invitation.email, magicLink);

      return { 
        success: true, 
        data: {
          message: "Invitation accepted successfully. Check your email for login link.", 
          role: invitation.role,
          requiresLogin: true,
          email: invitation.email
        }
      };
    } catch (error) {
      logger.error("TeamManagementService: Error accepting invitation", error);
      return { 
        success: false, 
        error: "Failed to accept invitation",
        statusCode: 500
      };
    }
  }

  async getTeamMembers(userId: string) {
    try {
      const currentUser = await this.storage.getUser(userId);
      if (!currentUser) {
        return { 
          success: false, 
          error: "User not found",
          statusCode: 404
        };
      }

      // Only sellers (admin/owner) can view their team
      if (!["admin", "owner"].includes(currentUser.role)) {
        return { 
          success: false, 
          error: "Only store owners can manage team members",
          statusCode: 403
        };
      }

      // Get canonical owner ID
      const canonicalOwnerId = currentUser.role === "owner" ? currentUser.id : currentUser.sellerId;
      if (!canonicalOwnerId) {
        return { 
          success: false, 
          error: "No store owner found for this user",
          statusCode: 400
        };
      }

      // Get team members for this seller's store
      const users = await this.storage.getTeamMembersBySellerId(canonicalOwnerId);
      
      // Sanitize sensitive info
      const sanitizedUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        createdAt: u.createdAt,
      }));

      return { success: true, data: sanitizedUsers };
    } catch (error) {
      logger.error("TeamManagementService: Error fetching team members", error);
      return { 
        success: false, 
        error: "Failed to fetch team members",
        statusCode: 500
      };
    }
  }

  async updateMemberRole(input: UpdateRoleInput) {
    try {
      const { userId, role, currentUserId } = input;

      // Validate role
      if (!["admin", "editor", "viewer"].includes(role)) {
        return { 
          success: false, 
          error: "Invalid role. Valid roles: admin, editor, viewer",
          statusCode: 400
        };
      }

      const updatedUser = await this.storage.updateUserRole(userId, role);
      if (!updatedUser) {
        return { 
          success: false, 
          error: "User not found",
          statusCode: 404
        };
      }

      return { 
        success: true, 
        data: { 
          message: "User role updated successfully", 
          user: updatedUser 
        } 
      };
    } catch (error) {
      logger.error("TeamManagementService: Error updating user role", error);
      return { 
        success: false, 
        error: "Failed to update user role",
        statusCode: 500
      };
    }
  }

  async deleteMember(input: DeleteMemberInput) {
    try {
      const { userId, currentUserId } = input;

      const currentUser = await this.storage.getUser(currentUserId);
      if (!currentUser) {
        return { 
          success: false, 
          error: "Current user not found",
          statusCode: 404
        };
      }

      // Get canonical owner ID
      const canonicalOwnerId = currentUser.sellerId || currentUser.id;
      if (!canonicalOwnerId) {
        return { 
          success: false, 
          error: "No store owner found for this user",
          statusCode: 400
        };
      }

      const deleted = await this.storage.deleteTeamMember(userId, canonicalOwnerId);
      if (!deleted) {
        return { 
          success: false, 
          error: "Team member not found or doesn't belong to your store",
          statusCode: 404
        };
      }

      return { 
        success: true, 
        data: { message: "Team member deleted successfully" } 
      };
    } catch (error) {
      logger.error("TeamManagementService: Error deleting team member", error);
      return { 
        success: false, 
        error: "Failed to delete team member",
        statusCode: 500
      };
    }
  }

  async validateOwnerPermissions(userId: string): Promise<{ isOwner: boolean; error?: string }> {
    try {
      const currentUser = await this.storage.getUser(userId);
      if (!currentUser) {
        return { isOwner: false, error: "User not found" };
      }

      // Check if user is owner/admin without a sellerId (meaning they ARE the owner, not a team member)
      const isOwner = ["seller", "owner", "admin"].includes(currentUser.role) && !currentUser.sellerId;
      
      if (!isOwner) {
        return { isOwner: false, error: "Only store owners can perform this action" };
      }

      return { isOwner: true };
    } catch (error) {
      logger.error("TeamManagementService: Error validating owner permissions", error);
      return { isOwner: false, error: "Failed to validate permissions" };
    }
  }
}
