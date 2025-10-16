/**
 * Newsletter System - Shared Types & DTOs
 * Architecture 3 compliant type definitions
 */

// ============================================================================
// Campaign DTOs
// ============================================================================

export interface CreateCampaignDTO {
  subject: string;
  content: string;
  htmlContent?: string;
  templateId?: string;
  segmentIds?: string[];
  groupIds?: string[];
  scheduledAt?: Date;
  timezone?: string;
}

export interface UpdateCampaignDTO {
  subject?: string;
  content?: string;
  htmlContent?: string;
  status?: CampaignStatus;
}

export interface SendCampaignResult {
  success: boolean;
  campaignId: string;
  recipientCount: number;
  batchId?: string;
  error?: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';

// ============================================================================
// Segment DTOs
// ============================================================================

export interface CreateSegmentDTO {
  name: string;
  description?: string;
  rules: SegmentRules;
}

export interface SegmentRules {
  conditions: SegmentCondition[];
  operator: 'AND' | 'OR';
}

export interface SegmentCondition {
  field: SegmentField;
  operator: SegmentOperator;
  value: string | number | boolean;
}

export type SegmentField = 
  | 'email'
  | 'name'
  | 'status'
  | 'engagement_score'
  | 'last_opened_at'
  | 'last_clicked_at'
  | 'total_opens'
  | 'total_clicks'
  | 'created_at'
  | 'group_id';

export type SegmentOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in';

export interface SegmentEvaluationResult {
  segmentId: string;
  subscriberCount: number;
  subscriberIds: string[];
  evaluatedAt: Date;
}

// ============================================================================
// Subscriber DTOs
// ============================================================================

export interface CreateSubscriberDTO {
  email: string;
  name?: string;
  groupIds?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateSubscriberDTO {
  name?: string;
  status?: SubscriberStatus;
  metadata?: Record<string, any>;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  email: string;
  error: string;
}

export type SubscriberStatus = 'active' | 'unsubscribed' | 'bounced' | 'complained';

// ============================================================================
// Template DTOs
// ============================================================================

export interface CreateTemplateDTO {
  name: string;
  subject: string;
  content: string;
  htmlContent?: string;
  blocks?: ContentBlock[];
  variables?: TemplateVariable[];
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string | Record<string, any>;
  styles?: Record<string, any>;
  order: number;
}

export type BlockType = 
  | 'text'
  | 'heading'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'html'
  | 'product'
  | 'social';

export interface TemplateVariable {
  key: string;
  label: string;
  defaultValue?: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

export interface RenderContext {
  subscriber?: {
    email: string;
    name?: string;
    [key: string]: any;
  };
  campaign?: {
    id: string;
    subject: string;
    [key: string]: any;
  };
  customVariables?: Record<string, any>;
}

// ============================================================================
// Analytics DTOs
// ============================================================================

export interface CampaignMetrics {
  campaignId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  conversionCount?: number;
  conversionValue?: number;
}

export interface SubscriberEngagementMetrics {
  subscriberId: string;
  engagementScore: number; // 0-100
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  lastOpenedAt?: Date;
  lastClickedAt?: Date;
  averageOpenRate: number;
  averageClickRate: number;
}

export interface OverviewMetrics {
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribedCount: number;
  bouncedCount: number;
  totalCampaigns: number;
  sentCampaigns: number;
  averageOpenRate: number;
  averageClickRate: number;
  totalRevenue?: number;
}

export interface TrendData {
  date: string;
  opens: number;
  clicks: number;
  unsubscribes: number;
  bounces: number;
}

export interface HeatmapData {
  campaignId: string;
  clickMap: ClickMapEntry[];
}

export interface ClickMapEntry {
  url: string;
  clicks: number;
  uniqueClicks: number;
  position?: { x: number; y: number };
}

export interface TimeSlot {
  dayOfWeek: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  openRate: number;
  clickRate: number;
  recommendationScore: number; // 0-100
}

// ============================================================================
// A/B Testing DTOs
// ============================================================================

export interface CreateABTestDTO {
  campaignId: string;
  variantA: ABVariant;
  variantB: ABVariant;
  splitPercentage?: number; // Default 50
  winnerMetric: 'open_rate' | 'click_rate' | 'conversion_rate';
  testDuration?: number; // Hours before selecting winner
}

export interface ABVariant {
  subject: string;
  content: string;
  htmlContent?: string;
}

export interface ABTestResult {
  testId: string;
  status: 'running' | 'completed';
  variantAMetrics: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  };
  variantBMetrics: {
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  };
  winnerId?: 'A' | 'B';
  confidenceLevel?: number; // Statistical confidence 0-100
}

// ============================================================================
// Automation/Workflow DTOs
// ============================================================================

export interface CreateWorkflowDTO {
  name: string;
  type: WorkflowType;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
}

export type WorkflowType = 
  | 'welcome'
  | 'abandoned_cart'
  | 're_engagement'
  | 'birthday'
  | 'anniversary'
  | 'custom';

export interface WorkflowTrigger {
  type: TriggerType;
  conditions?: TriggerCondition[];
  delay?: number; // Minutes
}

export type TriggerType = 
  | 'subscriber_added'
  | 'subscriber_inactive'
  | 'order_placed'
  | 'cart_abandoned'
  | 'specific_date'
  | 'segment_entered'
  | 'email_opened'
  | 'link_clicked';

export interface TriggerCondition {
  field: string;
  operator: string;
  value: any;
}

export interface WorkflowAction {
  type: ActionType;
  delay?: number; // Minutes after previous action
  config: ActionConfig;
}

export type ActionType = 
  | 'send_email'
  | 'wait'
  | 'add_to_segment'
  | 'remove_from_segment'
  | 'update_subscriber'
  | 'webhook';

export interface ActionConfig {
  // For send_email
  templateId?: string;
  subject?: string;
  content?: string;
  
