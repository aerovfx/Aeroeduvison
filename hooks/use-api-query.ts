'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';

interface ApiError {
  message: string;
  status?: number;
}

/**
 * Optimized API hook with built-in caching, retries, and error handling
 * Uses React Query for automatic caching, background refetching, and deduplication
 */
export function useApiQuery<TData = unknown>(
  key: string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<TData, ApiError, TData, string[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, ApiError>({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const response = await fetch(endpoint, {
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw {
          message: error.message || `HTTP ${response.status}`,
          status: response.status,
        } as ApiError;
      }

      return response.json();
    },
    // Optimized defaults for better performance
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 min
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch on window focus by default
    ...options,
  });
}

/**
 * Hook for mutations with optimistic updates
 */
export function useApiMutation<TData = unknown, TVariables = unknown>(
  key: string[],
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST'
) {
  // In a real implementation, you'd use useMutation from React Query
  // This is a simplified version for demonstration
  return {
    mutate: async (variables: TVariables) => {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        throw new Error(`Mutation failed: ${response.status}`);
      }

      return response.json() as Promise<TData>;
    },
  };
}

/**
 * Prefetch data for faster navigation
 * Call this when user hovers over links or in anticipation of navigation
 */
export async function prefetchQuery(
  queryClient: any,
  key: string[],
  endpoint: string
) {
  await queryClient.prefetchQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Prefetch failed: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
