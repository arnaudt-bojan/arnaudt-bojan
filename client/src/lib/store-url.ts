/**
 * Get the store URL based on username and environment
 * Used in both Share Modal and Settings page for consistency
 */
export function getStoreUrl(username: string | null | undefined): string {
  if (!username) {
    return `${window.location.origin}/products`;
  }

  const hostname = window.location.hostname;
  
  // Development/Replit environment - use query parameter with /products path for filtering
  if (hostname.includes('replit') || hostname === 'localhost') {
    return `${window.location.origin}/products?seller=${username}`;
  }
  
  // Production - use subdomain (storefront mounts at root, not /products)
  return `${window.location.protocol}//${username}.upfirst.io`;
}
