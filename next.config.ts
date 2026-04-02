import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://v5.db.transport.rest/:path*',
      },
    ];
  },
};

export default nextConfig;
