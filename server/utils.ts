/**
 * Server Utilities
 * 
 * Centralized utility functions used across multiple modules.
 * Eliminates code duplication and provides reusable helpers.
 */

import { storage } from './storage';
import crypto from 'crypto';

/**
 * Generate random 8-digit username
 */
export function generateRandomUsername(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

/**
 * Generate unique 8-digit username
 * Checks database to ensure uniqueness
 * @param maxAttempts Maximum number of attempts to generate unique username
 * @returns Unique username
 * @throws Error if unable to generate unique username after maxAttempts
 */
export async function generateUniqueUsername(maxAttempts: number = 10): Promise<string> {
  const allUsers = await storage.getAllUsers();
  let username = generateRandomUsername();
  let attempts = 0;
  
  while (allUsers.some(u => u.username === username) && attempts < maxAttempts) {
    username = generateRandomUsername();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique username after maximum attempts');
  }
  
  return username;
}

/**
 * Generate 6-digit authentication code
 */
export function generateAuthCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate secure token for authentication/session
 * @param bytes Number of random bytes (default: 32)
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Normalize email address
 * Converts to lowercase and trims whitespace
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize redirect URL to prevent open redirects
 * Only allows relative URLs starting with /
 */
export function isSafeReturnUrl(url: string): boolean {
  if (!url) return false;
  // Must start with / and not be a protocol URL
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('://');
}

/**
 * Format currency amount
 * @param amount Amount in smallest currency unit (cents)
 * @param currency Currency code (e.g., 'USD')
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });
  return formatter.format(amount / 100); // Convert cents to dollars
}

/**
 * Generate order number
 * Format: ORD-YYYYMMDD-XXXXX (random 5-digit suffix)
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `ORD-${datePart}-${randomPart}`;
}

/**
 * Generate invoice number
 * Format: INV-YYYYMMDD-XXXXX
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `INV-${datePart}-${randomPart}`;
}

/**
 * Generate packing slip number
 * Format: PS-YYYYMMDD-XXXXX
 */
export function generatePackingSlipNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `PS-${datePart}-${randomPart}`;
}

/**
 * Parse Stripe signature header
 */
export function parseStripeSignature(signature: string): { timestamp?: string; hash?: string } {
  try {
    const timestamp = signature.split(',').find(s => s.startsWith('t='))?.split('=')[1];
    const hash = signature.split(',').find(s => s.startsWith('v1='))?.split('=')[1];
    return { timestamp, hash };
  } catch {
    return {};
  }
}

/**
 * Calculate pagination offset
 */
export function calculateOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}

/**
 * Sleep/delay utility
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param fn Function to retry
 * @param maxAttempts Maximum number of attempts
 * @param initialDelay Initial delay in milliseconds
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxAttempts) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Remove undefined values from object
 */
export function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}
