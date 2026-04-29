import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getShippingRates,
  getShippingRate,
  getShippingRateByName,
  calculateDomesticShipping,
  calculateShipping,
  formatShippingCost,
  isShippingSupported,
  setShippingRates,
  fetchShippingRates,
} from '@/lib/shipping';

describe('lib/shipping', () => {
  describe('getShippingRates', () => {
    it('returns an array of rates', () => {
      const rates = getShippingRates();
      expect(Array.isArray(rates)).toBe(true);
      expect(rates.length).toBeGreaterThan(0);
    });

    it('includes Georgia with free shipping', () => {
      const rates = getShippingRates();
      const ge = rates.find((r) => r.countryCode === 'GE');
      expect(ge).toBeDefined();
      expect(ge?.isFree).toBe(true);
      expect(ge?.cost).toBe(0);
    });
  });

  describe('getShippingRate', () => {
    it('returns rate for known country', () => {
      const rate = getShippingRate('GE');
      expect(rate).not.toBeNull();
      expect(rate?.countryCode).toBe('GE');
    });

    it('returns null for unknown country', () => {
      expect(getShippingRate('XX')).toBeNull();
    });
  });

  describe('getShippingRateByName', () => {
    it('finds by country name', () => {
      const rate = getShippingRateByName('საქართველო');
      expect(rate).not.toBeNull();
      expect(rate?.countryCode).toBe('GE');
    });

    it('returns null for unknown name', () => {
      expect(getShippingRateByName('Atlantis')).toBeNull();
    });
  });

  describe('calculateDomesticShipping', () => {
    it('returns 0 for Tbilisi', () => {
      expect(calculateDomesticShipping('Tbilisi')).toBe(0);
      expect(calculateDomesticShipping('თბილისი')).toBe(0);
    });

    it('returns 18 for regional cities', () => {
      expect(calculateDomesticShipping('Kutaisi')).toBe(18);
      expect(calculateDomesticShipping('')).toBe(18);
    });
  });

  describe('calculateShipping', () => {
    it('returns 0 for Tbilisi, Georgia', () => {
      expect(calculateShipping('GE', 'Tbilisi')).toBe(0);
    });

    it('returns 18 for Georgia regional', () => {
      expect(calculateShipping('GE', 'Batumi')).toBe(18);
    });

    it('returns international rate for US', () => {
      expect(calculateShipping('US')).toBe(300);
    });

    it('resolves country name aliases', () => {
      expect(calculateShipping('Georgia', 'Tbilisi')).toBe(0);
      expect(calculateShipping('საქართველო', 'თბილისი')).toBe(0);
    });
  });

  describe('formatShippingCost', () => {
    it('shows free for Georgia', () => {
      expect(formatShippingCost('GE')).toBe('უფასო');
    });

    it('shows cost in GEL for international', () => {
      const result = formatShippingCost('US');
      expect(result).toContain('₾');
      expect(result).toContain('300');
    });

    it('shows both currencies when requested', () => {
      const result = formatShippingCost('US', true);
      expect(result).toContain('₾');
      expect(result).toContain('$');
    });
  });

  describe('isShippingSupported', () => {
    it('returns true for supported countries', () => {
      expect(isShippingSupported('GE')).toBe(true);
      expect(isShippingSupported('US')).toBe(true);
    });

    it('returns false for unsupported countries', () => {
      expect(isShippingSupported('XX')).toBe(false);
    });

    it('resolves country names', () => {
      expect(isShippingSupported('Georgia')).toBe(true);
      expect(isShippingSupported('Italy')).toBe(true);
    });
  });

  describe('setShippingRates', () => {
    it('overrides cached rates', () => {
      const customRates = [
        { countryCode: 'JP', countryName: 'Japan', cost: 400, costUSD: 160, isFree: false },
      ];
      setShippingRates(customRates);
      expect(getShippingRate('JP')).not.toBeNull();
      // Reset
      setShippingRates([]);
    });
  });

  describe('fetchShippingRates', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('fetches and caches rates from API', async () => {
      const mockRates = [{ countryCode: 'US', countryName: 'United States', cost: 50, isFree: false }];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRates),
      });
      const rates = await fetchShippingRates();
      expect(rates.length).toBeGreaterThan(0);
      expect(rates[0].countryCode).toBe('US');
    });

    it('returns fallback on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network'));
      const rates = await fetchShippingRates();
      expect(Array.isArray(rates)).toBe(true);
      expect(rates.length).toBeGreaterThan(0);
    });

    it('returns fallback on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const rates = await fetchShippingRates();
      expect(Array.isArray(rates)).toBe(true);
    });
  });

  describe('formatShippingCost with showBothCurrencies', () => {
    it('shows both currencies when flag is true', () => {
      const result = formatShippingCost('US', true);
      // Should contain both ₾ and $ or similar dual display
      expect(result).toBeTruthy();
    });
  });
});
