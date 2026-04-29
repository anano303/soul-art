import { describe, it, expect } from 'vitest';
import { cn, getVisiblePages, formatPrice, optimizeCloudinaryUrl } from '@/lib/utils';

describe('lib/utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
    });

    it('merges tailwind classes correctly', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('handles undefined/null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });
  });

  describe('getVisiblePages', () => {
    it('returns all pages when total <= 7', () => {
      expect(getVisiblePages(1, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('returns first pages with ellipsis for early current page', () => {
      expect(getVisiblePages(2, 10)).toEqual([1, 2, 3, 4, 5, null, 10]);
    });

    it('returns last pages with ellipsis for late current page', () => {
      expect(getVisiblePages(9, 10)).toEqual([1, null, 6, 7, 8, 9, 10]);
    });

    it('returns middle pages with double ellipsis', () => {
      expect(getVisiblePages(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    });

    it('handles edge case current=4', () => {
      expect(getVisiblePages(4, 10)).toEqual([1, 2, 3, 4, 5, null, 10]);
    });

    it('handles edge case current=total-3', () => {
      expect(getVisiblePages(7, 10)).toEqual([1, null, 6, 7, 8, 9, 10]);
    });
  });

  describe('formatPrice', () => {
    it('formats with GEL currency', () => {
      const result = formatPrice(100);
      expect(result).toContain('100');
      expect(result).toContain('GEL');
    });

    it('formats decimals', () => {
      const result = formatPrice(99.5);
      expect(result).toContain('99.50');
    });
  });

  describe('optimizeCloudinaryUrl', () => {
    it('returns empty string for falsy input', () => {
      expect(optimizeCloudinaryUrl(null)).toBe('');
      expect(optimizeCloudinaryUrl(undefined)).toBe('');
      expect(optimizeCloudinaryUrl('')).toBe('');
    });

    it('returns S3 URLs unchanged', () => {
      const s3Url = 'https://soulart-s3.s3.eu-north-1.amazonaws.com/products/test.jpg';
      expect(optimizeCloudinaryUrl(s3Url)).toBe(s3Url);
    });

    it('returns non-cloudinary, non-S3 URLs unchanged', () => {
      const url = 'https://example.com/image.jpg';
      expect(optimizeCloudinaryUrl(url)).toBe(url);
    });

    it('adds transformations to cloudinary URLs', () => {
      const url = 'https://res.cloudinary.com/cloud/image/upload/v123/path.jpg';
      const result = optimizeCloudinaryUrl(url, { width: 300 });
      expect(result).toContain('f_auto');
      expect(result).toContain('q_auto');
      expect(result).toContain('w_300');
    });
  });
});
