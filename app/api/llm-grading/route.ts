import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OCR_LLM_BACKEND_URL } from '@/lib/rust-backend';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const RUST_BACKEND_URL = OCR_LLM_BACKEND_URL;
const USE_RUST_LLM_GRADING_SERVICE = process.env.USE_RUST_LLM_GRADING_SERVICE === 'true';

// Auto-select best AI based on context
function autoSelectAI(studentAnswer: string, questionText: string, modelAnswer: string): string {
  const answerLength = studentAnswer.length;
  const questionLength = questionText.length;
  const modelLength = modelAnswer.length;
  
  // Calculate complexity score
  const complexityScore = 
    (answerLength > 500 ? 2 : 0) +
    (questionLength > 200 ? 1 : 0) +
    (modelLength > 300 ? 1 : 0);
  
  // Decision logic - prefer GPT-4 for high quality, Gemini for speed
  if (process.env.OPENAI_API_KEY) {
    // GPT-4 available - use for complex/important tasks
    if (complexityScore >= 2 || answerLength > 300) {
      return 'gpt4'; // GPT-4 for complex grading
    }
  }
  
  if (process.env.GEMINI_API_KEY) {
    return 'gemini'; // Gemini for fast grading
  }
  
  if (process.env.GROK_API_KEY) {
    return 'grok'; // Grok as alternative
  }
  
  // Final fallback
  return 'simulation';
}

// Subject-specific prompts for fine-tuning
const subjectPrompts = {
  history: `Bạn là một giáo viên lịch sử chuyên nghiệp. Khi chấm bài, hãy chú ý:
- Sự chính xác về năm tháng, sự kiện
- Mối quan hệ nhân quả lịch sử
- Dẫn chứng lịch sử cụ thể`,
  literature: `Bạn là một giáo viên văn học chuyên nghiệp. Khi chấm bài, hãy chú ý:
- Kỹ năng phân tích văn bản
- Cảm thụ nghệ thuật
- Khả năng diễn đạt, lập luận`,
  math: `Bạn là một giáo viên toán học chuyên nghiệp. Khi chấm bài, hãy chú ý:
- Tính chính xác của công thức
- Logic suy luận toán học
- Trình bày lời giải rõ ràng`,
  physics: `Bạn là một giáo viên vật lý chuyên nghiệp. Khi chấm bài, hãy chú ý:
- Áp dụng công thức đúng
- Hiểu biết về nguyên lý vật lý
- Đơn vị và phép tính chính xác`,
  general: `Bạn là một giáo viên chuyên nghiệp đang chấm bài thi tự luận.`
};

