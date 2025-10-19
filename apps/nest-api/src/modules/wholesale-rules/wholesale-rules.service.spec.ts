import { Test, TestingModule } from '@nestjs/testing';
import { WholesaleRulesService } from './wholesale-rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { TestingUtils } from '../../../test/test-utils';

describe('WholesaleRulesService', () => {
  let service: WholesaleRulesService;
  let prisma: any;
  
  beforeEach(async () => {
    const module: TestingModule = await TestingUtils.createTestingModule([
      WholesaleRulesService,
    ]);
    
    service = module.get<WholesaleRulesService>(WholesaleRulesService);
    prisma = module.get<PrismaService>(PrismaService);
  });
  
  afterEach(() => {
    TestingUtils.resetMocks();
  });
  
  describe('calculateDeposit', () => {
    it('should calculate deposit correctly', async () => {
      const result = await service.calculateDeposit(1000, 30);
      
      expect(result.depositAmount).toBe(300);
      expect(result.balanceAmount).toBe(700);
      expect(result.orderValue).toBe(1000);
      expect(result.depositPercentage).toBe(30);
    });
    
    it('should validate deposit percentage range', async () => {
      await expect(service.calculateDeposit(1000, 101)).rejects.toThrow(
        'Deposit percentage must be between 0 and 100'
      );
      await expect(service.calculateDeposit(1000, -1)).rejects.toThrow(
        'Deposit percentage must be between 0 and 100'
      );
    });
    
    it('should reject negative order value', async () => {
      await expect(service.calculateDeposit(-100, 30)).rejects.toThrow(
        'Order value cannot be negative'
      );
    });
  });
  
  describe('calculateBalance', () => {
    it('should calculate balance correctly', async () => {
      const result = await service.calculateBalance(1000, 300);
      
      expect(result.balanceRemaining).toBe(700);
      expect(result.balancePercentage).toBe(70);
    });
    
    it('should reject deposit exceeding order value', async () => {
      await expect(service.calculateBalance(1000, 1500)).rejects.toThrow(
        'Deposit paid cannot exceed order value'
      );
    });
  });

  describe('calculatePaymentDueDate', () => {
    it('should calculate Net 30 due date', async () => {
      const orderDate = new Date('2024-01-01');
      const dueDate = await service.calculatePaymentDueDate(orderDate, 'Net 30');
      
      expect(dueDate.getDate()).toBe(31);
    });
    
    it('should calculate Net 60 due date', async () => {
      const orderDate = new Date('2024-01-01');
      const dueDate = await service.calculatePaymentDueDate(orderDate, 'Net 60');
      
      const expectedDate = new Date('2024-01-01');
      expectedDate.setDate(expectedDate.getDate() + 60);
      expect(dueDate.getDate()).toBe(expectedDate.getDate());
    });
    
    it('should throw for unknown payment terms', async () => {
      await expect(
        service.calculatePaymentDueDate(new Date(), 'Unknown')
      ).rejects.toThrow('Unknown payment terms: Unknown');
    });
    
    it('should handle Immediate payment terms', async () => {
      const orderDate = new Date('2024-01-01');
      const dueDate = await service.calculatePaymentDueDate(orderDate, 'Immediate');
      
      expect(dueDate).toEqual(orderDate);
    });
  });

  describe('validatePaymentTerms', () => {
    it('should validate allowed payment terms', async () => {
      const mockInvitation = {
        id: 'inv-1',
        seller_id: 'seller-1',
        wholesale_terms: {
          allowedPaymentTerms: ['Net 30', 'Net 60'],
        },
      };
      
      prisma.wholesale_invitations.findUnique.mockResolvedValue(mockInvitation);
      
      const result = await service.validatePaymentTerms('inv-1', 'Net 30');
      
      expect(result.valid).toBe(true);
      expect(result.requestedTerm).toBe('Net 30');
    });
    
    it('should reject invalid payment terms', async () => {
      const mockInvitation = {
        id: 'inv-1',
        seller_id: 'seller-1',
        wholesale_terms: {
          allowedPaymentTerms: ['Net 30'],
        },
      };
      
      prisma.wholesale_invitations.findUnique.mockResolvedValue(mockInvitation);
      
      const result = await service.validatePaymentTerms('inv-1', 'Net 60');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });
  });
});
