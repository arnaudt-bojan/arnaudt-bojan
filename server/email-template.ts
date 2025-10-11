/**
 * Email Template Utility - Dark Mode Safe
 * 
 * Best practices for email rendering across all clients:
 * - Inline styles (more reliable than CSS)
 * - Force light mode with meta tags
 * - Explicit colors with !important
 * - Table-based layout (email-safe HTML)
 * - Color-scheme meta tag to prevent dark mode
 */

export interface EmailTemplateOptions {
  preheader?: string;
  logoUrl?: string;
  bannerUrl?: string;
  storeName?: string;
  content: string;
  footerText?: string;
  unsubscribeLink?: string;
}

/**
 * Generate dark-mode-safe email HTML with inline styles
 */
export function createEmailTemplate(options: EmailTemplateOptions): string {
  const {
    preheader = '',
    logoUrl,
    bannerUrl,
    storeName = 'Upfirst',
    content,
    footerText,
    unsubscribeLink,
  } = options;

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  
  <!-- Force Light Mode - Critical for dark mode clients -->
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  
  <title>${storeName}</title>
  
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  
  <style type="text/css">
    /* Force Light Mode - Multiple approaches for different clients */
    :root {
      color-scheme: light only !important;
      supported-color-schemes: light only !important;
    }
    
    /* Reset */
    body, table, td, a { 
      -webkit-text-size-adjust: 100% !important; 
      -ms-text-size-adjust: 100% !important; 
    }
    table, td { 
      mso-table-lspace: 0pt !important; 
      mso-table-rspace: 0pt !important; 
    }
    img { 
      -ms-interpolation-mode: bicubic !important; 
    }
    
    /* iOS/Gmail dark mode override */
    @media (prefers-color-scheme: dark) {
      body, .email-wrapper, .email-container, .email-content {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }
      h1, h2, h3, h4, h5, h6, p, td, span, a, div, li {
        color: #1a1a1a !important;
      }
      .dark-mode-bg-white {
        background-color: #ffffff !important;
      }
      .dark-mode-text-dark {
        color: #1a1a1a !important;
      }
    }
    
    /* Apple Mail specific */
    @supports (-webkit-appearance: none) {
      body, .email-wrapper, .email-container {
        background-color: #ffffff !important;
      }
    }
  </style>
</head>

<body style="margin: 0 !important; padding: 0 !important; background-color: #f5f5f5 !important; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;" class="dark-mode-bg-white dark-mode-text-dark">
  
  <!-- Preheader (hidden text for email preview) -->
  <div style="display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #f5f5f5; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    ${preheader || 'Update from ' + storeName}
  </div>
  
  <!-- Email Wrapper - Forces white background -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background-color: #f5f5f5 !important;" class="email-wrapper dark-mode-bg-white">
    <tr>
      <td style="padding: 20px 0;" align="center" valign="top">
        
        <!-- Email Container - 600px max width -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff !important; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);" class="email-container dark-mode-bg-white">
          
          <!-- Banner Image (if provided) -->
          ${bannerUrl ? `
          <tr>
            <td style="padding: 0;">
              <img src="${bannerUrl}" alt="Banner" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none;">
            </td>
          </tr>
          ` : ''}
          
          <!-- Logo/Header -->
          ${logoUrl ? `
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center; background-color: #ffffff !important;" class="dark-mode-bg-white">
              <img src="${logoUrl}" alt="${storeName}" style="display: inline-block; max-width: 150px; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none;">
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center; background-color: #ffffff !important;" class="dark-mode-bg-white">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">${storeName}</h1>
            </td>
          </tr>
          `}
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px 40px; background-color: #ffffff !important; color: #1a1a1a !important;" class="email-content dark-mode-bg-white dark-mode-text-dark">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb !important; border-top: 1px solid #e5e7eb; text-align: center;" class="dark-mode-bg-white">
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" class="dark-mode-text-dark">
                ${footerText || `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`}
              </p>
              ${unsubscribeLink ? `
              <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af !important;">
                <a href="${unsubscribeLink}" style="color: #6366f1 !important; text-decoration: underline;">Unsubscribe</a>
              </p>
              ` : ''}
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();
}

/**
 * Create content section with proper dark mode styling
 */
export function createContentSection(html: string): string {
  // Ensure all elements have explicit colors
  return html
    .replace(/<h1/g, '<h1 style="color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;" class="dark-mode-text-dark"')
    .replace(/<h2/g, '<h2 style="color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;" class="dark-mode-text-dark"')
    .replace(/<h3/g, '<h3 style="color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;" class="dark-mode-text-dark"')
    .replace(/<p(?!\s+style)/g, '<p style="color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6;" class="dark-mode-text-dark"')
    .replace(/<a(?!\s+style)/g, '<a style="color: #6366f1 !important; text-decoration: underline;"')
    .replace(/<div(?!\s+style)/g, '<div style="color: #1a1a1a !important;" class="dark-mode-text-dark"')
    .replace(/<span(?!\s+style)/g, '<span style="color: #1a1a1a !important;" class="dark-mode-text-dark"');
}

/**
 * Create a button with proper dark mode styling
 */
export function createEmailButton(text: string, url: string, color: string = '#6366f1'): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
  <tr>
    <td style="border-radius: 6px; background-color: ${color} !important; text-align: center;">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 6px; line-height: 1;">
        ${text}
      </a>
    </td>
  </tr>
</table>
  `.trim();
}

/**
 * Create an alert/notice box with proper styling
 */
export function createAlertBox(content: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): string {
  const colors = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  };
  
  const color = colors[type];
  
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
  <tr>
    <td style="padding: 16px; background-color: ${color.bg} !important; border-left: 4px solid ${color.border}; border-radius: 6px;">
      <div style="color: ${color.text} !important; font-size: 14px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${content}
      </div>
    </td>
  </tr>
</table>
  `.trim();
}

/**
 * Create order items table with proper styling
 */
export function createOrderItemsTable(items: Array<{ name: string; quantity: number; price: string }>): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding: 12px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-bottom: 1px solid #e5e7eb;" class="dark-mode-text-dark">
        ${item.name} × ${item.quantity}
      </td>
      <td style="padding: 12px 0; color: #1a1a1a !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: right; border-bottom: 1px solid #e5e7eb;" class="dark-mode-text-dark">
        $${item.price}
      </td>
    </tr>
  `).join('');
  
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
  ${rows}
</table>
  `.trim();
}