  // For wait
  waitDuration?: number; // Minutes
  
  // For segments
  segmentId?: string;
  
  // For update_subscriber
  updates?: Record<string, any>;
  
  // For webhook
  url?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, any>;
}

export interface WorkflowExecution {
  workflowId: string;
  subscriberId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ============================================================================
// Deliverability DTOs
// ============================================================================

export interface BounceEvent {
  campaignId: string;
  subscriberEmail: string;
  bounceType: BounceType;
  reason: string;
  timestamp: Date;
}

export type BounceType = 
  | 'hard' // Permanent failure
  | 'soft' // Temporary failure
  | 'complaint'; // Spam complaint

export interface SpamScore {
  score: number; // 0-10 (lower is better)
  details: SpamCheckDetail[];
  recommendation: 'good' | 'warning' | 'critical';
}

export interface SpamCheckDetail {
  check: string;
  passed: boolean;
  message: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ReputationScore {
  domain: string;
  score: number; // 0-100
  blacklisted: boolean;
  blacklists?: string[];
  recommendations: string[];
}

export interface CleanListResult {
  totalChecked: number;
  validEmails: number;
  invalidEmails: number;
  bouncedEmails: number;
  unsubscribedEmails: number;
  inactiveEmails: number;
  removedCount: number;
}

// ============================================================================
// Compliance DTOs
// ============================================================================

export interface ConsentRecord {
  subscriberId: string;
  email: string;
  optedIn: boolean;
  optInDate?: Date;
  optOutDate?: Date;
  consentSource: 'form' | 'api' | 'import' | 'manual';
  ipAddress?: string;
  userAgent?: string;
}

export interface DataExportRequest {
  subscriberId: string;
  includeEngagement: boolean;
  includeCampaigns: boolean;
  format: 'json' | 'csv';
}

export interface DataExportResult {
  subscriberId: string;
  data: SubscriberDataExport;
  exportedAt: Date;
}

export interface SubscriberDataExport {
  profile: {
    email: string;
    name?: string;
    status: string;
    createdAt: Date;
    metadata?: Record<string, any>;
  };
  engagement?: {
    totalOpens: number;
    totalClicks: number;
    engagementScore: number;
    lastActivity?: Date;
  };
  campaigns?: {
    id: string;
    subject: string;
    sentAt: Date;
    opened: boolean;
    clicked: boolean;
  }[];
  consent: ConsentRecord;
}

// ============================================================================
// Email Provider DTOs
// ============================================================================

export interface EmailMessage {
  to: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface BatchEmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  personalizations?: Record<string, any>;
}

export interface BatchEmailResult {
  success: boolean;
  batchId?: string;
  sent: number;
  failed: number;
  errors?: BatchEmailError[];
}

export interface BatchEmailError {
  email: string;
  error: string;
}

// ============================================================================
// Job Queue DTOs
// ============================================================================

export interface QueueJob<T = any> {
  id: string;
  type: JobType;
  data: T;
  priority?: number; // 0-10, higher is more important
  scheduledFor?: Date;
  maxRetries?: number;
  retryCount?: number;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export type JobType = 
  | 'send_campaign'
  | 'send_scheduled_campaign'
  | 'execute_automation'
  | 'update_engagement_scores'
  | 'clean_list'
  | 'evaluate_segment';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobProgress {
  jobId: string;
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  message?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}
