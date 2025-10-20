import { PrismaClient } from '../../generated/prisma/index.js';
import type { Prisma } from '../../generated/prisma/index.js';

class TransactionRollbackSignal extends Error {
  constructor() {
    super('Transaction rollback signal');
    this.name = 'TransactionRollbackSignal';
  }
}

export interface TestTransaction {
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

export class TestDatabase {
  private prisma: PrismaClient;
  private static instance: TestDatabase;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.VITEST_LOG_SQL === 'true' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }

  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async cleanup(): Promise<void> {
    const tablenames = await this.prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter(name => name !== '_prisma_migrations')
      .map(name => `"public"."${name}"`)
      .join(', ');

    if (tables) {
      try {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
      } catch (error) {
        console.error('Error truncating tables:', error);
      }
    }
  }

  async executeInTransaction<T>(
    testFn: (prisma: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    let result: T;
    
    try {
      await this.prisma.$transaction(async (tx) => {
        result = await testFn(tx);
        throw new TransactionRollbackSignal();
      });
    } catch (error: any) {
      if (!(error instanceof TransactionRollbackSignal)) {
        throw error;
      }
    }

    return result!;
  }

  async resetSequences(): Promise<void> {
    const sequences = await this.prisma.$queryRaw<
      Array<{ relname: string }>
    >`SELECT c.relname FROM pg_class c WHERE c.relkind = 'S';`;

    for (const { relname } of sequences) {
      await this.prisma.$executeRawUnsafe(`ALTER SEQUENCE "${relname}" RESTART WITH 1;`);
    }
  }

  async seed(seedFn: (prisma: PrismaClient) => Promise<void>): Promise<void> {
    await seedFn(this.prisma);
  }
}

export function createTestPrisma(): PrismaClient {
  return TestDatabase.getInstance().getPrisma();
}

export async function withTransaction<T>(
  testFn: (prisma: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const testDb = TestDatabase.getInstance();
  return testDb.executeInTransaction(testFn);
}

export async function setupTestDatabase(): Promise<TestDatabase> {
  const testDb = TestDatabase.getInstance();
  await testDb.connect();
  return testDb;
}

export async function teardownTestDatabase(): Promise<void> {
  const testDb = TestDatabase.getInstance();
  await testDb.disconnect();
}

export async function cleanDatabase(): Promise<void> {
  const testDb = TestDatabase.getInstance();
  await testDb.cleanup();
}

export interface AuditLogEntry {
  id: number;
  table_name: string;
  operation: string;
  row_id: string;
  old_data: any;
  new_data: any;
  changed_at: Date;
}

export async function getAuditLog(tableName?: string): Promise<AuditLogEntry[]> {
  const testDb = TestDatabase.getInstance();
  const prisma = testDb.getPrisma();
  
  if (tableName) {
    return await prisma.$queryRaw`
      SELECT * FROM test_audit_log
      WHERE table_name = ${tableName}
      ORDER BY changed_at DESC
    `;
  }
  
  return await prisma.$queryRaw`
    SELECT * FROM test_audit_log
    ORDER BY changed_at DESC
  `;
}

export async function clearAuditLog(): Promise<void> {
  const testDb = TestDatabase.getInstance();
  const prisma = testDb.getPrisma();
  
  await prisma.$executeRaw`DELETE FROM test_audit_log`;
}

export async function getAuditLogCount(tableName?: string): Promise<number> {
  const testDb = TestDatabase.getInstance();
  const prisma = testDb.getPrisma();
  
  if (tableName) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM test_audit_log
      WHERE table_name = ${tableName}
    `;
    return Number(result[0].count);
  }
  
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM test_audit_log
  `;
  return Number(result[0].count);
}
