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

  async rewrites() {
    const directRustProxy = process.env.DIRECT_RUST_VECTOR_PROXY === "true";
    const rustBase = process.env.RUST_VECTOR_SERVICE_URL || "http://127.0.0.1:8091";
    const directRustOcrProxy = process.env.DIRECT_RUST_OCR_GRADING_PROXY === "true";
    const directRustOcrProcessProxy = process.env.DIRECT_RUST_OCR_PROCESS_PROXY === "true";
    const directRustLlmGradingProxy = process.env.DIRECT_RUST_LLM_GRADING_PROXY === "true";
    const rustBackendBase = process.env.RUST_BACKEND_URL || "http://127.0.0.1:8090";

    if (
      !directRustProxy &&
      !directRustOcrProxy &&
      !directRustOcrProcessProxy &&
      !directRustLlmGradingProxy
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

    return rules;
  },
}

module.exports = withContentlayer(nextConfig)
