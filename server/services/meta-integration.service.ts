import { IStorage } from '../storage';
import { logger } from '../logger';

export interface MetaOAuthResult {
  success: boolean;
  error?: string;
  adAccountId?: string;
  accountName?: string;
}

export class MetaIntegrationService {
  constructor(
    private storage: IStorage,
    private appId: string,
    private appSecret: string,
    private redirectUri: string
  ) {}

  async handleOAuthCallback(code: string, userId: string): Promise<MetaOAuthResult> {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&code=${code}&redirect_uri=${encodeURIComponent(this.redirectUri)}`
      );
      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        return { success: false, error: 'token_failed' };
      }

      // Get user's ad accounts
      const adAccountsResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?access_token=${tokenData.access_token}`
      );
      const adAccountsData = await adAccountsResponse.json();

      const firstAdAccount = adAccountsData.data?.[0];
      
      // Store settings in database
      await this.storage.saveMetaSettings(userId, {
        accessToken: tokenData.access_token,
        adAccountId: firstAdAccount?.id || "",
        accountName: firstAdAccount?.name || "Facebook Ad Account",
        connected: 1,
      });

      return {
        success: true,
        adAccountId: firstAdAccount?.id,
        accountName: firstAdAccount?.name
      };
    } catch (error) {
      logger.error("Meta OAuth error", error);
      return { success: false, error: 'connection_failed' };
    }
  }
}
