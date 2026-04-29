import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from './products.service';
import { UsersService } from '@/users/services/users.service';
import { ExchangeRateService } from '@/exchange-rate/exchange-rate.service';
import { SettingsService } from '@/settings/settings.service';
import { FacebookPostingService } from '@/products/services/facebook-posting.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken('Product'), useValue: {} },
        { provide: getModelToken('Order'), useValue: {} },
        { provide: getModelToken('User'), useValue: {} },
        { provide: getModelToken('PortfolioPost'), useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: ExchangeRateService, useValue: {} },
        { provide: SettingsService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: FacebookPostingService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
