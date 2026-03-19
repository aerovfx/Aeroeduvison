/**
 * usePerformance.ts - React hooks for performance optimization
 * 
 * Features:
 * - Lazy loading with intersection observer
 * - Debounced values
 * - Throttled scroll/events
 * - Image lazy loading
 * - Component prefetching
 * - Render optimization
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ===== LAZY LOADING =====

interface UseLazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  skip?: boolean;
}

interface UseLazyLoadResult {
  ref: React.RefObject<HTMLElement>;
  isVisible: boolean;
  hasBeenVisible: boolean;
}

export function useLazyLoad(options: UseLazyLoadOptions = {}): UseLazyLoadResult {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    triggerOnce = true,
    skip = false,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    if (skip || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);

          if (triggerOnce && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, triggerOnce, skip]);

  return { ref, isVisible, hasBeenVisible };
}

// ===== DEBOUNCE =====

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ===== THROTTLE =====

export function useThrottle<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated.current >= interval) {
      setThrottledValue(value);
      lastUpdated.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastUpdated.current = Date.now();
      }, interval - (now - lastUpdated.current));

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

// ===== THROTTLED CALLBACK =====

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const callbackRef = useRef<T>(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const elapsed = now - lastCallRef.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (elapsed >= delay) {
      lastCallRef.current = now;
      callbackRef.current(...args);
    } else {
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callbackRef.current(...args);
      }, delay - elapsed);
    }
  }, [delay]) as T;
}

// ===== DEBOUNCED CALLBACK =====

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const callbackRef = useRef<T>(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]) as T;
}

// ===== IMAGE LAZY LOADING =====

interface UseImageLazyLoadOptions {
  src: string;
  rootMargin?: string;
  threshold?: number;
  placeholder?: string;
}

interface UseImageLazyLoadResult {
  ref: React.RefObject<HTMLImageElement>;
  isLoaded: boolean;
  currentSrc: string;
  error: boolean;
}

export function useImageLazyLoad(options: UseImageLazyLoadOptions): UseImageLazyLoadResult {
  const { src, rootMargin = '50px', threshold = 0.1, placeholder } = options;
  const ref = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');

  useEffect(() => {
    if (!ref.current) return;

    const image = ref.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCurrentSrc(src);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(image);

    return () => {
      observer.disconnect();
    };
  }, [src, rootMargin, threshold]);

  return { ref, isLoaded, currentSrc, error };
}

// ===== PREFETCH =====

const prefetchCache = new Map<string, Promise<any>>();

export function usePrefetch(url: string, options?: RequestInit): void {
  useEffect(() => {
    if (prefetchCache.has(url)) return;

    const controller = new AbortController();
    const promise = fetch(url, {
      ...options,
      signal: controller.signal,
      priority: 'low',
    }).catch(() => {
      // Ignore errors for prefetch
    });

    prefetchCache.set(url, promise);

    return () => {
      controller.abort();
    };
  }, [url, options]);
}

// ===== VIRTUAL SCROLL =====

interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface UseVirtualScrollResult {
  visibleItems: { index: number; top: number }[];
  totalHeight: number;
  scrollTop: number;
}

export function useVirtualScroll(options: UseVirtualScrollOptions): UseVirtualScrollResult {
  const { itemCount, itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    const items: { index: number; top: number }[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      items.push({
        index: i,
        top: i * itemHeight,
      });
    }
    return items;
  }, [startIndex, endIndex, itemHeight]);

  const totalHeight = itemCount * itemHeight;

  return { visibleItems, totalHeight, scrollTop };
}

// ===== RENDER OPTIMIZATION =====

export function useShouldRender(deps: any[], minChange: number = 100): boolean {
  const prevDepsRef = useRef<any[]>(deps);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const prevDeps = prevDepsRef.current;
    const hasSignificantChange = deps.some((dep, i) => {
      const prev = prevDeps[i];
      if (typeof dep === 'number' && typeof prev === 'number') {
        return Math.abs(dep - prev) > minChange;
      }
      return dep !== prev;
    });

    if (hasSignificantChange) {
      setShouldRender(true);
      prevDepsRef.current = deps;
    } else {
      setShouldRender(false);
    }
  }, [deps, minChange]);

  return shouldRender;
}

// ===== IDLE CALLBACK =====

export function useIdleCallback(callback: () => void, priority: 'low' | 'high' = 'low'): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let handle: number;

    const execute = (deadline: IdleDeadline) => {
      if (deadline.timeRemaining() > 0 || priority === 'high') {
        callbackRef.current();
      } else {
        handle = requestIdleCallback(execute, { timeout: priority === 'high' ? 100 : 1000 });
      }
    };

    handle = requestIdleCallback(execute, { timeout: priority === 'high' ? 100 : 1000 });

    return () => cancelIdleCallback(handle);
  }, [priority]);
}

// ===== NETWORK STATUS =====

export function useNetworkStatus(): {
  online: boolean;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
} {
  const [status, setStatus] = useState({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    downlink: undefined,
    effectiveType: undefined,
    rtt: undefined,
    saveData: undefined,
  });

  useEffect(() => {
    const updateStatus = () => {
      const connection = (navigator as any).connection;
      setStatus({
        online: navigator.onLine,
        downlink: connection?.downlink,
        effectiveType: connection?.effectiveType,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      });
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateStatus);
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
}

// ===== PERFORMANCE MONITORING =====

export function usePerformanceMonitor(): {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
} {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    // Only in browser
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

    const observeMetric = (type: string, callback: (value: number) => void) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          callback((lastEntry as any).value || (lastEntry as any).duration);
        }
      });

      try {
        observer.observe({ entryTypes: [type as any] });
      } catch (e) {
        // Metric type not supported
      }

      return observer;
    };

    const observers: PerformanceObserver[] = [];

    // FCP
    observers.push(observeMetric('paint', (value) => {
      setMetrics((prev) => ({ ...prev, fcp: value }));
    }));

    // LCP
    observers.push(observeMetric('largest-contentful-paint', (value) => {
      setMetrics((prev) => ({ ...prev, lcp: value }));
    }));

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  return metrics;
}

export default {
  useLazyLoad,
  useDebounce,
  useThrottle,
  useThrottledCallback,
  useDebouncedCallback,
  useImageLazyLoad,
  usePrefetch,
  useVirtualScroll,
  useShouldRender,
  useIdleCallback,
  useNetworkStatus,
  usePerformanceMonitor,
};
