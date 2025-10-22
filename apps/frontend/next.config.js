/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },
  env: {
    NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
  },
  async rewrites() {
    return [
      {
        source: '/api/graphql',
        destination: 'http://localhost:4000/graphql',
      },
    ];
  },
  turbopack: {
    // Add any turbopack specific configurations here
  },
}

module.exports = nextConfig;

