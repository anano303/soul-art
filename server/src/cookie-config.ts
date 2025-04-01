export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path?: string;
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
      secure: true, // iOS მოითხოვს secure=true
      sameSite: 'none', // iOS მოითხოვს SameSite=None
      maxAge: 10 * 60 * 1000, // 10 წუთი
      path: '/',
    },
  },
  refresh: {
    name: 'refresh_token',
    options: {
      httpOnly: true,
      secure: true, // iOS მოითხოვს secure=true
      sameSite: 'none', // iOS მოითხოვს SameSite=None
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 დღე
      path: '/',
    },
  },
  iosAccess: {
    name: 'access_token',
    options: {
      httpOnly: true,
      secure: true, // iOS მოითხოვს secure=true
      sameSite: 'none', // iOS მოითხოვს SameSite=None
      maxAge: 10 * 60 * 1000, // 10 წუთი
      path: '/',
    },
  },
  iosRefresh: {
    name: 'refresh_token',
    options: {
      httpOnly: true,
      secure: true, // iOS მოითხოვს secure=true
      sameSite: 'none', // iOS მოითხოვს SameSite=None
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 დღე
      path: '/',
    },
  },
  localAccess: {
    name: 'access_token',
    options: {
      httpOnly: true,
      secure: false, // ლოკალური გარემოსთვის secure=false
      sameSite: 'lax', // ლოკალური გარემოსთვის sameSite=lax
      maxAge: 10 * 60 * 1000, // 10 წუთი
      path: '/',
    },
  },
  localRefresh: {
    name: 'refresh_token',
    options: {
      httpOnly: true,
      secure: false, // ლოკალური გარემოსთვის secure=false
      sameSite: 'lax', // ლოკალური გარემოსთვის sameSite=lax
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 დღე
      path: '/',
    },
  },
} as const;
