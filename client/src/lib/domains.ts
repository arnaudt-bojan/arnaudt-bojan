import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import { z } from "zod";

// Import domain types from shared schema
export type DomainStrategy = "cloudflare" | "manual";

export type DomainStatus = 
  | "pending_verification"
  | "dns_verified"
  | "ssl_provisioning"
  | "active"
  | "error";

export interface DomainConnection {
  id: string;
  sellerId: string;
  domain: string;
  normalizedDomain: string;
  strategy: DomainStrategy;
  status: DomainStatus;
  verificationToken: string;
  dnsInstructions: any;
  cloudflareCustomHostnameId: string | null;
  caddySiteId: string | null;
  sslStatus: string | null;
  sslProvider: string | null;
  sslRenewAt: Date | null;
  sslIssuedAt: Date | null;
  sslExpiresAt: Date | null;
  lastCheckedAt: Date | null;
  lastVerifiedAt: Date | null;
  failureReason: string | null;
  failureCode: string | null;
  retryCount: number;
  isPrimary: number; // 0 or 1 (stored as integer in database)
  createdAt: Date;
  updatedAt: Date;
}

// Request schemas matching server-side validation
export const createDomainRequestSchema = z.object({
  domain: z.string()
    .trim()
    .min(1, "Domain is required")
    .max(255, "Domain too long")
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
      "Invalid domain format. Must be a valid domain like shop.example.com"
    ),
  strategy: z.enum(["cloudflare", "manual"]),
  isPrimary: z.boolean().optional().default(false),
});

export type CreateDomainRequest = z.infer<typeof createDomainRequestSchema>;

// API response types
interface DomainSetupResponse {
  success: boolean;
  domainConnection?: DomainConnection;
  error?: string;
  userMessage?: string;
}

interface DomainVerificationResponse {
  success: boolean;
  status?: string;
  message?: string;
}

// TanStack Query Hooks

/**
 * Fetch all domains for the authenticated seller
 */
export function useDomains() {
  return useQuery<DomainConnection[]>({
    queryKey: ["/api/seller/domains"],
  });
}

/**
 * Fetch a single domain by ID
 */
export function useDomain(id: string | null) {
  return useQuery<DomainConnection>({
    queryKey: ["/api/seller/domains", id],
    enabled: !!id,
  });
}

/**
 * Create a new domain connection
 */
export function useCreateDomain() {
  return useMutation({
    mutationFn: async (data: CreateDomainRequest) => {
      return await apiRequest("POST", "/api/seller/domains", data) as Promise<DomainSetupResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/domains"] });
    },
  });
}

/**
 * Update domain (set as primary)
 */
export function useUpdateDomain() {
  return useMutation({
    mutationFn: async ({ id, isPrimary }: { id: string; isPrimary: boolean }) => {
      return await apiRequest("PATCH", `/api/seller/domains/${id}`, { isPrimary }) as Promise<{ success: boolean; domain: DomainConnection }>;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/domains", id] });
    },
  });
}

/**
 * Delete a domain connection
 */
export function useDeleteDomain() {
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/seller/domains/${id}`, {}) as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/domains"] });
    },
  });
}

/**
 * Verify domain ownership (trigger verification check)
 */
export function useVerifyDomain() {
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/seller/domains/${id}/verify`, {}) as Promise<DomainVerificationResponse>;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/domains", id] });
    },
  });
}

/**
 * Switch domain strategy (Cloudflare ↔ Manual)
 */
export function useSwitchStrategy() {
  return useMutation({
    mutationFn: async ({ id, newStrategy }: { id: string; newStrategy: DomainStrategy }) => {
      return await apiRequest("POST", `/api/seller/domains/${id}/switch-strategy`, { newStrategy }) as Promise<DomainSetupResponse>;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/domains", id] });
    },
  });
}

// Utility functions

/**
 * Get status badge color variant
 */
export function getStatusBadgeVariant(status: DomainStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "dns_verified":
    case "ssl_provisioning":
      return "secondary";
    case "pending_verification":
      return "outline";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Get human-readable status text
 */
export function getStatusText(status: DomainStatus): string {
  switch (status) {
    case "pending_verification":
      return "Pending Verification";
    case "dns_verified":
      return "DNS Verified";
    case "ssl_provisioning":
      return "Provisioning SSL";
    case "active":
      return "Active";
    case "error":
      return "Error";
    default:
      return "Unknown";
  }
}

/**
 * Get verification URL for HTTP verification
 */
export function getVerificationUrl(domain: string, token: string): string {
  return `https://${domain}/.well-known/upfirst-domain-verify/${token}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
}
