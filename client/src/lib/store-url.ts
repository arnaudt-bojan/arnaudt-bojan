/**
 * Get the store URL based on username and environment
 * Used in both Share Modal and Settings page for consistency
 * 
 * @returns Relative path in dev (/s/username), absolute URL in production (https://username.upfirst.io), or undefined if no username
 */
export function getStoreUrl(username: string | null | undefined): string | undefined {
  if (!username) {
    return undefined;
  }

  const hostname = window.location.hostname;
  
  // Development/Replit environment - use relative path for SPA navigation
  if (hostname.includes('replit') || hostname === 'localhost') {
    return `/s/${username}`;
  }
  
  // Production - use absolute subdomain URL for cross-origin navigation
  return `${window.location.protocol}//${username}.upfirst.io`;
}
