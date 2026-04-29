import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from '../users.service';
import { UserCloudinaryService } from '../user-cloudinary.service';
import { CloudinaryService } from '@/cloudinary/services/cloudinary.service';
import { StorageService } from '@/storage/storage.service';
import { BalanceService } from '../balance.service';
import { SettingsService } from '@/settings/settings.service';
import { ReferralsService } from '@/referrals/services/referrals.service';
import { OrdersService } from '@/orders/services/orders.service';
import { EmailService } from '@/email/services/email.services';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken('User'), useValue: {} },
        { provide: getModelToken('Product'), useValue: {} },
        { provide: getModelToken('PortfolioPost'), useValue: {} },
        { provide: getModelToken('SalesTracking'), useValue: {} },
        { provide: UserCloudinaryService, useValue: {} },
        { provide: CloudinaryService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: BalanceService, useValue: {} },
        { provide: SettingsService, useValue: {} },
        { provide: ReferralsService, useValue: {} },
        { provide: OrdersService, useValue: {} },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
