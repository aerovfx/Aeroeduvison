/**
 * API Route: Generate AI Learning Path Content
 * POST /api/learning-path/generate
 *
 * Integrates:
 * - OpenRouter API for AI content generation
 * - Question Bank for existing curriculum content
 * - Assessment data for personalization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

// OpenRouter config
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Check if OpenRouter key is valid (supports both sk-or- and ysk-or- prefixes)
 */
function isOpenRouterKeyValid(): boolean {
  if (!OPENROUTER_API_KEY?.trim()) return false;
  return OPENROUTER_API_KEY.startsWith('sk-or-') || OPENROUTER_API_KEY.startsWith('ysk-or-');
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(messages: Array<{ role: string; content: string }>, maxTokens = 4000): Promise<string> {
  if (!isOpenRouterKeyValid()) {
    throw new Error('OpenRouter API key not configured or invalid');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://aeroeduvison.local',
      'X-Title': 'AeroEduVison Learning Path Generator',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Fetch questions from question bank by subject and difficulty
 */
async function fetchQuestionsFromBank(filters: {
  subject?: string;
  grade?: string;
  difficulty?: string;
  limit?: number;
}): Promise<any[]> {
  try {
    if (!prisma.question) return [];

    const where: any = {};
    if (filters.subject) where.subject = filters.subject;
    if (filters.grade) where.grade = filters.grade;
    if (filters.difficulty) where.difficulty = filters.difficulty.toUpperCase();

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 20,
    });

    return questions;
  } catch (error) {
    console.warn('[LEARNING_PATH_GEN] Question bank not available:', error);
    return [];
  }
}

/**
 * Map Vietnamese subject names to question bank format
 */
function mapSubjectName(domain: string): string {
  const mapping: Record<string, string> = {
    math: 'Toán học',
    physics: 'Vật lý',
    chemistry: 'Hóa học',
    biology: 'Sinh học',
    computer_science: 'Tin học',
    music: 'Âm nhạc',
    art: 'Nghệ thuật',
    language: 'Ngôn ngữ',
    history: 'Lịch sử',
    geography: 'Địa lý',
    economics: 'Kinh tế',
    philosophy: 'Triết học',
    mathematics: 'Toán học',
    programming: 'Tin học',
  };
  return mapping[domain.toLowerCase()] || domain;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Allow in development mode without auth
    const isDev = process.env.NODE_ENV === 'development' || process.env.BYPASS_SUBSCRIPTION === 'true';
    if (!session?.user?.id && !isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      domains = ['math'],
      grade = '12',
      difficulty = 'intermediate',
      weeks = 4,
      lessonsPerWeek = 5,
      assessmentData,
      surveyData,
    } = body;

    console.log('[LEARNING_PATH_GEN] Generating path for:', {
      user: session?.user?.email || 'dev-user',
      domains,
      grade,
      difficulty,
      weeks,
    });

    // 1. Fetch existing questions from question bank for each domain
    const questionBankContent: Record<string, any[]> = {};
    for (const domain of domains) {
      const subjectName = mapSubjectName(domain);
      const questions = await fetchQuestionsFromBank({
        subject: subjectName,
        grade: `Lớp ${grade}`,
        difficulty: difficulty === 'beginner' ? 'EASY' : difficulty === 'advanced' ? 'HARD' : 'MEDIUM',
        limit: 30, // Fetch more so we can distribute across lessons
      });
      questionBankContent[domain] = questions;
    }

    const totalQuestionsFound = Object.values(questionBankContent).reduce(
      (sum, qs) => sum + qs.length, 0
    );
    console.log(`[LEARNING_PATH_GEN] Found ${totalQuestionsFound} questions from bank`);

    // 2. Build context for AI generation
    const questionContext = totalQuestionsFound > 0
      ? `\n\nNội dung từ ngân hàng đề hiện có (sử dụng làm tham chiếu):\n${
          Object.entries(questionBankContent)
            .filter(([, qs]) => qs.length > 0)
            .map(([domain, qs]) =>
              `Môn ${mapSubjectName(domain)}:\n${qs.slice(0, 3).map(q => `- ${q.content?.substring(0, 100)}`).join('\n')}`
            ).join('\n\n')
        }`
      : '';

    const assessmentContext = assessmentData
      ? `\n\nKết quả đánh giá người học:
- Điểm tổng hợp: ${assessmentData.compositeScore}/100
- Mức độ sẵn sàng: ${assessmentData.studentProfile?.overallReadiness}/100
- Độ khó đề xuất: ${assessmentData.studentProfile?.recommendedStartingDifficulty}/10
- Phong cách học: ${assessmentData.studentProfile?.learningStyleMatch}/100
- Điểm mạnh: ${assessmentData.studentProfile?.strengthDomains?.join(', ') || 'N/A'}
- Điểm yếu: ${assessmentData.studentProfile?.gapDomains?.join(', ') || 'N/A'}`
      : '';

    const surveyContext = surveyData
      ? `\n\nThông tin khảo sát:
- Mục tiêu: ${surveyData.primaryGoal || 'N/A'}
- Thời gian cam kết: ${surveyData.weeklyHours || 'N/A'}
- Phong cách học: ${surveyData.learningStyle || 'N/A'}
- Nội dung ưa thích: ${surveyData.preferredContentType?.join(', ') || 'N/A'}`
      : '';

    // 3. Generate with AI (OpenRouter) or fallback
    let generatedPath;

    if (isOpenRouterKeyValid()) {
      console.log('[LEARNING_PATH_GEN] Using OpenRouter for generation...');

      const prompt = `Tạo lộ trình học tập ${weeks} tuần (${lessonsPerWeek} bài/tuần) cho học sinh lớp ${grade}.

Các môn học: ${domains.map(d => mapSubjectName(d)).join(', ')}
Độ khó: ${difficulty === 'beginner' ? 'Cơ bản' : difficulty === 'advanced' ? 'Nâng cao' : 'Trung bình'}
${assessmentContext}${surveyContext}${questionContext}

Yêu cầu:
1. Mỗi bài học cần có: title, subject, type (lesson/quiz/practice/project), difficulty, duration (phút), xpReward, objectives (mảng 2-3 mục tiêu)
2. Bài học cần có tính liên tục, từ dễ đến khó
3. Nếu có nhiều môn, tạo liên kết liên môn (ví dụ: Toán → Vật lý)
4. Mỗi tuần có ít nhất 1 bài quiz/kiểm tra
5. Trả về JSON hợp lệ

Trả về JSON theo format:
{
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Tên chủ đề tuần",
      "lessons": [
        {
          "id": "w1-l1",
          "title": "Tên bài học",
          "subject": "mathematics",
          "type": "lesson",
          "difficulty": "beginner",
          "duration": 45,
          "xpReward": 100,
          "objectives": ["Mục tiêu 1", "Mục tiêu 2"],
          "content_summary": "Tóm tắt nội dung"
        }
      ]
    }
  ],
  "totalEstimatedHours": 40,
  "keyMilestones": ["Milestone 1", "Milestone 2"]
}

Chỉ trả về JSON, không có text giải thích.`;

      try {
        const aiResponse = await callOpenRouter([
          {
            role: 'system',
            content: 'Bạn là chuyên gia giáo dục Việt Nam. Tạo lộ trình học tập chi tiết, phù hợp chương trình THPT/Đại học Việt Nam. Trả về JSON hợp lệ.',
          },
          { role: 'user', content: prompt },
        ]);

        // Parse AI response - try to extract JSON
        let jsonStr = aiResponse;
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)```/) || aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1] || jsonMatch[0];
        }

        try {
          generatedPath = JSON.parse(jsonStr);
          console.log('[LEARNING_PATH_GEN] AI generated path successfully');
        } catch (parseErr) {
          console.warn('[LEARNING_PATH_GEN] Failed to parse AI response, using fallback');
          generatedPath = null;
        }
      } catch (aiErr) {
        console.error('[LEARNING_PATH_GEN] OpenRouter error:', aiErr);
        generatedPath = null;
      }
    }

    // 4. Fallback to structured generation if AI fails
    if (!generatedPath) {
      console.log('[LEARNING_PATH_GEN] Using structured fallback generation...');
      generatedPath = generateStructuredPath(domains, grade, difficulty, weeks, lessonsPerWeek, questionBankContent);
    }

    // 5. Enrich lessons with question bank content
    const enrichedPath = enrichWithQuestionBank(generatedPath, questionBankContent);

    return NextResponse.json({
      success: true,
      path: enrichedPath,
      meta: {
        aiGenerated: isOpenRouterKeyValid() && generatedPath !== null,
        model: isOpenRouterKeyValid() ? OPENROUTER_MODEL : 'structured-fallback',
        questionsFromBank: totalQuestionsFound,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('[LEARNING_PATH_GEN] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate learning path' },
      { status: 500 }
    );
  }
}

/**
 * Generate a structured learning path without AI (fallback)
 */
function generateStructuredPath(
  domains: string[],
  grade: string,
  difficulty: string,
  weeks: number,
  lessonsPerWeek: number,
  questionBankContent: Record<string, any[]>
) {
  const subjectTopics: Record<string, string[]> = {
    math: ['Hàm số và đồ thị', 'Phương trình bậc hai', 'Hệ phương trình', 'Đạo hàm', 'Tích phân', 'Xác suất thống kê', 'Hình học không gian', 'Vectơ', 'Ma trận', 'Giới hạn'],
    physics: ['Dao động cơ', 'Sóng cơ', 'Điện xoay chiều', 'Quang học', 'Vật lý hạt nhân', 'Cơ học chất điểm', 'Nhiệt động lực học', 'Điện từ'],
    chemistry: ['Cấu tạo nguyên tử', 'Liên kết hóa học', 'Phản ứng hóa học', 'Dung dịch', 'Kim loại', 'Phi kim', 'Hữu cơ cơ bản', 'Polime'],
    biology: ['Tế bào', 'Di truyền', 'Tiến hóa', 'Sinh thái', 'Quang hợp', 'Hô hấp tế bào', 'Đột biến', 'Chọn giống'],
    computer_science: ['Thuật toán cơ bản', 'Cấu trúc dữ liệu', 'Lập trình Python', 'Cơ sở dữ liệu', 'HTML/CSS', 'JavaScript cơ bản', 'AI cơ bản', 'An toàn mạng'],
    programming: ['Thuật toán cơ bản', 'Cấu trúc dữ liệu', 'Lập trình Python', 'HTML/CSS', 'JavaScript', 'React cơ bản'],
  };

  const allWeeks = [];
  let lessonCount = 0;

  for (let w = 1; w <= weeks; w++) {
    const lessons = [];
    for (let l = 1; l <= lessonsPerWeek; l++) {
      lessonCount++;
      const domainIndex = (lessonCount - 1) % domains.length;
      const domain = domains[domainIndex];
      const topics = subjectTopics[domain] || subjectTopics['math'];
      const topicIndex = (lessonCount - 1) % topics.length;
      const isQuiz = l === lessonsPerWeek; // Last lesson each week is a quiz

      lessons.push({
        id: `w${w}-l${l}`,
        title: isQuiz ? `Kiểm tra tuần ${w}` : topics[topicIndex],
        subject: domain,
        type: isQuiz ? 'quiz' : (l % 3 === 0 ? 'practice' : 'lesson'),
        difficulty: w <= Math.ceil(weeks / 3) ? 'beginner' : w <= Math.ceil(2 * weeks / 3) ? 'intermediate' : 'advanced',
        duration: isQuiz ? 30 : 45 + Math.floor(Math.random() * 15),
        xpReward: isQuiz ? 200 : 100 + (w - 1) * 25,
        objectives: isQuiz
          ? [`Ôn tập kiến thức tuần ${w}`, 'Đánh giá mức độ hiểu bài']
          : [`Hiểu khái niệm ${topics[topicIndex]}`, 'Áp dụng vào bài tập', 'Liên hệ thực tế'],
        content_summary: isQuiz
          ? `Bài kiểm tra tổng hợp kiến thức tuần ${w}`
          : `Bài học về ${topics[topicIndex]} - Lớp ${grade}`,
      });
    }

    allWeeks.push({
      weekNumber: w,
      theme: `Tuần ${w}: ${domains.map(d => mapSubjectName(d)).join(' & ')}`,
      lessons,
    });
  }

  return {
    weeks: allWeeks,
    totalEstimatedHours: allWeeks.reduce(
      (sum, w) => sum + w.lessons.reduce((s, l) => s + l.duration, 0), 0
    ) / 60,
    keyMilestones: [
      `Hoàn thành ${lessonsPerWeek} bài học tuần 1`,
      `Kiểm tra giữa kỳ tuần ${Math.ceil(weeks / 2)}`,
      `Hoàn thành toàn bộ ${weeks} tuần`,
    ],
  };
}

/**
 * Score how well a question matches a lesson's topic
 * Higher score = better match
 */
function scoreQuestionRelevance(question: any, lessonTitle: string): number {
  const title = lessonTitle.toLowerCase();
  const topic = (question.topic || '').toLowerCase();
  const content = (question.content || '').toLowerCase();
  const keywords: string[] = (question.keywords || []).map((k: string) => k.toLowerCase());
  const tags: string[] = (question.tags || []).map((t: string) => t.toLowerCase());

  let score = 0;

  // Extract meaningful words from lesson title
  const titleWords = title
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 1);

  for (const word of titleWords) {
    if (topic.includes(word)) score += 10;       // Topic field match = strongest
    if (keywords.includes(word)) score += 8;      // Keyword exact match
    if (tags.includes(word)) score += 6;          // Tag match
    if (content.includes(word)) score += 3;       // Content contains word
  }

  // Bonus: if topic field is a substring of lesson title or vice versa
  if (topic && (title.includes(topic) || topic.includes(title.split(' ').slice(0, 3).join(' ')))) {
    score += 20;
  }

  return score;
}

/**
 * Enrich AI-generated path with question bank content
 * Matches questions to each lesson's specific topic using relevance scoring
 */
function enrichWithQuestionBank(
  path: any,
  questionBankContent: Record<string, any[]>
) {
  if (!path?.weeks) return path;

  // Track which question IDs have already been assigned to avoid duplicates
  const usedQuestionIds = new Set<string>();

  for (const week of path.weeks) {
    for (const lesson of week.lessons || []) {
      const domain = lesson.subject;
      const allQuestions = questionBankContent[domain] || [];
      const lessonTitle = lesson.title || '';

      if (allQuestions.length === 0) continue;

      const maxQ = lesson.type === 'quiz' ? 7 : lesson.type === 'practice' ? 5 : 3;

      // Score and rank questions by relevance to this specific lesson topic
      const scored = allQuestions
        .filter(q => !usedQuestionIds.has(q.id))
        .map(q => ({ question: q, score: scoreQuestionRelevance(q, lessonTitle) }))
        .sort((a, b) => b.score - a.score);

      // Take top-scoring questions (minimum score > 0 preferred, fallback to any)
      const topicMatched = scored.filter(s => s.score > 0).slice(0, maxQ);
      const selected = topicMatched.length >= 2
        ? topicMatched
        : scored.slice(0, maxQ); // Fallback: take best available even if score=0

      // Mark as used
      selected.forEach(s => usedQuestionIds.add(s.question.id));

      lesson.bankQuestions = selected.map(s => ({
        id: s.question.id,
        content: s.question.content,
        questionType: s.question.questionType,
        difficulty: s.question.difficulty,
        options: s.question.options || [],
        correctAnswer: s.question.correctAnswer,
        explanation: s.question.explanation,
        learningObjectives: s.question.learningObjectives || [],
        topic: s.question.topic,
        relevanceScore: s.score,
      }));
      lesson.hasQuestionBankContent = selected.length > 0;
      lesson.bankQuestionCount = selected.length;
    }
  }

  return path;
}