export async function POST(req: NextRequest) {
  try {
    const target = req.nextUrl.searchParams.get('target') || req.headers.get('x-strangler-target');
    const shouldUseRust =
      target === 'rust' || (target !== 'node' && USE_RUST_LLM_GRADING_SERVICE);

    if (shouldUseRust) {
      const rawBody = await req.text();
      const rustResponse = await fetch(`${RUST_BACKEND_URL}/api/llm-grading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
      });
      const rustData = await rustResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          ...rustData,
          backend: 'rust',
          strangler_target: 'rust'
        },
        { status: rustResponse.status }
      );
    }

    const { 
      student_answer, 
      question_text, 
      model_answer, 
      max_score,
      llm_provider = 'auto',
      auto_select = false,
      subject = 'general',
      use_vector_similarity = false,
      use_embedding_cache = true
    } = await req.json();

    // Validate inputs
    if (!student_answer || !question_text || !model_answer || !max_score) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    let score = 0;
    let comment = '';
    let selectedProvider = llm_provider;
    let vectorSimilarity = 0;
    
    // Auto-select AI if enabled
    if (auto_select || llm_provider === 'auto') {
      selectedProvider = autoSelectAI(student_answer, question_text, model_answer);
    }

    // Check vector similarity if enabled
    if (use_vector_similarity) {
      try {
        const vectorResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/vector-similarity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_answer,
            model_answer,
            use_cache: use_embedding_cache
          })
        });
        
        if (vectorResponse.ok) {
          const vectorData = await vectorResponse.json();
          vectorSimilarity = vectorData.similarity_percent || 0;
          console.log(`📊 Vector similarity: ${vectorSimilarity}%`);
        }
      } catch (vectorError) {
        console.warn('Vector similarity failed, continuing without it');
      }
    }

    // GPT-4 API Integration (Priority 1)
    if (selectedProvider === 'gpt4') {
      try {
        const subjectContext = subjectPrompts[subject as keyof typeof subjectPrompts] || subjectPrompts.general;

        const gptPrompt = `${subjectContext}
Hãy đánh giá bài làm của học sinh và cho điểm công bằng.

### Câu hỏi:
${question_text}

### Đáp án mẫu (chuẩn):
${model_answer}

### Bài làm của học sinh:
${student_answer}

### Yêu cầu:
1. So sánh bài làm học sinh với đáp án mẫu
2. Cho điểm từ 0 đến ${max_score} (có thể có số thập phân, ví dụ: 7.5, 8.2)
3. Giải thích ngắn gọn lý do chấm điểm (2-3 câu)
4. Chỉ ra điểm mạnh và điểm yếu của bài làm

### Định dạng trả về (chỉ trả về JSON thuần, không có markdown):
{
  "score": <số điểm>,
  "comment": "<nhận xét chi tiết>"
}`;

        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: 'You are an expert teacher grading student essays in Vietnamese. Always respond in valid JSON format.'
              },
              {
                role: 'user',
                content: gptPrompt
              }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
          })
        });

        if (!gptResponse.ok) {
          const errorData = await gptResponse.json().catch(() => ({}));
          throw new Error(`GPT-4 API error: ${gptResponse.statusText} - ${JSON.stringify(errorData)}`);
        }

        const gptData = await gptResponse.json();
        const gptText = gptData.choices[0].message.content;

        // Parse GPT-4 response
        const parsed = JSON.parse(gptText);
        score = parseFloat(parsed.score);
        comment = parsed.comment;

        if (isNaN(score) || score < 0 || score > max_score) {
          score = Math.min(Math.max(0, score), max_score);
        }

        console.log(`✅ GPT-4 grading: ${score}/${max_score}`);

      } catch (gpt4Error: any) {
        console.error('GPT-4 API failed:', gpt4Error.message);
        // Fallback to Gemini if GPT-4 fails
        console.log('⚠️ Falling back to Gemini...');
        selectedProvider = 'gemini';
      }
    }

    // GROK API Integration
    if (selectedProvider === 'grok') {
      try {
        const grokPrompt = `Bạn là một giáo viên chuyên nghiệp đang chấm bài thi tự luận. Hãy đánh giá bài làm của học sinh và cho điểm công bằng.

### Câu hỏi:
${question_text}

### Đáp án mẫu (chuẩn):
${model_answer}

### Bài làm của học sinh:
${student_answer}

### Yêu cầu:
1. So sánh bài làm học sinh với đáp án mẫu
2. Cho điểm từ 0 đến ${max_score} (có thể có số thập phân, ví dụ: 7.5, 8.2)
3. Giải thích ngắn gọn lý do chấm điểm (2-3 câu)
4. Chỉ ra điểm mạnh và điểm yếu của bài làm

### Định dạng trả về (chỉ trả về JSON thuần, không có markdown):
{
  "score": <số điểm>,
  "comment": "<nhận xét chi tiết>"
}`;

        const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROK_API_KEY}`
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: 'You are an expert teacher grading student essays in Vietnamese. Always respond in valid JSON format.'
              },
              {
                role: 'user',
                content: grokPrompt
              }
            ],
            model: 'grok-beta',
            stream: false,
            temperature: 0.3
          })
        });

        if (!grokResponse.ok) {
          throw new Error(`Grok API error: ${grokResponse.statusText}`);
        }

        const grokData = await grokResponse.json();
        const grokText = grokData.choices[0].message.content;

        // Parse Grok response
        try {
          let cleanedText = grokText.trim();
          if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
          }

          const parsed = JSON.parse(cleanedText);
          score = parseFloat(parsed.score);
          comment = parsed.comment;

          if (isNaN(score) || score < 0 || score > max_score) {
            score = Math.min(Math.max(0, score), max_score);
          }
        } catch (parseError) {
          console.error('Error parsing Grok response:', parseError);
          // Fallback extraction
          const scoreMatch = grokText.match(/score["\s:]+(\d+\.?\d*)/i);
          const commentMatch = grokText.match(/comment["\s:]+["']?([^"'\n]+)["']?/i);
          
          score = scoreMatch ? parseFloat(scoreMatch[1]) : max_score * 0.7;
          comment = commentMatch ? commentMatch[1] : 'Grok đánh giá: ' + grokText.substring(0, 100);
        }

        console.log(`✅ Grok grading: ${score}/${max_score}`);

      } catch (grokError: any) {
        console.error('Grok API failed:', grokError.message);
        // Fallback to simulation if Grok fails
        selectedProvider = 'gemini';
      }
    }

    // GEMINI API Integration
    if (selectedProvider === 'gemini') {
      try {
        // Use Gemini 2.5 Pro Preview (latest model available)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro-preview-03-25' });

        // Get subject-specific prompt for fine-tuning
        const subjectContext = subjectPrompts[subject as keyof typeof subjectPrompts] || subjectPrompts.general;

        const geminiPrompt = `${subjectContext}
Hãy đánh giá bài làm của học sinh và cho điểm công bằng.

### Câu hỏi:
${question_text}

### Đáp án mẫu (chuẩn):
${model_answer}

### Bài làm của học sinh:
${student_answer}

### Yêu cầu:
1. So sánh bài làm học sinh với đáp án mẫu
2. Cho điểm từ 0 đến ${max_score} (có thể có số thập phân, ví dụ: 7.5, 8.2)
3. Giải thích ngắn gọn lý do chấm điểm (2-3 câu)
4. Chỉ ra điểm mạnh và điểm yếu của bài làm
${vectorSimilarity > 0 ? `\n### Thông tin bổ sung:\nVector similarity score: ${vectorSimilarity}% (độ tương đồng ngữ nghĩa)` : ''}

### Định dạng trả về (chỉ trả về JSON thuần, không có markdown):
{
  "score": <số điểm>,
  "comment": "<nhận xét chi tiết>"
}`;

        const result = await model.generateContent(geminiPrompt);
        const response = await result.response;
        const text = response.text();

        // Parse Gemini response
        try {
          let cleanedText = text.trim();
          if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
          }

          const parsed = JSON.parse(cleanedText);
          score = parseFloat(parsed.score);
          comment = parsed.comment;

          if (isNaN(score) || score < 0 || score > max_score) {
            score = Math.min(Math.max(0, score), max_score);
          }
        } catch (parseError) {
          console.error('Error parsing Gemini response:', parseError);
          // Fallback extraction
          const scoreMatch = text.match(/score["\s:]+(\d+\.?\d*)/i);
          const commentMatch = text.match(/comment["\s:]+["']?([^"'\n]+)["']?/i);
          
          score = scoreMatch ? parseFloat(scoreMatch[1]) : max_score * 0.7;
          comment = commentMatch ? commentMatch[1] : 'Gemini đánh giá: ' + text.substring(0, 100);
        }

        console.log(`✅ Gemini grading: ${score}/${max_score}`);

      } catch (geminiError: any) {
        console.error('Gemini API failed:', geminiError.message);
        // Use smart simulation as fallback
        selectedProvider = 'simulation';
      }
    }

    // SMART SIMULATION FALLBACK
    if (selectedProvider === 'simulation' || (selectedProvider !== 'grok' && selectedProvider !== 'gemini' && selectedProvider !== 'claude' && selectedProvider !== 'gpt4' && selectedProvider !== 'llama3')) {
      console.log('📝 Using Smart Simulation Mode');
      
      const answerLength = student_answer.length;
      const answerWords = student_answer.split(/\s+/).length;
      const modelWords = model_answer.split(/\s+/).length;
      
      const importantKeywords = ['đảng', 'lãnh đạo', 'thắng lợi', 'nhân dân', 'đoàn kết', 'cách mạng', 'dân tộc'];
      const matchedKeywords = importantKeywords.filter(keyword => 
        student_answer.toLowerCase().includes(keyword)
      );
      
      let baseScore = 0;
      const lengthRatio = Math.min(answerWords / Math.max(modelWords, 10), 1.5);
      baseScore += Math.min(lengthRatio * 3, 3);
      const keywordScore = (matchedKeywords.length / importantKeywords.length) * 4;
      baseScore += keywordScore;
      if (answerLength > 50) baseScore += 1;
      if (answerLength > 100) baseScore += 1;
      if (answerWords > 15) baseScore += 1;
      
      score = Math.min(baseScore, max_score);
      score = Math.round((score + (Math.random() * 1 - 0.5)) * 10) / 10;
      score = Math.max(0, Math.min(score, max_score));
      
      if (score >= max_score * 0.8) {
        comment = `Bài làm tốt! Trình bày được ${matchedKeywords.length}/${importantKeywords.length} ý chính. ${
          answerLength > 100 ? 'Nội dung đầy đủ và mạch lạc.' : 'Có thể bổ sung thêm dẫn chứng.'
        } Điểm: ${score}/${max_score}.`;
      } else if (score >= max_score * 0.5) {
        comment = `Bài làm khá. Đã nêu được một số ý quan trọng. ${
          answerLength < 80 ? 'Cần bổ sung thêm nội dung.' : 'Có thể trình bày rõ hơn.'
        } Điểm: ${score}/${max_score}.`;
      } else {
        comment = `Bài làm cần cải thiện. Thiếu nhiều ý chính. Cần bổ sung thêm. Điểm: ${score}/${max_score}.`;
      }
      
      selectedProvider = 'simulation';
      console.log(`✅ Simulation grading: ${score}/${max_score}`);
    }

    // Handle other providers (Claude, Llama3)
    if (selectedProvider === 'claude' || selectedProvider === 'llama3') {
      return NextResponse.json(
        { error: `${selectedProvider.toUpperCase()} chưa được tích hợp. Vui lòng chọn GPT-4, Grok hoặc Gemini.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      score: Math.round(score * 10) / 10,
      comment,
      provider: selectedProvider,
      auto_selected: auto_select || llm_provider === 'auto',
      reasoning: auto_select || llm_provider === 'auto' 
        ? `Auto-selected ${selectedProvider} based on answer complexity and length` 
        : undefined,
      subject: subject,
      vector_similarity: vectorSimilarity > 0 ? vectorSimilarity : undefined,
      features_used: {
        vector_similarity: use_vector_similarity,
        embedding_cache: use_embedding_cache,
        subject_tuning: subject !== 'general'
      }
    });

  } catch (error: any) {
    console.error('Error in LLM grading:', error);
    return NextResponse.json(
      { 
        error: 'Lỗi khi xử lý chấm điểm',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
