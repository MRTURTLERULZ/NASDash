/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Ensure server listens on all interfaces
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;

