/**
 * Segmentation Service - Dynamic Subscriber Segmentation
 * Architecture 3 compliant - Pure business logic, no direct database access
 */

import type { IStorage } from "../../storage";
import type {
  CreateSegmentDTO,
  SegmentRules,
  SegmentCondition,
  SegmentEvaluationResult,
} from "@shared/newsletter-types";
import type { Subscriber } from "@shared/schema";
import { logger } from "../../logger";

export class SegmentationService {
  constructor(private storage: IStorage) {}

  /**
   * Create a new segment
   * TODO: Add segment storage methods to IStorage interface:
   * - createSegment(segment: InsertSegment): Promise<Segment>
   * - getSegment(id: string): Promise<Segment | undefined>
   * - getSegmentsByUserId(userId: string): Promise<Segment[]>
   */
  async createSegment(userId: string, data: CreateSegmentDTO): Promise<any> {
    logger.info(`[SegmentationService] Creating segment`, { name: data.name });

    // Validate rules before proceeding
    this.validateSegmentRules(data.rules);

    // Calculate subscriber count using real evaluation
    const subscriberCount = await this.previewSegment(userId, data.rules);

    // TODO: Once segment storage is implemented, persist to database
    // For now, return validated segment data with real subscriber count
    const segment = {
      id: `segment-${Date.now()}`,
      userId,
      name: data.name,
      description: data.description,
      rules: data.rules,
      subscriberCount,
      createdAt: new Date(),
    };

    logger.info(`[SegmentationService] Segment validated with ${subscriberCount} matching subscribers`, { 
      segmentId: segment.id,
      subscriberCount 
    });
    
    return segment;
  }

  /**
   * Evaluate segment rules against subscribers
   * TODO: Requires segment storage to fetch segment rules by ID
   * Use getSegmentSubscribers(userId, rules) for direct rule evaluation
   */
  async evaluateSegment(userId: string, segmentId: string): Promise<SegmentEvaluationResult> {
    logger.info(`[SegmentationService] Evaluating segment`, { segmentId });

    // TODO: Once segment storage is implemented:
    // const segment = await this.storage.getSegment(segmentId);
    // if (!segment || segment.userId !== userId) {
    //   throw new Error('Segment not found or access denied');
    // }
    // const matchingSubscribers = await this.getSegmentSubscribers(userId, segment.rules);
    
    logger.error(
      `[SegmentationService] Cannot evaluate segment - segment storage not implemented`,
      undefined,
      { segmentId }
    );

    throw new Error(
      'Segment storage not implemented. Use getSegmentSubscribers(userId, rules) to evaluate rules directly.'
    );
  }

  /**
   * Evaluate segment rules against a single subscriber
   */
  async evaluateSubscriber(subscriber: Subscriber, rules: SegmentRules): Promise<boolean> {
    const { conditions, operator } = rules;

    if (operator === "AND") {
      return conditions.every(condition => this.evaluateCondition(subscriber, condition));
    } else {
      return conditions.some(condition => this.evaluateCondition(subscriber, condition));
    }
  }

