/**
 * Knowledge Graph Embeddings Service
 * Generates and manages vector embeddings for concepts using OpenAI
 *
 * Phase 3 Component: Enables semantic search through vector similarity
 */

import { OpenAI } from "openai";
import { prisma } from "@/lib/prisma";

// Lazy initialization of OpenAI client
let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 1536;

/**
 * Generates embedding for a text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
  }
  
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: "float",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No embedding data returned from OpenAI");
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Creates a concept with embedding
 */
export async function createConceptWithEmbedding(data: {
  name: string;
  description?: string;
  subject: string;
  grade: string;
  difficulty?: string;
  definition?: string;
  examples?: string[];
  keyPoints?: string[];
  relatedTopics?: string[];
  sourceId?: string;
  metadata?: Record<string, any>;
}): Promise<any> {
  // Generate embedding from name + description + definition
  const textToEmbed = [
    data.name,
    data.description,
    data.definition,
    data.keyPoints?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  const embedding = await generateEmbedding(textToEmbed);

  // Store as raw number array for now (Prisma will handle conversion)
  const concept = await prisma.kgConcept.create({
    data: {
      name: data.name,
      description: data.description,
      subject: data.subject,
      grade: data.grade,
      difficulty: data.difficulty ?? "medium",
      definition: data.definition,
      examples: data.examples ?? [],
      keyPoints: data.keyPoints ?? [],
      relatedTopics: data.relatedTopics ?? [],
      sourceId: data.sourceId,
      embeddingModel: EMBEDDING_MODEL,
      metadata: data.metadata,
      // Note: embedding field will be handled separately in raw query
    },
  });

  // Store embedding in database using raw SQL
  await prisma.$executeRawUnsafe(
    `UPDATE "KgConcept" SET embedding = $1::vector WHERE id = $2`,
    `[${embedding.join(",")}]`,
    concept.id
  );

  return concept;
}

/**
 * Updates concept with new embedding
 */
export async function updateConceptEmbedding(conceptId: string): Promise<void> {
  const concept = await prisma.kgConcept.findUnique({
    where: { id: conceptId },
  });

  if (!concept) {
    throw new Error(`Concept ${conceptId} not found`);
  }

  const textToEmbed = [
    concept.name,
    concept.description,
    concept.definition,
    concept.keyPoints?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  const embedding = await generateEmbedding(textToEmbed);

  await prisma.$executeRawUnsafe(
    `UPDATE "KgConcept" SET embedding = $1::vector WHERE id = $2`,
    `[${embedding.join(",")}]`,
    conceptId
  );
}

/**
 * Creates a relationship between concepts
 */
export async function createRelationship(data: {
  sourceId: string;
  targetId: string;
  type: "prerequisite" | "related" | "part_of" | "extends" | "conflicts";
  description?: string;
  strength?: number;
  examples?: string[];
}): Promise<any> {
  return prisma.kgRelationship.create({
    data: {
      sourceId: data.sourceId,
      targetId: data.targetId,
      type: data.type,
      description: data.description,
      strength: data.strength ?? 0.7,
      examples: data.examples ?? [],
    },
  });
}

/**
 * Gets concept by ID with all relations
 */
export async function getConceptWithRelations(conceptId: string): Promise<any> {
  const concept = await prisma.kgConcept.findUnique({
    where: { id: conceptId },
    include: {
      asSource: {
        include: { target: true },
      },
      asTarget: {
        include: { source: true },
      },
      learningItems: true,
    },
  });

  return concept;
}

/**
 * Gets all prerequisites for a concept
 */
export async function getPrerequisites(conceptId: string): Promise<any[]> {
  const relationships = await prisma.kgRelationship.findMany({
    where: {
      targetId: conceptId,
      type: "prerequisite",
    },
    include: {
      source: true,
    },
    orderBy: { strength: "desc" },
  });

  return relationships.map((rel) => ({
    concept: rel.source,
    strength: rel.strength,
    description: rel.description,
  }));
}

/**
 * Gets all related concepts
 */
export async function getRelatedConcepts(
  conceptId: string,
  limit: number = 10
): Promise<any[]> {
  const relationships = await prisma.kgRelationship.findMany({
    where: {
      OR: [{ sourceId: conceptId }, { targetId: conceptId }],
      type: "related",
    },
    include: {
      source: true,
      target: true,
    },
    orderBy: { strength: "desc" },
    take: limit,
  });

  return relationships.map((rel) => ({
    concept: rel.sourceId === conceptId ? rel.target : rel.source,
    strength: rel.strength,
    type: rel.type,
    description: rel.description,
  }));
}

/**
 * Gets learning path (prerequisites chain) for a concept
 */
export async function getLearningPath(
  conceptId: string,
  maxDepth: number = 5
): Promise<any[]> {
  const path: any[] = [];
  const visited = new Set<string>();

  async function traversePrerequisites(
    currentId: string,
    depth: number
  ): Promise<void> {
    if (depth > maxDepth || visited.has(currentId)) return;

    visited.add(currentId);

    const prerequisites = await getPrerequisites(currentId);

    for (const prereq of prerequisites) {
      path.push({
        concept: prereq.concept,
        depth,
        strength: prereq.strength,
      });
      await traversePrerequisites(prereq.concept.id, depth + 1);
    }
  }

  await traversePrerequisites(conceptId, 0);

  // Sort by depth (prerequisites should come first)
  return path.sort((a, b) => b.depth - a.depth);
}

/**
 * Creates learning objectives for a concept
 */
export async function createLearningObjectives(
  conceptId: string,
  objectives: Array<{
    objective: string;
    difficulty:
      | "remember"
      | "understand"
      | "apply"
      | "analyze"
      | "evaluate"
      | "create";
  }>
): Promise<any[]> {
  return Promise.all(
    objectives.map((obj) =>
      prisma.learningObjective.create({
        data: {
          conceptId,
          objective: obj.objective,
          difficulty: obj.difficulty,
        },
      })
    )
  );
}

/**
 * Gets learning objectives for a concept
 */
export async function getLearningObjectives(
  conceptId: string
): Promise<any[]> {
  return prisma.learningObjective.findMany({
    where: { conceptId },
    orderBy: { difficulty: "asc" },
  });
}

/**
 * Batch creates concepts with embeddings
 */
export async function batchCreateConcepts(
  concepts: Array<{
    name: string;
    description?: string;
    subject: string;
    grade: string;
    difficulty?: string;
    definition?: string;
    examples?: string[];
    keyPoints?: string[];
  }>
): Promise<any[]> {
  const results = [];

  for (const concept of concepts) {
    try {
      const created = await createConceptWithEmbedding(concept);
      results.push({ success: true, concept: created });
    } catch (error) {
      results.push({
        success: false,
        concept: concept.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Gets embedding statistics for monitoring
 */
export async function getEmbeddingStats(): Promise<{
  totalConcepts: number;
  embeddedConcepts: number;
  missingEmbeddings: number;
  bySubject: Record<string, number>;
  byGrade: Record<string, number>;
}> {
  const allConcepts = await prisma.kgConcept.findMany({
    select: {
      id: true,
      subject: true,
      grade: true,
    },
  });

  const embeddings = await prisma.$queryRaw<
    Array<{ count: bigint }>
  >`SELECT COUNT(*) as count FROM "KgConcept" WHERE embedding IS NOT NULL`;

  const bySubject: Record<string, number> = {};
  const byGrade: Record<string, number> = {};

  allConcepts.forEach((concept) => {
    bySubject[concept.subject] = (bySubject[concept.subject] ?? 0) + 1;
    byGrade[concept.grade] = (byGrade[concept.grade] ?? 0) + 1;
  });

  return {
    totalConcepts: allConcepts.length,
    embeddedConcepts: Number(embeddings[0]?.count ?? 0),
    missingEmbeddings: allConcepts.length - Number(embeddings[0]?.count ?? 0),
    bySubject,
    byGrade,
  };
}
