/**
 * Newsletter Services - Architecture 3 Implementation
 * 
 * All services follow dependency injection pattern:
 * - Constructor injection of IStorage interface
 * - No direct database access
 * - Clean separation of concerns
 * - Proper TypeScript typing
 */

export { CampaignService } from "./campaign.service";
export { NewsletterJobQueue } from "./job-queue.service";
export { SubscriberService } from "./subscriber.service";
export { ComplianceService } from "./compliance.service";
export { SegmentationService } from "./segmentation.service";
export { TemplateService } from "./template.service";
export { AnalyticsService } from "./analytics.service";

// Re-export types for convenience
export type { EventData } from "./analytics.service";
export type {
  ConsentRecord,
  SuppressionEntry,
  GDPRExportData,
} from "./compliance.service";
