import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to not throw an error when user is not authenticated
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user, just return null instead of throwing
    if (err || !user) {
      return null;
    }
    return user;
  }

  // Override canActivate to always return true (allowing unauthenticated requests)
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Try to activate auth, but don't fail if it doesn't work
    try {
      const result = super.canActivate(context);
      if (result instanceof Promise) {
        return result.catch(() => true);
      }
      return true;
    } catch (error) {
      return true;
    }
  }
}