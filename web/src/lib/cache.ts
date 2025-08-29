import { NextResponse } from 'next/server';

// Cache configuration for different types of content
const CACHE_CONFIG = {
  // Static assets (images, fonts, etc.)
  static: {
    maxAge: 31536000, // 1 year
    staleWhileRevalidate: 86400, // 1 day
  },
  // API responses that change frequently
  dynamic: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes
  },
  // API responses that rarely change (categories, etc.)
  semiStatic: {
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 7200, // 2 hours
  },
  // User-specific content
  private: {
    maxAge: 0,
    staleWhileRevalidate: 0,
  }
};

export function setCacheHeaders(
  response: NextResponse,
  cacheType: keyof typeof CACHE_CONFIG,
  customMaxAge?: number
) {
  const config = CACHE_CONFIG[cacheType];
  const maxAge = customMaxAge ?? config.maxAge;
  
  if (maxAge > 0) {
    response.headers.set(
      'Cache-Control',
      `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`
    );
  } else {
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate'
    );
  }
  
  return response;
}

// Utility to create cached API responses
export function createCachedResponse<T>(
  data: T,
  cacheType: keyof typeof CACHE_CONFIG,
  customMaxAge?: number
): NextResponse {
  const response = NextResponse.json(data);
  return setCacheHeaders(response, cacheType, customMaxAge);
}

// Memory cache for frequently accessed data
class MemoryCache {
  private cache = new Map<string, { data: unknown; expires: number }>();
  
  set(key: string, data: unknown, ttlSeconds: number) {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expires });
  }
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  clear() {
    this.cache.clear();
  }
  
  // Clean expired items
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

export const memoryCache = new MemoryCache();

// Cleanup expired cache items every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    memoryCache.cleanup();
  }, 5 * 60 * 1000);
}
