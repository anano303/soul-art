import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock before import
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any) => ({
      headers: new Map(),
      json: () => data,
    }),
  },
}));

import { memoryCache } from '@/lib/cache';

describe('lib/cache - MemoryCache', () => {
  beforeEach(() => {
    memoryCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('set and get', () => {
    it('stores and retrieves data', () => {
      memoryCache.set('key1', { name: 'test' }, 60);
      const result = memoryCache.get<{ name: string }>('key1');
      expect(result).toEqual({ name: 'test' });
    });

    it('returns null for non-existent key', () => {
      expect(memoryCache.get('nonexistent')).toBeNull();
    });

    it('returns null for expired items', () => {
      memoryCache.set('short', 'data', 5);
      
      vi.advanceTimersByTime(6000);
      
      expect(memoryCache.get('short')).toBeNull();
    });

    it('returns data before expiry', () => {
      memoryCache.set('short', 'data', 10);
      
      vi.advanceTimersByTime(5000);
      
      expect(memoryCache.get('short')).toBe('data');
    });
  });

  describe('clear', () => {
    it('removes all items', () => {
      memoryCache.set('a', 1, 60);
      memoryCache.set('b', 2, 60);
      memoryCache.clear();
      expect(memoryCache.get('a')).toBeNull();
      expect(memoryCache.get('b')).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('removes expired items but keeps valid ones', () => {
      memoryCache.set('expires', 'old', 5);
      memoryCache.set('stays', 'new', 60);
      
      vi.advanceTimersByTime(6000);
      
      memoryCache.cleanup();
      
      expect(memoryCache.get('expires')).toBeNull();
      expect(memoryCache.get('stays')).toBe('new');
    });
  });
});
