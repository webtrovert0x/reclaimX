import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ['bufferutil', 'utf-8-validate', 'pino-pretty', 'lokijs', 'encoding'],
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding', 'bufferutil', 'utf-8-validate');
    return config;
  },
};

export default nextConfig;
