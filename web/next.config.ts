import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  serverExternalPackages: [],
  images: {
    domains: ['res.cloudinary.com'], // Add Cloudinary domain to allowed image domains
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "**",
      },
    ],
    unoptimized: false // Set to false to properly optimize images
  },
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  distDir: '.next',
  
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: 
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.facebook.net https://*.facebook.com; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https://*.cloudinary.com https://*.fbcdn.net https://*.facebook.com https://* http://*; " +
              "font-src 'self' data:; " +
              "connect-src 'self' https://*.facebook.net https://*.facebook.com https://seal-app-tilvb.ondigitalocean.app http://localhost:* https://localhost:*; " +
              "frame-src 'self' https://*.facebook.com;"
          },
        ],
      },
    ];
  },
};

export default nextConfig;
