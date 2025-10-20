/**
 * IP Address Utilities
 * 
 * Utilities for IP address validation, parsing, and range checking.
 * Supports both IPv4 and CIDR notation for allowlists.
 */

export interface IPRange {
  base: string;
  cidr?: number;
}

/**
 * Parse IP address or CIDR range
 * 
 * Examples:
 * - "192.168.1.1" => { base: "192.168.1.1" }
 * - "192.168.0.0/16" => { base: "192.168.0.0", cidr: 16 }
 */
export function parseIPRange(range: string): IPRange {
  const trimmed = range.trim();
  
  if (trimmed.includes('/')) {
    const [base, cidr] = trimmed.split('/');
    return {
      base: base.trim(),
      cidr: parseInt(cidr.trim(), 10),
    };
  }
  
  return { base: trimmed };
}

/**
 * Convert IP address to 32-bit integer
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return 0;
  }
  
  return parts.reduce((int, octet) => {
    return (int << 8) + parseInt(octet, 10);
  }, 0) >>> 0;
}

/**
 * Check if IP address is in a range (supports CIDR)
 * 
 * @param ip IP address to check
 * @param range IP range (single IP or CIDR notation)
 * @returns true if IP is in range
 */
export function ipRangeCheck(ip: string, range: IPRange): boolean {
  // Handle special cases
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }
  
  // Extract IPv4 from IPv6-mapped format
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // Parse range
  const { base, cidr } = range;
  
  // Exact match (no CIDR)
  if (!cidr) {
    return ip === base;
  }
  
  // CIDR range check
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  const mask = ~((1 << (32 - cidr)) - 1);
  
  return (ipInt & mask) === (baseInt & mask);
}

/**
 * Check if IP is in any of the provided ranges
 * 
 * @param ip IP address to check
 * @param ranges Array of IP ranges
 * @returns true if IP is in any range
 */
export function isIPInRanges(ip: string, ranges: IPRange[]): boolean {
  return ranges.some(range => ipRangeCheck(ip, range));
}

/**
 * Parse allowlist from environment variable
 * 
 * Format: "127.0.0.1,192.168.0.0/16,10.0.0.0/8"
 */
export function parseAllowlist(allowlistStr: string): IPRange[] {
  if (!allowlistStr) {
    return [];
  }
  
  return allowlistStr
    .split(',')
    .map(range => range.trim())
    .filter(range => range.length > 0)
    .map(parseIPRange);
}

/**
 * Validate IPv4 address format
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  
  if (parts.length !== 4) {
    return false;
  }
  
  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}
