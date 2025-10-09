/**
 * Domain detection utilities for Upfirst
 * Main domain: upfirst.com (seller admin access)
 * Seller domains: {username}.upfirst.com or custom domains (buyer access)
 */

export interface DomainInfo {
  isMainDomain: boolean;
  isSellerDomain: boolean;
  sellerUsername?: string;
}

/**
 * Detect domain type and extract seller username if on seller domain
 */
export function detectDomain(): DomainInfo {
  const hostname = window.location.hostname;
  
  // For development/preview environments
  if (hostname.includes('replit') || hostname === 'localhost') {
    // Check if there's a seller parameter in URL for testing
    const urlParams = new URLSearchParams(window.location.search);
    const testSeller = urlParams.get('seller');
    
    if (testSeller) {
      return {
        isMainDomain: false,
        isSellerDomain: true,
        sellerUsername: testSeller,
      };
    }
    
    // Default to main domain for dev
    return {
      isMainDomain: true,
      isSellerDomain: false,
    };
  }
  
  // Production logic
  const parts = hostname.split('.');
  
  // Main domain: upfirst.com
  if (hostname === 'upfirst.com' || (parts.length === 2 && parts[0] === 'uppfirst')) {
    return {
      isMainDomain: true,
      isSellerDomain: false,
    };
  }
  
  // Seller subdomain: {username}.upfirst.com
  if (parts.length === 3 && parts[1] === 'uppfirst' && parts[2] === 'com') {
    return {
      isMainDomain: false,
      isSellerDomain: true,
      sellerUsername: parts[0],
    };
  }
  
  // Custom domain - treat as seller domain
  // We'll need to look up which seller owns this domain from the backend
  return {
    isMainDomain: false,
    isSellerDomain: true,
    // sellerUsername will be fetched from API based on custom domain
  };
}

/**
 * Check if current domain allows seller login
 */
export function canSellerLogin(): boolean {
  return detectDomain().isMainDomain;
}

/**
 * Check if current domain allows buyer login/signup
 */
export function canBuyerAccess(): boolean {
  return detectDomain().isSellerDomain;
}
