import { IStorage } from '../../storage';
import { logger } from '../../logger';
import { InsertMetaAdAccount, MetaAdAccount } from '@shared/schema';
import crypto from 'crypto';

export interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface MetaOAuthStartResult {
  authUrl: string;
  state: string;
}

export interface MetaOAuthCallbackResult {
  success: boolean;
  error?: string;
  account?: MetaAdAccount;
}

export interface MetaAccessTokenData {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaAdAccountData {
  id: string;
  name: string;
  account_id: string;
  currency: string;
  timezone_name: string;
}

/**
 * MetaOAuthService
 * Architecture 3 service for Meta OAuth flow and token management
 * 
 * Handles:
 * - OAuth authorization URL generation
 * - OAuth callback processing
 * - Access token exchange
 * - Ad account connection and validation
 * - Token refresh and rotation
 */
export class MetaOAuthService {
  private readonly META_GRAPH_VERSION = 'v21.0';
  private readonly META_GRAPH_BASE = `https://graph.facebook.com/${this.META_GRAPH_VERSION}`;
  
  constructor(
    private storage: IStorage,
    private config: MetaOAuthConfig
  ) {}

  /**
   * Start OAuth flow - generate authorization URL
   */
  async startOAuthFlow(sellerId: string): Promise<MetaOAuthStartResult> {
    try {
      // Generate secure state parameter to prevent CSRF
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in session/cache for validation (in real implementation)
      // For now, we'll validate state in callback
      
      const params = new URLSearchParams({
        client_id: this.config.appId,
        redirect_uri: this.config.redirectUri,
        state: state,
        scope: 'ads_management,ads_read,business_management',
        response_type: 'code'
      });
      
      const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
      
      logger.info(`[MetaOAuth] Started OAuth flow for seller ${sellerId}`);
      
      return { authUrl, state };
    } catch (error) {
      logger.error('[MetaOAuth] Failed to start OAuth flow', { error, sellerId });
      throw new Error('Failed to start Meta OAuth flow');
    }
  }

