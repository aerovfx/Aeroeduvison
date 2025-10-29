import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Interface cho request
interface GenerateContentRequest {
  type: 'lesson' | 'quiz' | 'slides' | 'video-script';
  subject: string;
  grade: string;
  topic: string;
  curriculum?: string; // Khung chương trình (VD: "Chương trình GDPT 2018")
  duration?: number; // Thời lượng (phút)
  difficulty?: 'easy' | 'medium' | 'hard';
  additionalContext?: string;
  freeformPrompt?: string; // Prompt tự do, ưu tiên hơn các trường khác
  aiModel?: 'auto' | 'grok' | 'openrouter' | 'openai' | 'cursor' | 'ollama' | 'demo'; // AI model selection
}

// Interface cho response
interface GeneratedContent {
  title: string;
  content: string;
  type: string;
  metadata: {
    subject: string;
    grade: string;
    topic: string;
    estimatedDuration: number;
    difficulty: string;
  };
  quiz?: {
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }>;
  };
  slides?: Array<{
    slideNumber: number;
    title: string;
    content: string;
    imagePrompt?: string;
  }>;
}

// Hàm sinh nội dung bằng AI (hỗ trợ Grok, OpenRouter, OpenAI, Cursor, Ollama)
async function generateWithAI(request: GenerateContentRequest): Promise<GeneratedContent> {
  // Use aiModel from request if provided, otherwise fallback to environment variable
  const aiProvider = request.aiModel || process.env.AI_PROVIDER || 'auto'; // auto, grok, openrouter, openai, cursor, ollama, demo
  const prompt = createPrompt(request);

  try {
    // Auto-detect provider based on available keys
    
    // Priority 1: Grok API (X.AI) - Fast and powerful
    if (aiProvider === 'auto' || aiProvider === 'grok') {
      const grokKey = process.env.GROK_API_KEY;
      if (grokKey && grokKey.startsWith('xai-')) {
        console.log('🔥 Using Grok API (X.AI)...');
        return await generateWithGrok(prompt, request, grokKey);
      }
    }
    
    // Priority 2: OpenRouter - Unified interface for all LLMs
    if (aiProvider === 'auto' || aiProvider === 'openrouter') {
      const openrouterKey = process.env.OPENROUTER_API_KEY;
      if (openrouterKey && openrouterKey.startsWith('sk-or-')) {
        console.log('🌐 Using OpenRouter (Unified LLM API)...');
        return await generateWithOpenRouter(prompt, request, openrouterKey);
      }
    }
    
    // Priority 3: OpenAI
    if (aiProvider === 'auto' || aiProvider === 'openai') {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey && openaiKey.startsWith('sk-')) {
        console.log('🤖 Using OpenAI...');
        return await generateWithOpenAI(prompt, request, openaiKey);
      }
    }
    
    // Priority 4: Cursor API
    if (aiProvider === 'auto' || aiProvider === 'cursor') {
      const cursorKey = process.env.CURSOR_API_KEY;
      if (cursorKey) {
        console.log('💻 Using Cursor API...');
        return await generateWithCursor(prompt, request, cursorKey);
      }
    }

    // Priority 5: Ollama (Local)
    if (aiProvider === 'auto' || aiProvider === 'ollama') {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
      // Try Ollama if available
      try {
        console.log('🏠 Trying Ollama (Local)...');
        return await generateWithOllama(prompt, request, ollamaUrl);
      } catch (ollamaError) {
        console.log('⚠️  Ollama not available, trying other providers...');
      }
    }

    // Fallback to demo mode
    console.log('🎭 Using Demo Mode...');
    return generateMockContent(request);
    
  } catch (error) {
    console.error('❌ AI Generation error:', error);
    return generateMockContent(request);
  }
}

// Generate with Grok (X.AI) - Compatible with OpenAI format
async function generateWithGrok(prompt: string, request: GenerateContentRequest, apiKey: string): Promise<GeneratedContent> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-beta', // or 'grok-4-latest' when available
      messages: [
        {
          role: 'system',
          content: 'Bạn là một chuyên gia giáo dục Việt Nam, có kinh nghiệm thiết kế bài giảng và tài liệu học tập chất lượng cao. Hãy tạo nội dung chi tiết, dễ hiểu và phù hợp với học sinh Việt Nam.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Grok API error: ${error}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;
  
  return parseAIResponse(aiResponse, request);
}

// Generate with OpenRouter - Unified interface for all LLMs
async function generateWithOpenRouter(prompt: string, request: GenerateContentRequest, apiKey: string): Promise<GeneratedContent> {
  // OpenRouter supports many models, choosing the best ones
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'; // or 'openai/gpt-4-turbo', 'google/gemini-pro', etc.
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'LMS Math - AI Content Generator',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Bạn là một chuyên gia giáo dục Việt Nam, có kinh nghiệm thiết kế bài giảng và tài liệu học tập chất lượng cao. Hãy tạo nội dung chi tiết, dễ hiểu và phù hợp với học sinh Việt Nam.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;
  
  console.log('✅ OpenRouter response received, model used:', data.model);
  
  return parseAIResponse(aiResponse, request);
}

// Generate with OpenAI
async function generateWithOpenAI(prompt: string, request: GenerateContentRequest, apiKey: string): Promise<GeneratedContent> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Bạn là một chuyên gia giáo dục Việt Nam, có kinh nghiệm thiết kế bài giảng và tài liệu học tập chất lượng cao.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;
  
  return parseAIResponse(aiResponse, request);
}

