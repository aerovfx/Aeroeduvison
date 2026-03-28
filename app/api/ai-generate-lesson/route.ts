import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// ─── Provider Config ────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const XAI_API_KEY = process.env.XAI_API_KEY || '';

function isOpenRouterValid(): boolean {
  if (!OPENROUTER_API_KEY.trim()) return false;
  return OPENROUTER_API_KEY.startsWith('sk-or-') || OPENROUTER_API_KEY.startsWith('ysk-or-');
}

// ─── Subject mapping ────────────────────────────────────
function mapSubjectToVN(subject: string): string {
  const map: Record<string, string> = {
    mathematics: 'Toán học', math: 'Toán học',
    physics: 'Vật lý', chemistry: 'Hóa học',
    biology: 'Sinh học', computer_science: 'Tin học',
    programming: 'Tin học', language: 'Ngôn ngữ',
    history: 'Lịch sử', geography: 'Địa lý',
    music: 'Âm nhạc', art: 'Nghệ thuật',
  };
  return map[subject?.toLowerCase()] || subject;
}

function mapDifficultyToDB(difficulty: string): string {
  if (difficulty === 'beginner') return 'EASY';
  if (difficulty === 'advanced') return 'HARD';
  return 'MEDIUM';
}

// ─── Extract topic keywords from lesson title ───────────
function extractTopicKeywords(title: string): string[] {
  // Remove common Vietnamese prefixes/suffixes to get core topic terms
  const stopWords = ['bài', 'học', 'về', 'của', 'và', 'trong', 'cho', 'các', 'những', 'một', 'được', 'là', 'có', 'với', 'từ', 'đến', 'theo', 'để', 'khi', 'cơ bản', 'nâng cao', 'ứng dụng', 'kiểm tra', 'ôn tập', 'tổng hợp', 'tuần'];
  const words = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Keep letters/numbers/spaces (Unicode-safe)
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.includes(w));
  return words;
}

