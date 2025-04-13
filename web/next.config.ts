import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  serverExternalPackages: [],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        port: "",
        pathname: "**",
      },
    ],
      unoptimized: process.env.NODE_ENV !== 'production'
  },
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  distDir: '.next',
};

export default nextConfig;
