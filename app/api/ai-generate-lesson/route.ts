import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const XAI_API_KEY = process.env.XAI_API_KEY || '';

export async function POST(request: Request) {
  try {
    const { title, subject, difficulty, duration } = await request.json();

    console.log('🤖 [AI-GENERATE-LESSON] Generating lesson:', { title, subject, difficulty, duration });

    // Try to generate content using real AI APIs (priority order: OpenAI -> Gemini -> xAI)
    let content = null;
    let usedModel = '';
    
    // Try OpenAI first (most reliable)
    if (OPENAI_API_KEY && !content) {
      try {
        content = await generateWithOpenAI(title, subject, difficulty, duration);
        usedModel = 'gpt-4o-mini';
        console.log('✅ [AI-GENERATE-LESSON] Generated with OpenAI GPT-4o-mini');
      } catch (error) {
        console.error('❌ [AI-GENERATE-LESSON] OpenAI failed:', error);
      }
    }
    
    // Fallback to Google Gemini
    if (GOOGLE_AI_API_KEY && !content) {
      try {
        content = await generateWithGemini(title, subject, difficulty, duration);
        usedModel = 'gemini-2.5-flash';
        console.log('✅ [AI-GENERATE-LESSON] Generated with Google Gemini 2.5 Flash');
      } catch (error) {
        console.error('❌ [AI-GENERATE-LESSON] Gemini failed:', error);
      }
    }
    
    // Fallback to xAI Grok
    if (XAI_API_KEY && !content) {
      try {
        content = await generateWithXAI(title, subject, difficulty, duration);
        usedModel = 'grok-4-latest';
        console.log('✅ [AI-GENERATE-LESSON] Generated with xAI Grok-4');
      } catch (error) {
        console.error('❌ [AI-GENERATE-LESSON] xAI failed:', error);
      }
    }
    
    // Final fallback to demo content
    if (!content) {
      console.log('⚠️ [AI-GENERATE-LESSON] Using demo content (no API keys or all failed)');
      content = {
        theory: {
          objectives: generateObjectives(title, subject, difficulty),
          knowledge: generateKnowledge(title, subject),
          skills: generateSkills(subject),
          content: generateTheoryContent(title, subject, difficulty)
        },
        exercises: generateExercises(title, subject, difficulty)
      };
    }

    return NextResponse.json({ 
      success: true,
      content,
      source: usedModel || content.source || 'demo',
      model: usedModel || 'demo'
    });

  } catch (error) {
    console.error('Error generating lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate lesson' },
      { status: 500 }
    );
  }
}

// ============= AI GENERATION FUNCTIONS =============

async function generateWithOpenAI(title: string, subject: string, difficulty: string, duration: number) {
  const prompt = `Tạo bài học ${difficulty} về "${title}" (môn ${subject}, ${duration} phút).

Trả về CHÍNH XÁC JSON format sau (KHÔNG có markdown, KHÔNG có giải thích):
{
  "theory": {
    "objectives": ["Mục tiêu cụ thể 1", "Mục tiêu 2", "Mục tiêu 3", "Mục tiêu 4", "Mục tiêu 5"],
    "knowledge": ["Kiến thức 1", "Kiến thức 2", "Kiến thức 3", "Kiến thức 4", "Kiến thức 5", "Kiến thức 6", "Kiến thức 7"],
    "skills": ["Kỹ năng 1", "Kỹ năng 2", "Kỹ năng 3", "Kỹ năng 4", "Kỹ năng 5"],
    "content": "Nội dung markdown chi tiết với ví dụ, công thức. MAX 800 ký tự."
  },
  "exercises": [
    {"type":"multiple_choice","question":"Câu hỏi chi tiết với gợi ý","options":["A. Đáp án 1","B. Đáp án 2","C. Đáp án 3","D. Đáp án 4"],"correctAnswer":0,"points":15},
    {"type":"multiple_choice","question":"Câu 2","options":["A","B","C","D"],"correctAnswer":1,"points":15},
    {"type":"multiple_choice","question":"Câu 3","options":["A","B","C","D"],"correctAnswer":2,"points":15},
    {"type":"multiple_choice","question":"Câu 4","options":["A","B","C","D"],"correctAnswer":1,"points":15},
    {"type":"short_answer","question":"Câu tự luận ngắn","rubric":"Rubric chấm điểm","points":20},
    {"type":"short_answer","question":"Câu tự luận 2","rubric":"Rubric","points":20},
    {"type":"essay","question":"Bài toán thực tế","rubric":"Rubric 5 tiêu chí","points":20}
  ]
}

YÊU CẦU CHẶT CHẼ:
- Nội dung 100% tiếng Việt, phù hợp học sinh Việt Nam
- Content field: 600-800 ký tự, có công thức LaTeX, ví dụ cụ thể
- 5 objectives chi tiết, rõ ràng
- 7 knowledge points đầy đủ
- 5 skills thực tế
- 7 exercises đa dạng: 4 trắc nghiệm + 2 tự luận ngắn + 1 essay
- Questions phải chi tiết, có ngữ cảnh
- Options ngắn gọn 3-8 từ
- correctAnswer: index (0-3)
- Tổng points = 120`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Bạn là một giáo viên giỏi, chuyên tạo bài học chi tiết và phù hợp cho học sinh Việt Nam. Luôn trả về JSON hợp lệ, KHÔNG có markdown hay giải thích thêm.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ OpenAI API error details:', errorData);
    throw new Error(`OpenAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    console.error('❌ [OPENAI] No choices in response:', data);
    throw new Error('OpenAI returned no choices');
  }

  const messageContent = data.choices[0].message.content;
  console.log('📝 [OPENAI] Raw response length:', messageContent.length);
  console.log('📝 [OPENAI] Preview:', messageContent.substring(0, 150));

  let jsonText = messageContent.trim();
  
  // Extract JSON if wrapped in markdown
  if (jsonText.includes('```json')) {
    jsonText = jsonText.split('```json')[1].split('```')[0].trim();
  } else if (jsonText.includes('```')) {
    jsonText = jsonText.split('```')[1].split('```')[0].trim();
  }

  console.log('🔍 [OPENAI] JSON text length:', jsonText.length);

  try {
    const content = JSON.parse(jsonText);
    
    // Validate structure
    if (!content.theory || !content.exercises) {
      throw new Error('Invalid content structure');
    }

    console.log('✅ [OPENAI] Success! Objectives:', content.theory.objectives?.length, 
                'Knowledge:', content.theory.knowledge?.length,
                'Skills:', content.theory.skills?.length,
                'Content:', content.theory.content?.length, 'chars',
                'Exercises:', content.exercises?.length);

    return content;
  } catch (parseError) {
    console.error('❌ [OPENAI] JSON parse error:', parseError);
    console.log('📄 [OPENAI] First 500 chars:', jsonText.substring(0, 500));
    console.log('📄 [OPENAI] Last 200 chars:', jsonText.substring(Math.max(0, jsonText.length - 200)));
    throw parseError;
  }
}

