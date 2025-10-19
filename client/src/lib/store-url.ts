/**
 * Get the store URL based on username and environment
 * Used in both Share Modal and Settings page for consistency
 * 
 * @param username - The store username
 * @param alwaysAbsolute - If true, always return full URL format (https://username.upfirst.io)
 * @returns Relative path in dev (/s/username), absolute URL in production (https://username.upfirst.io), or undefined if no username
 */
export function getStoreUrl(username: string | null | undefined, alwaysAbsolute: boolean = false): string | undefined {
  if (!username) {
    return undefined;
  }

  const hostname = window.location.hostname;
  
  // Force absolute URL if requested (for Settings page display)
  if (alwaysAbsolute) {
    return `https://${username}.upfirst.io`;
  }
  
  // Development/Replit environment - use relative path for SPA navigation
  if (hostname.includes('replit') || hostname === 'localhost') {
    return `/s/${username}`;
  }
  
  // Production - use absolute subdomain URL for cross-origin navigation
  return `${window.location.protocol}//${username}.upfirst.io`;
}

/**
 * Get the production store URL (always returns full URL format)
 * Used in Settings page to show users their actual storefront URL
 * 
 * @param username - The store username
 * @returns Full production URL (https://username.upfirst.io) or undefined if no username
 */
export function getProductionStoreUrl(username: string | null | undefined): string | undefined {
  return getStoreUrl(username, true);
}
