/** @type {import('next').Config} */
const nextConfig = {
  // Serve public/index.html for all non-API, non-asset routes (SPA fallback).
  async rewrites() {
    return {
      fallback: [
        { source: '/:path*', destination: '/index.html' },
      ],
    };
  },
};

export default nextConfig;
