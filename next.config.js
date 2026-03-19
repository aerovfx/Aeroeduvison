/** @type {import('next').NextConfig} */
const { withContentlayer } = require("next-contentlayer")

const nextConfig = {
  // Output configuration for Cloud Run
  output: 'standalone',

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

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
    minimumCacheTTL: 300,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: false,
  },

  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // HTTP headers for caching and performance
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|ico|webp|woff|woff2|ttf|eot)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },

  // Rewrites for Rust service proxy
  async rewrites() {
    const directRustProxy = process.env.DIRECT_RUST_VECTOR_PROXY === "true";
    const rustBase = process.env.RUST_VECTOR_SERVICE_URL || "http://127.0.0.1:8091";
    const directRustOcrProxy = process.env.DIRECT_RUST_OCR_GRADING_PROXY === "true";
    const directRustOcrProcessProxy = process.env.DIRECT_RUST_OCR_PROCESS_PROXY === "true";
    const directRustLlmGradingProxy = process.env.DIRECT_RUST_LLM_GRADING_PROXY === "true";
    const rustBackendBase = process.env.RUST_BACKEND_URL || "http://127.0.0.1:8090";
    const directRustGradingProxy = process.env.DIRECT_RUST_GRADING_PROXY === "true";
    const rustGradingBase = process.env.RUST_GRADING_URL || "http://127.0.0.1:8100";

    if (
      !directRustProxy &&
      !directRustOcrProxy &&
      !directRustOcrProcessProxy &&
      !directRustLlmGradingProxy &&
      !directRustGradingProxy
    ) {
      return [];
    }

    const rules = [
      {
        source: "/api/vector-similarity",
        destination: `${rustBase}/v1/vector-similarity`,
      },
      {
        source: "/api/vector-similarity/cache",
        destination: `${rustBase}/v1/vector-similarity/cache`,
      },
    ];

    if (directRustOcrProxy) {
      rules.push({
        source: "/api/ocr-grading",
        destination: `${rustBackendBase}/api/ocr-grading`,
      });
    }

    if (directRustOcrProcessProxy) {
      rules.push({
        source: "/api/ocr-process",
        destination: `${rustBackendBase}/api/ocr-process`,
      });
    }

    if (directRustLlmGradingProxy) {
      rules.push({
        source: "/api/llm-grading",
        destination: `${rustBackendBase}/api/llm-grading`,
      });
    }

    if (directRustGradingProxy) {
      const gradingEndpoints = [
        "/api/grading/essay",
        "/api/grading/submit",
        "/api/grading/batch",
        "/api/grading/dashboard",
        "/api/grading/review",
        "/api/grading/secure",
        "/api/grading/grade",
      ];
      for (const endpoint of gradingEndpoints) {
        rules.push({
          source: endpoint,
          destination: `${rustGradingBase}${endpoint}`,
        });
      }
      // Wildcard for /api/grading/:id
      rules.push({
        source: "/api/grading/:id",
        destination: `${rustGradingBase}/api/grading/:id`,
      });
    }

    return rules;
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@mui/material',
      '@mui/icons-material',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'recharts',
      'three',
      'deck.gl',
      'maplibre-gl',
      'date-fns',
    ],
    // Optimize server actions
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['*'],
    },
    // Optimize CSS
    optimizeCss: true,
  },

  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // Alias contentlayer/generated
    const path = require("path")
    config.resolve.alias = {
      ...config.resolve.alias,
      "contentlayer/generated": path.resolve(__dirname, ".contentlayer/generated/index.mjs"),
    };

    // Production client-side optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: true,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
              maxSize: 250000,
            },
            common: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            // Isolate heavy libraries into separate chunks
            three: {
              test: /[\\/]node_modules[\\/]three[\\/]/,
              name: 'three-vendor',
              priority: 30,
              chunks: 'async', // Only load when dynamically imported
              reuseExistingChunk: true,
            },
            mui: {
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              name: 'mui-vendor',
              priority: 30,
              reuseExistingChunk: true,
            },
            deck: {
              test: /[\\/]node_modules[\\/](deck\.gl|@deck\.gl)[\\/]/,
              name: 'deck-vendor',
              priority: 30,
              chunks: 'async',
              reuseExistingChunk: true,
            },
            recharts: {
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              name: 'recharts-vendor',
              priority: 30,
              reuseExistingChunk: true,
            },
            mediapipe: {
              test: /[\\/]node_modules[\\/]@mediapipe[\\/]/,
              name: 'mediapipe-vendor',
              priority: 30,
              chunks: 'async',
              reuseExistingChunk: true,
            },
          },
        },
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
    }

    // Drop console.log in production using SWC (Next.js 15 uses SWC, not Terser)
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }

    return config;
  },

  // SWC compiler options — drop console in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
}

module.exports = withContentlayer(nextConfig)
