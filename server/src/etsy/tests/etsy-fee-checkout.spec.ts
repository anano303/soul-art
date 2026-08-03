import { EtsyListingService } from '../etsy-listing.service';

/**
 * Covers how an open BOG checkout for the Etsy listing fee is resolved.
 *
 * The behaviour that matters: a seller who lost the BOG tab or had their card
 * declined must not be held behind a countdown. We ask BOG for the real order
 * status and either resume the same checkout or release the lock immediately.
 */
describe('EtsyListingService — fee checkout reconciliation', () => {
  const SELLER = 'seller-1';
  const PRODUCT = 'product-1';

  // Builds the service with only the two collaborators this path touches.
  function buildService(opts: {
    payment: Record<string, any> | null;
    bogStatus?: { order_status?: { key: string }; reject_reason?: any };
    bogThrows?: boolean;
  }) {
    const saved: Record<string, any>[] = [];
    const doc = opts.payment
      ? {
          ...opts.payment,
          save: jest.fn(function (this: any) {
            saved.push({ status: this.status, error: this.error });
            return Promise.resolve(this);
          }),
        }
      : null;

    const feePaymentModel = {
      findOne: jest.fn(() => ({
        sort: () => ({ exec: () => Promise.resolve(doc) }),
      })),
    };
    const paymentsService = {
      getPaymentStatus: jest.fn(() =>
        opts.bogThrows
          ? Promise.reject(new Error('BOG unreachable'))
          : Promise.resolve(opts.bogStatus),
      ),
    };

    const service = new (EtsyListingService as any)(
      null, // etsyService
      null, // exchangeRateService
      null, // etsyListingModel
      null, // productModel
      null, // userModel
      null, // sellerBalanceModel
      null, // balanceTransactionModel
      feePaymentModel,
      paymentsService,
      null, // productsService
    ) as EtsyListingService;

    return { service, doc, saved, paymentsService };
  }

  const pendingPayment = (overrides: Record<string, any> = {}) => ({
    _id: 'pay-1',
    externalOrderId: 'etsy_abc',
    bogOrderId: 'bog-123',
    seller: SELLER,
    product: PRODUCT,
    status: 'pending',
    redirectUrl: 'https://payment.bog.ge/checkout/abc',
    // still well inside the checkout window
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
  });

  const requester = { _id: SELLER, role: 'seller' };

  it('lets the seller resume the same BOG checkout while the order is live', async () => {
    const { service } = buildService({
      payment: pendingPayment(),
      bogStatus: { order_status: { key: 'created' } },
    });

    const result = await service.syncCardFeePayment(PRODUCT, requester);

    expect(result.state).toBe('resumable');
    expect(result.redirectUrl).toBe('https://payment.bog.ge/checkout/abc');
    expect(result.secondsLeft).toBeGreaterThan(0);
  });

  it('treats an in-flight (processing) order as resumable too', async () => {
    const { service } = buildService({
      payment: pendingPayment(),
      bogStatus: { order_status: { key: 'processing' } },
    });

    expect((await service.syncCardFeePayment(PRODUCT, requester)).state).toBe(
      'resumable',
    );
  });

  it('releases the lock at once when BOG reports the order rejected', async () => {
    const { service, saved } = buildService({
      payment: pendingPayment(),
      bogStatus: {
        order_status: { key: 'rejected' },
        reject_reason: 'insufficient_funds',
      },
    });

    const result = await service.syncCardFeePayment(PRODUCT, requester);

    // No waiting out the countdown — the seller can pay again right away
    expect(result.state).toBe('expired');
    expect(saved[0].status).toBe('expired');
    expect(saved[0].error).toContain('insufficient_funds');
  });

  it('expires a checkout whose BOG ttl has already lapsed', async () => {
    const { service, saved } = buildService({
      payment: pendingPayment({
        expiresAt: new Date(Date.now() - 1000),
      }),
      bogStatus: { order_status: { key: 'created' } },
    });

    const result = await service.syncCardFeePayment(PRODUCT, requester);

    expect(result.state).toBe('expired');
    expect(saved[0].status).toBe('expired');
  });

  it('keeps a live checkout resumable when BOG cannot be reached', async () => {
    const { service, saved } = buildService({
      payment: pendingPayment(),
      bogThrows: true,
    });

    const result = await service.syncCardFeePayment(PRODUCT, requester);

    // Unverifiable — must not guess that the money was taken, and must not
    // destroy a checkout the seller may still be paying on
    expect(result.state).toBe('unknown');
    expect(result.redirectUrl).toBe('https://payment.bog.ge/checkout/abc');
    expect(saved).toHaveLength(0);
  });

  it('retires an unreachable checkout once its window has passed', async () => {
    const { service, saved } = buildService({
      payment: pendingPayment({ expiresAt: new Date(Date.now() - 1000) }),
      bogThrows: true,
    });

    expect((await service.syncCardFeePayment(PRODUCT, requester)).state).toBe(
      'expired',
    );
    expect(saved[0].status).toBe('expired');
  });

  it('falls back to the time window for legacy records with no BOG order id', async () => {
    const { service, paymentsService } = buildService({
      payment: pendingPayment({ bogOrderId: undefined }),
    });

    const result = await service.syncCardFeePayment(PRODUCT, requester);

    expect(result.state).toBe('resumable');
    expect(paymentsService.getPaymentStatus).not.toHaveBeenCalled();
  });

  it('reports nothing to resolve when no checkout is open', async () => {
    const { service } = buildService({ payment: null });

    expect((await service.syncCardFeePayment(PRODUCT, requester)).state).toBe(
      'none',
    );
  });

  it("refuses to expose another seller's checkout", async () => {
    const { service } = buildService({
      payment: pendingPayment({ seller: 'someone-else' }),
      bogStatus: { order_status: { key: 'created' } },
    });

    await expect(
      service.syncCardFeePayment(PRODUCT, requester),
    ).rejects.toThrow(/only check your own payments/i);
  });

  it('lets an admin resolve a checkout they did not open', async () => {
    const { service } = buildService({
      payment: pendingPayment({ seller: 'someone-else' }),
      bogStatus: { order_status: { key: 'created' } },
    });

    expect(
      (
        await service.syncCardFeePayment(PRODUCT, {
          _id: 'admin-1',
          role: 'admin',
        })
      ).state,
    ).toBe('resumable');
  });
});