async function generateWithGemini(title: string, subject: string, difficulty: string, duration: number) {
  const prompt = `Tạo bài học ${difficulty} về "${title}" (môn ${subject}, ${duration} phút).

JSON format (bắt buộc):
{
  "theory": {
    "objectives": ["Mục tiêu cụ thể 1", "Mục tiêu 2", "Mục tiêu 3", "Mục tiêu 4", "Mục tiêu 5"],
    "knowledge": ["Kiến thức 1", "Kiến thức 2", "Kiến thức 3", "Kiến thức 4", "Kiến thức 5", "Kiến thức 6", "Kiến thức 7"],
    "skills": ["Kỹ năng 1", "Kỹ năng 2", "Kỹ năng 3", "Kỹ năng 4", "Kỹ năng 5"],
    "content": "Nội dung markdown chi tiết với ví dụ, công thức. GIỚ HẠN: 600 ký tự."
  },
  "exercises": [
    {"type":"multiple_choice","question":"Câu hỏi chi tiết với gợi ý","options":["A. Đáp án 1","B. Đáp án 2","C. Đáp án 3","D. Đáp án 4"],"correctAnswer":0,"points":15},
    {"type":"multiple_choice","question":"Câu 2","options":["A","B","C","D"],"correctAnswer":1,"points":15},
    {"type":"multiple_choice","question":"Câu 3","options":["A","B","C","D"],"correctAnswer":2,"points":15},
    {"type":"multiple_choice","question":"Câu 4","options":["A","B","C","D"],"correctAnswer":1,"points":15},
    {"type":"short_answer","question":"Câu tự luận ngắn","rubric":"Rubric chấm điểm","points":20},
    {"type":"short_answer","question":"Câu tự luận 2","rubric":"Rubric","points":20},
    {"type":"essay","question":"Bài toán thực tế","rubric":"Rubric 5 tiêu chí","points":20}
  ]
}

YÊU CẦU:
- Nội dung tiếng Việt
- Content field: MAX 600 ký tự (BẮT BUỘC - tránh truncate)
- 5 objectives ngắn gọn
- 7 knowledge points ngắn
- 5 skills ngắn
- 7 exercises: questions ngắn (< 50 từ), options 2-5 từ
- Sử dụng \\n cho xuống dòng`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ Gemini API error details:', errorData);
    throw new Error(`Gemini API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  
  // Check if response has candidates
  if (!data.candidates || data.candidates.length === 0) {
    console.error('❌ [GEMINI] No candidates in response:', data);
    throw new Error('Gemini returned no candidates');
  }
  
  // Check if candidate has content and parts
  const candidate = data.candidates[0];
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    console.error('❌ [GEMINI] Invalid candidate structure:', candidate);
    throw new Error('Gemini candidate has no content parts');
  }
  
  const text = candidate.content.parts[0].text;
  
  console.log('📝 [GEMINI] Raw response length:', text.length);
  console.log('📝 [GEMINI] Preview:', text.substring(0, 150));
  
  // When using responseMimeType: "application/json", Gemini returns pure JSON
  // No need to extract from markdown
  let jsonText = text.trim();
  
  // Safety: Still check for markdown blocks (just in case)
  if (jsonText.includes('```json')) {
    jsonText = jsonText.split('```json')[1].split('```')[0].trim();
  } else if (jsonText.includes('```')) {
    jsonText = jsonText.split('```')[1].split('```')[0].trim();
  }
  
  console.log('🔍 [GEMINI] JSON text length:', jsonText.length);
  
  try {
    const content = JSON.parse(jsonText);
    
    // Validate structure
    if (!content.theory || !content.exercises) {
      throw new Error('Invalid structure: missing theory or exercises');
    }
    
    content.source = 'gemini';
    
    console.log('✅ [GEMINI] Success! Objectives:', content.theory.objectives?.length, 
                'Knowledge:', content.theory.knowledge?.length,
                'Skills:', content.theory.skills?.length,
                'Content:', content.theory.content?.length, 'chars',
                'Exercises:', content.exercises?.length);
    
    return content;
  } catch (parseError: any) {
    console.error('❌ [GEMINI] JSON parse error:', parseError.message);
    console.error('📄 [GEMINI] First 500 chars:', jsonText.substring(0, 500));
    console.error('📄 [GEMINI] Last 200 chars:', jsonText.substring(Math.max(0, jsonText.length - 200)));
    throw parseError;
  }
}

