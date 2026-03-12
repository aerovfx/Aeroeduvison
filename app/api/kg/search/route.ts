/**
 * Semantic Search API Route
 * POST /api/kg/search - Search for concepts by meaning
 * GET /api/kg/search/trending - Get trending searches
 * GET /api/kg/search/recommendations - Get learning recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import {
  semanticSearch,
  findSimilarConcepts,
  recommendNextConcepts,
  crossSubjectSearch,
  getTrendingSearches,
  hybridSearch,
  type SemanticSearchResult,
} from "@/lib/kg/semantic-search";
import { getServerSession } from "next-auth/next";

// Validate request
function validateSearchRequest(body: any) {
  const errors: string[] = [];

  if (!body.query || typeof body.query !== "string") {
    errors.push("query is required and must be a string");
  }

  if (body.query && body.query.length < 2) {
    errors.push("query must be at least 2 characters");
  }

  if (body.limit && (typeof body.limit !== "number" || body.limit < 1 || body.limit > 50)) {
    errors.push("limit must be a number between 1 and 50");
  }

  if (body.minSimilarity && (typeof body.minSimilarity !== "number" || body.minSimilarity < 0 || body.minSimilarity > 1)) {
    errors.push("minSimilarity must be between 0 and 1");
  }

  return errors.length > 0 ? errors : null;
}

/**
 * POST /api/kg/search
 * Search for concepts by semantic meaning
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    // Optionally require authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const errors = validateSearchRequest(body);

    if (errors) {
      return NextResponse.json(
        { error: "Validation error", details: errors },
        { status: 400 }
      );
    }

    const {
      query,
      subject,
      grade,
      limit = 10,
      minSimilarity = 0.5,
      searchType = "semantic", // 'semantic', 'keyword', 'hybrid'
    } = body;

    let results: SemanticSearchResult[];

    if (searchType === "hybrid") {
      results = await hybridSearch(query, {
        subject,
        grade,
        limit,
        keywordWeight: body.keywordWeight ?? 0.3,
      });
    } else if (searchType === "keyword") {
      // Keyword search is handled by database text search
      // For now, use semantic with lower threshold
      results = await semanticSearch(query, {
        subject,
        grade,
        limit,
        minSimilarity: 0.3,
      });
    } else {
      // Default semantic search
      results = await semanticSearch(query, {
        subject,
        grade,
        limit,
        minSimilarity,
      });
    }

    return NextResponse.json({
      success: true,
      query,
      searchType,
      resultCount: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/kg/search/similar?conceptId=xxx
 * Find similar concepts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route 1: Similar concepts
    if (path.includes("/similar")) {
      const conceptId = url.searchParams.get("conceptId");
      const limit = parseInt(url.searchParams.get("limit") ?? "5");

      if (!conceptId) {
        return NextResponse.json(
          { error: "conceptId is required" },
          { status: 400 }
        );
      }

      const results = await findSimilarConcepts(conceptId, limit);

      return NextResponse.json({
        success: true,
        conceptId,
        resultCount: results.length,
        results,
      });
    }

    // Route 2: Recommendations
    if (path.includes("/recommendations")) {
      const conceptId = url.searchParams.get("conceptId");
      const difficulty = url.searchParams.get("difficulty");
      const learningPace = url.searchParams.get("learningPace");

      if (!conceptId) {
        return NextResponse.json(
          { error: "conceptId is required" },
          { status: 400 }
        );
      }

      const recommendations = await recommendNextConcepts(conceptId, {
        difficulty: difficulty as any,
        learningPace: learningPace as any,
      });

      return NextResponse.json({
        success: true,
        conceptId,
        recommendationCount: recommendations.length,
        recommendations,
      });
    }

    // Route 3: Cross-subject search
    if (path.includes("/cross-subject")) {
      const query = url.searchParams.get("q");
      const limit = parseInt(url.searchParams.get("limit") ?? "15");

      if (!query) {
        return NextResponse.json(
          { error: "q (query) is required" },
          { status: 400 }
        );
      }

      const results = await crossSubjectSearch(query, limit);

      return NextResponse.json({
        success: true,
        query,
        subjectCount: results.length,
        results,
      });
    }

    // Route 4: Trending searches
    if (path.includes("/trending")) {
      const days = parseInt(url.searchParams.get("days") ?? "7");
      const limit = parseInt(url.searchParams.get("limit") ?? "10");

      const trends = await getTrendingSearches(days, limit);

      return NextResponse.json({
        success: true,
        days,
        trendCount: trends.length,
        trends,
      });
    }

    return NextResponse.json(
      { error: "Route not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Search GET error:", error);
    return NextResponse.json(
      {
        error: "Search GET failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/kg/search
 * CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
