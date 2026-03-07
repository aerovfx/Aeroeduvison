import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { 
      subject, 
      difficulty, 
      mbtiType, 
      userXP, 
      learningStyle,
      currentLevel 
    } = await req.json();

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Use Gemini 2.5 Pro - latest and most powerful model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro-preview-03-25' });

    const prompt = `Bạn là một AI giáo viên chuyên nghiệp. Hãy tạo một bài học chi tiết dựa trên thông tin sau:

### Thông tin học sinh:
- Môn học: ${subject}
- Độ khó: ${difficulty}
- MBTI Type: ${mbtiType}
- XP hiện tại: ${userXP}
- Phong cách học: ${learningStyle}
- Level hiện tại: ${currentLevel}

### Yêu cầu:
Tạo một bài học hoàn chỉnh bao gồm:

1. **Tiêu đề bài học**: Tên bài học hấp dẫn và phù hợp
2. **Mục tiêu học tập**: 3-5 mục tiêu cụ thể
3. **Nội dung chính**: 
   - Giới thiệu khái niệm
   - Giải thích chi tiết với ví dụ
   - Ứng dụng thực tế
4. **Bài tập thực hành**: 3-5 bài tập từ cơ bản đến nâng cao
5. **Đáp án và giải thích**: Giải thích chi tiết cho từng bài tập
6. **Tài liệu tham khảo**: Link hoặc tài liệu liên quan
7. **Thời gian học ước tính**: Phút
8. **XP thưởng**: Điểm XP khi hoàn thành (50-300 tùy độ khó)

### Lưu ý:
- Phù hợp với MBTI ${mbtiType} (${
  mbtiType?.includes('E') ? 'học qua thảo luận và tương tác' : 'học độc lập và suy ngẫm sâu'
})
- Độ khó ${difficulty}
- Nội dung phải chi tiết, dễ hiểu và có ví dụ cụ thể
- Format bằng Markdown để dễ đọc

Trả về JSON với format:
{
  "title": "Tên bài học",
  "estimatedTime": 45,
  "xpReward": 150,
  "difficulty": "${difficulty}",
  "objectives": ["Mục tiêu 1", "Mục tiêu 2", ...],
  "content": "Nội dung chi tiết (Markdown)",
  "exercises": [
    {
      "question": "Câu hỏi",
      "answer": "Đáp án",
      "explanation": "Giải thích"
    }
  ],
  "resources": ["Link 1", "Link 2", ...]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Try to parse JSON from response
    let lessonData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        lessonData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('⚠️ JSON parse failed, using fallback structure');
      lessonData = {
        title: `Bài học ${subject} - ${difficulty}`,
        estimatedTime: 45,
        xpReward: difficulty === 'expert' ? 250 : difficulty === 'advanced' ? 150 : 100,
        difficulty,
        objectives: [
          'Hiểu khái niệm cơ bản',
          'Áp dụng vào thực tế',
          'Giải quyết bài tập'
        ],
        content: text,
        exercises: [],
        resources: []
      };
    }

    return NextResponse.json({
      success: true,
      lesson: {
        ...lessonData,
        id: `lesson_${Date.now()}`,
        subject,
        mbtiType,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error generating lesson:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Lỗi khi tạo bài học', 
        details: error.message,
        errorType: error.name
      },
      { status: 500 }
    );
  }
}

