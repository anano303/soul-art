/**
 * Development-only configuration that gets loaded conditionally
 * to override production settings during local development.
 */
export const setupDevEnvironment = () => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  // Allow local API requests in development by relaxing CSP
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.facebook.net https://*.facebook.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https://*.cloudinary.com https://*.fbcdn.net https://*.facebook.com https://* http://*; " +
    "font-src 'self' data:; " +
    "connect-src 'self' http://localhost:* https://localhost:* https://*.facebook.net https://*.facebook.com https://seal-app-tilvb.ondigitalocean.app; " +
    "frame-src 'self' https://*.facebook.com;";
  
  // Replace any existing CSP meta tag or add a new one
  const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingMeta) {
    existingMeta.setAttribute('content', meta.content);
  } else {
    document.head.appendChild(meta);
  }
  
  console.log('Development environment configured: CSP relaxed for localhost');
};
