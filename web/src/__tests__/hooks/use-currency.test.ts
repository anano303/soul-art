import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock js-cookie
vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

import { useCurrency } from '@/hooks/use-currency';

describe('hooks/useCurrency', () => {
  it('defaults to GEL when no cookie', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.currency).toBe('GEL');
    expect(result.current.symbol).toBe('₾');
  });

  it('formats GEL amounts with symbol after number', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.format(100);
    expect(formatted).toBe('100.00 ₾');
  });

  it('formats decimal amounts correctly', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.format(99.9);
    expect(formatted).toBe('99.90 ₾');
  });

  it('getPrice returns base price when no conversions provided', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.getPrice(100)).toBe(100);
    expect(result.current.getPrice(50, undefined)).toBe(50);
  });

  it('getPrice returns GEL conversion when available', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.getPrice(100, { GEL: 100, USD: 40 })).toBe(100);
  });

  it('formatPrice combines getPrice + format', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.formatPrice(200);
    expect(formatted).toBe('200.00 ₾');
  });
});
