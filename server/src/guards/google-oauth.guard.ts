import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    // Only set state on the init request (when going TO Google)
    // On callback, Google returns the state in the URL - don't override it
    if (request.url.includes('/callback')) {
      return {};
    }
    
    const sellerMode = request.query?.sellerMode === 'true';
    const popup = request.query?.popup === 'true';
    
    // Pass sellerMode and popup as state parameter to preserve through OAuth flow
    const state = JSON.stringify({ sellerMode, popup });
    return {
      state,
    };
  }
}
