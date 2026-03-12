/**
 * Semantic Search Service
 * Finds relevant concepts using vector similarity search
 * 
 * Phase 3 Component: Enables "search by meaning" instead of keywords
 */

import { prisma } from "@/lib/prisma";
import { generateEmbedding, EMBEDDING_MODEL } from "./embeddings";

export interface SemanticSearchResult {
  id: string;
  name: string;
  description?: string;
  subject: string;
  grade: string;
  difficulty: string;
  similarity: number; // 0-1 score
  definition?: string;
  keyPoints: string[];
  examples: string[];
}

/**
 * Searches for concepts by semantic meaning
 * Uses vector similarity to find relevant concepts
 */
export async function semanticSearch(
  query: string,
  options?: {
    subject?: string;
    grade?: string;
    limit?: number;
    minSimilarity?: number; // 0-1, default 0.5
  }
): Promise<SemanticSearchResult[]> {
  const limit = options?.limit ?? 10;
  const minSimilarity = options?.minSimilarity ?? 0.5;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Format for PostgreSQL pgvector
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Search using vector similarity
  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      name: string;
      description: string | null;
      subject: string;
      grade: string;
      difficulty: string;
      definition: string | null;
      keyPoints: string[];
      examples: string[];
      similarity: number;
    }>
  >(
    `
    SELECT 
      id,
      name,
      description,
      subject,
      grade,
      difficulty,
      definition,
      "keyPoints" as "keyPoints",
      examples,
      (1 - (embedding <=> $1::vector)) as similarity
    FROM "KgConcept"
    WHERE (1 - (embedding <=> $1::vector)) >= $2
    ${options?.subject ? `AND subject = $3` : ""}
    ${options?.grade ? `AND grade = $4` : ""}
    ORDER BY similarity DESC
    LIMIT $${options?.subject && options?.grade ? "5" : options?.subject || options?.grade ? "4" : "3"}
  `,
    embeddingStr,
    minSimilarity,
    ...(options?.subject ? [options.subject] : []),
    ...(options?.grade ? [options.grade] : []),
    limit
  );

  // Cache the search result
  try {
    const cacheEmbedding = `[${queryEmbedding.join(",")}]`;
    const resultIds = results.map((r) => r.id);

    await prisma.conceptSearchCache.create({
      data: {
        query,
        results: resultIds,
        resultCount: results.length,
        avgRelevance:
          results.length > 0
            ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
            : 0,
      },
    });

    // Also try to cache the query embedding (optional, non-blocking)
    // Note: This is informational, actual similarity search uses the embedding directly
  } catch (error) {
    console.warn("Failed to cache search result:", error);
  }

  return results.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || undefined,
    subject: r.subject,
    grade: r.grade,
    difficulty: r.difficulty,
    similarity: r.similarity,
    definition: r.definition || undefined,
    keyPoints: r.keyPoints || [],
    examples: r.examples || [],
  }));
}

/**
 * Finds similar concepts to a given concept
 */
export async function findSimilarConcepts(
  conceptId: string,
  limit: number = 5
): Promise<SemanticSearchResult[]> {
  const concept = await prisma.kgConcept.findUnique({
    where: { id: conceptId },
  });

  if (!concept) {
    throw new Error(`Concept ${conceptId} not found`);
  }

  // Use concept name + description for similarity search
  const searchText = [concept.name, concept.description, concept.definition]
    .filter(Boolean)
    .join(" ");

  const results = await semanticSearch(searchText, {
    subject: concept.subject,
    limit,
    minSimilarity: 0.4, // Lower threshold for same-subject search
  });

  // Filter out the original concept
  return results.filter((r) => r.id !== conceptId);
}

/**
 * Recommends next concepts to learn (based on prerequisites and related topics)
 */
export async function recommendNextConcepts(
  currentConceptId: string,
  studentProfile?: {
    difficulty?: "easy" | "medium" | "hard";
    learningPace?: "slow" | "normal" | "fast";
    strengths?: string[];
    weaknesses?: string[];
  }
): Promise<
  Array<{
    concept: SemanticSearchResult;
    reason: string;
    priority: number; // 1-10 scale
  }>
