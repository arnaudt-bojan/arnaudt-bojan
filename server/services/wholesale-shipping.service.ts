/**
 * WholesaleShippingService - Wholesale B2B shipping management
 * 
 * Follows Architecture 3: Service Layer Pattern with dependency injection
 * - Manages freight collect and buyer pickup shipping
 * - Handles prepaid labels and warehouse locations
 */

import type { IStorage } from '../storage';
import type { 
  WholesaleShippingDetail, 
  InsertWholesaleShippingDetail,
  WarehouseLocation 
} from '@shared/schema';
import type { NotificationService } from '../notifications';
import { logger } from '../logger';

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateShippingResult {
  success: boolean;
  shippingDetail?: WholesaleShippingDetail;
  error?: string;
  statusCode?: number;
}

export interface GetShippingResult {
  success: boolean;
  shippingDetail?: WholesaleShippingDetail;
  error?: string;
  statusCode?: number;
}

export interface UpdateShippingResult {
  success: boolean;
  shippingDetail?: WholesaleShippingDetail;
  error?: string;
  statusCode?: number;
}

export interface ValidateFreightResult {
  success: boolean;
  valid: boolean;
  error?: string;
}

export interface ShippingData {
  shippingType: 'freight_collect' | 'buyer_pickup';
  carrierName?: string;
  freightAccountNumber?: string;  // Changed from carrierAccountNumber to match frontend
  pickupInstructions?: string;     // Added for buyer pickup instructions
  prepaidLabelUrls?: string[];
  serviceLevel?: string;
  pickupAddress?: any;
  pickupContactName?: string;
  pickupContactPhone?: string;
  pickupContactEmail?: string;
  invoicingAddress?: any;
  invoicingName?: string;
  invoicingEmail?: string;
  invoicingPhone?: string;
  rememberInvoicing?: number;
}

// ============================================================================
// WholesaleShippingService
// ============================================================================

export class WholesaleShippingService {
  constructor(
    private storage: IStorage,
    private notificationService?: NotificationService
  ) {}

  /**
   * Create shipping details for order
   * Note: This uses wholesaleShippingDetails table (legacy)
   * For new implementations, use shipping metadata instead
   */
  async createShippingDetails(
    orderId: string,
    shippingData: ShippingData
  ): Promise<CreateShippingResult> {
    try {
      const order = await this.storage.getWholesaleOrder(orderId);

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          statusCode: 404,
        };
      }

      const shippingInsert: InsertWholesaleShippingDetail = {
        wholesaleOrderId: orderId,
        shippingType: shippingData.shippingType,
        carrierName: shippingData.carrierName,
        carrierAccountNumber: shippingData.freightAccountNumber,  // Map from freightAccountNumber
        prepaidLabelUrls: shippingData.prepaidLabelUrls,
        serviceLevel: shippingData.serviceLevel,
        pickupAddress: shippingData.pickupAddress,
        pickupContactName: shippingData.pickupContactName,
        pickupContactPhone: shippingData.pickupContactPhone,
        pickupContactEmail: shippingData.pickupContactEmail,
        invoicingAddress: shippingData.invoicingAddress,
        invoicingName: shippingData.invoicingName,
        invoicingEmail: shippingData.invoicingEmail,
        invoicingPhone: shippingData.invoicingPhone,
        rememberInvoicing: shippingData.rememberInvoicing,
      };

      const shippingDetail = await this.storage.createWholesaleShippingDetails(shippingInsert);

      if (!shippingDetail) {
        return {
          success: false,
          error: 'Failed to create shipping details',
          statusCode: 500,
        };
      }

      logger.info('[WholesaleShippingService] Shipping details created', {
        orderId,
        shippingType: shippingData.shippingType,
      });

