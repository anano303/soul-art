import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_req: NextRequest) {
    console.log('Middleware triggered', _req.url);
  // Get the response
  const response = NextResponse.next();

  // Add CORS headers for all requests
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, forum-id');
  
  // Add Content-Security-Policy header to allow localhost connections during development
  if (process.env.NODE_ENV === 'development') {
    const cspHeader = response.headers.get('Content-Security-Policy');
    if (cspHeader) {
      response.headers.set(
        'Content-Security-Policy',
        cspHeader.replace(
          "connect-src 'self'",
          "connect-src 'self' http://localhost:* https://localhost:*"
        )
      );
    }
  }

  return response;
}

// See: https://nextjs.org/docs/app/building-your-application/routing/middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
