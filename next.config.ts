import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ['bufferutil', 'utf-8-validate', 'pino-pretty', 'lokijs', 'encoding'],
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding', 'bufferutil', 'utf-8-validate');
    return config;
  },
};

export default nextConfig;
