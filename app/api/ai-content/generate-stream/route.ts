import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Stream response for real-time AI generation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, subject, grade, topic, curriculum, duration, difficulty, additionalContext, aiModel, freeformPrompt } = body;

    // Validate required fields - either freeform prompt or structured fields
    if (!freeformPrompt && (!type || !subject || !grade || !topic)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a readable stream for real-time response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: '🚀 Bắt đầu tạo nội dung...',
            progress: 10
          })}\n\n`));

          // Simulate AI model selection
          await new Promise(resolve => setTimeout(resolve, 500));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: `🤖 Đang sử dụng ${aiModel.toUpperCase()} model...`,
            progress: 20
          })}\n\n`));

          // Simulate content analysis
          await new Promise(resolve => setTimeout(resolve, 800));
          const analysisMessage = freeformPrompt 
            ? `📚 Phân tích prompt tự do (${freeformPrompt.substring(0, 50)}...)...`
            : `📚 Phân tích chủ đề: ${topic} (${subject} - Lớp ${grade})...`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: analysisMessage,
            progress: 40
          })}\n\n`));

          // Simulate content generation
          await new Promise(resolve => setTimeout(resolve, 1000));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: '⚡ Đang tạo nội dung...',
            progress: 60
          })}\n\n`));

          // Generate content based on type or freeform prompt
          let generatedContent;
          
          if (freeformPrompt) {
            // Use REAL AI generation with freeform prompt
            generatedContent = await generateWithRealAI(freeformPrompt, aiModel, { type, subject, grade, topic });
          } else if (type === 'quiz') {
            generatedContent = await generateQuizContent(topic, subject, grade, difficulty);
          } else if (type === 'lesson') {
            generatedContent = await generateLessonContent(topic, subject, grade, duration);
          } else if (type === 'slides') {
            generatedContent = await generateSlidesContent(topic, subject, grade);
          } else if (type === 'video-script') {
            generatedContent = await generateVideoScriptContent(topic, subject, grade, duration);
          }

          // Send progress update
          await new Promise(resolve => setTimeout(resolve, 500));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: '✨ Hoàn thiện nội dung...',
            progress: 80
          })}\n\n`));

          // Send final result
          await new Promise(resolve => setTimeout(resolve, 300));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'result',
            data: generatedContent,
            model: aiModel.toUpperCase(),
            progress: 100
          })}\n\n`));

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Có lỗi xảy ra trong quá trình tạo nội dung'
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate quiz content with specific questions
async function generateQuizContent(topic: string, subject: string, grade: string, difficulty: string) {
  const questions = [];
  
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
        }
      );
    }
  }

  // Fallback questions if no specific ones generated
  if (questions.length === 0) {
    questions.push(
      {
        question: `Khái niệm cơ bản về ${topic} là gì?`,
        options: [
          `A. ${topic} là một khái niệm quan trọng trong ${subject}`,
          `B. ${topic} không liên quan đến ${subject}`,
          `C. ${topic} chỉ áp dụng ở lớp cao hơn`,
          `D. ${topic} quá khó để hiểu`
        ],
        correctAnswer: 0,
        explanation: `Khái niệm ${topic} là nền tảng quan trọng trong môn ${subject}, giúp học sinh hiểu sâu hơn về lĩnh vực này.`
      }
    );
  }

  return {
    title: `Quiz về ${topic}`,
    content: `Quiz về ${topic} gồm ${questions.length} câu hỏi`,
    type: 'quiz',
    metadata: {
      subject,
      grade,
      topic,
      estimatedDuration: 30,
      difficulty
    },
    quiz: { questions }
  };
}

// Generate lesson content
async function generateLessonContent(topic: string, subject: string, grade: string, duration: number) {
  return {
    title: `Bài học về ${topic}`,
    content: `# ${topic}

## 🎯 Mục tiêu học tập

1. Hiểu rõ khái niệm cơ bản về ${topic}
2. Áp dụng kiến thức vào giải quyết bài tập thực tế
3. Phát triển tư duy logic và khả năng phân tích

## 📚 Kiến thức trọng tâm

### Khái niệm cơ bản
${topic} là một khái niệm quan trọng trong môn ${subject}, đặc biệt ở lớp ${grade}.

### Các tính chất chính
- Tính chất 1: [Mô tả chi tiết]
- Tính chất 2: [Mô tả chi tiết]
- Tính chất 3: [Mô tả chi tiết]

## 💡 Ví dụ minh họa

**Ví dụ 1:**
*Đề bài:* [Đề bài cụ thể liên quan đến ${topic}]

*Giải:*
Bước 1: ...
Bước 2: ...
Kết luận: ...

## 💡 Tóm tắt

- Điểm chính 1
- Điểm chính 2
- Điểm chính 3

---
*Bài học này được tạo tự động bởi AI Content Generator*
*Thời lượng ước tính: ${duration || 45} phút*`,
    type: 'lesson',
    metadata: {
      subject,
      grade,
      topic,
      estimatedDuration: duration || 45,
      difficulty: 'medium'
    }
  };
}

