export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path?: string;
  domain?: string;
}

export interface CookieConfig {
  name: string;
  options: CookieOptions;
}

export const cookieConfig: Record<string, CookieConfig> = {
  access: {
    name: 'access_token',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour
      path: '/',
      // Domain for cross-subdomain cookie sharing - configurable via env var
      domain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.soulart.ge' : undefined),
    },
  },
  refresh: {
    name: 'refresh_token',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
      // Domain for cross-subdomain cookie sharing - configurable via env var
      domain: process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.soulart.ge' : undefined),
    },
  },
} as const;
