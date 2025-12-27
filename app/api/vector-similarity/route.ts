import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache for embeddings
const embeddingCache = new Map<string, number[]>();

// Calculate cosine similarity
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Simple text to vector (bag of words approach for demo)
// In production, use Sentence Transformers or OpenAI embeddings
function textToVector(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const wordSet = new Set(words);
  
  // Create a simple vector based on word presence
  const commonWords = ['đảng', 'lãnh đạo', 'nhân dân', 'cách mạng', 'thắng lợi', 
                       'đoàn kết', 'dân tộc', 'thời cơ', 'độc lập', 'tự do'];
  
  const vector: number[] = commonWords.map(word => {
    const count = words.filter(w => w.includes(word)).length;
    return count > 0 ? Math.log(count + 1) : 0;
  });
  
  // Add TF-IDF-like features
  vector.push(words.length); // Document length
  vector.push(wordSet.size); // Vocabulary size
  vector.push(wordSet.size / words.length); // Lexical diversity
  
  return vector;
}

export async function POST(req: NextRequest) {
  try {
    const { 
      student_answer, 
      model_answer,
      use_cache = true
    } = await req.json();

    if (!student_answer || !model_answer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = `${student_answer.substring(0, 50)}_${model_answer.substring(0, 50)}`;
    let studentVector: number[];
    let modelVector: number[];
    
    if (use_cache && embeddingCache.has(cacheKey + '_student')) {
      studentVector = embeddingCache.get(cacheKey + '_student')!;
      modelVector = embeddingCache.get(cacheKey + '_model')!;
      console.log('✅ Cache hit! Embedding retrieved from cache');
    } else {
      // Generate vectors
      studentVector = textToVector(student_answer);
      modelVector = textToVector(model_answer);
      
      // Cache them
      if (use_cache) {
        embeddingCache.set(cacheKey + '_student', studentVector);
        embeddingCache.set(cacheKey + '_model', modelVector);
        console.log('💾 Cached new embeddings');
      }
    }
    
    // Calculate similarity
    const similarity = cosineSimilarity(studentVector, modelVector);
    const similarityPercent = Math.round(similarity * 100);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      similarity: similarity,
      similarity_percent: similarityPercent,
      student_vector_size: studentVector.length,
      model_vector_size: modelVector.length,
      cache_used: use_cache && embeddingCache.has(cacheKey + '_student'),
      cache_size: embeddingCache.size,
      processing_time_ms: processingTime
    });

  } catch (error: any) {
    console.error('Error in vector similarity:', error);
    return NextResponse.json(
      { error: 'Error calculating similarity', details: error.message },
      { status: 500 }
    );
  }
}

// Endpoint to clear cache
export async function DELETE() {
  embeddingCache.clear();
  return NextResponse.json({ 
    message: 'Cache cleared', 
    cache_size: 0 
  });
}

