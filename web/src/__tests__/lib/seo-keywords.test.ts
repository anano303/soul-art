import { describe, it, expect } from 'vitest';
import {
  BASE_KEYWORDS,
  ADDITIONAL_KEYWORDS,
  GLOBAL_KEYWORDS,
  extractKeywordsFromText,
  mergeKeywordSets,
  sanitizeKeyword,
} from '@/lib/seo-keywords';

describe('lib/seo-keywords', () => {
  describe('constants', () => {
    it('BASE_KEYWORDS is non-empty array', () => {
      expect(Array.isArray(BASE_KEYWORDS)).toBe(true);
      expect(BASE_KEYWORDS.length).toBeGreaterThan(10);
    });

    it('ADDITIONAL_KEYWORDS is non-empty array', () => {
      expect(Array.isArray(ADDITIONAL_KEYWORDS)).toBe(true);
      expect(ADDITIONAL_KEYWORDS.length).toBeGreaterThan(10);
    });

    it('GLOBAL_KEYWORDS combines BASE + ADDITIONAL keywords', () => {
      expect(GLOBAL_KEYWORDS.length).toBeGreaterThan(0);
      expect(GLOBAL_KEYWORDS.length).toBeGreaterThanOrEqual(BASE_KEYWORDS.length);
    });
  });

  describe('extractKeywordsFromText', () => {
    it('returns empty array for null/undefined', () => {
      expect(extractKeywordsFromText(null)).toEqual([]);
      expect(extractKeywordsFromText(undefined)).toEqual([]);
      expect(extractKeywordsFromText('')).toEqual([]);
    });

    it('extracts words from text', () => {
      const result = extractKeywordsFromText('ხელნაკეთი ნახატები ქართული');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('ხელნაკეთი');
    });

    it('handles comma-separated text', () => {
      const result = extractKeywordsFromText('art, painting, handmade');
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('mergeKeywordSets', () => {
    it('merges multiple arrays without duplicates', () => {
      const result = mergeKeywordSets(['art', 'painting'], ['art', 'craft']);
      expect(result).toContain('art');
      expect(result).toContain('painting');
      expect(result).toContain('craft');
      // No duplicate 'art'
      expect(result.filter(k => k.toLowerCase() === 'art').length).toBe(1);
    });

    it('handles undefined/null arrays', () => {
      const result = mergeKeywordSets(['one'], undefined as any, null as any, ['two']);
      expect(result).toContain('one');
      expect(result).toContain('two');
    });

    it('returns empty array for no valid inputs', () => {
      const result = mergeKeywordSets(undefined as any, null as any);
      expect(result).toEqual([]);
    });
  });

  describe('sanitizeKeyword', () => {
    it('trims and normalizes whitespace', () => {
      const result = sanitizeKeyword('  hello  ');
      expect(result).toBe('hello');
    });

    it('returns null for single non-digit char', () => {
      const result = sanitizeKeyword('a');
      expect(result).toBeNull();
    });

    it('keeps two-letter words', () => {
      const result = sanitizeKeyword('ab');
      expect(result).toBe('ab');
    });
  });
});
