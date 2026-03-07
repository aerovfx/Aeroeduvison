/**
 * performance-config.ts - Performance optimization configuration
 * 
 * Centralized configuration for performance optimizations
 */

// Bundle splitting configuration
export const BUNDLE_SPLITTING = {
  // Chunk size limits
  MAX_CHUNK_SIZE: 244 * 1024, // 244KB
  MAX_ASYNC_CHUNKS: 5,
  
  // Dynamic import configurations
  DYNAMIC_IMPORTS: {
    // Heavy libraries
    recharts: {
      loading: 'Charts loading...',
      ssr: false
    },
    // Large components
    adminDashboard: {
      loading: 'Dashboard loading...',
      ssr: false
    },
    // Data tables
    dataTable: {
      loading: 'Table loading...',
      ssr: false
    }
  }
};

// Image optimization configuration
export const IMAGE_OPTIMIZATION = {
  // Default quality
  DEFAULT_QUALITY: 75,
  
  // Responsive breakpoints
  BREAKPOINTS: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280
  },
  
  // Image sizes for different use cases
  SIZES: {
    avatar: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    card: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw',
    hero: '(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw',
    thumbnail: '(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw'
  },
  
  // Placeholder configurations
  PLACEHOLDERS: {
    blur: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    empty: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4='
  }
};

// Caching configuration
export const CACHE_CONFIG = {
  // Browser cache
  BROWSER_CACHE: {
    static: 'public, max-age=31536000, immutable', // 1 year
    dynamic: 'public, max-age=3600, s-maxage=86400', // 1 hour browser, 1 day CDN
    api: 'public, max-age=300, s-maxage=600' // 5 minutes browser, 10 minutes CDN
  },
  
  // Service worker cache
  SW_CACHE: {
    static: 'cache-first',
    dynamic: 'network-first',
    api: 'stale-while-revalidate'
  }
};

// Lazy loading configuration
export const LAZY_LOADING = {
  // Intersection observer options
  INTERSECTION_OPTIONS: {
    rootMargin: '50px',
    threshold: 0.1
  },
  
  // Component lazy loading
  COMPONENTS: {
    charts: {
      delay: 100, // ms
      fallback: 'Charts loading...'
    },
    tables: {
      delay: 50,
      fallback: 'Table loading...'
    },
    images: {
      delay: 0,
      fallback: null
    }
  }
};

// Performance monitoring thresholds
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100, // First Input Delay (ms)
  CLS: 0.1, // Cumulative Layout Shift
  
  // Custom metrics
  BUNDLE_SIZE: 500 * 1024, // 500KB
  API_RESPONSE_TIME: 1000, // 1s
  RENDER_TIME: 100, // 100ms
  
  // Memory usage
  MEMORY_LIMIT: 100 * 1024 * 1024, // 100MB
  GC_THRESHOLD: 80 * 1024 * 1024 // 80MB
};

// Development optimizations
export const DEV_OPTIMIZATIONS = {
  // Hot reload optimization
  HOT_RELOAD: {
    enabled: true,
    exclude: ['node_modules', '.next', 'public'],
    include: ['src', 'app', 'components', 'lib']
  },
  
  // Bundle analyzer
  BUNDLE_ANALYZER: {
    enabled: process.env.ANALYZE === 'true',
    openAnalyzer: false,
    generateStatsFile: true
  },
  
  // Source maps
  SOURCE_MAPS: {
    enabled: process.env.NODE_ENV === 'development',
    type: 'cheap-module-source-map'
  }
};

// Production optimizations
export const PROD_OPTIMIZATIONS = {
  // Compression
  COMPRESSION: {
    gzip: true,
    brotli: true,
    threshold: 1024 // 1KB
  },
  
  // Minification
  MINIFICATION: {
    enabled: true,
    removeConsole: true,
    removeDebugger: true
  },
  
  // Tree shaking
  TREE_SHAKING: {
    enabled: true,
    sideEffects: false
  }
};

// Export all configurations
export const PERFORMANCE_CONFIG = {
  BUNDLE_SPLITTING,
  IMAGE_OPTIMIZATION,
  CACHE_CONFIG,
  LAZY_LOADING,
  PERFORMANCE_THRESHOLDS,
  DEV_OPTIMIZATIONS,
  PROD_OPTIMIZATIONS
};

export default PERFORMANCE_CONFIG;