  /**
   * Evaluate a single condition against a subscriber
   */
  private evaluateCondition(subscriber: Subscriber, condition: SegmentCondition): boolean {
    const { field, operator, value } = condition;

    let fieldValue: any;

    // Map condition field to subscriber property
    switch (field) {
      case "email":
        fieldValue = subscriber.email;
        break;
      case "name":
        fieldValue = subscriber.name;
        break;
      case "status":
        fieldValue = subscriber.status;
        break;
      case "created_at":
        fieldValue = subscriber.createdAt;
        break;
      case "engagement_score":
      case "last_opened_at":
      case "last_clicked_at":
      case "total_opens":
      case "total_clicks":
        // TODO: Implement engagement tracking
        logger.warn(`[SegmentationService] Field not yet implemented`, { field });
        return false;
      default:
        logger.warn(`[SegmentationService] Unknown field`, { field });
        return false;
    }

    // Normalize values for comparison (especially dates)
    let normalizedFieldValue = fieldValue;
    let normalizedValue = value;

    // For date fields, convert both to timestamps for proper comparison
    if (field === 'created_at' || field === 'last_opened_at' || field === 'last_clicked_at') {
      // Parse field value to timestamp
      const fieldTimestamp = fieldValue instanceof Date 
        ? fieldValue.getTime() 
        : new Date(fieldValue).getTime();
      
      // Parse rule value to timestamp
      const ruleTimestamp = value instanceof Date 
        ? value.getTime() 
        : new Date(value).getTime();

      // Validate timestamps are valid numbers
      if (isNaN(fieldTimestamp) || isNaN(ruleTimestamp)) {
        logger.error(`[SegmentationService] Invalid date in segment rule`, {
          field,
          fieldValue,
          value,
          fieldTimestamp,
          ruleTimestamp
        });
        throw new Error(`Invalid date value in segment rule for field: ${field}`);
      }

      normalizedFieldValue = fieldTimestamp;
      normalizedValue = ruleTimestamp;
    }

    // Evaluate operator
    switch (operator) {
      case "equals":
        return normalizedFieldValue === normalizedValue;
      case "not_equals":
        return normalizedFieldValue !== normalizedValue;
      case "contains":
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case "not_contains":
        return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case "greater_than":
        return normalizedFieldValue > normalizedValue;
      case "less_than":
        return normalizedFieldValue < normalizedValue;
      case "greater_than_or_equal":
        return normalizedFieldValue >= normalizedValue;
      case "less_than_or_equal":
        return normalizedFieldValue <= normalizedValue;
      case "in":
        return Array.isArray(value) && value.includes(fieldValue);
      case "not_in":
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        logger.warn(`[SegmentationService] Unknown operator`, { operator });
        return false;
    }
  }

  /**
   * Get subscribers matching segment rules
   */
  async getSegmentSubscribers(userId: string, rules: SegmentRules): Promise<Subscriber[]> {
    logger.info(`[SegmentationService] Getting segment subscribers`);

    const allSubscribers = await this.storage.getSubscribersByUserId(userId);
    const matchingSubscribers: Subscriber[] = [];

    for (const subscriber of allSubscribers) {
      const matches = await this.evaluateSubscriber(subscriber, rules);
      if (matches) {
        matchingSubscribers.push(subscriber);
      }
    }

    logger.info(`[SegmentationService] Found ${matchingSubscribers.length} matching subscribers`);
    return matchingSubscribers;
  }

  /**
   * Validate segment rules
   */
  private validateSegmentRules(rules: SegmentRules): void {
    if (!rules.conditions || rules.conditions.length === 0) {
      throw new Error("Segment must have at least one condition");
    }

    if (!["AND", "OR"].includes(rules.operator)) {
      throw new Error("Segment operator must be AND or OR");
    }

    for (const condition of rules.conditions) {
      if (!condition.field || !condition.operator) {
        throw new Error("Each condition must have field and operator");
      }
    }
  }

  /**
   * Calculate segment preview (estimate size without full evaluation)
   */
  async previewSegment(userId: string, rules: SegmentRules): Promise<number> {
    logger.info(`[SegmentationService] Previewing segment`);

    // For now, do full evaluation
    // TODO: Optimize with approximate counting for large datasets
    const subscribers = await this.getSegmentSubscribers(userId, rules);
    return subscribers.length;
  }

  /**
   * Get segment membership for a subscriber
   * TODO: Implement segment membership caching
   */
  async getSubscriberSegments(subscriberId: string): Promise<string[]> {
    logger.info(`[SegmentationService] Getting segments for subscriber`, { subscriberId });

    // TODO: Implement segment membership caching
    // For now, return empty array
    return [];
  }

  /**
   * Clear segment membership cache
   */
  async clearSegmentCache(segmentId: string): Promise<void> {
    logger.info(`[SegmentationService] Clearing cache for segment`, { segmentId });

    // TODO: Implement segment cache clearing
  }

  /**
   * Refresh segment membership cache
   * TODO: Requires segment storage to fetch segment rules
   */
  async refreshSegmentCache(userId: string, segmentId: string): Promise<void> {
    logger.info(`[SegmentationService] Refreshing cache for segment`, { segmentId });

    // TODO: Once segment storage is implemented:
    // const segment = await this.storage.getSegment(segmentId);
    // if (!segment) throw new Error('Segment not found');
    // const subscribers = await this.getSegmentSubscribers(userId, segment.rules);
    // await this.storage.setSegmentCache(segmentId, subscribers.map(s => s.id));
    
    logger.warn(
      `[SegmentationService] Cannot refresh cache - segment storage not implemented`,
      { segmentId }
    );
  }
}