// ─── Fetch questions from question bank (topic-aware) ────
async function fetchQuestionsFromBank(
  subject: string,
  difficulty: string,
  title: string,
  limit = 10
): Promise<any[]> {
  try {
    if (!prisma.question) return [];

    const subjectVN = mapSubjectToVN(subject);
    const difficultyDB = mapDifficultyToDB(difficulty);
    const topicKeywords = extractTopicKeywords(title);

    console.log(`[AI-GENERATE-LESSON] Searching bank: subject="${subjectVN}", difficulty="${difficultyDB}", keywords=${JSON.stringify(topicKeywords)}`);

    // Strategy 1: Try to find questions matching BOTH subject AND topic keywords
    let questions: any[] = [];
    if (topicKeywords.length > 0) {
      const topicConditions = topicKeywords.map(kw => ({
        OR: [
          { topic: { contains: kw, mode: 'insensitive' as const } },
          { content: { contains: kw, mode: 'insensitive' as const } },
          { keywords: { has: kw } },
          { tags: { has: kw } },
        ],
      }));

      questions = await prisma.question.findMany({
        where: {
          AND: [
            {
              OR: [
                { subject: subjectVN },
                { subject: { contains: subjectVN, mode: 'insensitive' } },
              ],
            },
            { difficulty: difficultyDB },
            { status: { in: ['Đã duyệt', 'Đã xuất bản', 'Nháp'] } },
            // At least one keyword must match topic/content/keywords/tags
            { OR: topicConditions },
          ],
        },
        orderBy: [
          { qualityScore: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });
    }

    // Strategy 2: If not enough topic-matched questions, also search by topic field directly
    if (questions.length < limit && topicKeywords.length > 0) {
      const existingIds = new Set(questions.map(q => q.id));
      const topicMatches = await prisma.question.findMany({
        where: {
          OR: topicKeywords.map(kw => ({
            topic: { contains: kw, mode: 'insensitive' as const },
          })),
          difficulty: difficultyDB,
          status: { in: ['Đã duyệt', 'Đã xuất bản', 'Nháp'] },
          id: { notIn: Array.from(existingIds) },
        },
        orderBy: { qualityScore: 'desc' },
        take: limit - questions.length,
      });
      questions = [...questions, ...topicMatches];
    }

    // Strategy 3: Fallback to subject-only if still not enough
    if (questions.length < 3) {
      const existingIds = new Set(questions.map(q => q.id));
      const subjectFallback = await prisma.question.findMany({
        where: {
          OR: [
            { subject: subjectVN },
            { subject: { contains: subjectVN, mode: 'insensitive' } },
          ],
          difficulty: difficultyDB,
          status: { in: ['Đã duyệt', 'Đã xuất bản', 'Nháp'] },
          id: { notIn: Array.from(existingIds) },
        },
        orderBy: [
          { qualityScore: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit - questions.length,
      });
      questions = [...questions, ...subjectFallback];
    }

    console.log(`[AI-GENERATE-LESSON] Found ${questions.length} questions for "${title}" (${subjectVN}, ${difficultyDB})`);
    return questions;
  } catch (error) {
    console.warn('[AI-GENERATE-LESSON] Question bank query failed:', error);
    return [];
  }
}

// ─── Convert question bank questions to exercise format ──
function convertBankQuestionsToExercises(questions: any[]): any[] {
  return questions.map((q, i) => {
    const base: any = {
      question: q.content || `Câu hỏi ${i + 1}`,
      points: q.questionType === 'MCQ' ? 15 : q.questionType === 'ESSAY' ? 20 : 20,
      fromBank: true,
      bankQuestionId: q.id,
    };

    if (q.questionType === 'MCQ' || q.questionType === 'TRUE_FALSE') {
      base.type = 'multiple_choice';
      base.options = q.options?.length > 0 ? q.options : ['A', 'B', 'C', 'D'];
      // correctAnswer as index
      if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
        const idx = q.options?.indexOf(q.correctAnswer);
        base.correctAnswer = idx >= 0 ? idx : 0;
      } else {
        base.correctAnswer = 0;
      }
    } else if (q.questionType === 'SHORT_ANSWER') {
      base.type = 'short_answer';
      base.rubric = q.explanation || 'Đáp án chính xác và đầy đủ';
    } else {
      base.type = 'essay';
      base.rubric = q.explanation || 'Đánh giá dựa trên tính logic, ví dụ minh họa và độ chính xác';
    }

    return base;
  });
}

// ─── Main API handler ────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { title, subject, difficulty, duration, lessonId, bankQuestions } = await request.json();

    console.log('[AI-GENERATE-LESSON] Generating lesson:', { title, subject, difficulty, duration, lessonId });

    // 1. Fetch questions from question bank matching lesson topic
    const dbQuestions = await fetchQuestionsFromBank(subject, difficulty, title, 10);

    // Also use any bankQuestions passed from the learning path
    const allBankQuestions = [...dbQuestions];
    if (bankQuestions?.length > 0) {
      // Merge passed bank questions (avoid duplicates by id)
      const existingIds = new Set(dbQuestions.map(q => q.id));
      for (const bq of bankQuestions) {
        if (!existingIds.has(bq.id)) {
          allBankQuestions.push(bq);
        }
      }
    }

    const bankExercises = convertBankQuestionsToExercises(allBankQuestions.slice(0, 7));
    console.log(`[AI-GENERATE-LESSON] ${bankExercises.length} exercises from question bank`);

    // 2. Build question context for AI prompt
    const questionContext = allBankQuestions.length > 0
      ? `\n\nCâu hỏi tham khảo từ ngân hàng đề (hãy tạo nội dung bài học phù hợp với các câu hỏi này):\n${
          allBankQuestions.slice(0, 5).map((q, i) => `${i + 1}. [${q.questionType}] ${q.content?.substring(0, 150)}`).join('\n')
        }`
      : '';

    // 3. Try to generate content using AI (priority: OpenRouter → OpenAI → Gemini → xAI)
    let content = null;
    let usedModel = '';

    // Priority 1: OpenRouter
    if (isOpenRouterValid() && !content) {
      try {
        content = await generateWithOpenRouter(title, subject, difficulty, duration, questionContext);
        usedModel = OPENROUTER_MODEL;
        console.log(`[AI-GENERATE-LESSON] Generated with OpenRouter: ${OPENROUTER_MODEL}`);
      } catch (error: any) {
        console.error('[AI-GENERATE-LESSON] OpenRouter failed:', error.message);
      }
    }

    // Priority 2: OpenAI / Ollama
    if (OPENAI_API_KEY && !content) {
      try {
        content = await generateWithOpenAI(title, subject, difficulty, duration, questionContext);
        usedModel = 'gpt-4o-mini';
        console.log('[AI-GENERATE-LESSON] Generated with OpenAI/Ollama');
      } catch (error: any) {
        console.error('[AI-GENERATE-LESSON] OpenAI failed:', error.message);
      }
    }

    // Priority 3: Google Gemini
    if (GOOGLE_AI_API_KEY && !content) {
      try {
        content = await generateWithGemini(title, subject, difficulty, duration, questionContext);
        usedModel = 'gemini-2.5-flash';
        console.log('[AI-GENERATE-LESSON] Generated with Gemini');
      } catch (error: any) {
        console.error('[AI-GENERATE-LESSON] Gemini failed:', error.message);
      }
    }

    // Priority 4: xAI Grok
    if (XAI_API_KEY && !content) {
      try {
        content = await generateWithXAI(title, subject, difficulty, duration, questionContext);
        usedModel = 'grok-4-latest';
        console.log('[AI-GENERATE-LESSON] Generated with xAI Grok');
      } catch (error: any) {
        console.error('[AI-GENERATE-LESSON] xAI failed:', error.message);
      }
    }

    // 4. Build final content
    if (!content) {
      console.log('[AI-GENERATE-LESSON] Using fallback content with question bank exercises');
      content = {
        theory: {
          objectives: generateObjectives(title, subject, difficulty),
          knowledge: generateKnowledge(title, subject),
          skills: generateSkills(subject),
          content: generateTheoryContent(title, subject, difficulty),
        },
        exercises: bankExercises.length > 0 ? bankExercises : generateExercises(title, subject, difficulty),
      };
    } else {
      // Merge AI-generated content with real question bank exercises
      if (bankExercises.length > 0) {
        // Replace some AI exercises with real bank questions for authenticity
        const aiExercises = content.exercises || [];
        const merged = [
          ...bankExercises.slice(0, 4),  // First 4 from question bank
          ...aiExercises.slice(0, 3),     // Up to 3 from AI
        ];
        content.exercises = merged.slice(0, 7); // Max 7 exercises
      }
    }

    // 5. Increment usage count for bank questions used
    if (allBankQuestions.length > 0) {
      try {
        const usedIds = allBankQuestions.slice(0, 7).map(q => q.id);
        await prisma.question.updateMany({
          where: { id: { in: usedIds } },
          data: { usageCount: { increment: 1 } },
        });
      } catch { /* ignore usage tracking errors */ }
    }

    return NextResponse.json({
      success: true,
      content,
      source: usedModel || 'fallback',
      model: usedModel || 'fallback',
      questionsFromBank: allBankQuestions.length,
    });

  } catch (error: any) {
    console.error('[AI-GENERATE-LESSON] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate lesson' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════
// AI GENERATION FUNCTIONS
// ═══════════════════════════════════════════════════════════

function buildLessonPrompt(title: string, subject: string, difficulty: string, duration: number, questionContext: string): string {
  return `Tạo bài học ${difficulty} về "${title}" (môn ${subject}, ${duration} phút).
${questionContext}

Trả về CHÍNH XÁC JSON format sau (KHÔNG có markdown, KHÔNG có giải thích):
{
  "theory": {
    "objectives": ["Mục tiêu cụ thể 1", "Mục tiêu 2", "Mục tiêu 3", "Mục tiêu 4", "Mục tiêu 5"],
    "knowledge": ["Kiến thức 1", "Kiến thức 2", "Kiến thức 3", "Kiến thức 4", "Kiến thức 5", "Kiến thức 6", "Kiến thức 7"],
    "skills": ["Kỹ năng 1", "Kỹ năng 2", "Kỹ năng 3", "Kỹ năng 4", "Kỹ năng 5"],
    "content": "Nội dung markdown chi tiết với ví dụ, công thức. MAX 800 ký tự."
  },
  "exercises": [
    {"type":"multiple_choice","question":"Câu hỏi chi tiết","options":["A. Đáp án 1","B. Đáp án 2","C. Đáp án 3","D. Đáp án 4"],"correctAnswer":0,"points":15},
    {"type":"multiple_choice","question":"Câu 2","options":["A","B","C","D"],"correctAnswer":1,"points":15},
    {"type":"multiple_choice","question":"Câu 3","options":["A","B","C","D"],"correctAnswer":2,"points":15},
    {"type":"multiple_choice","question":"Câu 4","options":["A","B","C","D"],"correctAnswer":1,"points":15},
    {"type":"short_answer","question":"Câu tự luận ngắn","rubric":"Rubric chấm điểm","points":20},
    {"type":"short_answer","question":"Câu tự luận 2","rubric":"Rubric","points":20},
    {"type":"essay","question":"Bài toán thực tế","rubric":"Rubric 5 tiêu chí","points":20}
  ]
}

YÊU CẦU:
- Nội dung 100% tiếng Việt, phù hợp học sinh Việt Nam
- Content field: 600-800 ký tự, có công thức, ví dụ cụ thể
- 5 objectives chi tiết
- 7 knowledge points đầy đủ
- 5 skills thực tế
- 7 exercises đa dạng: 4 trắc nghiệm + 2 tự luận ngắn + 1 essay
- correctAnswer: index (0-3)
- Tổng points = 120`;
}

function parseAIResponse(text: string): any {
  let jsonText = text.trim();
  if (jsonText.includes('```json')) {
    jsonText = jsonText.split('```json')[1].split('```')[0].trim();
  } else if (jsonText.includes('```')) {
    jsonText = jsonText.split('```')[1].split('```')[0].trim();
  }
  const content = JSON.parse(jsonText);
  if (!content.theory || !content.exercises) {
    throw new Error('Invalid content structure: missing theory or exercises');
  }
  return content;
}

// ─── OpenRouter ──────────────────────────────────────────
async function generateWithOpenRouter(title: string, subject: string, difficulty: string, duration: number, questionContext: string) {
  const prompt = buildLessonPrompt(title, subject, difficulty, duration, questionContext);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://aeroeduvison.local',
      'X-Title': 'AeroEduVison Lesson Generator',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: 'Bạn là giáo viên chuyên nghiệp, tạo bài học chi tiết cho học sinh Việt Nam. Luôn trả về JSON hợp lệ.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty OpenRouter response');

  return parseAIResponse(text);
}

// ─── OpenAI / Ollama ─────────────────────────────────────
async function generateWithOpenAI(title: string, subject: string, difficulty: string, duration: number, questionContext: string) {
  const prompt = buildLessonPrompt(title, subject, difficulty, duration, questionContext);

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Bạn là giáo viên chuyên nghiệp. Luôn trả về JSON hợp lệ.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty OpenAI response');

  return parseAIResponse(text);
}

// ─── Google Gemini ───────────────────────────────────────
async function generateWithGemini(title: string, subject: string, difficulty: string, duration: number, questionContext: string) {
  const prompt = buildLessonPrompt(title, subject, difficulty, duration, questionContext);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorData.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  return parseAIResponse(text);
}

// ─── xAI Grok ────────────────────────────────────────────
async function generateWithXAI(title: string, subject: string, difficulty: string, duration: number, questionContext: string) {
  const prompt = buildLessonPrompt(title, subject, difficulty, duration, questionContext);

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-4-latest',
      messages: [
        { role: 'system', content: 'Bạn là giáo viên chuyên nghiệp. Luôn trả về JSON hợp lệ.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${errorData.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty xAI response');

  return parseAIResponse(text);
}

// ═══════════════════════════════════════════════════════════
// FALLBACK CONTENT GENERATORS
// ═══════════════════════════════════════════════════════════

function generateObjectives(title: string, subject: string, difficulty: string): string[] {
  return [
    `Hiểu sâu về khái niệm ${title}`,
    `Áp dụng ${title} để giải bài toán thực tế`,
    `Phân tích và đánh giá các phương pháp liên quan đến ${title}`,
    `Liên hệ kiến thức ${title} với các chủ đề đã học`,
    `Phát triển tư duy logic qua ${title}`,
  ];
}

function generateKnowledge(title: string, subject: string): string[] {
  return [
    `Định nghĩa và khái niệm cơ bản về ${title}`,
    `Các công thức và quy tắc áp dụng`,
    `Mối liên hệ với các kiến thức đã học`,
    `Ứng dụng trong thực tế`,
    `Các dạng bài tập thường gặp`,
    `Sai lầm phổ biến cần tránh`,
    `Phương pháp giải nhanh và hiệu quả`,
  ];
}

function generateSkills(subject: string): string[] {
  return [
    'Phân tích và giải quyết vấn đề',
    'Tư duy logic và sáng tạo',
    'Áp dụng kiến thức vào thực tế',
    'Làm việc độc lập và tự học',
    'Trình bày và lập luận chặt chẽ',
  ];
}

function generateTheoryContent(title: string, subject: string, difficulty: string): string {
  return `# ${title}\n\n## Giới thiệu\n\nĐây là nội dung lý thuyết về "${title}" với độ khó "${difficulty}".\n\n## Nội dung chính\n\n1. **Khái niệm cơ bản**\n   - Định nghĩa và tính chất\n   - Ví dụ minh họa\n\n2. **Phương pháp giải**\n   - Các bước thực hiện\n   - Lưu ý quan trọng\n\n3. **Ứng dụng thực tế**\n   - Bài toán trong cuộc sống\n   - Liên hệ liên môn\n\n## Tóm tắt\n\nNội dung sẽ được cập nhật khi có AI model khả dụng.`;
}

function generateExercises(title: string, subject: string, difficulty: string): any[] {
  const titleLower = title.toLowerCase();

  // Dao động cơ - Mechanical Oscillation
  if (titleLower.includes('dao động') || titleLower.includes('dao dong')) {
    return [
      { type: 'multiple_choice', question: 'Một vật dao động điều hòa với phương trình x = 5cos(2πt + π/3) cm. Biên độ dao động là bao nhiêu?', options: ['5 cm', '2π cm', '10 cm', 'π/3 cm'], correctAnswer: 0, points: 15, explanation: 'Biên độ A = 5 cm, là hệ số trước hàm cos trong phương trình dao động.' },
      { type: 'multiple_choice', question: 'Chu kỳ dao động của con lắc đơn phụ thuộc vào yếu tố nào?', options: ['Chiều dài dây và gia tốc trọng trường', 'Khối lượng vật nặng', 'Biên độ dao động', 'Lực ma sát'], correctAnswer: 0, points: 15, explanation: 'T = 2π√(l/g), chu kỳ chỉ phụ thuộc chiều dài l và gia tốc trọng trường g.' },
      { type: 'multiple_choice', question: 'Trong dao động điều hòa, vận tốc của vật đạt giá trị cực đại khi vật ở vị trí nào?', options: ['Vị trí cân bằng', 'Vị trí biên dương', 'Vị trí biên âm', 'Giữa vị trí cân bằng và biên'], correctAnswer: 0, points: 15, explanation: 'Tại vị trí cân bằng (x = 0), vận tốc cực đại v_max = Aω.' },
      { type: 'multiple_choice', question: 'Một con lắc lò xo dao động điều hòa với tần số góc ω = 10 rad/s, biên độ A = 4 cm. Vận tốc cực đại của vật là:', options: ['40 cm/s', '20 cm/s', '10 cm/s', '80 cm/s'], correctAnswer: 0, points: 15, explanation: 'v_max = Aω = 4 × 10 = 40 cm/s.' },
      { type: 'multiple_choice', question: 'Năng lượng dao động điều hòa tỉ lệ với:', options: ['Bình phương biên độ', 'Biên độ', 'Tần số', 'Chu kỳ'], correctAnswer: 0, points: 15, explanation: 'W = ½kA², năng lượng tỉ lệ với A².' },
      { type: 'short_answer', question: 'Một con lắc lò xo có k = 100 N/m, m = 0.25 kg. Tính chu kỳ dao động T.', rubric: 'T = 2π√(m/k) = 2π√(0.25/100) = 2π × 0.05 = 0.314 s ≈ π/10 s', points: 20 },
      { type: 'short_answer', question: 'Phân biệt dao động tự do và dao động cưỡng bức. Nêu điều kiện xảy ra cộng hưởng.', rubric: 'Dao động tự do: không có ngoại lực, tần số riêng f₀. Dao động cưỡng bức: có ngoại lực tuần hoàn f. Cộng hưởng khi f = f₀.', points: 20 },
    ];
  }

  // Sóng cơ - Mechanical Waves
  if (titleLower.includes('sóng') || titleLower.includes('song co')) {
    return [
      { type: 'multiple_choice', question: 'Sóng cơ không truyền được trong môi trường nào?', options: ['Chân không', 'Chất rắn', 'Chất lỏng', 'Chất khí'], correctAnswer: 0, points: 15, explanation: 'Sóng cơ cần môi trường vật chất để truyền, không truyền được trong chân không.' },
      { type: 'multiple_choice', question: 'Bước sóng λ được tính bằng công thức nào?', options: ['λ = v/f', 'λ = v × f', 'λ = f/v', 'λ = v² × f'], correctAnswer: 0, points: 15, explanation: 'λ = v/f = vT, với v là vận tốc truyền sóng, f là tần số.' },
      { type: 'multiple_choice', question: 'Hiện tượng giao thoa sóng xảy ra khi hai sóng có:', options: ['Cùng tần số và hiệu pha không đổi', 'Cùng biên độ', 'Cùng phương truyền', 'Khác tần số'], correctAnswer: 0, points: 15, explanation: 'Giao thoa xảy ra khi hai nguồn kết hợp: cùng tần số, hiệu pha không đổi theo thời gian.' },
      { type: 'multiple_choice', question: 'Sóng dừng trên dây có hai đầu cố định, chiều dài dây L = 1m, tần số cơ bản f₁ = 50 Hz. Vận tốc truyền sóng là:', options: ['100 m/s', '50 m/s', '25 m/s', '200 m/s'], correctAnswer: 0, points: 15, explanation: 'Với hai đầu cố định: L = λ₁/2 → λ₁ = 2L = 2m. v = f₁λ₁ = 50 × 2 = 100 m/s.' },
      { type: 'multiple_choice', question: 'Trong sóng dừng, khoảng cách giữa hai nút liên tiếp bằng:', options: ['λ/2', 'λ', 'λ/4', '2λ'], correctAnswer: 0, points: 15, explanation: 'Khoảng cách hai nút liên tiếp = λ/2.' },
      { type: 'short_answer', question: 'Một sóng cơ có tần số f = 200 Hz, vận tốc truyền sóng v = 340 m/s. Tính bước sóng λ.', rubric: 'λ = v/f = 340/200 = 1.7 m', points: 20 },
      { type: 'short_answer', question: 'Giải thích hiện tượng sóng dừng trên dây và điều kiện hình thành sóng dừng với hai đầu cố định.', rubric: 'Sóng dừng do giao thoa sóng tới và sóng phản xạ. Điều kiện: L = nλ/2 (n = 1, 2, 3...)', points: 20 },
    ];
  }

  // Điện xoay chiều - AC Circuits
  if (titleLower.includes('điện xoay chiều') || titleLower.includes('dien xoay chieu') || titleLower.includes('xoay chiều')) {
    return [
      { type: 'multiple_choice', question: 'Trong mạch RLC nối tiếp, hiện tượng cộng hưởng xảy ra khi:', options: ['ZL = ZC', 'R = ZL', 'R = ZC', 'ZL = 2ZC'], correctAnswer: 0, points: 15, explanation: 'Cộng hưởng khi ZL = ZC, tức ωL = 1/(ωC), khi đó Z = R (cực tiểu).' },
      { type: 'multiple_choice', question: 'Dòng điện xoay chiều i = 2cos(100πt + π/6) A có giá trị hiệu dụng là:', options: ['√2 A', '2 A', '1 A', '2√2 A'], correctAnswer: 0, points: 15, explanation: 'I = I₀/√2 = 2/√2 = √2 A.' },
      { type: 'multiple_choice', question: 'Công suất tiêu thụ trung bình của mạch RLC nối tiếp là:', options: ['P = UI cosφ', 'P = UI', 'P = I²Z', 'P = U²/Z'], correctAnswer: 0, points: 15, explanation: 'P = UIcosφ = I²R, với cosφ là hệ số công suất.' },
      { type: 'multiple_choice', question: 'Máy biến áp lý tưởng có tỉ số vòng dây N₁/N₂ = 10. Nếu U₁ = 220V thì U₂ bằng:', options: ['22 V', '2200 V', '110 V', '44 V'], correctAnswer: 0, points: 15, explanation: 'U₁/U₂ = N₁/N₂ → U₂ = U₁ × N₂/N₁ = 220/10 = 22 V.' },
      { type: 'short_answer', question: 'Mạch RLC nối tiếp có R = 30Ω, ZL = 40Ω, ZC = 0. Tính tổng trở Z và hệ số công suất cosφ.', rubric: 'Z = √(R² + (ZL-ZC)²) = √(900 + 1600) = 50Ω. cosφ = R/Z = 30/50 = 0.6', points: 20 },
      { type: 'short_answer', question: 'Giải thích nguyên lý hoạt động của máy biến áp và ứng dụng trong truyền tải điện năng.', rubric: 'Máy biến áp hoạt động dựa trên hiện tượng cảm ứng điện từ. Tăng áp để giảm hao phí P = RI² = R(P₀/U)² trên đường dây truyền tải.', points: 20 },
    ];
  }

  // Đạo hàm - Derivatives (Math)
  if (titleLower.includes('đạo hàm') || titleLower.includes('dao ham') || titleLower.includes('derivative')) {
    return [
      { type: 'multiple_choice', question: 'Đạo hàm của hàm số y = x³ + 2x² - 5x + 1 là:', options: ['y\' = 3x² + 4x - 5', 'y\' = 3x² + 2x - 5', 'y\' = x² + 4x - 5', 'y\' = 3x² + 4x + 1'], correctAnswer: 0, points: 15, explanation: 'Áp dụng (xⁿ)\' = nxⁿ⁻¹: y\' = 3x² + 4x - 5.' },
      { type: 'multiple_choice', question: 'Hàm số y = x³ - 3x + 2 đạt cực đại tại:', options: ['x = -1', 'x = 1', 'x = 0', 'x = 2'], correctAnswer: 0, points: 15, explanation: 'y\' = 3x² - 3 = 0 → x = ±1. y\'\' = 6x. Tại x = -1: y\'\' = -6 < 0 → cực đại.' },
      { type: 'multiple_choice', question: 'Đạo hàm của hàm số y = sin(2x) là:', options: ['y\' = 2cos(2x)', 'y\' = cos(2x)', 'y\' = -2cos(2x)', 'y\' = 2sin(2x)'], correctAnswer: 0, points: 15, explanation: 'Áp dụng đạo hàm hàm hợp: y\' = cos(2x) × (2x)\' = 2cos(2x).' },
      { type: 'multiple_choice', question: 'Phương trình tiếp tuyến của đồ thị y = x² tại điểm M(1, 1) là:', options: ['y = 2x - 1', 'y = x', 'y = 2x', 'y = 2x + 1'], correctAnswer: 0, points: 15, explanation: 'y\' = 2x. Tại x=1: y\'(1) = 2. PTTT: y - 1 = 2(x - 1) → y = 2x - 1.' },
      { type: 'short_answer', question: 'Tìm khoảng đồng biến, nghịch biến của hàm số y = x³ - 3x² + 4.', rubric: 'y\' = 3x² - 6x = 3x(x-2). y\' > 0 khi x < 0 hoặc x > 2 (đồng biến). y\' < 0 khi 0 < x < 2 (nghịch biến).', points: 20 },
      { type: 'short_answer', question: 'Tính đạo hàm của hàm số y = (2x+1)/(x-1) và tìm các điểm mà đạo hàm bằng 0.', rubric: 'y\' = [2(x-1) - (2x+1)]/(x-1)² = -3/(x-1)². Đạo hàm luôn âm (≠0) với mọi x ≠ 1 → không có điểm đạo hàm bằng 0.', points: 20 },
    ];
  }

  // Generic fallback with meaningful questions
  return [
    { type: 'multiple_choice', question: `Câu hỏi cơ bản 1 về ${title}: Đâu là khái niệm chính của chủ đề này?`, options: ['Định nghĩa cơ bản', 'Không liên quan', 'Chưa xác định', 'Tất cả đều sai'], correctAnswer: 0, points: 15 },
    { type: 'multiple_choice', question: `Câu hỏi cơ bản 2 về ${title}: Phương pháp giải phổ biến nhất là gì?`, options: ['Phương pháp phân tích', 'Không có phương pháp', 'Chỉ đoán', 'Bỏ qua'], correctAnswer: 0, points: 15 },
    { type: 'multiple_choice', question: `Câu hỏi cơ bản 3 về ${title}: Ứng dụng quan trọng nhất là gì?`, options: ['Ứng dụng trong thực tế', 'Không có ứng dụng', 'Chưa được nghiên cứu', 'Chỉ lý thuyết'], correctAnswer: 0, points: 15 },
    { type: 'short_answer', question: `Trình bày các khái niệm cơ bản của ${title}.`, rubric: 'Nêu đúng định nghĩa, tính chất, và ví dụ minh họa', points: 20 },
    { type: 'short_answer', question: `Giải thích mối liên hệ giữa ${title} với các chủ đề liên quan.`, rubric: 'Trình bày rõ ràng, có ví dụ cụ thể', points: 20 },
  ];
}
