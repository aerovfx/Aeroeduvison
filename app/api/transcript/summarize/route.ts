/**
 * Summarize Transcript API
 * Uses AI to summarize transcript
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    // Call LLM to summarize
    const summary = await summarizeWithAI(transcript);
    const keyPoints = extractKeyPoints(summary);

    return NextResponse.json({
      success: true,
      summary,
      keyPoints,
    });
  } catch (error) {
    console.error('Summarize error:', error);
    return NextResponse.json(
      { error: 'Failed to summarize transcript' },
      { status: 500 }
    );
  }
}

/**
 * Summarize transcript using AI
 */
async function summarizeWithAI(transcript: string): Promise<string> {
  // Call your preferred LLM API (OpenAI, Ollama, etc.)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Tóm tắt nội dung sau bằng tiếng Việt, ngắn gọn và đầy đủ ý chính.',
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content || '';
}

/**
 * Extract key points from summary
 */
function extractKeyPoints(summary: string): string[] {
  // Simple implementation - split by newlines
  return summary
    .split('\n')
    .filter(line => line.trim().length > 0)
    .slice(0, 5); // Top 5 key points
}
