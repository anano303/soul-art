import { describe, it, expect } from 'vitest';
import { organizationSchema, websiteSchema, storeSchema } from '@/lib/structured-data';

describe('lib/structured-data', () => {
  describe('organizationSchema', () => {
    it('has correct type', () => {
      expect(organizationSchema['@type']).toBe('Organization');
    });
    it('has context', () => {
      expect(organizationSchema['@context']).toBe('https://schema.org');
    });
    it('has name SoulArt', () => {
      expect(organizationSchema.name).toBe('SoulArt');
    });
    it('has url', () => {
      expect(organizationSchema.url).toBe('https://SoulArt.ge');
    });
    it('has address in Georgia', () => {
      expect(organizationSchema.address.addressCountry).toBe('GE');
    });
    it('has contactPoint', () => {
      expect(organizationSchema.contactPoint.contactType).toBe('customer service');
    });
    it('has sameAs social links', () => {
      expect(organizationSchema.sameAs.length).toBeGreaterThan(0);
    });
  });

  describe('websiteSchema', () => {
    it('has correct type', () => {
      expect(websiteSchema['@type']).toBe('WebSite');
    });
    it('has search action', () => {
      expect(websiteSchema.potentialAction['@type']).toBe('SearchAction');
    });
    it('supports ka and en languages', () => {
      expect(websiteSchema.inLanguage).toContain('ka');
      expect(websiteSchema.inLanguage).toContain('en');
    });
  });

  describe('storeSchema', () => {
    it('has correct type', () => {
      expect(storeSchema['@type']).toBe('Store');
    });
    it('has geo coordinates', () => {
      expect(storeSchema.geo.latitude).toBe('41.7151');
      expect(storeSchema.geo.longitude).toBe('44.8271');
    });
    it('has opening hours', () => {
      expect(storeSchema.openingHours).toBeDefined();
    });
    it('has price range', () => {
      expect(storeSchema.priceRange).toBe('$$');
    });
  });
});