      return { success: true, shippingDetail };
    } catch (error: any) {
      logger.error('[WholesaleShippingService] Failed to create shipping details', error);
      return {
        success: false,
        error: error.message || 'Failed to create shipping details',
        statusCode: 500,
      };
    }
  }

  /**
   * Validate freight collect carrier account
   */
  validateFreightCollect(freightAccountNumber?: string): ValidateFreightResult {
    try {
      if (!freightAccountNumber || freightAccountNumber.trim().length === 0) {
        return {
          success: true,
          valid: false,
          error: 'Freight account number is required for freight collect',
        };
      }

      // Basic validation - could be enhanced with carrier-specific rules
      if (freightAccountNumber.length < 5) {
        return {
          success: true,
          valid: false,
          error: 'Invalid freight account number format',
        };
      }

      return { success: true, valid: true };
    } catch (error: any) {
      logger.error('[WholesaleShippingService] Failed to validate freight collect', error);
      return {
        success: false,
        valid: false,
        error: error.message || 'Validation failed',
      };
    }
  }

  /**
   * Upload prepaid shipping labels
   */
  async uploadPrepaidLabels(
    orderId: string,
    labelUrls: string[]
  ): Promise<UpdateShippingResult> {
    try {
      const shippingDetail = await this.storage.getWholesaleShippingDetails(orderId);

      if (!shippingDetail) {
        return {
          success: false,
          error: 'Shipping details not found',
          statusCode: 404,
        };
      }

      const updatedShipping = await this.storage.updateWholesaleShippingDetails(
        orderId,
        { prepaidLabelUrls: labelUrls }
      );

      if (!updatedShipping) {
        return {
          success: false,
          error: 'Failed to upload labels',
          statusCode: 500,
        };
      }

      logger.info('[WholesaleShippingService] Prepaid labels uploaded', {
        orderId,
        labelCount: labelUrls.length,
      });

      return { success: true, shippingDetail: updatedShipping };
    } catch (error: any) {
      logger.error('[WholesaleShippingService] Failed to upload prepaid labels', error);
      return {
        success: false,
        error: error.message || 'Failed to upload labels',
        statusCode: 500,
      };
    }
  }

  /**
   * Set buyer pickup with warehouse location
   */
  async setBuyerPickup(
    orderId: string,
    warehouseLocationId: string
  ): Promise<UpdateShippingResult> {
    try {
      const warehouse = await this.storage.getWarehouseLocation(warehouseLocationId);

      if (!warehouse) {
        return {
          success: false,
          error: 'Warehouse location not found',
          statusCode: 404,
        };
      }

      const shippingDetail = await this.storage.getWholesaleShippingDetails(orderId);

      if (!shippingDetail) {
        return {
          success: false,
          error: 'Shipping details not found',
          statusCode: 404,
        };
      }

      const updatedShipping = await this.storage.updateWholesaleShippingDetails(
        orderId,
        {
          shippingType: 'buyer_pickup',
          pickupAddress: warehouse.address,
          pickupContactName: warehouse.contactName,
          pickupContactPhone: warehouse.contactPhone,
          pickupContactEmail: warehouse.contactEmail,
        }
      );

      if (!updatedShipping) {
        return {
          success: false,
          error: 'Failed to set buyer pickup',
          statusCode: 500,
        };
      }

      logger.info('[WholesaleShippingService] Buyer pickup set', {
        orderId,
        warehouseId: warehouseLocationId,
      });

      return { success: true, shippingDetail: updatedShipping };
    } catch (error: any) {
      logger.error('[WholesaleShippingService] Failed to set buyer pickup', error);
      return {
        success: false,
        error: error.message || 'Failed to set buyer pickup',
        statusCode: 500,
      };
    }
  }

  /**
   * Get shipping details for order
   */
  async getShippingDetails(orderId: string): Promise<GetShippingResult> {
    try {
      const shippingDetail = await this.storage.getWholesaleShippingDetails(orderId);

      if (!shippingDetail) {
        return {
          success: false,
          error: 'Shipping details not found',
          statusCode: 404,
        };
      }

      return { success: true, shippingDetail };
    } catch (error: any) {
      logger.error('[WholesaleShippingService] Failed to get shipping details', error);
      return {
        success: false,
        error: error.message || 'Failed to get shipping details',
        statusCode: 500,
      };
    }
  }

  /**
   * Update shipping details
   */
  async updateShippingDetails(
    orderId: string,
    updates: Partial<InsertWholesaleShippingDetail>
  ): Promise<UpdateShippingResult> {
    try {
      const shippingDetail = await this.storage.getWholesaleShippingDetails(orderId);

      if (!shippingDetail) {
        return {
          success: false,
          error: 'Shipping details not found',
          statusCode: 404,
        };
      }

      const updatedShipping = await this.storage.updateWholesaleShippingDetails(
        orderId,
        updates
      );

      if (!updatedShipping) {
        return {
          success: false,
          error: 'Failed to update shipping details',
          statusCode: 500,
        };
      }

      logger.info('[WholesaleShippingService] Shipping details updated', {
        orderId,
      });

      return { success: true, shippingDetail: updatedShipping };
    } catch (error: any) {
      logger.error('[WholesaleShippingService] Failed to update shipping details', error);
      return {
        success: false,
        error: error.message || 'Failed to update shipping details',
        statusCode: 500,
      };
    }
  }

  /**
   * Update tracking information for freight collect orders
   * Updates shipping metadata with carrier and tracking number
   */
  async updateTrackingInfo(
    orderId: string,
    carrier: string,
    trackingNumber: string
  ): Promise<{ success: boolean; error?: string; statusCode?: number }> {
    try {
      // Check if order exists
      const order = await this.storage.getWholesaleOrder(orderId);
      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          statusCode: 404,
        };
      }

      // Get or create shipping metadata
      let shippingMetadata = await this.storage.getShippingMetadataByOrderId(orderId);
      
      if (shippingMetadata) {
        // Update existing metadata
        const updated = await this.storage.updateShippingMetadata(shippingMetadata.id, {
          carrier,
          trackingNumber,
        });

        if (!updated) {
          return {
            success: false,
            error: 'Failed to update tracking information',
            statusCode: 500,
          };
        }
      } else {
        // Create new metadata if doesn't exist
        shippingMetadata = await this.storage.createShippingMetadata({
          orderId,
          shippingType: 'freight_collect',
          carrier,
          trackingNumber,
        });

        if (!shippingMetadata) {
          return {
            success: false,
            error: 'Failed to create tracking information',
            statusCode: 500,
          };
        }
      }

      logger.info('[WholesaleShippingService] Tracking info updated', {
        orderId,
        carrier,
        trackingNumber,
      });

      // Send shipped email with tracking info
      if (this.notificationService) {
        try {
          const seller = await this.storage.getUser(order.sellerId);
          
          if (seller) {
            const trackingInfo = {
              carrier,
              trackingNumber,
              trackingUrl: `https://tracking.example.com/${trackingNumber}`
            };
            
            await this.notificationService.sendWholesaleOrderShipped(
              order, 
              seller, 
              trackingInfo
            );
          }
        } catch (emailError: any) {
          logger.error('[WholesaleShippingService] Failed to send shipping email', emailError);
        }
      }

      return { success: true };
    } catch (error: any) {
      logger.error('[WholesaleShippingService] Failed to update tracking info', error);
      return {
        success: false,
        error: error.message || 'Failed to update tracking info',
        statusCode: 500,
      };
    }
  }
}
