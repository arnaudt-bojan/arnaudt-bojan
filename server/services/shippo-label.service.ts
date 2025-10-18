/**
 * Shippo Label Service
 * 
 * Architecture 3 Compliant: Server-side label management with 20% markup
 * 
 * Responsibilities:
 * - Purchase shipping labels from Shippo API
 * - Apply 20% platform markup to base Shippo cost
 * - Cancel/void labels and process refunds
 * - Manage seller credit ledger for refunds
 * - Cache seller addresses as Shippo Address objects
 */

import type { IStorage } from "../storage";
import type { Order, User } from "@shared/schema";
import type { NotificationService } from "../notifications";
import { CreditLedgerService } from "./credit-ledger.service";
import { logger } from "../logger";

export interface LabelPurchaseResult {
  labelId: string;
  labelUrl: string;
  trackingNumber: string;
  carrier: string;
  baseCostUsd: number;
  totalChargedUsd: number;
  shippoTransactionId: string;
}

export interface LabelRefundResult {
  refundId: string;
  status: "queued" | "pending" | "success" | "rejected";
  rejectionReason?: string;
}

export class ShippoLabelService {
  private readonly MARKUP_PERCENT = 20; // 20% platform markup
  private creditLedgerService: CreditLedgerService;
  
  constructor(
    private storage: IStorage,
    private notificationService: NotificationService
  ) {
    this.creditLedgerService = new CreditLedgerService(storage);
  }

