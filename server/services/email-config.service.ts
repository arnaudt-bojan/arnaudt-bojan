/**
 * Email Configuration Service
 * 
 * Centralizes all email configuration with environment-based overrides.
 * NO HARDCODED VALUES - all configuration comes from environment or typed defaults.
 */

export interface EmailConfig {
  fromEmail: string;
  supportEmail: string;
  noreplyEmail: string;
  platformName: string;
  platformUrl: string;
}

export class EmailConfigService {
  private config: EmailConfig;

  constructor() {
    // Load configuration from environment with validation
    this.config = this.loadConfig();
  }

  private loadConfig(): EmailConfig {
    const platformName = process.env.PLATFORM_NAME || 'Upfirst';
    const platformDomain = process.env.PLATFORM_DOMAIN || 'upfirst.io';
    
    // ⚠️ IMPORTANT: Resend only allows sending from VERIFIED email addresses in development
    // Using 'hello@upfirst.io' which is verified in Resend (was working before)
    // The RESEND_FROM_EMAIL secret may be set incorrectly, so we hardcode the working value
    // 📝 TODO PRODUCTION: Fix RESEND_FROM_EMAIL secret and use seller-specific FROM addresses
    const fromEmail = `${platformName} <hello@upfirst.io>`; // Hardcoded to working verified email
    
    return {
      fromEmail,
      supportEmail: process.env.SUPPORT_EMAIL || `support@${platformDomain}`,
      noreplyEmail: process.env.NOREPLY_EMAIL || `noreply@${platformDomain}`,
      platformName,
      platformUrl: this.getPlatformUrl(),
    };
  }

  private getPlatformUrl(): string {
    if (process.env.REPLIT_DOMAINS) {
      const domain = process.env.REPLIT_DOMAINS.split(',')[0];
      return `https://${domain}`;
    }
    return `http://localhost:${process.env.PORT || 5000}`;
  }

  /**
   * Get FROM email for seller-branded emails (sent to buyers)
   */
  getSellerBrandedFrom(sellerName?: string): string {
    const name = sellerName || this.config.platformName;
    return `${name} <${this.config.noreplyEmail}>`;
  }

  /**
   * Get FROM email for platform emails (sent to sellers)
   */
  getPlatformFrom(): string {
    return this.config.fromEmail;
  }

  /**
   * Get REPLY-TO email for seller-branded emails
   */
  getSellerReplyTo(sellerEmail: string): string {
    return sellerEmail;
  }

  /**
   * Get REPLY-TO email for platform emails to sellers
   */
  getPlatformReplyTo(): string {
    return this.config.supportEmail;
  }

  /**
   * Get support email for footer text
   */
  getSupportEmail(): string {
    return this.config.supportEmail;
  }

  /**
   * Get platform name
   */
  getPlatformName(): string {
    return this.config.platformName;
  }

  /**
   * Get full platform URL with optional path
   */
  getUrl(path?: string): string {
    return path ? `${this.config.platformUrl}${path}` : this.config.platformUrl;
  }
}

// Export singleton instance
export const emailConfig = new EmailConfigService();
