/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Global type declarations for third-party scripts
 */

interface Window {
  // Google AdSense - array-like object that accepts push calls
  adsbygoogle: Array<Record<string, unknown>>;
  // Google Analytics / Tag Manager
  gtag: (...args: any[]) => void;
  dataLayer: any[];
  // Meta/Facebook Pixel
  fbq: (...args: any[]) => void;
  _fbq: any;
}
