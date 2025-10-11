import { logger } from '../logger';
import { InventoryService } from '../services/inventory.service';
import { IStorage } from '../storage';

export class ReservationCleanupJob {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes
  private inventoryService: InventoryService;

  constructor(storage: IStorage) {
    this.inventoryService = new InventoryService(storage);
  }

  start() {
    logger.info('[ReservationCleanup] Starting background cleanup job', {
      intervalMinutes: this.INTERVAL_MS / 60000,
    });

    // Run immediately on start
    this.runCleanup();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[ReservationCleanup] Stopped background cleanup job');
    }
  }

  private async runCleanup() {
    try {
      logger.debug('[ReservationCleanup] Starting cleanup cycle');
      
      const count = await this.inventoryService.releaseExpiredReservations();
      
      if (count > 0) {
        logger.info('[ReservationCleanup] Cleaned up expired reservations', {
          count,
        });
      } else {
        logger.debug('[ReservationCleanup] No expired reservations found');
      }
    } catch (error) {
      logger.error('[ReservationCleanup] Error during cleanup cycle', error);
      // Don't throw - let the job continue running
    }
  }
}
