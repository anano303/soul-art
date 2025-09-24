declare module "next-pwa" {
  import { NextConfig } from "next";

  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    sw?: string;
    fallbacks?: {
      document?: string;
      image?: string;
      font?: string;
    };
    buildExcludes?: RegExp[];
    runtimeCaching?: Array<{
      urlPattern: RegExp | string;
      handler:
        | "CacheFirst"
        | "CacheOnly"
        | "NetworkFirst"
        | "NetworkOnly"
        | "StaleWhileRevalidate";
      options?: {
        cacheName?: string;
        expiration?: {
          maxEntries?: number;
          maxAgeSeconds?: number;
        };
        cacheableResponse?: {
          statuses?: number[];
        };
        networkTimeoutSeconds?: number;
      };
    }>;
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;

  export default withPWA;
}
