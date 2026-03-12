/**
 * useSemanticSearch Hook
 * Client-side hook for semantic concept search
 * 
 * Phase 3 Component: Enables frontend to search concepts by meaning
 */

"use client";

import { useState, useCallback, useRef } from "react";

export interface ConceptSearchResult {
  id: string;
  name: string;
  description?: string;
  subject: string;
  grade: string;
  difficulty: string;
  similarity: number;
  definition?: string;
  keyPoints: string[];
  examples: string[];
}

export interface SearchRecommendation {
  concept: ConceptSearchResult;
  reason: string;
  priority: number;
}

export type SearchType = "semantic" | "keyword" | "hybrid";

/**
 * Hook for semantic search functionality
 */
export function useSemanticSearch() {
  const [results, setResults] = useState<ConceptSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [searchStats, setSearchStats] = useState({
    totalResults: 0,
    searchDuration: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Performs semantic search
   */
  const search = useCallback(
    async (
      query: string,
      options?: {
        subject?: string;
        grade?: string;
        limit?: number;
        minSimilarity?: number;
        searchType?: SearchType;
      }
    ): Promise<ConceptSearchResult[]> => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);
      setLastQuery(query);

      const startTime = performance.now();

      try {
        const response = await fetch("/api/kg/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            subject: options?.subject,
            grade: options?.grade,
            limit: options?.limit ?? 10,
            minSimilarity: options?.minSimilarity ?? 0.5,
            searchType: options?.searchType ?? "semantic",
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Search failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || "Search failed");
        }

        const duration = Math.round(performance.now() - startTime);
        setResults(data.results);
        setSearchStats({
          totalResults: data.resultCount,
          searchDuration: duration,
        });

        return data.results;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("Search cancelled");
          return [];
        }

        const errorMsg = err instanceof Error ? err.message : "Search failed";
        setError(errorMsg);
        setResults([]);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Finds similar concepts
   */
  const findSimilar = useCallback(async (conceptId: string, limit = 5) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/kg/search/similar?conceptId=${conceptId}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to find similar concepts`);
      }

      const data = await response.json();
      setResults(data.results);
      return data.results;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed";
      setError(errorMsg);
      setResults([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Gets learning recommendations
   */
  const getRecommendations = useCallback(
    async (
      conceptId: string,
      profile?: {
        difficulty?: "easy" | "medium" | "hard";
        learningPace?: "slow" | "normal" | "fast";
      }
    ): Promise<SearchRecommendation[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          conceptId,
          ...(profile?.difficulty && { difficulty: profile.difficulty }),
          ...(profile?.learningPace && { learningPace: profile.learningPace }),
        });

        const response = await fetch(`/api/kg/search/recommendations?${params}`);

        if (!response.ok) {
          throw new Error(`Failed to get recommendations`);
        }

        const data = await response.json();
        return data.recommendations ?? [];
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed";
        setError(errorMsg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Gets cross-subject search results
   */
  const searchCrossSubject = useCallback(
    async (query: string, limit = 15) => {
      setIsLoading(true);
      setError(null);
      setLastQuery(query);

      try {
        const response = await fetch(
          `/api/kg/search/cross-subject?q=${encodeURIComponent(query)}&limit=${limit}`
        );

        if (!response.ok) {
          throw new Error(`Cross-subject search failed`);
        }

        const data = await response.json();
        setSearchStats({
          totalResults: data.results.length,
          searchDuration: 0,
        });
        return data.results;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed";
        setError(errorMsg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Gets trending searches
   */
  const getTrending = useCallback(async (days = 7, limit = 10) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/kg/search/trending?days=${days}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get trending searches`);
      }

      const data = await response.json();
      return data.trends ?? [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed";
      setError(errorMsg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clears search results
   */
  const clearSearch = useCallback(() => {
    setResults([]);
    setError(null);
    setLastQuery("");
    setSearchStats({ totalResults: 0, searchDuration: 0 });
  }, []);

  return {
    // Data
    results,
    isLoading,
    error,
    lastQuery,
    searchStats,

    // Methods
    search,
    findSimilar,
    getRecommendations,
    searchCrossSubject,
    getTrending,
    clearSearch,

    // Derived
    hasResults: results.length > 0,
    isEmpty: results.length === 0 && !isLoading && lastQuery !== "",
  };
}

/**
 * Hook for displaying search results with filtering
 */
export function useSearchResults(results: ConceptSearchResult[]) {
  const [filteredResults, setFilteredResults] = useState(results);
  const [filters, setFilters] = useState<{
    subject?: string;
    grade?: string;
    difficulty?: string;
    minSimilarity?: number;
  }>({});

  // Update filtered results when filters or results change
  const applyFilters = useCallback(
    (
      newFilters: typeof filters
    ) => {
      setFilters(newFilters);

      let filtered = results;

      if (newFilters.subject) {
        filtered = filtered.filter((r) => r.subject === newFilters.subject);
      }

      if (newFilters.grade) {
        filtered = filtered.filter((r) => r.grade === newFilters.grade);
      }

      if (newFilters.difficulty) {
        filtered = filtered.filter(
          (r) => r.difficulty === newFilters.difficulty
        );
      }

      if (newFilters.minSimilarity) {
        filtered = filtered.filter(
          (r) => r.similarity >= newFilters.minSimilarity!
        );
      }

      setFilteredResults(filtered);
    },
    [results]
  );

  // Get available filter options
  const getFilterOptions = useCallback(
    () => ({
      subjects: [...new Set(results.map((r) => r.subject)).values()],
      grades: [...new Set(results.map((r) => r.grade)).values()],
      difficulties: [...new Set(results.map((r) => r.difficulty)).values()],
    }),
    [results]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setFilteredResults(results);
  }, [results]);

  return {
    filteredResults,
    filters,
    applyFilters,
    clearFilters,
    getFilterOptions,
    resultCount: filteredResults.length,
  };
}
