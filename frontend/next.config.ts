import type { NextConfig } from 'next';

const apiOrigin = process.env.QTS_API_ORIGIN ?? 'http://127.0.0.1:8080';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  images: { unoptimized: true },
  experimental: {
    sri: { algorithm: 'sha256' },
  },
  ...(process.env.NODE_ENV === 'development' ? {
    async rewrites() {
      return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
    },
  } : {}),
};

export default nextConfig;
