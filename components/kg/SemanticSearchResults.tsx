/**
 * Semantic Search Results Component
 * Displays and manages semantic search results with filters and interactions
 */

"use client";

import { useState } from "react";
import { ConceptSearchResult, SearchRecommendation } from "@/hooks/useSemanticSearch";
import {
  Search,
  Filter,
  Zap,
  BookOpen,
  ChevronRight,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface SemanticSearchResultsProps {
  results: ConceptSearchResult[];
  isLoading: boolean;
  error?: string | null;
  onSelectConcept?: (concept: ConceptSearchResult) => void;
  onGetRecommendations?: (conceptId: string) => void;
  showStats?: boolean;
}

/**
 * Component displaying individual search result card
 */
function ResultCard({
  concept,
  onClick,
  onGetRecommendations,
}: {
  concept: ConceptSearchResult;
  onClick?: (concept: ConceptSearchResult) => void;
  onGetRecommendations?: (conceptId: string) => void;
}) {
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return "bg-green-100 text-green-800";
    if (similarity >= 0.8) return "bg-blue-100 text-blue-800";
    if (similarity >= 0.7) return "bg-yellow-100 text-yellow-800";
    if (similarity >= 0.6) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "hard":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div
      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(concept)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg text-gray-900 flex-1">
          {concept.name}
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSimilarityColor(concept.similarity)}`}>
          {(concept.similarity * 100).toFixed(0)}%
        </div>
      </div>

      {concept.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {concept.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
          {concept.subject}
        </span>
        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
          Grade {concept.grade}
        </span>
        <span className={`px-2 py-1 text-xs bg-gray-100 rounded font-medium ${getDifficultyColor(concept.difficulty)}`}>
          {concept.difficulty.charAt(0).toUpperCase() + concept.difficulty.slice(1)}
        </span>
      </div>

      {concept.keyPoints.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-600 font-medium mb-1">Key Points:</p>
          <div className="flex flex-wrap gap-1">
            {concept.keyPoints.slice(0, 3).map((point, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
              >
                {point}
              </span>
            ))}
            {concept.keyPoints.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-gray-600">
                +{concept.keyPoints.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {onGetRecommendations && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGetRecommendations(concept.id);
          }}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          <Zap className="w-4 h-4" />
          Get Recommendations
        </button>
      )}
    </div>
  );
}

/**
 * Main search results component
 */
export function SemanticSearchResults({
  results,
  isLoading,
  error,
  onSelectConcept,
  onGetRecommendations,
  showStats = true,
}: SemanticSearchResultsProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  );
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const filteredResults = results.filter((r) => {
    if (selectedDifficulty && r.difficulty !== selectedDifficulty) return false;
    if (selectedSubject && r.subject !== selectedSubject) return false;
    return true;
  });

  const subjects = [...new Set(results.map((r) => r.subject))];
  const difficulties = [...new Set(results.map((r) => r.difficulty))];

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900">Search Error</h3>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Searching concepts...</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No concepts found. Try a different search.</p>
      </div>
    );
  }

  const avgSimilarity =
    results.length > 0
      ? (
          results.reduce((sum, r) => sum + r.similarity, 0) / results.length
        ).toFixed(2)
      : "0";

  return (
    <div className="space-y-6">
      {/* Search Statistics */}
      {showStats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">
              {results.length}
            </div>
            <div className="text-sm text-blue-700">Results Found</div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {avgSimilarity}
            </div>
            <div className="text-sm text-green-700">Avg Relevance</div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">
              {subjects.length}
            </div>
            <div className="text-sm text-purple-700">Subjects</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {(subjects.length > 1 || difficulties.length > 1) && (
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>

          {subjects.length > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSubject(null)}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  selectedSubject === null
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Subjects
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() =>
                    setSelectedSubject(
                      selectedSubject === subject ? null : subject
                    )
                  }
                  className={`px-3 py-1 text-sm rounded-full transition ${
                    selectedSubject === subject
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          )}

          {difficulties.length > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDifficulty(null)}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  selectedDifficulty === null
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Levels
              </button>
              {difficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() =>
                    setSelectedDifficulty(
                      selectedDifficulty === difficulty ? null : difficulty
                    )
                  }
                  className={`px-3 py-1 text-sm rounded-full transition ${
                    selectedDifficulty === difficulty
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredResults.map((concept) => (
          <ResultCard
            key={concept.id}
            concept={concept}
            onClick={onSelectConcept}
            onGetRecommendations={onGetRecommendations}
          />
        ))}
      </div>

      {filteredResults.length === 0 && results.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">
            No results match your filters. Try adjusting them.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Recommendations display component
 */
export function RecommendationsDisplay({
  recommendations,
  isLoading,
  onSelectConcept,
}: {
  recommendations: SearchRecommendation[];
  isLoading: boolean;
  onSelectConcept?: (concept: ConceptSearchResult) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading recommendations...</span>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No recommendations available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-500" />
        Recommended Next Topics
      </h3>

      <div className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div
            key={rec.concept.id}
            className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSelectConcept?.(rec.concept)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {rec.concept.name}
                  </h4>
                  <p className="text-xs text-gray-600">{rec.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {rec.priority}
                  </div>
                  <div className="text-xs text-gray-600">/10</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {rec.concept.description && (
              <p className="text-sm text-gray-600 line-clamp-2 ml-11">
                {rec.concept.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
