import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  output: 'export', trailingSlash: true, images: { unoptimized: true },
  poweredByHeader: false, reactStrictMode: true,
  env: { NEXT_PUBLIC_ANZEN_NATIVE:'true' },
  experimental: { cpus: 2 },
  webpack(config) {
    config.resolve.alias = { ...config.resolve.alias, '@/components/home/home-safety-updates$':path.resolve('src/components/shared-home-updates.tsx'), '@': path.resolve('../web/src'), canvas:false };
    config.resolve.modules = [path.resolve('node_modules'), path.resolve('../web/node_modules'), 'node_modules'];
    return config;
  },
  turbopack: {},
};
export default config;
