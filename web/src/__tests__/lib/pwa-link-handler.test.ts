import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PWALinkHandler } from '@/lib/pwa-link-handler';

describe('lib/pwa-link-handler', () => {
  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = PWALinkHandler.getInstance();
      const instance2 = PWALinkHandler.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('returns an instance of PWALinkHandler', () => {
      const instance = PWALinkHandler.getInstance();
      expect(instance).toBeInstanceOf(PWALinkHandler);
    });
  });

  describe('init', () => {
    it('does not throw when called', () => {
      const handler = PWALinkHandler.getInstance();
      // Not in PWA mode in test env, should just log and return
      expect(() => handler.init()).not.toThrow();
    });
  });
});