> {
  const concept = await prisma.kgConcept.findUnique({
    where: { id: currentConceptId },
    include: {
      asSource: {
        include: { target: true },
      },
      asTarget: {
        include: { source: true },
      },
    },
  });

  if (!concept) {
    throw new Error(`Concept ${currentConceptId} not found`);
  }

  const recommendations: Array<{
    concept: SemanticSearchResult;
    reason: string;
    priority: number;
  }> = [];

  // Get next concepts (from asSource relationships)
  for (const rel of concept.asSource) {
    const target = rel.target;

    // Check if matches student difficulty
    const difficultyMatch = !studentProfile?.difficulty ||
      target.difficulty === studentProfile.difficulty || (
        studentProfile.difficulty === "hard" &&
        target.difficulty !== "easy"
      );

    if (difficultyMatch) {
      recommendations.push({
        concept: {
          id: target.id,
          name: target.name,
          description: target.description || undefined,
          subject: target.subject,
          grade: target.grade,
          difficulty: target.difficulty,
          similarity: 0.9, // High relevance as it's related
          definition: target.definition || undefined,
          keyPoints: target.keyPoints || [],
          examples: target.examples || [],
        },
        reason: `Follows from ${concept.name} (${rel.type})`,
        priority: Math.min(10, Math.round(rel.strength * 10)),
      });
    }
  }

  // Get related concepts using semantic similarity
  const similarConcepts = await findSimilarConcepts(currentConceptId, 5);
  for (const similar of similarConcepts) {
    if (
      !recommendations.find(
        (r) => r.concept.id === similar.id
      )
    ) {
      recommendations.push({
        concept: similar,
        reason: `Related to ${concept.name}`,
        priority: Math.round(similar.similarity * 10),
      });
    }
  }

  // Sort by priority
  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

/**
 * Searches across multiple subjects/topics
 */
export async function crossSubjectSearch(
  query: string,
  limit: number = 15
): Promise<
  Array<{
    subject: string;
    concepts: SemanticSearchResult[];
  }>
> {
  const allResults = await semanticSearch(query, {
    limit,
    minSimilarity: 0.4,
  });

  // Group by subject
  const grouped: Record<string, SemanticSearchResult[]> = {};

  for (const result of allResults) {
    if (!grouped[result.subject]) {
      grouped[result.subject] = [];
    }
    grouped[result.subject].push(result);
  }

  return Object.entries(grouped).map(([subject, concepts]) => ({
    subject,
    concepts,
  }));
}

/**
 * Gets search trending topics based on cache hits
 */
export async function getTrendingSearches(
  days: number = 7,
  limit: number = 10
): Promise<
  Array<{
    query: string;
    hitCount: number;
    avgRelevance: number;
    lastSearched: Date;
  }>
> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const trends = await prisma.conceptSearchCache.findMany({
    where: {
      createdAt: { gte: cutoff },
    },
    orderBy: [{ hitCount: "desc" }, { avgRelevance: "desc" }],
    take: limit,
  });

  return trends.map((t) => ({
    query: t.query,
    hitCount: t.hitCount,
    avgRelevance: t.avgRelevance,
    lastSearched: t.lastAccessedAt,
  }));
}

/**
 * Advanced search combining keyword and semantic search
 */
export async function hybridSearch(
  query: string,
  options?: {
    subject?: string;
    grade?: string;
    limit?: number;
    keywordWeight?: number; // 0-1, default 0.3
  }
): Promise<SemanticSearchResult[]> {
  const limit = options?.limit ?? 10;
  const keywordWeight = options?.keywordWeight ?? 0.3;

  // Get semantic results
  const semanticResults = await semanticSearch(query, {
    subject: options?.subject,
    grade: options?.grade,
    limit: limit * 2, // Get more for combining
    minSimilarity: 0.3,
  });

  // Get keyword matches
  const keywordResults = await prisma.kgConcept.findMany({
    where: {
      OR: [
        {
          name: {
            search: query.split(" ").join(" | "),
          },
        },
        {
          description: {
            search: query.split(" ").join(" | "),
          },
        },
      ],
      subject: options?.subject,
      grade: options?.grade,
    },
    take: limit * 2,
  });

  // Combine and score
  const combined = new Map<string, SemanticSearchResult>();

  // Add semantic results (70% weight)
  for (const result of semanticResults) {
    combined.set(result.id, {
      ...result,
      similarity: result.similarity * (1 - keywordWeight),
    });
  }

  // Add/boost keyword results (30% weight)
  for (const result of keywordResults) {
    const existing = combined.get(result.id);
    if (existing) {
      existing.similarity = Math.max(
        existing.similarity,
        0.8 * keywordWeight
      );
    } else {
      combined.set(result.id, {
        id: result.id,
        name: result.name,
        description: result.description || undefined,
        subject: result.subject,
        grade: result.grade,
        difficulty: result.difficulty,
        similarity: 0.8 * keywordWeight,
        definition: result.definition || undefined,
        keyPoints: result.keyPoints || [],
        examples: result.examples || [],
      });
    }
  }

  // Sort by combined score and return top results
  return Array.from(combined.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
