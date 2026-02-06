import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    // Only set state on the init request (when going TO Facebook)
    // On callback, Facebook returns the state in the URL - don't override it
    if (request.url.includes('/callback')) {
      return {};
    }
    
    const sellerMode = request.query?.sellerMode === 'true';
    
    // Pass sellerMode as state parameter to preserve through OAuth flow
    return {
      state: JSON.stringify({ sellerMode }),
    };
  }
}
