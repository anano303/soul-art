import type { NextConfig } from "next";
// @ts-ignore - next-pwa doesn't have official TypeScript declarations
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // Optimize bundling and loading only in production
    optimizeCss: process.env.NODE_ENV === "production",
    optimizeServerReact: process.env.NODE_ENV === "production",
    // Improve CSS handling
    cssChunking: true,
    // Better caching
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Reduce CSS warnings
    turbo: {
      rules: {
        "*.css": ["css-loader"],
      },
    },
  },
  // Optimize compilation
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  serverExternalPackages: [],
  images: {
    domains: ["res.cloudinary.com", "fish-hunt.s3.eu-north-1.amazonaws.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "fish-hunt.s3.eu-north-1.amazonaws.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "**",
      },
    ],
    // Optimize image loading
    unoptimized: true, // Disable image optimization to prevent 402 errors with Cloudinary
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/webp", "image/avif"], // Modern image formats
  },
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  distDir: ".next",
  // Optimize bundle splitting
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Improve development performance
    if (dev) {
      // Faster rebuilds
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };

      // Reduce chunk size in development for faster HMR
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Optimize CSS loading for development
      config.module.rules.forEach((rule: any) => {
        if (rule.oneOf) {
          rule.oneOf.forEach((oneOfRule: any) => {
            if (oneOfRule.use && Array.isArray(oneOfRule.use)) {
              oneOfRule.use.forEach((useItem: any) => {
                if (
                  typeof useItem === "object" &&
                  useItem.loader &&
                  useItem.loader.includes("css-loader")
                ) {
                  useItem.options = {
                    ...useItem.options,
                    sourceMap: false, // Disable source maps for faster builds
                  };
                }
              });
            }
          });
        }
      });
    }

    // Optimize chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            chunks: "all",
            name: "framework",
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module: any) {
              return (
                module.size() > 160000 &&
                /node_modules[/\\]/.test(module.identifier())
              );
            },
            name: "lib",
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: "commons",
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name: false,
            priority: 10,
            minChunks: 2,
          },
        },
      },
    };

    return config;
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "production" ? false : true, // Disable PWA in development to reduce logging
  sw: "sw.js",
  runtimeCaching: [
    // API calls - always try network first, short cache
    {
      urlPattern: /^https?.*\/api\/.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 5 * 60, // 5 minutes only
        },
        networkTimeoutSeconds: 3,
      },
    },
    // Images - cache first for performance
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images-cache",
        expiration: {
          maxEntries: 300,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    // Static assets - cache first
    {
      urlPattern: /\.(?:js|css|woff2?|ttf|eot)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-cache",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    // Pages - network first with short timeout
    {
      urlPattern: /^https?.*\/.*$/,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 10 * 60, // 10 minutes
        },
        networkTimeoutSeconds: 3,
      },
    },
  ],
  buildExcludes: [/middleware-manifest\.json$/],
  fallbacks: {
    document: "/offline",
  },
})(nextConfig);
