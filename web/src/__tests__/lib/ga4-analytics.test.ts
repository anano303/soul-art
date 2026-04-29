import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ga4Event,
  ga4PageView,
  trackSearch,
  trackPageView,
  trackHomepageEvent,
} from '@/lib/ga4-analytics';

describe('lib/ga4-analytics', () => {
  beforeEach(() => {
    // Reset gtag mock
    (window as any).gtag = vi.fn();
    vi.useFakeTimers();
  });

  describe('ga4Event', () => {
    it('calls gtag with event name and parameters', () => {
      ga4Event('test_event', { key: 'value' });
      expect((window as any).gtag).toHaveBeenCalledWith('event', 'test_event', { key: 'value' });
    });

    it('calls gtag without parameters', () => {
      ga4Event('simple_event');
      expect((window as any).gtag).toHaveBeenCalledWith('event', 'simple_event', undefined);
    });

    it('queues event when gtag not loaded and retries', () => {
      (window as any).gtag = undefined;
      ga4Event('queued_event', { data: 1 });
      
      // Now load gtag
      (window as any).gtag = vi.fn();
      vi.advanceTimersByTime(1000);
      
      expect((window as any).gtag).toHaveBeenCalledWith('event', 'queued_event', { data: 1 });
    });
  });

  describe('ga4PageView', () => {
    it('sends page_path config to gtag', () => {
      ga4PageView('/about', 'About Page');
      expect((window as any).gtag).toHaveBeenCalledWith(
        'config',
        undefined, // NEXT_PUBLIC_GA_MEASUREMENT_ID is not set in test env
        expect.objectContaining({
          page_path: '/about',
          page_title: 'About Page',
        })
      );
    });
  });

  describe('trackSearch', () => {
    it('sends search event with term', () => {
      trackSearch('painting', 5);
      expect((window as any).gtag).toHaveBeenCalledWith('event', 'search', expect.objectContaining({
        search_term: 'painting',
        result_count: 5,
      }));
    });
  });

  describe('trackPageView', () => {
    it('sends page_view event', () => {
      trackPageView('/products', 'Products');
      expect((window as any).gtag).toHaveBeenCalledWith('event', 'page_view', expect.objectContaining({
        page_path: '/products',
        page_title: 'Products',
      }));
    });
  });

  describe('trackHomepageEvent', () => {
    it('sends homepage_interaction event', () => {
      trackHomepageEvent('click_banner', { bannerId: '123' });
      expect((window as any).gtag).toHaveBeenCalledWith('event', 'homepage_interaction', expect.objectContaining({
        action: 'click_banner',
        bannerId: '123',
      }));
    });
  });
});
