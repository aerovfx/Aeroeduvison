/**
 * request-dedup.ts - Request deduplication and debouncing
 * 
 * Prevents duplicate concurrent requests and implements debouncing
 * for better performance and reduced server load
 */

import { apiLogger } from '../logging-simple';

// Pending requests tracker
const pendingRequests = new Map<string, Promise<any>>();

// Debounce timers
const debounceTimers = new Map<string, NodeJS.Timeout>();

// Throttle state
const throttleState = new Map<string, { lastCall: number; queue: Array<() => void> }>();

/**
 * Deduplicate concurrent requests
 * If a request with the same key is pending, return the existing promise
 */
export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if request is already pending
  const existing = pendingRequests.get(key);
  if (existing) {
    apiLogger.debug('Request deduplicated', { metadata: { key } });
    return existing;
  }

  // Execute request and track it
  const promise = (async () => {
    try {
      return await requestFn();
    } finally {
      // Remove from pending when complete
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Debounce function - delays execution until no calls for delay ms
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options?: {
    key?: (...args: Parameters<T>) => string;
    immediate?: boolean;
  }
): (...args: Parameters<T>) => void {
  const { key = () => 'default', immediate = false } = options || {};

  return function (...args: Parameters<T>) {
    const debounceKey = key(...args);
    const callNow = immediate && !debounceTimers.has(debounceKey);

    // Clear existing timer
    const existingTimer = debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      debounceTimers.delete(debounceKey);
      fn(...args);
    }, delay);

    debounceTimers.set(debounceKey, timer);

    // Call immediately if first call
    if (callNow) {
      fn(...args);
    }
  };
}

/**
 * Throttle function - limits execution to once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number,
  options?: {
    key?: (...args: Parameters<T>) => string;
    trailing?: boolean;
  }
): (...args: Parameters<T>) => void {
  const { key = () => 'default', trailing = true } = options || {};

  return function (...args: Parameters<T>) {
    const throttleKey = key(...args);
    const now = Date.now();
    const state = throttleState.get(throttleKey);

    if (!state) {
      // First call - execute immediately
      fn(...args);
      throttleState.set(throttleKey, {
        lastCall: now,
        queue: [],
      });
    } else {
      const elapsed = now - state.lastCall;

      if (elapsed >= interval) {
        // Execute immediately and update last call
        fn(...args);
        state.lastCall = now;

        // Execute queued calls if any
        if (state.queue.length > 0) {
          const queued = state.queue.shift()!;
          setTimeout(() => queued(), interval - elapsed);
        }
      } else if (trailing) {
        // Queue for later execution
        state.queue.push(() => fn(...args));
        
        // Limit queue size
        if (state.queue.length > 5) {
          state.queue.shift();
        }
      }
    }
  };
}

/**
 * Debounced async function with request deduplication
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number,
  options?: {
    key?: (...args: Parameters<T>) => string;
  }
): (...args: Parameters<T>) => ReturnType<T> {
  const { key = (...args: Parameters<T>) => JSON.stringify(args) } = options || {};

  return function (...args: Parameters<T>) {
    const debounceKey = key(...args);

    return new Promise((resolve, reject) => {
      // Clear existing timer
      const existingTimer = debounceTimers.get(debounceKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        debounceTimers.delete(debounceKey);
        
        // Use deduplication for the actual request
        deduplicateRequest(debounceKey, () => fn(...args))
          .then(resolve)
          .catch(reject);
      }, delay);

      debounceTimers.set(debounceKey, timer);
    });
  };
}

/**
 * Clear all debounce timers
 */
export function clearDebounceTimers(): void {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
}

/**
 * Clear throttle state
 */
export function clearThrottleState(): void {
  throttleState.clear();
}

/**
 * Get pending request count
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

/**
 * Get debounce timer count
 */
export function getDebounceTimerCount(): number {
  return debounceTimers.size;
}

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics() {
  return {
    pendingRequests: pendingRequests.size,
    debounceTimers: debounceTimers.size,
    throttledKeys: throttleState.size,
    queueLength: globalRequestQueue?.getQueueLength?.() ?? 0,
    activeRequests: globalRequestQueue?.getActiveCount?.() ?? 0,
  };
}

/**
 * Request priority queue for better resource management
 */
interface QueuedRequest {
  key: string;
  priority: number; // Higher = more important
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = new Map<string, boolean>();
  private maxConcurrent = 5;
  private activeCount = 0;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  enqueue<T>(
    key: string,
    fn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        key,
        priority,
        fn,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(request);
      this.queue.sort((a, b) => {
        // Sort by priority (descending), then by timestamp (ascending)
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift()!;

      // Skip if already processing
      if (this.processing.get(request.key)) {
        continue;
      }

      this.processing.set(request.key, true);
      this.activeCount++;

      // Process request
      request.fn()
        .then(request.resolve)
        .catch(request.reject)
        .finally(() => {
          this.processing.delete(request.key);
          this.activeCount--;
          this.processQueue();
        });
    }
  }

  clear(): void {
    this.queue = [];
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getActiveCount(): number {
    return this.activeCount;
  }
}

// Global request queue instance
export const globalRequestQueue = new RequestQueue(5);

/**
 * Queue a request with priority
 */
export function queueRequest<T>(
  key: string,
  fn: () => Promise<T>,
  priority: number = 0
): Promise<T> {
  return globalRequestQueue.enqueue(key, fn, priority);
}

export default {
  deduplicateRequest,
  debounce,
  throttle,
  debounceAsync,
  clearDebounceTimers,
  clearThrottleState,
  queueRequest,
  globalRequestQueue,
};
