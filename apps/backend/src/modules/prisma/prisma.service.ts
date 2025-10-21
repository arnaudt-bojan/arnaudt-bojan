import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../../../../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Run a database transaction with automatic rollback on error
   * 
   * Usage:
   * ```typescript
   * return this.prisma.runTransaction(async (tx) => {
   *   const order = await tx.order.create({ data: ... });
   *   await tx.orderItem.createMany({ data: items });
   *   return order;
   * });
   * ```
   * 
   * @param fn Transaction callback that receives a Prisma transaction client
   * @returns Result of the transaction
   * @throws Error if transaction fails (automatically rolls back)
   */
  async runTransaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.$transaction(fn);
      const duration = Date.now() - startTime;
      
      this.logger.debug(`Transaction completed successfully in ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Transaction failed after ${duration}ms:`, error);
      
      throw error;
    }
  }
}