// Generate with Cursor API
async function generateWithCursor(prompt: string, request: GenerateContentRequest, apiKey: string): Promise<GeneratedContent> {
  try {
    const response = await fetch('https://api.cursor.sh/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4', // Cursor supports various models
      messages: [
        {
          role: 'system',
          content: 'Bạn là một chuyên gia giáo dục Việt Nam, có kinh nghiệm thiết kế bài giảng và tài liệu học tập chất lượng cao.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cursor API error: ${error}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;
  
  return parseAIResponse(aiResponse, request);
  } catch (error) {
    console.error('Cursor API error:', error);
    throw new Error('Cursor API không khả dụng, đang chuyển sang chế độ demo...');
  }
}

// Generate with Ollama (Local)
async function generateWithOllama(prompt: string, request: GenerateContentRequest, ollamaUrl: string): Promise<GeneratedContent> {
  const model = process.env.OLLAMA_MODEL || 'llama3.2:latest';
  
  console.log('🏠 [OLLAMA] Generating with model:', model);
  console.log('🏠 [OLLAMA] URL:', ollamaUrl);
  console.log('🏠 [OLLAMA] Request type:', request.type);
  
  // Create detailed prompt for Ollama
  const detailedPrompt = createDetailedPrompt(request);
  
  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      prompt: detailedPrompt,
      stream: false,
      options: {
        temperature: 0.8,
        num_predict: 4000,
        top_p: 0.9,
        top_k: 40,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('🏠 [OLLAMA] API Error:', error);
    throw new Error(`Ollama API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('🏠 [OLLAMA] Response received, length:', data.response?.length || 0);
  
  const aiResponse = data.response;
  
  // Try to parse AI response, fallback to demo if parsing fails
  try {
    return parseAIResponse(aiResponse, request);
  } catch (error) {
    console.error('🏠 [OLLAMA] Parse error, using raw response:', error);
    return createContentFromRawResponse(aiResponse, request);
  }
}

// Create detailed prompt for Ollama
function createDetailedPrompt(request: GenerateContentRequest): string {
  // Nếu có freeform prompt, ưu tiên sử dụng nó
  if (request.freeformPrompt && request.freeformPrompt.trim().length > 0) {
    return `Bạn là một chuyên gia giáo dục Việt Nam. Hãy tạo nội dung giáo dục dựa trên yêu cầu sau:

${request.freeformPrompt}

Lưu ý:
- Nội dung phải rõ ràng, dễ hiểu
- Phù hợp với học sinh Việt Nam
- Sử dụng tiếng Việt chuẩn
- Nếu tạo quiz, trả về JSON format:
{
  "title": "Tiêu đề quiz",
  "questions": [
    {
      "question": "Câu hỏi cụ thể",
      "options": ["A. Đáp án A", "B. Đáp án B", "C. Đáp án C", "D. Đáp án D"],
      "correctAnswer": 0,
      "explanation": "Giải thích chi tiết"
    }
  ]
}`;
  }

  if (request.type === 'quiz') {
    return `Tạo quiz về "${request.topic}" cho môn ${request.subject} lớp ${request.grade}.

Yêu cầu:
- Tạo 10 câu hỏi trắc nghiệm
- Mỗi câu có 4 đáp án A, B, C, D
- Đáp án đúng rõ ràng
- Giải thích chi tiết
- Phù hợp trình độ lớp ${request.grade}

Trả về JSON chính xác:
{
  "title": "Quiz về ${request.topic}",
  "questions": [
    {
      "question": "Câu hỏi cụ thể",
      "options": ["A. Đáp án A", "B. Đáp án B", "C. Đáp án C", "D. Đáp án D"],
      "correctAnswer": 0,
      "explanation": "Giải thích"
    }
  ]
}

Chỉ trả về JSON, không có text khác.`;
  }
  
  return createPrompt(request);
}

// Create content from raw Ollama response
function createContentFromRawResponse(aiResponse: string, request: GenerateContentRequest): GeneratedContent {
  return {
    title: `${request.topic} - ${request.subject} (Lớp ${request.grade})`,
    content: aiResponse,
    type: request.type,
    metadata: {
      subject: request.subject,
      grade: request.grade,
      topic: request.topic,
      estimatedDuration: request.duration || 45,
      difficulty: request.difficulty || 'medium',
    },
    // For quiz type, try to extract questions from raw response
    quiz: request.type === 'quiz' ? extractQuestionsFromText(aiResponse) : undefined,
  };
}

// Extract questions from raw text response
function extractQuestionsFromText(text: string) {
  const questions = [];
  
  // Try to extract JSON first - multiple strategies
  try {
    // Strategy 1: Find JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[0];
      
      // Clean up common JSON issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/\n/g, ' ')     // Replace newlines with spaces
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
      
      const parsed = JSON.parse(jsonStr);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        console.log('🏠 [OLLAMA] JSON extraction successful');
        return { questions: parsed.questions };
      }
    }
    
    // Strategy 2: Find JSON between code blocks
    const codeBlockMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        console.log('🏠 [OLLAMA] JSON extraction from code block successful');
        return { questions: parsed.questions };
      }
    }
    
  } catch (error) {
    console.log('🏠 [OLLAMA] JSON extraction failed:', error.message);
  }
  
  // Fallback: Create a simple question from the raw text
  console.log('🏠 [OLLAMA] Using fallback question creation');
  questions.push({
    question: `Câu hỏi về ${text.substring(0, 100)}...`,
    options: [
      "A. Đáp án A",
      "B. Đáp án B", 
      "C. Đáp án C",
      "D. Đáp án D"
    ],
    correctAnswer: 0,
    explanation: "Giải thích từ Ollama (format cần cải thiện)"
  });
  
  return { questions };
}

// Tạo prompt cho AI
function createPrompt(request: GenerateContentRequest): string {
  // Nếu có freeform prompt, ưu tiên sử dụng nó
  if (request.freeformPrompt && request.freeformPrompt.trim().length > 0) {
    return `Bạn là một chuyên gia giáo dục Việt Nam với 15 năm kinh nghiệm giảng dạy. Hãy tạo nội dung giáo dục chất lượng cao dựa trên yêu cầu sau:

${request.freeformPrompt}

YÊU CẦU CHẤT LƯỢNG:
- Nội dung chính xác, khoa học
- Phù hợp với học sinh Việt Nam
- Sử dụng tiếng Việt chuẩn, tự nhiên
- Có ví dụ thực tế, gần gũi
- Khuyến khích tư duy phản biện
- Trả về format JSON nếu là quiz hoặc slides`;
  }

  const basePrompt = `
Hãy tạo ${request.type === 'lesson' ? 'một bài học' : 
             request.type === 'quiz' ? 'một bài quiz' : 
             request.type === 'slides' ? 'slides thuyết trình' : 
             'kịch bản video'} về chủ đề: "${request.topic}"

Thông tin:
- Môn học: ${request.subject}
- Lớp: ${request.grade}
- Khung chương trình: ${request.curriculum || 'Chương trình GDPT 2018'}
- Thời lượng: ${request.duration || 45} phút
- Độ khó: ${request.difficulty || 'medium'}
${request.additionalContext ? `- Yêu cầu thêm: ${request.additionalContext}` : ''}

Yêu cầu:
`;

  if (request.type === 'lesson') {
    return basePrompt + `
1. Tạo một bài học chi tiết với cấu trúc:
   - Mục tiêu học tập (3-5 mục tiêu cụ thể)
   - Kiến thức trọng tâm
   - Nội dung bài học (chia thành các phần logic)
   - Ví dụ minh họa cụ thể
   - Bài tập thực hành (3-5 bài)
   - Tóm tắt và kết luận

2. Sử dụng ngôn ngữ phù hợp với độ tuổi học sinh
3. Tích hợp ví dụ thực tế từ cuộc sống
4. Định dạng nội dung bằng Markdown

Trả về dạng JSON với cấu trúc:
{
  "title": "Tiêu đề bài học",
  "content": "Nội dung chi tiết (Markdown)",
  "objectives": ["Mục tiêu 1", "Mục tiêu 2", ...],
  "keyPoints": ["Điểm trọng tâm 1", ...],
  "exercises": ["Bài tập 1", ...]
}
`;
  } else   if (request.type === 'quiz') {
    return basePrompt + `
1. Tạo 10 câu hỏi trắc nghiệm chất lượng cao
2. Mỗi câu hỏi có 4 đáp án, 1 đáp án đúng
3. Bao gồm giải thích chi tiết cho mỗi câu
4. Câu hỏi phải:
   - Kiểm tra hiểu biết sâu, không chỉ ghi nhớ
   - Có độ phân hóa tốt
   - Phù hợp với độ khó yêu cầu

Trả về dạng JSON với cấu trúc:
{
  "title": "Tiêu đề bài quiz",
  "questions": [
    {
      "question": "Câu hỏi",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": 0,
      "explanation": "Giải thích chi tiết"
    }
  ]
}
`;
  } else if (request.type === 'slides') {
    return basePrompt + `
1. Tạo 8-12 slides thuyết trình
2. Mỗi slide có:
   - Tiêu đề rõ ràng
   - Nội dung súc tích (không quá 5-7 bullet points)
   - Gợi ý hình ảnh minh họa

3. Cấu trúc slides:
   - Slide 1: Giới thiệu chủ đề
   - Slide 2-3: Động lực/Tại sao cần học
   - Slide 4-8: Nội dung chính (chia nhỏ)
   - Slide 9-10: Ví dụ/Ứng dụng
   - Slide 11: Tóm tắt
   - Slide 12: Bài tập/Thảo luận

Trả về dạng JSON với cấu trúc:
{
  "title": "Tiêu đề bài giảng",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Tiêu đề slide",
      "content": "Nội dung (các bullet points)",
      "imagePrompt": "Mô tả hình ảnh cần có"
    }
  ]
}
`;
  } else {
    return basePrompt + `
1. Tạo kịch bản video giảng dạy chi tiết
2. Bao gồm:
   - Hook (30s đầu để thu hút)
   - Giới thiệu (1-2 phút)
   - Nội dung chính (chia thành segments)
   - Demo/Ví dụ
   - Tổng kết và call-to-action

3. Mỗi phần có:
   - Thời gian ước tính
   - Script chi tiết
   - Gợi ý visual/animation

Trả về dạng JSON với cấu trúc:
{
  "title": "Tiêu đề video",
  "duration": ${request.duration || 10},
  "script": [
    {
      "segment": "Hook",
      "duration": 0.5,
      "content": "Nội dung script",
      "visual": "Gợi ý hình ảnh"
    }
  ]
}
`;
  }
}

// Parse AI response
function parseAIResponse(aiResponse: string, request: GenerateContentRequest): GeneratedContent {
  try {
    // Cố gắng extract JSON từ response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        title: parsed.title || `${request.topic} - ${request.subject}`,
        content: parsed.content || aiResponse,
        type: request.type,
        metadata: {
          subject: request.subject,
          grade: request.grade,
          topic: request.topic,
          estimatedDuration: request.duration || 45,
          difficulty: request.difficulty || 'medium',
        },
        quiz: request.type === 'quiz' ? { questions: parsed.questions || [] } : undefined,
        slides: request.type === 'slides' ? parsed.slides || [] : undefined,
      };
    }
  } catch (e) {
    console.error('Parse error:', e);
  }

  // Fallback: return raw content
  return {
    title: `${request.topic} - ${request.subject}`,
    content: aiResponse,
    type: request.type,
    metadata: {
      subject: request.subject,
      grade: request.grade,
      topic: request.topic,
      estimatedDuration: request.duration || 45,
      difficulty: request.difficulty || 'medium',
    },
  };
}

// Generate mock content (cho demo hoặc khi không có AI API)
function generateMockContent(request: GenerateContentRequest): GeneratedContent {
  const content: GeneratedContent = {
    title: `${request.topic} - ${request.subject} (Lớp ${request.grade})`,
    content: '',
    type: request.type,
    metadata: {
      subject: request.subject,
      grade: request.grade,
      topic: request.topic,
      estimatedDuration: request.duration || 45,
      difficulty: request.difficulty || 'medium',
    },
  };

  // Generate specific quiz questions based on topic
  function generateSpecificQuizQuestions(topic: string, subject: string, grade: string) {
    const questions = [];
    
    // Generate questions based on subject and topic
    if (subject === 'Toán học') {
      if (topic.toLowerCase().includes('phương trình bậc hai')) {
        questions.push(
          {
            question: `Phương trình bậc hai có dạng tổng quát là gì?`,
            options: [
              'A. ax² + bx + c = 0 (a ≠ 0)',
              'B. ax + b = 0',
              'C. ax³ + bx² + cx + d = 0',
              'D. a/x + b = 0'
            ],
            correctAnswer: 0,
            explanation: 'Phương trình bậc hai có dạng ax² + bx + c = 0 với a ≠ 0, trong đó a, b, c là các hệ số và x là ẩn số.'
          },
          {
            question: `Nghiệm của phương trình x² - 5x + 6 = 0 là:`,
            options: [
              'A. x = 2 và x = 3',
              'B. x = 1 và x = 6',
              'C. x = -2 và x = -3',
              'D. x = 0 và x = 5'
            ],
            correctAnswer: 0,
            explanation: 'Sử dụng công thức nghiệm: x = (5 ± √(25-24))/2 = (5 ± 1)/2, suy ra x = 2 hoặc x = 3.'
          },
          {
            question: `Điều kiện để phương trình bậc hai có nghiệm kép là:`,
            options: [
              'A. Δ = 0',
              'B. Δ > 0',
              'C. Δ < 0',
              'D. a = 0'
            ],
            correctAnswer: 0,
            explanation: 'Khi biệt thức Δ = b² - 4ac = 0, phương trình có nghiệm kép x = -b/(2a).'
          }
        );
      } else if (topic.toLowerCase().includes('hàm số')) {
        questions.push(
          {
            question: `Hàm số y = 2x + 3 có đồ thị là:`,
            options: [
              'A. Đường thẳng',
              'B. Parabol',
              'C. Hyperbol',
              'D. Đường tròn'
            ],
            correctAnswer: 0,
            explanation: 'Hàm số bậc nhất y = ax + b có đồ thị là một đường thẳng.'
          },
          {
            question: `Điểm nào sau đây thuộc đồ thị hàm số y = x² - 2x + 1?`,
            options: [
              'A. (1, 0)',
              'B. (0, 1)',
              'C. (2, 1)',
              'D. (-1, 4)'
            ],
            correctAnswer: 0,
            explanation: 'Thay x = 1 vào hàm số: y = 1² - 2(1) + 1 = 0, nên điểm (1, 0) thuộc đồ thị.'
          }
        );
      }
    } else if (subject === 'Vật lý') {
      if (topic.toLowerCase().includes('định luật newton')) {
        questions.push(
          {
            question: `Định luật I Newton (định luật quán tính) phát biểu:`,
            options: [
              'A. Một vật sẽ giữ nguyên trạng thái đứng yên hoặc chuyển động thẳng đều nếu không có lực nào tác dụng',
              'B. Gia tốc của vật tỉ lệ thuận với lực tác dụng',
              'C. Mọi lực tác dụng đều có phản lực',
              'D. Lực hấp dẫn tỉ lệ nghịch với bình phương khoảng cách'
            ],
            correctAnswer: 0,
            explanation: 'Định luật I Newton nói về tính quán tính: vật giữ nguyên trạng thái chuyển động khi không có lực tác dụng.'
          },
          {
            question: `Khi một chiếc xe đang chạy đột ngột phanh gấp, hành khách bị ngã về phía trước do:`,
            options: [
              'A. Quán tính',
              'B. Lực ma sát',
              'C. Trọng lực',
              'D. Lực đẩy'
            ],
            correctAnswer: 0,
            explanation: 'Do quán tính, cơ thể hành khách muốn tiếp tục chuyển động về phía trước khi xe dừng đột ngột.'
          },
          {
            question: `Công thức của định luật II Newton là:`,
            options: [
              'A. F = ma',
              'B. F = mv',
              'C. F = mgh',
              'D. F = mv²/r'
            ],
            correctAnswer: 0,
            explanation: 'Định luật II Newton: F = ma, trong đó F là lực, m là khối lượng, a là gia tốc.'
          }
        );
      } else if (topic.toLowerCase().includes('điện')) {
        questions.push(
          {
            question: `Đơn vị đo cường độ dòng điện là:`,
            options: [
              'A. Ampe (A)',
              'B. Volt (V)',
              'C. Ohm (Ω)',
              'D. Watt (W)'
            ],
            correctAnswer: 0,
            explanation: 'Cường độ dòng điện được đo bằng đơn vị Ampe (A).'
          }
        );
      }
    } else if (subject === 'Hóa học') {
      if (topic.toLowerCase().includes('phản ứng')) {
        questions.push(
          {
            question: `Phản ứng hóa học là quá trình:`,
            options: [
              'A. Biến đổi chất này thành chất khác',
              'B. Chỉ thay đổi trạng thái vật lý',
              'C. Chỉ thay đổi nhiệt độ',
              'D. Chỉ thay đổi thể tích'
            ],
            correctAnswer: 0,
            explanation: 'Phản ứng hóa học là quá trình biến đổi chất này thành chất khác, có sự thay đổi về cấu trúc phân tử.'
          }
        );
      }
    }
    
    // If no specific questions generated, create high-quality generic ones
    if (questions.length === 0) {
      // Create better questions based on subject
      if (subject === 'Vật lý') {
        questions.push(
          {
            question: `Trong dao động cơ, đại lượng nào đặc trưng cho độ lớn của dao động?`,
            options: [
              'A. Biên độ dao động (A)',
              'B. Tần số dao động (f)',
              'C. Chu kì dao động (T)',
              'D. Pha ban đầu (φ)'
            ],
            correctAnswer: 0,
            explanation: 'Biên độ dao động (A) là độ lệch cực đại của vật so với vị trí cân bằng, đặc trưng cho độ lớn của dao động.'
          },
          {
            question: `Dao động điều hòa có phương trình x = 5cos(2πt + π/3) cm. Biên độ dao động là:`,
            options: [
              'A. 5 cm',
              'B. 10 cm',
              'C. 2π cm',
              'D. π/3 cm'
            ],
            correctAnswer: 0,
            explanation: 'Trong phương trình x = Acos(ωt + φ), A = 5 cm chính là biên độ dao động.'
          },
          {
            question: `Chu kì dao động của con lắc đơn phụ thuộc vào:`,
            options: [
              'A. Chiều dài dây treo và gia tốc trọng trường',
              'B. Khối lượng vật nặng và chiều dài dây',
              'C. Biên độ dao động và khối lượng vật',
              'D. Gia tốc trọng trường và biên độ dao động'
            ],
            correctAnswer: 0,
            explanation: 'Chu kì con lắc đơn: T = 2π√(l/g), chỉ phụ thuộc vào chiều dài dây treo (l) và gia tốc trọng trường (g).'
          }
        );
      } else if (subject === 'Toán học') {
        questions.push(
          {
            question: `Đạo hàm của hàm số y = x³ - 3x² + 2x - 1 là:`,
            options: [
              'A. y\' = 3x² - 6x + 2',
              'B. y\' = 3x² - 6x + 2x',
              'C. y\' = x² - 3x + 2',
              'D. y\' = 3x² - 3x + 2'
            ],
            correctAnswer: 0,
            explanation: 'Áp dụng công thức đạo hàm: (xⁿ)\' = nxⁿ⁻¹. Ta có: (x³)\' = 3x², (-3x²)\' = -6x, (2x)\' = 2, (-1)\' = 0.'
          },
          {
            question: `Nghiệm của phương trình 2x + 5 = 13 là:`,
            options: [
              'A. x = 4',
              'B. x = 6',
              'C. x = 8',
              'D. x = 9'
            ],
            correctAnswer: 0,
            explanation: 'Giải phương trình: 2x + 5 = 13 → 2x = 13 - 5 → 2x = 8 → x = 4.'
          }
        );
      } else {
        // Generic high-quality questions
        questions.push(
          {
            question: `Khái niệm chính của ${topic} trong ${subject} là gì?`,
            options: [
              `A. ${topic} là một khái niệm cơ bản và quan trọng trong ${subject}`,
              `B. ${topic} chỉ là phần phụ trong ${subject}`,
              `C. ${topic} không có ứng dụng thực tế`,
              `D. ${topic} quá khó để học sinh hiểu`
            ],
            correctAnswer: 0,
            explanation: `${topic} là một khái niệm nền tảng trong ${subject}, giúp học sinh hiểu sâu hơn về các vấn đề liên quan và có nhiều ứng dụng thực tế.`
          },
          {
            question: `Đặc điểm quan trọng của ${topic} là:`,
            options: [
              `A. Có tính chất khoa học và logic rõ ràng`,
              `B. Không tuân theo quy luật nào`,
              `C. Chỉ tồn tại trong lý thuyết`,
              `D. Không liên quan đến thực tế`
            ],
            correctAnswer: 0,
            explanation: `${topic} có những đặc điểm khoa học rõ ràng, tuân theo các quy luật và nguyên lý cơ bản, đồng thời có nhiều ứng dụng trong thực tế.`
          }
        );
      }
    }
    
    return questions;
  }

  if (request.type === 'lesson') {
    // Generate subject-specific content
    let lessonContent = '';
    
    if (request.subject === 'Vật lý' && request.topic.toLowerCase().includes('dao động')) {
      lessonContent = `# ${request.topic}

## 🎯 Mục tiêu học tập

1. **Hiểu khái niệm dao động cơ**: Định nghĩa, phân loại và đặc điểm của dao động
2. **Nắm vững dao động điều hòa**: Phương trình, đồ thị và các đại lượng đặc trưng
3. **Áp dụng vào con lắc**: Con lắc đơn, con lắc lò xo và các ứng dụng thực tế
4. **Giải bài tập**: Tính toán chu kì, tần số, biên độ và năng lượng dao động

## 📚 Kiến thức trọng tâm

### 1. Định nghĩa dao động cơ

**Dao động cơ** là chuyển động qua lại của một vật quanh vị trí cân bằng dưới tác dụng của lực hồi phục.

**Đặc điểm:**
- Có tính tuần hoàn (lặp lại sau một khoảng thời gian nhất định)
- Luôn có vị trí cân bằng
- Chịu tác dụng của lực hồi phục

### 2. Dao động điều hòa

**Định nghĩa**: Dao động điều hòa là dao động có li độ biến thiên theo quy luật hình sin hoặc cosin.

**Phương trình dao động điều hòa:**
\`\`\`
x = Acos(ωt + φ)
\`\`\`

Trong đó:
- **x**: Li độ dao động (m)
- **A**: Biên độ dao động (m) - độ lệch cực đại
- **ω**: Tần số góc (rad/s)
- **t**: Thời gian (s)
- **φ**: Pha ban đầu (rad)

**Các đại lượng đặc trưng:**
- **Chu kì T**: Thời gian thực hiện 1 dao động toàn phần
- **Tần số f**: Số dao động trong 1 giây (f = 1/T)
- **Tần số góc**: ω = 2πf = 2π/T

### 3. Con lắc đơn

**Định nghĩa**: Hệ gồm một vật nhỏ khối lượng m treo vào một sợi dây không dãn, chiều dài l.

**Chu kì dao động nhỏ:**
\`\`\`
T = 2π√(l/g)
\`\`\`

**Đặc điểm:**
- Chu kì chỉ phụ thuộc vào chiều dài dây treo và gia tốc trọng trường
- Không phụ thuộc vào khối lượng vật nặng và biên độ dao động nhỏ

### 4. Con lắc lò xo

**Định nghĩa**: Hệ gồm một vật nhỏ khối lượng m gắn vào đầu một lò xo có độ cứng k.

**Chu kì dao động:**
\`\`\`
T = 2π√(m/k)
\`\`\`

**Tần số góc:**
\`\`\`
ω = √(k/m)
\`\`\`

### 5. Năng lượng trong dao động điều hòa

**Thế năng:**
\`\`\`
Wt = (1/2)kx² = (1/2)mω²x²
\`\`\`

**Động năng:**
\`\`\`
Wđ = (1/2)mv² = (1/2)mω²(A² - x²)
\`\`\`

**Cơ năng (bảo toàn):**
\`\`\`
W = Wt + Wđ = (1/2)kA² = (1/2)mω²A²
\`\`\`

## 🔬 Ví dụ minh họa

### Ví dụ 1: Tính chu kì con lắc đơn

**Đề bài**: Một con lắc đơn có chiều dài dây treo l = 1m, gia tốc trọng trường g = 10 m/s². Tính chu kì dao động.

**Giải:**
Bước 1: Áp dụng công thức chu kì con lắc đơn
\`\`\`
T = 2π√(l/g)
\`\`\`

Bước 2: Thay số
\`\`\`
T = 2π√(1/10) = 2π√(0.1) = 2π × 0.316 = 1.99 s
\`\`\`

**Kết luận**: Chu kì dao động của con lắc là 1.99 giây.

### Ví dụ 2: Viết phương trình dao động

**Đề bài**: Một vật dao động điều hòa có biên độ A = 4cm, chu kì T = 2s, tại t = 0 vật ở vị trí cân bằng và chuyển động theo chiều dương. Viết phương trình dao động.

**Giải:**
Bước 1: Tính tần số góc
\`\`\`
ω = 2π/T = 2π/2 = π (rad/s)
\`\`\`

Bước 2: Xác định pha ban đầu
- Tại t = 0: x = 0, v > 0
- Từ x = Acos(φ) = 0 → cos(φ) = 0 → φ = ±π/2
- Vì v > 0 nên φ = -π/2

Bước 3: Viết phương trình
\`\`\`
x = 4cos(πt - π/2) cm
\`\`\`

## 📝 Bài tập thực hành

### Bài 1: Cơ bản
Một con lắc đơn dao động với chu kì 2s. Nếu tăng chiều dài dây treo lên 4 lần thì chu kì mới là bao nhiêu?

### Bài 2: Vận dụng
Một con lắc lò xo có khối lượng m = 100g, độ cứng k = 100 N/m. Tính chu kì và tần số dao động.

### Bài 3: Nâng cao
Một vật dao động điều hòa với phương trình x = 6cos(4πt + π/3) cm. Tính:
a) Biên độ, chu kì, tần số
b) Li độ và vận tốc tại t = 0.5s
c) Thời gian ngắn nhất để vật đi từ vị trí cân bằng đến vị trí biên

## 🎯 Tóm tắt kiến thức

1. **Dao động cơ** là chuyển động tuần hoàn quanh vị trí cân bằng
2. **Dao động điều hòa** tuân theo phương trình x = Acos(ωt + φ)
3. **Con lắc đơn**: T = 2π√(l/g) - chỉ phụ thuộc l và g
4. **Con lắc lò xo**: T = 2π√(m/k) - phụ thuộc m và k
5. **Năng lượng dao động** được bảo toàn và biến đổi qua lại giữa thế năng và động năng

## 🔗 Ứng dụng thực tế

- **Đồng hồ quả lắc**: Sử dụng dao động của con lắc để đo thời gian
- **Giảm chấn**: Hệ thống lò xo giảm chấn trong xe máy, ô tô
- **Cầu treo**: Dao động tự nhiên của cầu dưới tác dụng của gió
- **Địa chấn học**: Dao động của Trái Đất trong động đất`;
    } else {
      lessonContent = `# ${request.topic}

## 🎯 Mục tiêu học tập

1. **Hiểu khái niệm cơ bản**: Nắm vững định nghĩa và đặc điểm chính của ${request.topic}
2. **Áp dụng kiến thức**: Sử dụng hiểu biết để giải quyết các bài tập thực tế
3. **Phát triển tư duy**: Rèn luyện khả năng phân tích, tổng hợp và đánh giá

## 📚 Kiến thức trọng tâm

### 1. Định nghĩa và khái niệm cơ bản

**${request.topic}** là một khái niệm quan trọng trong ${request.subject}, có vai trò nền tảng trong việc xây dựng kiến thức chuyên sâu.

**Đặc điểm chính:**
- Tính khoa học và logic rõ ràng
- Có nhiều ứng dụng thực tế
- Liên quan mật thiết với các khái niệm khác trong ${request.subject}

### 2. Nội dung chi tiết

**Phần A: Lý thuyết cơ bản**
- Khái niệm và định nghĩa
- Các tính chất quan trọng
- Mối quan hệ với các khái niệm liên quan

**Phần B: Ứng dụng**
- Ví dụ minh họa cụ thể
- Bài tập vận dụng
- Tình huống thực tế

### 3. Ví dụ minh họa

**Ví dụ 1**: [Ví dụ cụ thể liên quan đến ${request.topic}]
- **Tình huống**: Mô tả tình huống thực tế
- **Phân tích**: Giải thích cách áp dụng kiến thức
- **Kết luận**: Rút ra bài học và ứng dụng

## 📝 Bài tập thực hành

### Bài tập cơ bản
1. [Câu hỏi kiểm tra hiểu biết cơ bản về ${request.topic}]
2. [Bài tập nhận biết và phân loại]

### Bài tập vận dụng
1. [Bài tập áp dụng kiến thức vào tình huống cụ thể]
2. [Bài tập so sánh và phân tích]

### Bài tập nâng cao
1. [Bài tập tổng hợp nhiều kiến thức]
2. [Bài tập sáng tạo và mở rộng]

## 🎯 Tóm tắt và kết luận

**Những điểm quan trọng cần nhớ:**
1. [Điểm quan trọng 1 về ${request.topic}]
2. [Điểm quan trọng 2 về ${request.topic}]
3. [Điểm quan trọng 3 về ${request.topic}]

**Mối liên hệ với các chủ đề khác:**
- [Mối liên hệ 1]
- [Mối liên hệ 2]
- [Mối liên hệ 3]

**Ứng dụng trong thực tế:**
- [Ứng dụng 1]
- [Ứng dụng 2]
- [Ứng dụng 3]`;
    }
    
    content.content = lessonContent;
  } else if (request.type === 'quiz') {
    // Generate specific quiz questions based on topic
    const quizQuestions = generateSpecificQuizQuestions(request.topic, request.subject, request.grade);
    content.quiz = {
      questions: quizQuestions
    };
    content.content = `Quiz về ${request.topic} gồm ${quizQuestions.length} câu hỏi`;
  } else if (request.type === 'slides') {
    content.slides = [
      {
        slideNumber: 1,
        title: request.topic,
        content: `Chào mừng đến với bài học về ${request.topic}\n\nMôn: ${request.subject}\nLớp: ${request.grade}`,
        imagePrompt: `Hình ảnh chủ đề ${request.topic}`
      },
      {
        slideNumber: 2,
        title: 'Tại sao cần học?',
        content: `• Ứng dụng trong thực tế\n• Nền tảng cho kiến thức nâng cao\n• Phát triển tư duy logic`,
        imagePrompt: 'Biểu đồ lợi ích học tập'
      },
      {
        slideNumber: 3,
        title: 'Khái niệm cơ bản',
        content: `• Định nghĩa chính\n• Các thuật ngữ quan trọng\n• Ví dụ đơn giản`,
        imagePrompt: 'Sơ đồ khái niệm'
      },
      {
        slideNumber: 4,
        title: 'Phân tích chi tiết',
        content: `• Tính chất 1\n• Tính chất 2\n• Tính chất 3\n• Mối liên hệ giữa các tính chất`,
        imagePrompt: 'Infographic các tính chất'
      },
      {
        slideNumber: 5,
        title: 'Ví dụ minh họa',
        content: `Ví dụ 1: [Tình huống cụ thể]\n\nGiải pháp:\n• Bước 1\n• Bước 2\n• Kết luận`,
        imagePrompt: 'Minh họa bước giải quyết'
      },
      {
        slideNumber: 6,
        title: 'Thực hành',
        content: `Bài tập 1: [Đề bài]\n\nHãy cùng giải quyết!\n\nGợi ý: ...`,
        imagePrompt: 'Bài tập tương tác'
      },
      {
        slideNumber: 7,
        title: 'Tóm tắt',
        content: `Những điểm chính:\n• Điểm 1\n• Điểm 2\n• Điểm 3\n\nGhi nhớ: [Key takeaway]`,
        imagePrompt: 'Tóm tắt trực quan'
      },
      {
        slideNumber: 8,
        title: 'Câu hỏi & Bài tập về nhà',
        content: `Q&A\n\nBài tập về nhà:\n1. [Bài 1]\n2. [Bài 2]\n3. [Bài 3]`,
        imagePrompt: 'Hình ảnh động viên học tập'
      }
    ];
    content.content = `Slides về ${request.topic} gồm ${content.slides.length} slides`;
  }

  return content;
}

// Main API handler
export async function POST(req: NextRequest) {
  try {
    // Kiểm tra authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Vui lòng đăng nhập' },
        { status: 401 }
      );
    }

    // Chỉ teacher mới được sử dụng
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Chỉ giáo viên mới có thể sử dụng tính năng này' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: GenerateContentRequest = await req.json();

    // Validate input
    if (!body.type || !body.subject || !body.grade || !body.topic) {
      return NextResponse.json(
        { error: 'Missing required fields: type, subject, grade, topic' },
        { status: 400 }
      );
    }

    // Generate content
    const generatedContent = await generateWithAI(body);

    return NextResponse.json({
      success: true,
      data: generatedContent,
      message: 'Nội dung đã được tạo thành công!',
    });

  } catch (error) {
    console.error('AI Content Generation error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Có lỗi xảy ra khi tạo nội dung. Vui lòng thử lại.'
      },
      { status: 500 }
    );
  }
}

// GET method để lấy thông tin về API
export async function GET() {
  return NextResponse.json({
    name: 'AI Content Generator API',
    version: '1.0.0',
    description: 'Tạo tự động nội dung giảng dạy (bài học, quiz, slides) bằng AI',
    endpoints: {
      POST: {
        path: '/api/ai-content/generate',
        description: 'Tạo nội dung mới',
        requiredFields: ['type', 'subject', 'grade', 'topic'],
        optionalFields: ['curriculum', 'duration', 'difficulty', 'additionalContext'],
        types: ['lesson', 'quiz', 'slides', 'video-script']
      }
    },
    status: 'active',
    features: [
      'Tạo bài học chi tiết với cấu trúc rõ ràng',
      'Sinh quiz với câu hỏi chất lượng cao',
      'Tạo slides thuyết trình chuyên nghiệp',
      'Hỗ trợ nhiều môn học và cấp độ',
      'Tiết kiệm 70-80% thời gian chuẩn bị'
    ]
  });
}