  /**
   * Task 5: Ensure Sender Address
   * 
   * Creates or retrieves cached Shippo Address object for warehouse address.
   * This object is reusable and avoids creating duplicate addresses.
   * 
   * @param sellerId - Seller's user ID
   * @param warehouseAddressId - Optional warehouse address ID (defaults to seller's default warehouse)
   * @returns Shippo Address object_id
   */
  async ensureSenderAddress(sellerId: string, warehouseAddressId?: string): Promise<string> {
    const seller = await this.storage.getUser(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    // Get warehouse address: use provided ID or fetch default
    let warehouseAddress;
    if (warehouseAddressId) {
      warehouseAddress = await this.storage.getWarehouseAddress(warehouseAddressId);
      if (!warehouseAddress || warehouseAddress.sellerId !== sellerId) {
        throw new Error("Warehouse address not found or access denied");
      }
    } else {
      // Use default warehouse address
      warehouseAddress = await this.storage.getDefaultWarehouseAddress(sellerId);
      if (!warehouseAddress) {
        // Fallback: use first warehouse address if no default
        const addresses = await this.storage.getWarehouseAddressesBySellerId(sellerId);
        warehouseAddress = addresses[0];
      }
    }

    if (!warehouseAddress) {
      throw new Error("No warehouse address configured. Please add a warehouse address in Settings.");
    }

    // Return cached Shippo address if exists
    if (warehouseAddress.shippoAddressObjectId) {
      logger.info('[ShippoLabelService] Using cached Shippo address', {
        sellerId,
        warehouseAddressId: warehouseAddress.id,
        addressObjectId: warehouseAddress.shippoAddressObjectId
      });
      return warehouseAddress.shippoAddressObjectId;
    }

    // Validate address completeness
    if (!warehouseAddress.addressLine1 || !warehouseAddress.city || 
        !warehouseAddress.postalCode || !warehouseAddress.countryCode) {
      throw new Error("Warehouse address is incomplete. Please update your warehouse address in Settings.");
    }

    // Create Shippo Address object
    const { Shippo } = await import('shippo');
    const shippo = new Shippo({
      apiKeyHeader: process.env.SHIPPO_API_KEY
    });

    try {
      const addressResponse = await shippo.addresses.create({
        name: warehouseAddress.name,
        company: seller.companyName || '',
        street1: warehouseAddress.addressLine1,
        street2: warehouseAddress.addressLine2 || '',
        city: warehouseAddress.city,
        state: warehouseAddress.state || '',
        zip: warehouseAddress.postalCode,
        country: warehouseAddress.countryCode,
        phone: warehouseAddress.phone || seller.businessPhone || '',
        email: seller.email || '',
        metadata: `seller_id:${sellerId},warehouse_id:${warehouseAddress.id}`
      });

      const addressObjectId = addressResponse.objectId;

      // Cache the address object ID in warehouse address record
      await this.storage.updateWarehouseAddress(warehouseAddress.id, {
        shippoAddressObjectId: addressObjectId
      });

      logger.info('[ShippoLabelService] Created and cached Shippo address', {
        sellerId,
        warehouseAddressId: warehouseAddress.id,
        addressObjectId
      });

      if (!addressObjectId) {
        throw new Error('Failed to get address object ID from Shippo');
      }

      return addressObjectId;
    } catch (error: any) {
      logger.error('[ShippoLabelService] Failed to create Shippo address', {
        sellerId,
        warehouseAddressId: warehouseAddress.id,
        error: error.message
      });
      throw new Error(`Failed to create shipping address: ${error.message}`);
    }
  }

  /**
   * Task 6: Purchase Label
   * 
   * Purchases a shipping label from Shippo and stores it with 20% markup.
   * Architecture 3: All pricing calculations happen server-side.
   * 
   * @param orderId - Order ID to create label for
   * @param warehouseAddressId - Optional warehouse address ID to use as sender (defaults to default warehouse)
   * @returns Label purchase result with download URL and tracking
   */
  async purchaseLabel(orderId: string, warehouseAddressId?: string): Promise<LabelPurchaseResult> {
    const order = await this.storage.getOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Validate order is ready for label (has shipping address, not already shipped)
    if (!order.shippingStreet || !order.shippingCity || !order.shippingPostalCode || !order.shippingCountry) {
      throw new Error("Order does not have a complete shipping address");
    }

    if (order.shippingLabelId) {
      throw new Error("Label already purchased for this order");
    }

    if (!order.sellerId) {
      throw new Error("Order does not have a seller ID");
    }

    // Get seller's Shippo address (from specified warehouse or default)
    const senderAddressId = await this.ensureSenderAddress(order.sellerId, warehouseAddressId);

    // Get first product to determine package dimensions (simplified - assumes single package)
    // TODO: For multi-package orders, extend this to support multiple labels per order
    const orderItems = await this.storage.getOrderItems(orderId);
    if (!orderItems || orderItems.length === 0) {
      throw new Error("Order has no items");
    }

    const firstItem = orderItems[0];
    const product = await this.storage.getProduct(firstItem.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Validate product has Shippo dimensions configured
    if (!product.shippoWeight || !product.shippoLength || !product.shippoWidth || !product.shippoHeight) {
      throw new Error("Product does not have shipping dimensions configured");
    }

    const { Shippo } = await import('shippo');
    const shippo = new Shippo({
      apiKeyHeader: process.env.SHIPPO_API_KEY
    });

    try {
      // Create shipment to get rates
      const shipment = await shippo.shipments.create({
        addressFrom: senderAddressId, // Use cached address object ID
        addressTo: {
          name: order.customerName,
          street1: order.shippingStreet,
          city: order.shippingCity,
          state: order.shippingState || '',
          zip: order.shippingPostalCode,
          country: order.shippingCountry
        },
        parcels: [{
          length: product.shippoLength.toString(),
          width: product.shippoWidth.toString(),
          height: product.shippoHeight.toString(),
          distanceUnit: 'in' as const,
          weight: product.shippoWeight.toString(),
          massUnit: 'lb' as const
        }],
        async: false
      });

      const rates = shipment.rates || [];
      if (rates.length === 0) {
        throw new Error("No shipping rates available for this destination");
      }

      // Select cheapest rate (or use template if specified)
      let selectedRate = rates[0];
      if (product.shippoTemplate) {
        const templateRate = rates.find(r => r.servicelevel?.token === product.shippoTemplate);
        if (templateRate) {
          selectedRate = templateRate;
        }
      } else {
        selectedRate = rates.reduce((cheapest, rate) =>
          parseFloat(rate.amount) < parseFloat(cheapest.amount) ? rate : cheapest
          , rates[0]);
      }

      // Architecture 3: Calculate markup server-side (BEFORE purchasing)
      const baseCostUsd = parseFloat(selectedRate.amount);
      const markupMultiplier = 1 + (this.MARKUP_PERCENT / 100); // 1.20 for 20%
      const totalChargedUsd = baseCostUsd * markupMultiplier;

      // CRITICAL: Check wallet balance BEFORE calling Shippo
      const currentBalance = await this.creditLedgerService.getSellerBalance(order.sellerId);
      
      if (currentBalance < totalChargedUsd) {
        logger.warn('[ShippoLabelService] Insufficient wallet balance', {
          sellerId: order.sellerId,
          orderId,
          currentBalance,
          requiredAmount: totalChargedUsd,
          shortfall: totalChargedUsd - currentBalance
        });
        throw new Error("Insufficient wallet balance. Please add funds to purchase labels.");
      }

      // Debit wallet BEFORE calling Shippo (will be rolled back if Shippo fails)
      await this.creditLedgerService.debitLabelPurchase(
        order.sellerId,
        totalChargedUsd,
        orderId,
        'pending' // Temporary labelId - will be updated after label creation
      );

      logger.info('[ShippoLabelService] Wallet debited, proceeding with Shippo transaction', {
        sellerId: order.sellerId,
        orderId,
        amount: totalChargedUsd,
        newBalance: currentBalance - totalChargedUsd
      });

      // Purchase label from Shippo (wrap in try/catch for rollback)
      let transaction;
      try {
        transaction = await shippo.transactions.create({
          rate: selectedRate.objectId,
          labelFileType: 'PDF' as const,
          async: false
        });

        if (transaction.status !== 'SUCCESS') {
          // Shippo returns messages as an array of objects
          const errorMessage = transaction.messages 
            ? JSON.stringify(transaction.messages, null, 2)
            : 'Unknown error';
          logger.error('[ShippoLabelService] Transaction failed', {
            orderId,
            status: transaction.status,
            messages: transaction.messages
          });
          throw new Error(`Label purchase failed: ${errorMessage}`);
        }
      } catch (shippoError: any) {
        // CRITICAL: Rollback the wallet debit since Shippo failed
        logger.error('[ShippoLabelService] Shippo transaction failed, rolling back debit', {
          orderId,
          sellerId: order.sellerId,
          amount: totalChargedUsd,
          error: shippoError.message
        });

        await this.creditLedgerService.rollbackLabelPurchase(
          order.sellerId,
          totalChargedUsd,
          'rollback', // Placeholder labelId for rollback
          orderId
        );

        throw shippoError; // Re-throw to fail the purchase
      }

      // Store label in database
      const labelData = {
        orderId: order.id,
        sellerId: order.sellerId,
        shippoTransactionId: transaction.objectId,
        shippoRateId: selectedRate.objectId,
        baseCostUsd: baseCostUsd.toFixed(2),
        markupPercent: this.MARKUP_PERCENT.toString(),
        totalChargedUsd: totalChargedUsd.toFixed(2),
        labelUrl: transaction.labelUrl || null,
        trackingNumber: transaction.trackingNumber || null,
        carrier: selectedRate.provider || null,
        serviceLevelName: selectedRate.servicelevel?.name || null,
        status: 'purchased' as const,
        purchasedAt: new Date(),
        currency: order.currency || 'USD',
        exchangeRateApplied: null // TODO: Implement if supporting non-USD display
      };

      const label = await this.storage.createShippingLabel(labelData);

      // Update order with label ID
      await this.storage.updateOrder(orderId, {
        shippingLabelId: label.id,
        trackingNumber: transaction.trackingNumber || null
      });

      logger.info('[ShippoLabelService] Label purchased successfully', {
        orderId,
        labelId: label.id,
        baseCostUsd,
        totalChargedUsd,
        markup: `${this.MARKUP_PERCENT}%`,
        carrier: selectedRate.provider,
        trackingNumber: transaction.trackingNumber
      });

      if (!transaction.objectId) {
        throw new Error('Failed to get transaction object ID from Shippo');
      }

      const labelResult = {
        labelId: label.id,
        labelUrl: transaction.labelUrl || '',
        trackingNumber: transaction.trackingNumber || '',
        carrier: selectedRate.provider || '',
        baseCostUsd,
        totalChargedUsd,
        shippoTransactionId: transaction.objectId
      };

      // CRITICAL: Send all three notifications (Architecture 3)
      // Notifications are fire-and-forget - errors are logged but don't fail label purchase
      try {
        const seller = await this.storage.getUser(order.sellerId);
        
        if (seller) {
          // 1. Notify seller about label purchase (Upfirst → Seller)
          await this.notificationService.sendLabelPurchasedToSeller(
            order,
            seller,
            labelResult
          );

          // 2. Notify seller about label cost charge (Upfirst → Seller)
          await this.notificationService.sendLabelCostDeduction(
            seller,
            totalChargedUsd,
            orderId
          );

          // 3. Notify buyer about shipment (Seller → Buyer)
          await this.notificationService.sendLabelCreatedToBuyer(
            order,
            labelResult
          );

          logger.info('[ShippoLabelService] All label purchase notifications sent', {
            orderId,
            labelId: label.id,
            sellerId: seller.id
          });
        } else {
          logger.error('[ShippoLabelService] Cannot send notifications - seller not found', {
            orderId,
            sellerId: order.sellerId
          });
        }
      } catch (notificationError: any) {
        // Log but don't fail - label purchase was successful
        logger.error('[ShippoLabelService] Failed to send label purchase notifications', {
          orderId,
          labelId: label.id,
          error: notificationError.message
        });
      }

      return labelResult;
    } catch (error: any) {
      logger.error('[ShippoLabelService] Label purchase failed', {
        orderId,
        error: error.message
      });
      throw new Error(`Failed to purchase label: ${error.message}`);
    }
  }

  /**
   * Task 7: Request Void (Cancel Label)
   * 
   * Requests a refund from Shippo for an unused label.
   * Credits seller's account when refund succeeds.
   * 
   * @param labelId - Shipping label ID to cancel
   * @returns Refund request result
   */
  async requestVoid(labelId: string): Promise<LabelRefundResult> {
    const label = await this.storage.getShippingLabel(labelId);
    if (!label) {
      throw new Error("Label not found");
    }

    if (label.status === 'voided') {
      throw new Error("Label already voided");
    }

    if (label.status === 'void_requested') {
      throw new Error("Void already requested for this label");
    }

    if (!label.shippoTransactionId) {
      throw new Error("Label has no Shippo transaction ID");
    }

    const { Shippo } = await import('shippo');
    const shippo = new Shippo({
      apiKeyHeader: process.env.SHIPPO_API_KEY
    });

    try {
      // Request refund from Shippo
      const refund = await shippo.refunds.create({
        transaction: label.shippoTransactionId,
        async: false
      });

      // Store refund request in database
      const refundStatus = (refund.status || 'pending') as 'queued' | 'pending' | 'success' | 'rejected';
      const isResolved = refundStatus === 'success' || refundStatus === 'rejected';
      const isSuccess = refundStatus === 'success';
      const isRejected = refundStatus === 'rejected';

      const refundData = {
        labelId: label.id,
        shippoRefundId: refund.objectId,
        status: refundStatus,
        requestedAt: new Date(),
        resolvedAt: isResolved ? new Date() : null,
        rejectionReason: isRejected ? 'Label was already used or conditions not met' : null
      };

      const refundRecord = await this.storage.createShippingLabelRefund(refundData);

      // Update label status
      await this.storage.updateShippingLabel(labelId, {
        status: isSuccess ? 'voided' : 'void_requested',
        voidedAt: isSuccess ? new Date() : null
      });

      // If refund succeeded immediately, apply seller credit
      if (isSuccess) {
        await this.applySellerCredit(label.sellerId, label.baseCostUsd, labelId, label.orderId);
      }

      logger.info('[ShippoLabelService] Void requested', {
        labelId,
        refundId: refundRecord.id,
        status: refundStatus
      });

      return {
        refundId: refundRecord.id,
        status: refundStatus,
        rejectionReason: isRejected ? 'Label was already used or conditions not met' : undefined
      };
    } catch (error: any) {
      logger.error('[ShippoLabelService] Void request failed', {
        labelId,
        error: error.message
      });
      throw new Error(`Failed to request refund: ${error.message}`);
    }
  }

  /**
   * Task 8: Apply Seller Credit
   * 
   * Credits seller's account when a label refund succeeds.
   * Architecture 3: All credit calculations happen server-side via unified ledger.
   * 
   * @param sellerId - Seller's user ID
   * @param amountUsd - Amount to credit (in USD)
   * @param labelId - Related label ID (optional, for traceability)
   * @param orderId - Related order ID (optional, for context)
   */
  async applySellerCredit(
    sellerId: string,
    amountUsd: string,
    labelId?: string,
    orderId?: string
  ): Promise<void> {
    const seller = await this.storage.getUser(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    // Use unified credit ledger service
    const creditAmount = parseFloat(amountUsd);
    await this.creditLedgerService.creditLabelRefund(
      sellerId,
      creditAmount,
      labelId || 'unknown',
      orderId
    );

    logger.info('[ShippoLabelService] Seller credit applied via ledger', {
      sellerId,
      amount: creditAmount,
      labelId,
      orderId
    });
  }

  /**
   * Poll Shippo refund status for pending refunds
   * (Background job helper - called by background worker)
   */
  async pollPendingRefunds(): Promise<void> {
    const pendingRefunds = await this.storage.getPendingShippingLabelRefunds();
    
    if (pendingRefunds.length === 0) {
      return;
    }

    const { Shippo } = await import('shippo');
    const shippo = new Shippo({
      apiKeyHeader: process.env.SHIPPO_API_KEY
    });

    for (const refund of pendingRefunds) {
      try {
        // Fetch refund status from Shippo
        const shippoRefund = await shippo.refunds.get(refund.shippoRefundId!);
        const newStatus = shippoRefund.status as 'queued' | 'pending' | 'success' | 'rejected';

        // Update if status changed
        if (newStatus !== refund.status) {
          await this.storage.updateShippingLabelRefund(refund.id, {
            status: newStatus,
            resolvedAt: newStatus === 'success' || newStatus === 'rejected' ? new Date() : null,
            rejectionReason: newStatus === 'rejected' ? 'Label was already used or scanned' : null
          });

          // Update label status
          const label = await this.storage.getShippingLabel(refund.labelId);
          if (label) {
            if (newStatus === 'success') {
              await this.storage.updateShippingLabel(refund.labelId, {
                status: 'voided',
                voidedAt: new Date()
              });

              // Apply seller credit
              await this.applySellerCredit(label.sellerId, label.baseCostUsd, label.id, label.orderId);
            } else if (newStatus === 'rejected') {
              await this.storage.updateShippingLabel(refund.labelId, {
                status: 'purchased' // Revert to purchased since refund rejected
              });
            }
          }

          logger.info('[ShippoLabelService] Refund status updated', {
            refundId: refund.id,
            oldStatus: refund.status,
            newStatus
          });
        }
      } catch (error: any) {
        logger.error('[ShippoLabelService] Failed to poll refund status', {
          refundId: refund.id,
          error: error.message
        });
      }
    }
  }
}
