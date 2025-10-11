/**
 * Get the store URL based on username and environment
 * Used in both Share Modal and Settings page for consistency
 */
export function getStoreUrl(username: string | null | undefined): string {
  if (!username) {
    return `${window.location.origin}`;
  }

  const hostname = window.location.hostname;
  
  // Development/Replit environment - use /s/username path
  if (hostname.includes('replit') || hostname === 'localhost') {
    return `${window.location.origin}/s/${username}`;
  }
  
  // Production - use subdomain architecture (username.upfirst.io)
  return `${window.location.protocol}//${username}.upfirst.io`;
}
