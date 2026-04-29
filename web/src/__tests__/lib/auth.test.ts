import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  storeUserData,
  getUserData,
  clearUserData,
  isLoggedIn,
  generateDeviceFingerprint,
  getDeviceFingerprint,
  login,
  register,
  logout,
  refreshTokens,
} from '@/lib/auth';

describe('lib/auth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('storeUserData', () => {
    it('stores user data in localStorage', () => {
      const user = { _id: '123', name: 'Test', email: 'test@test.com', role: 'user' };
      storeUserData(user as any);
      const stored = localStorage.getItem('soulart_user_data');
      expect(stored).toBe(JSON.stringify(user));
    });

    it('does nothing if userData is falsy', () => {
      storeUserData(null as any);
      expect(localStorage.getItem('soulart_user_data')).toBeNull();
    });
  });

  describe('getUserData', () => {
    it('returns parsed user data from localStorage', () => {
      const user = { _id: '123', name: 'Test' };
      localStorage.setItem('soulart_user_data', JSON.stringify(user));
      expect(getUserData()).toEqual(user);
    });

    it('returns null when no data stored', () => {
      expect(getUserData()).toBeNull();
    });

    it('returns null on invalid JSON', () => {
      localStorage.setItem('soulart_user_data', 'not-json');
      expect(getUserData()).toBeNull();
    });
  });

  describe('clearUserData', () => {
    it('removes user data from localStorage', () => {
      localStorage.setItem('soulart_user_data', '{"name":"Test"}');
      clearUserData();
      expect(localStorage.getItem('soulart_user_data')).toBeNull();
    });

    it('clears auth_session cookie', () => {
      clearUserData();
      expect(document.cookie).not.toContain('auth_session');
    });
  });

  describe('isLoggedIn', () => {
    it('returns true when user data exists', () => {
      localStorage.setItem('soulart_user_data', '{"name":"Test"}');
      expect(isLoggedIn()).toBe(true);
    });

    it('returns false when no user data', () => {
      expect(isLoggedIn()).toBe(false);
    });
  });

  describe('generateDeviceFingerprint', () => {
    it('generates and stores a fingerprint', () => {
      const fp = generateDeviceFingerprint();
      expect(fp).toBeTruthy();
      expect(typeof fp).toBe('string');
      expect(localStorage.getItem('soulart_device_fp')).toBe(fp);
    });

    it('returns existing fingerprint if already generated', () => {
      localStorage.setItem('soulart_device_fp', 'existing-fp');
      expect(generateDeviceFingerprint()).toBe('existing-fp');
    });
  });

  describe('getDeviceFingerprint', () => {
    it('returns stored fingerprint', () => {
      localStorage.setItem('soulart_device_fp', 'my-fp');
      expect(getDeviceFingerprint()).toBe('my-fp');
    });

    it('generates a new one if none exists', () => {
      const fp = getDeviceFingerprint();
      expect(fp).toBeTruthy();
      expect(localStorage.getItem('soulart_device_fp')).toBe(fp);
    });
  });

  describe('login', () => {
    it('returns data on successful login', async () => {
      const mockUser = { _id: '1', name: 'Test', email: 'test@t.com' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, token: 'abc' }),
      });
      const result = await login('test@t.com', 'pass123');
      expect(result.user).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('throws on failed login', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      });
      await expect(login('bad@t.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('returns data on successful registration', async () => {
      const mockUser = { _id: '2', name: 'New User' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      });
      const result = await register({ firstName: 'New', lastName: 'User', email: 'new@t.com', password: '123456' });
      expect(result.user).toEqual(mockUser);
    });

    it('throws on failed registration', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Email already exists' }),
      });
      await expect(register({ firstName: 'X', lastName: 'Y', email: 'x@t.com', password: '123' })).rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    it('calls logout endpoint and clears user data', async () => {
      localStorage.setItem('soulart_user_data', '{"name":"Test"}');
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      await logout();
      expect(localStorage.getItem('soulart_user_data')).toBeNull();
    });

    it('clears user data even if fetch fails', async () => {
      localStorage.setItem('soulart_user_data', '{"name":"Test"}');
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await logout();
      expect(localStorage.getItem('soulart_user_data')).toBeNull();
    });
  });

  describe('refreshTokens', () => {
    it('returns data on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-token' }),
      });
      const result = await refreshTokens();
      expect(result.accessToken).toBe('new-token');
    });

    it('throws and clears data on 401', async () => {
      localStorage.setItem('soulart_user_data', '{"name":"Test"}');
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
      await expect(refreshTokens()).rejects.toThrow('Session expired');
      expect(localStorage.getItem('soulart_user_data')).toBeNull();
    });

    it('throws generic error on other failures', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      await expect(refreshTokens()).rejects.toThrow('Failed to refresh tokens');
    });
  });
});
