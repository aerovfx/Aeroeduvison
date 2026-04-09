/** @type {import('next').NextConfig} */

// Fix: Node.js 22+ broken localStorage global (--localstorage-file without valid path)
// This must run before ANY module that might touch localStorage during SSR
if (typeof globalThis !== 'undefined' && globalThis.localStorage && typeof globalThis.localStorage.getItem !== 'function') {
  const _store = new Map();
  globalThis.localStorage = {
    getItem: (k) => _store.get(k) ?? null,
    setItem: (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
    clear: () => _store.clear(),
    get length() { return _store.size; },
    key: (i) => [..._store.keys()][i] ?? null,
  };
}

// NOTE: withContentlayer() wrapper removed — incompatible with Next.js 15.3.x
// Instead, we inline the contentlayer webpack plugin directly.
// The package exports don't expose dist/plugin.js, so we resolve the path manually.
let _ContentlayerPlugin = null
try {
  const _path = require('path')
  const _pluginPath = _path.join(
    _path.dirname(require.resolve('next-contentlayer/package.json')),
    'dist', 'plugin.js'
  )
  // Verify the file exists before defining the plugin class
  require('fs').accessSync(_pluginPath)
  const _devServerStartedRef = { current: false }
  const { pathToFileURL } = require('url')
  const _pluginURL = pathToFileURL(_pluginPath).href
  _ContentlayerPlugin = class ContentlayerWebpackPlugin {
    apply(compiler) {
      compiler.hooks.beforeCompile.tapPromise('ContentlayerWebpackPlugin', async () => {
        try {
          const plugin = await import(/* webpackIgnore: true */ _pluginURL)
          await plugin.runBeforeWebpackCompile({
            pluginOptions: {},
            devServerStartedRef: _devServerStartedRef,
            mode: compiler.options.mode,
          })
        } catch (e) {
          // Contentlayer compilation error — log once and continue
          if (!this._errorLogged) {
            console.warn('[Contentlayer] Plugin error (non-fatal):', e.message || e)
            this._errorLogged = true
          }
        }
      })
    }
  }
} catch {
  // next-contentlayer not installed or dist/plugin.js missing — skip
}


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

  // Transpile ESM packages that need it
  // NOTE: Do NOT transpile 'three' here — it interferes with webpack alias
  // resolution for subpath exports (three/webgpu, three/tsl) used by three-globe.
  // Three.js ESM is handled via webpack aliases + resolve.conditionNames instead.
  // Do NOT transpile @react-three/* packages — they ship pre-built bundles
  // and transpiling them causes react-reconciler resolution issues.
  transpilePackages: [
    'postprocessing',
  ],

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
    // Fix: Disable PPR to prevent "Cannot read properties of undefined (reading 'PPR')" in Link component
    ppr: false,
    optimizePackageImports: [
      'lucide-react',
      '@mui/material',
      '@mui/icons-material',
      'recharts',
      'date-fns',
    ],
    // Optimize server actions
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['*'],
    },
    // optimizeCss disabled — critters consumes too much memory during SSG
    // optimizeCss: true,
    // Limit build workers to prevent OOM during "Collecting page data"
    workerThreads: false,
    cpus: 1,
  },


  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Contentlayer webpack plugin (inlined from withContentlayer wrapper)
    if (_ContentlayerPlugin) {
      config.plugins.push(new _ContentlayerPlugin())
    }
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/!(.contentlayer)/**/*'],
    };

    if (dev) {
      config.watchOptions.poll = 1000;
      config.watchOptions.aggregateTimeout = 300;
    }

    // Alias contentlayer/generated + force single Three.js/R3F instance
    const path = require("path")

    // Fix: three-globe v2.45+ imports three/webgpu and three/tsl (WebGPU renderer modules).
    // Webpack alias "three" without "$" suffix catches ALL subpath imports (three/webgpu, three/tsl)
    // and resolves them as node_modules/three/webgpu (doesn't exist), bypassing package.json exports.
    // Solution: use "three$" for exact match only, then explicit aliases for subpaths.
    config.resolve.alias = {
      ...config.resolve.alias,
      "contentlayer/generated": path.resolve(__dirname, ".contentlayer/generated/index.mjs"),
      "three/webgpu": path.resolve(__dirname, "node_modules/three/build/three.webgpu.js"),
      "three/tsl": path.resolve(__dirname, "node_modules/three/build/three.tsl.js"),
      "three$": path.resolve(__dirname, "node_modules/three"),
      "@react-three/fiber": path.resolve(__dirname, "node_modules/@react-three/fiber"),
      "@react-three/drei": path.resolve(__dirname, "node_modules/@react-three/drei"),
      "@react-three/postprocessing": path.resolve(__dirname, "node_modules/@react-three/postprocessing"),
      // Fix: force ESM entry for @floating-ui/dom so re-exports (getOverflowAncestors) resolve correctly
      "@floating-ui/dom": path.resolve(__dirname, "node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs"),
    };

    // Ensure webpack resolves Node.js subpath exports (package.json "exports" field)
    // This is critical for three/webgpu and three/tsl which are defined in three's exports map
    config.resolve.conditionNames = config.resolve.conditionNames || [];
    if (!config.resolve.conditionNames.includes('import')) {
      config.resolve.conditionNames = ['import', 'module', 'require', 'node', 'default', ...config.resolve.conditionNames];
    }

    // Fix: three-stdlib → fflate imports Node.js built-in 'module' which doesn't exist client-side.
    // Provide empty fallbacks for Node.js built-ins used by fflate in browser context.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        module: false,
        fs: false,
        path: false,
      };
    }

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
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              name: 'three-vendor',
              priority: 30,
              chunks: 'async',
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

  // SWC compiler options
  // FIX (2026-04): Keep console.log in production so Cloud Run logs show crash details.
  // Previously stripped → impossible to diagnose the 7-second SIGKILL crash loop.
  // Re-enable stripping only after the crash is definitively fixed.
  compiler: {
    removeConsole: false,
  },

  // Prevent Prisma and other Node.js-only packages from being bundled
  // into the Edge runtime (middleware) or SSR bundles. They must run
  // as Node.js external modules via require(), not as webpack bundles.
  serverExternalPackages: [
    '@prisma/client',
    'prisma',
    'bcryptjs',
    'ioredis',
  ],
}

module.exports = nextConfig
// cache-bust: force rebuild