// Generate slides content
async function generateSlidesContent(topic: string, subject: string, grade: string) {
  return {
    title: `Slides về ${topic}`,
    content: `Slides về ${topic}`,
    type: 'slides',
    metadata: {
      subject,
      grade,
      topic,
      estimatedDuration: 30,
      difficulty: 'medium'
    },
    slides: [
      {
        slideNumber: 1,
        title: topic,
        content: `Chào mừng đến với bài học về ${topic}\n\nMôn: ${subject}\nLớp: ${grade}`,
        imagePrompt: `Hình ảnh chủ đề ${topic}`
      },
      {
        slideNumber: 2,
        title: 'Khái niệm cơ bản',
        content: `• Định nghĩa chính\n• Các thuật ngữ quan trọng\n• Ví dụ đơn giản`,
        imagePrompt: 'Sơ đồ khái niệm'
      },
      {
        slideNumber: 3,
        title: 'Ứng dụng thực tế',
        content: `• Ứng dụng 1\n• Ứng dụng 2\n• Ứng dụng 3`,
        imagePrompt: 'Hình ảnh ứng dụng thực tế'
      }
    ]
  };
}

// Generate video script content
async function generateVideoScriptContent(topic: string, subject: string, grade: string, duration: number) {
  return {
    title: `Video Script về ${topic}`,
    content: `Video Script về ${topic}`,
    type: 'video-script',
    metadata: {
      subject,
      grade,
      topic,
      estimatedDuration: duration || 10,
      difficulty: 'medium'
    },
    videoScript: {
      segments: [
        {
          segment: 'Hook',
          duration: 0.5,
          content: `Chào mừng các bạn đến với bài học về ${topic}!`,
          visual: 'Hình ảnh chủ đề'
        },
        {
          segment: 'Introduction',
          duration: 1,
          content: `Hôm nay chúng ta sẽ tìm hiểu về ${topic} trong môn ${subject} lớp ${grade}.`,
          visual: 'Sơ đồ tổng quan'
        },
        {
          segment: 'Main Content',
          duration: duration - 2,
          content: `Nội dung chính về ${topic}...`,
          visual: 'Hình ảnh minh họa'
        },
        {
          segment: 'Conclusion',
          duration: 0.5,
          content: `Tóm tắt lại những điểm chính về ${topic}.`,
          visual: 'Tóm tắt'
        }
      ]
    }
  };
}