async function generateWithXAI(title: string, subject: string, difficulty: string, duration: number) {
  const prompt = `Bạn là một giáo viên xuất sắc. Hãy tạo một bài học chi tiết về "${title}" cho môn ${subject}, độ khó ${difficulty}, thời lượng ${duration} phút.

Trả về JSON với cấu trúc:
{
  "theory": {
    "objectives": [...],
    "knowledge": [...],
    "skills": [...],
    "content": "markdown content"
  },
  "exercises": [...]
}`;

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-4-latest',
      messages: [
        { role: 'system', content: 'You are an expert teacher. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      stream: false
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('❌ xAI API error details:', errorData);
    throw new Error(`xAI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  
  let jsonText = text;
  if (text.includes('```json')) {
    jsonText = text.split('```json')[1].split('```')[0].trim();
  }
  
  const content = JSON.parse(jsonText);
  content.source = 'xai';
  return content;
}

function generateObjectives(title: string, subject: string, difficulty: string): string[] {
  // AI would generate these based on the lesson
  return [
    `Hiểu khái niệm ${title}`,
    `Áp dụng ${title} để giải bài toán thực tế`,
    `Phân tích và đánh giá các phương pháp liên quan`
  ];
}

function generateKnowledge(title: string, subject: string): string[] {
  return [
    `Định nghĩa và khái niệm cơ bản về ${title}`,
    `Các công thức và quy tắc áp dụng`,
    `Mối liên hệ với các kiến thức đã học`,
    `Ứng dụng trong thực tế`
  ];
}

function generateSkills(subject: string): string[] {
  return [
    'Phân tích và giải quyết vấn đề',
    'Tư duy logic và sáng tạo',
    'Áp dụng kiến thức vào thực tế',
    'Làm việc độc lập và tự học'
  ];
}

function generateTheoryContent(title: string, subject: string, difficulty: string): string {
  // AI would generate detailed content
  return `
# ${title}

## Giới thiệu

Đây là nội dung lý thuyết được AI tạo ra dựa trên tiêu đề "${title}" với độ khó "${difficulty}".

## Nội dung chính

1. **Khái niệm cơ bản**
   - Định nghĩa
   - Tính chất
   - Ví dụ minh họa

2. **Phương pháp giải quyết**
   - Các bước thực hiện
   - Lưu ý quan trọng
   - Mẹo và thủ thuật

3. **Ứng dụng thực tế**
   - Bài toán trong cuộc sống
   - Các lĩnh vực liên quan
   - Phát triển tư duy

## Tóm tắt

Nội dung này sẽ được AI tạo ra một cách chi tiết và phù hợp với trình độ của học sinh.
  `;
}

function generateExercises(title: string, subject: string, difficulty: string): any[] {
  // AI would generate varied exercises
  return [
    {
      type: 'multiple_choice',
      question: `Câu hỏi trắc nghiệm về ${title}`,
      options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
      correctAnswer: 0,
      points: 20
    },
    {
      type: 'short_answer',
      question: `Trả lời ngắn về ${title}`,
      rubric: 'Đáp án cần bao gồm các khái niệm chính',
      points: 30
    },
    {
      type: 'essay',
      question: `Viết bài luận về ứng dụng của ${title}`,
      rubric: 'Đánh giá dựa trên độ sâu, tính logic, và ví dụ minh họa',
      points: 50
    }
  ];
}

