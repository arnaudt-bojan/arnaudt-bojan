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
 */
export function detectDomain(): DomainInfo {
  const hostname = window.location.hostname;
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
  
  // For Replit deployment domains (pattern: {project}-{username}.replit.app or replit.dev)
  // Example: shop-swift-mirtorabi.replit.app -> seller username is "mirtorabi"
  if (hostname.includes('replit')) {
    // Parse subdomain for seller username
    const subdomain = parts[0]; // e.g., "shop-swift-mirtorabi"
    
    // Extract seller username from pattern: {project}-{username}
    if (subdomain.includes('-')) {
      const subdomainParts = subdomain.split('-');
      // Seller username is the last part (e.g., "mirtorabi" from "shop-swift-mirtorabi")
      const sellerUsername = subdomainParts[subdomainParts.length - 1];
      
      if (sellerUsername) {
        return {
          isMainDomain: false,
          isSellerDomain: true,
          sellerUsername: sellerUsername,
        };
      }
    }
    
    // Check for seller parameter as fallback
    const urlParams = new URLSearchParams(window.location.search);
    const testSeller = urlParams.get('seller');
    
    if (testSeller) {
      return {
        isMainDomain: false,
        isSellerDomain: true,
        sellerUsername: testSeller,
      };
    }
    
    // Default to main domain if no seller identified
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
