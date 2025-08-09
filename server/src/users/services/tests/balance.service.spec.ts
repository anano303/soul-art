import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BalanceService } from '../balance.service';
import { SellerBalance } from '../../schemas/seller-balance.schema';
import { BalanceTransaction } from '../../schemas/seller-balance.schema';
import { User } from '../../schemas/user.schema';
import { Product } from '../../../products/schemas/product.schema';
import { Order } from '../../../orders/schemas/order.schema';
import { BankIntegrationService } from '../bog-bank-integration.service';
import { EmailService } from '../../../email/services/email.services';

describe('BalanceService', () => {
  let service: BalanceService;
  let mockSellerBalanceModel: any;
  let mockBalanceTransactionModel: any;
  let mockUserModel: any;
  let mockEmailService: any;

  beforeEach(async () => {
    // Mock models
    mockSellerBalanceModel = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockBalanceTransactionModel = {
      findById: jest.fn(),
      save: jest.fn(),
      populate: jest.fn().mockReturnThis(),
    };

    mockUserModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    mockEmailService = {
      sendWithdrawalCompletedNotification: jest.fn(),
      sendWithdrawalRejectedNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
        {
          provide: getModelToken(SellerBalance.name),
          useValue: mockSellerBalanceModel,
        },
        {
          provide: getModelToken(BalanceTransaction.name),
          useValue: mockBalanceTransactionModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Product.name),
          useValue: {},
        },
        {
          provide: getModelToken(Order.name),
          useValue: {},
        },
        {
          provide: BankIntegrationService,
          useValue: {},
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<BalanceService>(BalanceService);
  });

  describe('approveWithdrawal', () => {
    it('should approve withdrawal and update totalWithdrawn', async () => {
      const transactionId = 'mockTransactionId';
      const adminId = 'mockAdminId';
      const amount = 100;
      const sellerId = 'mockSellerId';

      // Mock transaction
      const mockTransaction = {
        _id: transactionId,
        type: 'withdrawal_pending',
        amount: -amount,
        seller: {
          _id: sellerId,
          email: 'seller@test.com',
          ownerFirstName: 'Test',
          ownerLastName: 'Seller',
        },
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock seller balance
      const mockSellerBalance = {
        seller: sellerId,
        totalBalance: 200,
        pendingWithdrawals: amount,
        totalWithdrawn: 50, // Starting with 50
        save: jest.fn().mockResolvedValue(true),
      };

      // Setup mocks
      mockBalanceTransactionModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockTransaction),
      });

      mockSellerBalanceModel.findOne.mockResolvedValue(mockSellerBalance);

      // Mock constructor for new transaction
      const mockNewTransaction = {
        save: jest.fn().mockResolvedValue(true),
      };
      jest
        .spyOn(service as any, 'balanceTransactionModel')
        .mockImplementation(() => mockNewTransaction);

      // Execute
      await service.approveWithdrawal(transactionId, adminId);

      // Verify
      expect(mockSellerBalance.pendingWithdrawals).toBe(0);
      expect(mockSellerBalance.totalWithdrawn).toBe(150); // 50 + 100
      expect(mockSellerBalance.save).toHaveBeenCalled();
      expect(mockTransaction.type).toBe('withdrawal_completed');
      expect(mockTransaction.save).toHaveBeenCalled();
      expect(
        mockEmailService.sendWithdrawalCompletedNotification,
      ).toHaveBeenCalledWith('seller@test.com', 'Test Seller', amount);
    });

    it('should throw error if transaction not found', async () => {
      mockBalanceTransactionModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.approveWithdrawal('invalidId', 'adminId'),
      ).rejects.toThrow('ტრანზაქცია არ მოიძებნა ან არ არის დასამუშავებელი');
    });

    it('should throw error if transaction is not pending', async () => {
      const mockTransaction = {
        type: 'withdrawal_completed',
        seller: { _id: 'sellerId' },
      };

      mockBalanceTransactionModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockTransaction),
      });

      await expect(
        service.approveWithdrawal('transactionId', 'adminId'),
      ).rejects.toThrow('ტრანზაქცია არ მოიძებნა ან არ არის დასამუშავებელი');
    });
  });
});