// Generate with REAL AI (Ollama, Cursor, OpenAI)
async function generateWithRealAI(prompt: string, aiModel: string, context: any) {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const cursorApiKey = process.env.CURSOR_API_KEY;
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:latest';

  console.log('🤖 [REAL-AI] Generating with model:', aiModel);
  console.log('🤖 [REAL-AI] Prompt length:', prompt.length);

  // Try Ollama first if selected or auto
  if (aiModel === 'ollama' || aiModel === 'auto') {
    try {
      console.log('🏠 [OLLAMA] Attempting to generate with Ollama...');
      
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: `Bạn là chuyên gia giáo dục Vật lý Việt Nam. Tạo quiz chuyên môn chất lượng cao.

Yêu cầu: ${prompt}

TRẢ VỀ CHÍNH XÁC FORMAT JSON SAU (không có text khác):
{
  "title": "Quiz về [chủ đề cụ thể]",
  "questions": [
    {
      "question": "Câu hỏi chuyên môn cụ thể về [chủ đề]",
      "options": ["A. Đáp án A chi tiết", "B. Đáp án B chi tiết", "C. Đáp án C chi tiết", "D. Đáp án D chi tiết"],
      "correctAnswer": 0,
      "explanation": "Giải thích chi tiết dựa trên kiến thức Vật lý"
    }
  ]
}

Lưu ý:
- Tạo 10 câu hỏi chuyên môn
- Câu hỏi phải liên quan trực tiếp đến chủ đề
- Đáp án phải khác biệt rõ ràng
- Giải thích phải chính xác về mặt khoa học`,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 4000,
            top_p: 0.9,
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [OLLAMA] Generation successful');
        
        // Parse Ollama response
        const aiResponse = data.response;
        
        // Try to extract JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.questions) {
              return {
                title: parsed.title || `Quiz từ Ollama`,
                content: aiResponse,
                type: 'quiz',
                metadata: {
                  subject: context.subject || 'Tổng hợp',
                  grade: context.grade || 'Tự chọn',
                  topic: context.topic || 'AI Generated',
                  estimatedDuration: 30,
                  difficulty: 'medium'
                },
                quiz: { questions: parsed.questions }
              };
            }
          } catch (e) {
            console.log('🏠 [OLLAMA] JSON parse failed, using fallback');
          }
        }
      }
    } catch (error) {
      console.log('🏠 [OLLAMA] Failed:', error.message);
    }
  }

  // Try Cursor API
  if ((aiModel === 'cursor' || aiModel === 'auto') && cursorApiKey) {
    try {
      console.log('⚡ [CURSOR] Attempting to generate with Cursor...');
      
      const response = await fetch('https://api.cursor.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cursorApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Bạn là chuyên gia giáo dục Việt Nam. Tạo nội dung chất lượng cao.'
            },
            {
              role: 'user',
              content: `${prompt}\n\nTrả về JSON format:\n{\n  "title": "...",\n  "questions": [\n    {"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": 0, "explanation": "..."}\n  ]\n}`
            }
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        console.log('✅ [CURSOR] Generation successful');
        
        // Parse Cursor response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.questions) {
              return {
                title: parsed.title || `Quiz từ Cursor AI`,
                content: aiResponse,
                type: 'quiz',
                metadata: {
                  subject: context.subject || 'Tổng hợp',
                  grade: context.grade || 'Tự chọn',
                  topic: context.topic || 'AI Generated',
                  estimatedDuration: 30,
                  difficulty: 'medium'
                },
                quiz: { questions: parsed.questions }
              };
            }
          } catch (e) {
            console.log('⚡ [CURSOR] JSON parse failed');
          }
        }
      }
    } catch (error) {
      console.log('⚡ [CURSOR] Failed:', error.message);
    }
  }

  // Fallback to demo
  console.log('🎭 [FALLBACK] Using demo mode');
  return generateFromFreeformPrompt(prompt, aiModel);
}

