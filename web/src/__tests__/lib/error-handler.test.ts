import { describe, it, expect, vi } from 'vitest';
import { AxiosError } from 'axios';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import { ErrorHandler } from '@/lib/error-handler';

describe('lib/error-handler', () => {
  describe('ErrorHandler.handle', () => {
    it('handles AxiosError with response data message', () => {
      const error = new AxiosError(
        'Request failed',
        '400',
        undefined,
        undefined,
        {
          status: 400,
          data: { message: 'Invalid input' },
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
        }
      );

      const result = ErrorHandler.handle(error);
      expect(result.message).toBe('Invalid input');
      expect(result.statusCode).toBe(400);
    });

    it('handles 401 unauthorized', () => {
      const error = new AxiosError(
        'Unauthorized',
        '401',
        undefined,
        undefined,
        {
          status: 401,
          data: {},
          statusText: 'Unauthorized',
          headers: {},
          config: {} as any,
        }
      );

      const result = ErrorHandler.handle(error);
      expect(result.message).toContain('ავტორიზაცია');
      expect(result.statusCode).toBe(401);
    });

    it('handles 403 forbidden', () => {
      const error = new AxiosError(
        'Forbidden',
        '403',
        undefined,
        undefined,
        {
          status: 403,
          data: {},
          statusText: 'Forbidden',
          headers: {},
          config: {} as any,
        }
      );

      const result = ErrorHandler.handle(error);
      expect(result.message).toContain('აკრძალულია');
      expect(result.statusCode).toBe(403);
    });

    it('handles 404 not found', () => {
      const error = new AxiosError(
        'Not Found',
        '404',
        undefined,
        undefined,
        {
          status: 404,
          data: {},
          statusText: 'Not Found',
          headers: {},
          config: {} as any,
        }
      );

      const result = ErrorHandler.handle(error);
      expect(result.message).toContain('ვერ მოიძებნა');
      expect(result.statusCode).toBe(404);
    });

    it('handles 429 rate limit', () => {
      const error = new AxiosError(
        'Too Many Requests',
        '429',
        undefined,
        undefined,
        {
          status: 429,
          data: {},
          statusText: 'Too Many Requests',
          headers: {},
          config: {} as any,
        }
      );

      const result = ErrorHandler.handle(error);
      expect(result.message).toContain('ბევრი მოთხოვნა');
      expect(result.statusCode).toBe(429);
    });

    it('handles 500 server error', () => {
      const error = new AxiosError(
        'Internal Server Error',
        '500',
        undefined,
        undefined,
        {
          status: 500,
          data: {},
          statusText: 'Internal Server Error',
          headers: {},
          config: {} as any,
        }
      );

      const result = ErrorHandler.handle(error);
      expect(result.message).toContain('სერვერის შეცდომა');
      expect(result.statusCode).toBe(500);
    });

    it('handles array message in response', () => {
      const error = new AxiosError(
        'Validation failed',
        '400',
        undefined,
        undefined,
        {
          status: 400,
          data: { message: ['field1 is required', 'field2 is invalid'] },
          statusText: 'Bad Request',
          headers: {},
          config: {} as any,
        }
      );

      const result = ErrorHandler.handle(error);
      expect(result.message).toContain('field1 is required');
      expect(result.details).toEqual(['field1 is required', 'field2 is invalid']);
    });

    it('handles standard Error object', () => {
      const error = new Error('Something went wrong');
      const result = ErrorHandler.handle(error);
      expect(result.message).toBe('Something went wrong');
      expect(result.statusCode).toBe(500);
    });

    it('handles unknown error', () => {
      const result = ErrorHandler.handle('string error');
      expect(result.message).toContain('უცნობი შეცდომა');
      expect(result.statusCode).toBe(500);
    });

    it('uses custom message when provided', () => {
      const error = new Error('original');
      const result = ErrorHandler.handle(error, 'Custom message');
      expect(result.message).toBe('Custom message');
    });

    it('uses translation function when provided', () => {
      const t = (key: string) => `translated:${key}`;
      const result = ErrorHandler.handle('unknown', undefined, t);
      expect(result.message).toBe('translated:errors.generic');
    });
  });
});
