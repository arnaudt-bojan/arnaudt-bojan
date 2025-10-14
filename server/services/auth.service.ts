import { IStorage } from '../storage';
import { IEmailProvider } from './email-provider.service';
import {
  User,
  UpsertUser,
  TeamInvitation,
  InsertTeamInvitation,
  WholesaleInvitation,
  InsertWholesaleInvitation,
  UserStoreMembership,
  InsertUserStoreMembership,
  WholesaleAccessGrant,
  InsertWholesaleAccessGrant,
} from '@shared/schema';
import crypto from 'crypto';

export type SignupContext = 'seller' | 'buyer';

export interface WholesaleTerms {
  discountPercentage?: number;
  minimumOrderValue?: number;
  expiresAt?: Date;
  notes?: string;
}

export interface TeamCapabilities {
  manageProducts?: boolean;
  manageOrders?: boolean;
  viewAnalytics?: boolean;
  manageTeam?: boolean;
}

export interface IAuthService {
  createSeller(email: string, username?: string, firstName?: string, lastName?: string): Promise<User>;
  createBuyer(email: string, sellerContext?: string): Promise<User>;
  createCollaborator(email: string, invitation: TeamInvitation): Promise<User>;
  
  sendTeamInvitation(storeOwnerId: string, email: string, capabilities: TeamCapabilities): Promise<TeamInvitation>;
  acceptTeamInvitation(token: string, userId: string): Promise<UserStoreMembership>;
  cancelTeamInvitation(invitationId: string): Promise<void>;
  
  sendWholesaleInvitation(sellerId: string, email: string, terms: WholesaleTerms): Promise<WholesaleInvitation>;
  acceptWholesaleInvitation(token: string, userId: string): Promise<WholesaleAccessGrant>;
  revokeWholesaleInvitation(invitationId: string): Promise<void>;
  
  determineSignupContext(hostname: string): Promise<SignupContext>;
  getSellerContextFromDomain(hostname: string): Promise<string | null>;
}

export class AuthService implements IAuthService {
  constructor(
    private storage: IStorage,
    private emailProvider: IEmailProvider
  ) {}

  async createSeller(email: string, username?: string, firstName?: string, lastName?: string): Promise<User> {
    const existingUser = await this.storage.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const finalUsername = username || this.generateUsername(email);
    const existingUsername = await this.storage.getUserByUsername(finalUsername);
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    const newUser: UpsertUser = {
      email,
      username: finalUsername,
      userType: 'seller',
      firstName: firstName || '',
      lastName: lastName || '',
      role: 'seller',
      storeActive: 0,
    };

    const user = await this.storage.upsertUser(newUser);
    return user;
  }

  async createBuyer(email: string, sellerContext?: string): Promise<User> {
    const existingUser = await this.storage.getUserByEmail(email);
    if (existingUser) {
      return existingUser;
    }

    const username = this.generateUsername(email);
    const newUser: UpsertUser = {
      email,
      username,
      userType: 'buyer',
      firstName: '',
      lastName: '',
      role: 'buyer',
    };

    const user = await this.storage.upsertUser(newUser);
    return user;
  }

  async createCollaborator(email: string, invitation: TeamInvitation): Promise<User> {
    const existingUser = await this.storage.getUserByEmail(email);
    if (existingUser) {
      if (existingUser.userType !== 'buyer' && existingUser.userType !== null) {
        throw new Error('User already exists with a different role');
      }
      
      const updatedUser = await this.storage.upsertUser({
        ...existingUser,
        userType: 'collaborator',
        role: 'editor',
      });
      return updatedUser;
    }

    const username = this.generateUsername(email);
    const newUser: UpsertUser = {
      email,
      username,
      userType: 'collaborator',
      firstName: '',
      lastName: '',
      role: 'editor',
    };

    const user = await this.storage.upsertUser(newUser);
    return user;
  }