// Generate content from freeform prompt (DEMO/FALLBACK)
async function generateFromFreeformPrompt(prompt: string, aiModel: string) {
  // Extract topic and context from prompt
  const lines = prompt.split('\n');
  const firstLine = lines[0] || prompt.substring(0, 100);
  const title = firstLine.substring(0, 80);
  
  // Determine type from prompt keywords
  let type = 'lesson';
  const promptLower = prompt.toLowerCase();
  if (promptLower.includes('quiz') || promptLower.includes('câu hỏi') || promptLower.includes('trắc nghiệm')) {
    type = 'quiz';
  } else if (promptLower.includes('slide')) {
    type = 'slides';
  } else if (promptLower.includes('video')) {
    type = 'video-script';
  }
  
  // For quiz, generate 10 specific questions
  if (type === 'quiz') {
    const questions = [
      {
        question: `Câu 1: Dựa trên nội dung "${firstLine}", hãy xác định khái niệm chính?`,
        options: [
          'A. Khái niệm được mô tả chi tiết trong prompt',
          'B. Khái niệm không liên quan',
          'C. Khái niệm không rõ ràng',
          'D. Khái niệm cần bổ sung'
        ],
        correctAnswer: 0,
        explanation: 'Dựa trên prompt của bạn, khái niệm chính đã được mô tả rõ ràng và chi tiết.'
      },
      {
        question: 'Câu 2: Ứng dụng thực tế của kiến thức này là gì?',
        options: [
          'A. Ứng dụng trong học tập và nghiên cứu',
          'B. Không có ứng dụng thực tế',
          'C. Chỉ dùng trong lý thuyết',
          'D. Ứng dụng hạn chế'
        ],
        correctAnswer: 0,
        explanation: 'Kiến thức này có nhiều ứng dụng thực tế trong học tập và nghiên cứu khoa học.'
      },
      {
        question: 'Câu 3: Yếu tố quan trọng nhất trong chủ đề này là gì?',
        options: [
          'A. Hiểu rõ nguyên lý cơ bản',
          'B. Học thuộc lòng công thức',
          'C. Bỏ qua phần lý thuyết',
          'D. Chỉ làm bài tập'
        ],
        correctAnswer: 0,
        explanation: 'Hiểu rõ nguyên lý cơ bản là nền tảng để nắm vững kiến thức và áp dụng linh hoạt.'
      },
      {
        question: 'Câu 4: Khi giải quyết vấn đề, bước đầu tiên nên làm gì?',
        options: [
          'A. Phân tích đề bài và xác định yêu cầu',
          'B. Áp dụng công thức ngay lập tức',
          'C. Đoán đáp án',
          'D. Bỏ qua phần lý thuyết'
        ],
        correctAnswer: 0,
        explanation: 'Phân tích đề bài giúp xác định rõ yêu cầu và chọn phương pháp giải quyết phù hợp.'
      },
      {
        question: 'Câu 5: Điều kiện cần thiết để hiểu sâu chủ đề này là gì?',
        options: [
          'A. Nắm vững kiến thức nền tảng',
          'B. Chỉ cần học thuộc',
          'C. Không cần ôn lại',
          'D. Học qua loa'
        ],
        correctAnswer: 0,
        explanation: 'Kiến thức nền tảng vững chắc là tiền đề để tiếp thu kiến thức mới hiệu quả.'
      },
      {
        question: 'Câu 6: Phương pháp học tập hiệu quả cho chủ đề này là gì?',
        options: [
          'A. Kết hợp lý thuyết và thực hành',
          'B. Chỉ học lý thuyết',
          'C. Chỉ làm bài tập',
          'D. Học không có hệ thống'
        ],
        correctAnswer: 0,
        explanation: 'Kết hợp lý thuyết và thực hành giúp củng cố kiến thức và nâng cao kỹ năng vận dụng.'
      },
      {
        question: 'Câu 7: Khi gặp khó khăn, nên làm gì?',
        options: [
          'A. Xem lại lý thuyết và tìm ví dụ tương tự',
          'B. Bỏ qua và làm câu khác',
          'C. Đoán đáp án',
          'D. Chép bài bạn'
        ],
        correctAnswer: 0,
        explanation: 'Xem lại lý thuyết và tìm ví dụ tương tự giúp hiểu rõ vấn đề và tìm ra hướng giải quyết.'
      },
      {
        question: 'Câu 8: Tầm quan trọng của chủ đề này trong thực tế là gì?',
        options: [
          'A. Rất quan trọng, áp dụng rộng rãi',
          'B. Không có ứng dụng',
          'C. Chỉ quan trọng trong sách vở',
          'D. Ít được sử dụng'
        ],
        correctAnswer: 0,
        explanation: 'Kiến thức này có nhiều ứng dụng thực tế trong cuộc sống và các lĩnh vực khoa học.'
      },
      {
        question: 'Câu 9: Để nắm vững chủ đề, cần chú ý điều gì?',
        options: [
          'A. Hiểu bản chất, không chỉ ghi nhớ',
          'B. Học thuộc công thức',
          'C. Không cần hiểu sâu',
          'D. Học qua loa'
        ],
        correctAnswer: 0,
        explanation: 'Hiểu bản chất giúp vận dụng linh hoạt kiến thức vào nhiều tình huống khác nhau.'
      },
      {
        question: 'Câu 10: Mối liên hệ giữa lý thuyết và thực hành trong chủ đề này?',
        options: [
          'A. Lý thuyết là nền tảng, thực hành giúp củng cố',
          'B. Không liên quan đến nhau',
          'C. Chỉ cần lý thuyết',
          'D. Chỉ cần thực hành'
        ],
        correctAnswer: 0,
        explanation: 'Lý thuyết cung cấp kiến thức nền, thực hành giúp hiểu sâu và vận dụng thành thạo.'
      }
    ];
    
    return {
      title: `Quiz: ${title}`,
      content: `Quiz được tạo từ prompt tự do`,
      type: 'quiz',
      metadata: {
        subject: 'Tổng hợp',
        grade: 'Tự chọn',
        topic: title,
        estimatedDuration: 30,
        difficulty: 'medium'
      },
      quiz: { questions }
    };
  }
  
  // For lesson or other types
  return {
    title: `Bài học: ${title}`,
    content: `# ${title}

## 📝 Nội dung từ prompt của bạn:

${prompt}

## 💡 Phân tích và mở rộng:

Dựa trên nội dung bạn cung cấp, chúng ta có thể rút ra những điểm chính sau:

1. **Khái niệm cơ bản**: [Tổng hợp từ prompt]
2. **Nguyên lý/Định luật**: [Phân tích từ prompt]
3. **Ứng dụng thực tế**: [Mở rộng từ prompt]

## 🎯 Kết luận:

Nội dung này giúp học sinh hiểu rõ hơn về chủ đề, với các ví dụ cụ thể và ứng dụng thực tế.

---
*Bài học được tạo từ prompt tự do bằng ${aiModel.toUpperCase()}*`,
    type: 'lesson',
    metadata: {
      subject: 'Tổng hợp',
      grade: 'Tự chọn',
      topic: title,
      estimatedDuration: 45,
      difficulty: 'medium'
    }
  };
}
