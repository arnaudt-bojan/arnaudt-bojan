/**
 * Domain detection utilities for Upfirst
 * Main domain: upfirst.io (seller admin access)
 * Seller domains: {username}.upfirst.io or custom domains (buyer access)
 */

export interface DomainInfo {
  isMainDomain: boolean;
  isSellerDomain: boolean;
  sellerUsername?: string;
}

/**
 * Detect domain type and extract seller username if on seller domain
 * CRITICAL: Always checks pathname FIRST for /s/:username pattern (works on all environments)
 */
export function detectDomain(): DomainInfo {
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;
  
  // FIRST: Always check if path contains /s/:username pattern (PRIMARY METHOD)
  // This works regardless of hostname (localhost, replit, production)
  const storefrontMatch = pathname.match(/^\/s\/([^\/]+)/);
  if (storefrontMatch && storefrontMatch[1]) {
    return {
      isMainDomain: false,
      isSellerDomain: true,
      sellerUsername: storefrontMatch[1],
    };
  }
  
  // THEN: Check domain-based logic (SECONDARY METHOD - for production subdomains)
  const parts = hostname.split('.');
  
  // For localhost development
  if (hostname === 'localhost') {
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
  
  // For Replit deployment domains (all replit.app and replit.dev URLs)
  if (hostname.includes('replit')) {
    // Check for explicit seller parameter for testing/sharing
    const urlParams = new URLSearchParams(window.location.search);
    const sellerParam = urlParams.get('seller');
    
    if (sellerParam) {
      return {
        isMainDomain: false,
        isSellerDomain: true,
        sellerUsername: sellerParam,
      };
    }
    
    // Default: Replit deployment URLs are treated as main domain
    return {
      isMainDomain: true,
      isSellerDomain: false,
    };
  }
  
  // Production logic
  
  // Main domain: upfirst.io
  if (hostname === 'upfirst.io' || (parts.length === 2 && parts[0] === 'upfirst')) {
    return {
      isMainDomain: true,
      isSellerDomain: false,
    };
  }
  
  // Seller subdomain: {username}.upfirst.io
  if (parts.length === 3 && parts[1] === 'upfirst' && parts[2] === 'io') {
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

/**
 * Extract seller username from pathname
 * Supports patterns like /s/:username/... 
 */
export function extractSellerFromPath(pathname: string): string | null {
  const storefrontMatch = pathname.match(/^\/s\/([^\/]+)/);
  return storefrontMatch?.[1] || null;
}