  async sendTeamInvitation(
    storeOwnerId: string,
    email: string,
    capabilities: TeamCapabilities
  ): Promise<TeamInvitation> {
    const owner = await this.storage.getUser(storeOwnerId);
    if (!owner || owner.userType !== 'seller') {
      throw new Error('Only sellers can send team invitations');
    }

    const existingInvitations = await this.storage.getTeamInvitationsByStore(storeOwnerId);
    const pendingInvitation = existingInvitations.find(
      (inv: TeamInvitation) => inv.email === email && inv.status === 'pending'
    );
    if (pendingInvitation) {
      throw new Error('Invitation already sent to this email');
    }

    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation: InsertTeamInvitation = {
      email,
      storeOwnerId,
      token,
      capabilities: capabilities as any,
      status: 'pending',
      expiresAt,
    };

    const createdInvitation = await this.storage.createTeamInvitation(invitation);

    const inviteUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://upfirst.io'}/team/accept/${token}`;
    const storeName = owner.username || owner.email || 'a store';
    const inviterName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email || 'Someone';

    await this.emailProvider.sendEmail({
      from: process.env.RESEND_FROM_EMAIL || 'hello@upfirst.io',
      to: email,
      subject: `You've been invited to join ${storeName} on Upfirst`,
      html: this.generateTeamInvitationEmail(email, storeName, inviterName, inviteUrl),
    });

    return createdInvitation;
  }

  async acceptTeamInvitation(token: string, userId: string): Promise<UserStoreMembership> {
    const invitation = await this.storage.getTeamInvitationByToken(token);
    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid');
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      await this.storage.updateTeamInvitationStatus(invitation.id, 'expired');
      throw new Error('Invitation has expired');
    }

