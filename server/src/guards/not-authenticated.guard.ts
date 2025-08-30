import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { cookieConfig } from '@/cookie-config';

@Injectable()
export class NotAuthenticatedGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    console.log('🔍 NotAuthenticatedGuard: Checking authentication status...');
    
    // Check for token in HTTP-only cookies first
    let token = request.cookies?.[cookieConfig.access.name];
    console.log('🍪 Cookie token found:', token ? 'YES' : 'NO');
    
    // Fallback to Authorization header for backwards compatibility
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        console.log('🔑 Authorization header token found:', 'YES');
      } else {
        console.log('🔑 Authorization header token found:', 'NO');
      }
    }
    
    if (!token) {
      console.log('✅ No token found - allowing access');
      return true; // Allow access if no token
    }

    try {
      console.log('🔐 Verifying token...');
      await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      console.log('❌ Token is valid - denying access (user already authenticated)');
      return false; // Deny access if token is valid
    } catch (error) {
      console.log('✅ Token verification failed - allowing access:', error.message);
      return true; // Allow access if token is invalid
    }
  }
}