  /**
   * Handle OAuth callback - exchange code for access token
   */
  async handleOAuthCallback(
    code: string,
    state: string,
    sellerId: string
  ): Promise<MetaOAuthCallbackResult> {
    try {
      // TODO: Validate state parameter against stored value (CSRF protection)
      
      // Step 1: Exchange authorization code for access token
      const tokenData = await this.exchangeCodeForToken(code);
      
      if (!tokenData.access_token) {
        return { success: false, error: 'Failed to obtain access token' };
      }
      
      // Step 2: Get user's Meta account info
      const metaUserId = await this.getMetaUserId(tokenData.access_token);
      
      // Step 3: Get user's ad accounts
      const adAccounts = await this.getAdAccounts(tokenData.access_token);
      
      if (adAccounts.length === 0) {
        return { success: false, error: 'No ad accounts found. Please create an ad account first.' };
      }
      
      // Use the first ad account
      const primaryAccount = adAccounts[0];
      
      // Step 4: Calculate token expiry
      const tokenExpiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;
      
      // Step 5: Check if account already exists
      const existingAccount = await this.storage.getMetaAdAccountByMetaAccountId(primaryAccount.account_id);
      
      if (existingAccount) {
        // Update existing account
        await this.storage.updateMetaAdAccount(existingAccount.id, {
          accessToken: tokenData.access_token,
          tokenExpiresAt,
          status: 'connected',
          businessName: primaryAccount.name,
          currency: primaryAccount.currency,
          timezone: primaryAccount.timezone_name,
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        });
        
        const updatedAccount = await this.storage.getMetaAdAccount(existingAccount.id);
        
        logger.info('[MetaOAuth] Updated existing Meta ad account', {
          accountId: existingAccount.id,
          sellerId
        });
        
        return { success: true, account: updatedAccount! };
      }
      
      // Step 6: Create new ad account record
      const newAccount: InsertMetaAdAccount = {
        sellerId,
        metaUserId,
        metaAdAccountId: primaryAccount.account_id,
        accessToken: tokenData.access_token,
        tokenExpiresAt,
        status: 'connected',
        businessName: primaryAccount.name,
        currency: primaryAccount.currency,
        timezone: primaryAccount.timezone_name,
        totalSpent: '0',
        totalRevenue: '0'
      };
      
      const accountId = await this.storage.createMetaAdAccount(newAccount);
      const account = await this.storage.getMetaAdAccount(accountId);
      
      logger.info('[MetaOAuth] Created new Meta ad account', { accountId, sellerId });
      
      return { success: true, account: account! };
    } catch (error) {
      logger.error('[MetaOAuth] OAuth callback failed', { error, sellerId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth authentication failed'
      };
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<MetaAccessTokenData> {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      redirect_uri: this.config.redirectUri,
      code
    });
    
    const response = await fetch(`${this.META_GRAPH_BASE}/oauth/access_token?${params.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      logger.error('[MetaOAuth] Token exchange failed', { error });
      throw new Error(`Token exchange failed: ${error.error?.message || 'Unknown error'}`);
    }
    
    return await response.json();
  }

  /**
   * Get Meta user ID
   */
  private async getMetaUserId(accessToken: string): Promise<string> {
    const response = await fetch(`${this.META_GRAPH_BASE}/me?access_token=${accessToken}`);
    
    if (!response.ok) {
      throw new Error('Failed to get Meta user ID');
    }
    
    const data = await response.json();
    return data.id;
  }

  /**
   * Get user's ad accounts
   */
  private async getAdAccounts(accessToken: string): Promise<MetaAdAccountData[]> {
    const response = await fetch(
      `${this.META_GRAPH_BASE}/me/adaccounts?fields=id,name,account_id,currency,timezone_name&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch ad accounts');
    }
    
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Refresh access token (for long-lived tokens)
   */
  async refreshAccessToken(accountId: string): Promise<boolean> {
    try {
      const account = await this.storage.getMetaAdAccount(accountId);
      
      if (!account) {
        throw new Error('Ad account not found');
      }
      
      // Exchange short-lived token for long-lived token
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        fb_exchange_token: account.accessToken
      });
      
      const response = await fetch(`${this.META_GRAPH_BASE}/oauth/access_token?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const tokenData: MetaAccessTokenData = await response.json();
      
      const tokenExpiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;
      
      await this.storage.updateMetaAdAccount(accountId, {
        accessToken: tokenData.access_token,
        tokenExpiresAt,
        status: 'connected',
        updatedAt: new Date()
      });
      
      logger.info('[MetaOAuth] Refreshed access token', { accountId });
      
      return true;
    } catch (error) {
      logger.error('[MetaOAuth] Token refresh failed', { error, accountId });
      
      // Mark account as token_expired
      await this.storage.updateMetaAdAccount(accountId, {
        status: 'token_expired',
        updatedAt: new Date()
      });
      
      return false;
    }
  }

  /**
   * Disconnect ad account
   */
  async disconnectAccount(accountId: string): Promise<boolean> {
    try {
      await this.storage.updateMetaAdAccount(accountId, {
        status: 'disconnected',
        updatedAt: new Date()
      });
      
      logger.info('[MetaOAuth] Disconnected ad account', { accountId });
      
      return true;
    } catch (error) {
      logger.error('[MetaOAuth] Failed to disconnect account', { error, accountId });
      return false;
    }
  }

  /**
   * Validate token and check account status
   */
  async validateToken(accountId: string): Promise<boolean> {
    try {
      const account = await this.storage.getMetaAdAccount(accountId);
      
      if (!account) {
        return false;
      }
      
      // Check if token is expired
      if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
        await this.storage.updateMetaAdAccount(accountId, {
          status: 'token_expired',
          updatedAt: new Date()
        });
        return false;
      }
      
      // Test token by making a simple API call
      const response = await fetch(
        `${this.META_GRAPH_BASE}/me?access_token=${account.accessToken}`
      );
      
      if (!response.ok) {
        await this.storage.updateMetaAdAccount(accountId, {
          status: 'token_expired',
          updatedAt: new Date()
        });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('[MetaOAuth] Token validation failed', { error, accountId });
      return false;
    }
  }
}