    const user = await this.storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.email !== invitation.email) {
      throw new Error('This invitation was sent to a different email address');
    }

    const existingMembership = await this.storage.getUserStoreMembership(userId, invitation.storeOwnerId);
    if (existingMembership) {
      throw new Error('User is already a member of this store');
    }

    if (user.userType === 'buyer' || user.userType === null) {
      await this.storage.upsertUser({
        ...user,
        userType: 'collaborator',
        role: 'editor',
      });
    }

    const membership: InsertUserStoreMembership = {
      userId,
      storeOwnerId: invitation.storeOwnerId,
      capabilities: invitation.capabilities as any,
      status: 'active',
    };

    const createdMembership = await this.storage.createUserStoreMembership(membership);

    await this.storage.updateTeamInvitationStatus(invitation.id, 'accepted', new Date());

    return createdMembership;
  }

  async cancelTeamInvitation(invitationId: string): Promise<void> {
    const invitation = await this.storage.getTeamInvitation(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Only pending invitations can be cancelled');
    }

    await this.storage.updateTeamInvitationStatus(invitationId, 'cancelled');
  }

  async sendWholesaleInvitation(
    sellerId: string,
    email: string,
    terms: WholesaleTerms
  ): Promise<WholesaleInvitation> {
    const seller = await this.storage.getUser(sellerId);
    if (!seller || seller.userType !== 'seller') {
      throw new Error('Only sellers can send wholesale invitations');
    }

    const existingInvitations = await this.storage.getWholesaleInvitationsBySeller(sellerId);
    const pendingInvitation = existingInvitations.find(
      inv => inv.buyerEmail === email && inv.status === 'pending'
    );

    if (pendingInvitation) {
      throw new Error('Invitation already sent to this email');
    }

    const token = this.generateToken();
    const expiresAt = terms.expiresAt || (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    })();

    const invitation: InsertWholesaleInvitation = {
      buyerEmail: email,
      sellerId,
      token,
      wholesaleTerms: terms as any,
      status: 'pending',
      expiresAt,
    };

    const createdInvitation = await this.storage.createWholesaleInvitation(invitation);

    const inviteUrl = `${process.env.REPLIT_DEV_DOMAIN || 'https://upfirst.io'}/wholesale/accept/${token}`;
    const storeName = seller.username || seller.email || 'a store';
    const inviterName = `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || seller.email || 'Someone';

    await this.emailProvider.sendEmail({
      from: process.env.RESEND_FROM_EMAIL || 'hello@upfirst.io',
      to: email,
      subject: `Wholesale Invitation from ${storeName}`,
      html: this.generateWholesaleInvitationEmail(email, storeName, inviterName, inviteUrl, terms),
    });

    return createdInvitation;
  }

  async acceptWholesaleInvitation(token: string, userId: string): Promise<WholesaleAccessGrant> {
    const invitation = await this.storage.getWholesaleInvitationByToken(token);
    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid');
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      await this.storage.updateWholesaleInvitationStatus(invitation.id, 'expired');
      throw new Error('Invitation has expired');
    }

    const user = await this.storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.email !== invitation.buyerEmail) {
      throw new Error('This invitation was sent to a different email address');
    }

    if (user.userType !== 'buyer') {
      throw new Error('Wholesale access can only be granted to buyer accounts');
    }

    const existingGrant = await this.storage.getWholesaleAccessGrant(userId, invitation.sellerId);
    if (existingGrant) {
      throw new Error('User already has wholesale access to this seller');
    }

    const grant: InsertWholesaleAccessGrant = {
      buyerId: userId,
      sellerId: invitation.sellerId,
      wholesaleTerms: invitation.wholesaleTerms as any,
      status: 'active',
    };

    const createdGrant = await this.storage.createWholesaleAccessGrant(grant);

    await this.storage.updateWholesaleInvitationStatus(invitation.id, 'accepted', new Date());

    return createdGrant;
  }

  async revokeWholesaleInvitation(invitationId: string): Promise<void> {
    const invitation = await this.storage.getWholesaleInvitation(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Only pending invitations can be revoked');
    }

    await this.storage.updateWholesaleInvitationStatus(invitationId, 'cancelled');
  }

  async determineSignupContext(hostname: string): Promise<SignupContext> {
    const sellerContext = await this.getSellerContextFromDomain(hostname);
    return sellerContext ? 'buyer' : 'seller';
  }

  async getSellerContextFromDomain(hostname: string): Promise<string | null> {
    const mainDomains = ['upfirst.io', 'localhost', process.env.REPLIT_DEV_DOMAIN];
    
    if (mainDomains.some(domain => hostname.includes(domain || ''))) {
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== hostname) {
        const seller = await this.storage.getUserByUsername(subdomain);
        return seller?.id || null;
      }
    }
    
    return null;
  }

  private generateUsername(email: string): string {
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    return `${baseUsername}_${randomSuffix}`;
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateTeamInvitationEmail(
    inviteeEmail: string,
    storeName: string,
    inviterName: string,
    inviteUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>You've been invited to join ${storeName}</h2>
          <p>Hi there,</p>
          <p>${inviterName} has invited you to join their team at ${storeName} on Upfirst.</p>
          <p>As a team member, you'll be able to help manage products, orders, and more.</p>
          <p>
            <a href="${inviteUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Accept Invitation
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${inviteUrl}</p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This invitation will expire in 7 days.
          </p>
        </body>
      </html>
    `;
  }

  private generateWholesaleInvitationEmail(
    inviteeEmail: string,
    storeName: string,
    inviterName: string,
    inviteUrl: string,
    terms: WholesaleTerms
  ): string {
    const termsHtml = [];
    if (terms.discountPercentage) {
      termsHtml.push(`<li><strong>${terms.discountPercentage}%</strong> discount on all wholesale products</li>`);
    }
    if (terms.minimumOrderValue) {
      termsHtml.push(`<li>Minimum order value: <strong>$${terms.minimumOrderValue}</strong></li>`);
    }
    if (terms.notes) {
      termsHtml.push(`<li>${terms.notes}</li>`);
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Wholesale Invitation from ${storeName}</h2>
          <p>Hi there,</p>
          <p>${inviterName} has invited you to purchase wholesale products from ${storeName} on Upfirst.</p>
          ${termsHtml.length > 0 ? `
            <h3>Wholesale Terms:</h3>
            <ul>
              ${termsHtml.join('\n              ')}
            </ul>
          ` : ''}
          <p>
            <a href="${inviteUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Accept Invitation
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${inviteUrl}</p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This invitation will expire in 30 days.
          </p>
        </body>
      </html>
    `;
  }
}
