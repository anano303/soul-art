import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { cookieConfig } from '@/cookie-config';

@Injectable()
export class NotAuthenticatedGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check for token in HTTP-only cookies first
    let token = request.cookies?.[cookieConfig.access.name];

    // Fallback to Authorization header for backwards compatibility
    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return true; // Allow access if no token
    }

    try {
      await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      return false; // Deny access if token is valid
    } catch {
      return true; // Allow access if token is invalid
    }
  }
}
