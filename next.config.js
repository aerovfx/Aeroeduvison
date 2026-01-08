/** @type {import('next').NextConfig} */
const { withContentlayer } = require("next-contentlayer")

const nextConfig = {
  // Output configuration for Cloud Run
  output: 'standalone',
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Simple webpack config to avoid conflicts
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // Alias contentlayer/generated to .contentlayer/generated/index.mjs
    const path = require("path")
    config.resolve.alias = {
      ...config.resolve.alias,
      "contentlayer/generated": path.resolve(__dirname, ".contentlayer/generated/index.mjs"),
    };
    
    return config;
  },
}

module.exports = withContentlayer(nextConfig)
