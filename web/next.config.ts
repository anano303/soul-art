import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // Optimize CSS chunking and reduce preloading
    optimizeCss: true,
    // Reduce unused CSS preloading
    cssChunking: "strict",
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
    // Disable image optimization completely in development
    unoptimized: true,
    // Add a larger deviceSizes array for better responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  distDir: ".next",
  // Optimize build for better CSS handling
  optimizeFonts: true,
  compress: true,
  // Add performance headers
  async headers() {
    return [
      {
        source: "/_next/static/css/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/styles/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000",
          },
        ],
      },
    ];
  },
  // Reduce resource hints for unused resources
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Optimize CSS chunk splitting in production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            // Group critical CSS together
            criticalCSS: {
              name: "critical-css",
              test: /\.(css|scss)$/,
              chunks: "initial",
              priority: 10,
              enforce: true,
            },
            // Group component CSS separately
            componentCSS: {
              name: "component-css",
              test: /\.(css|scss)$/,
              chunks: "async",
              priority: 5,
              minSize: 0,
            },
          },
        },
      };

      // Reduce preload for CSS chunks
      const originalMiniCssExtractPlugin = config.plugins.find(
        (plugin: any) => plugin.constructor.name === "MiniCssExtractPlugin"
      );
      if (originalMiniCssExtractPlugin) {
        originalMiniCssExtractPlugin.options = {
          ...originalMiniCssExtractPlugin.options,
          // Disable preload for non-critical CSS
          linkType: false,
        };
      }
    }

    return config;
  },
};

export default nextConfig;
