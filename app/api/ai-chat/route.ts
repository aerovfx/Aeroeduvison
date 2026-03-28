import { NextRequest, NextResponse } from 'next/server';
import { aiTutorService } from '@/lib/ai-services';
import { withAiAccess } from '@/lib/with-ai-access';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, context, type } = body;

  return withAiAccess(request, "ai_chat", async (userId, plan) => {
    try {

    let response: string;

    switch (type) {
      case 'help':
        response = await aiTutorService.provideHelp(message, context || '');
        break;
      
      case 'lesson':
        const lessonData = JSON.parse(context || '{}');
        const lessonContent = await aiTutorService.generateLessonContent(lessonData);
        response = lessonContent.content;
        break;
      
      case 'emotion':
        const emotionData = JSON.parse(context || '{}');
        const emotionAnalysis = await aiTutorService.analyzeEmotion(emotionData);
        response = emotionAnalysis.analysis;
        break;
      
      default:
        response = await aiTutorService.provideHelp(message, context || '');
    }

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
      userId,
    });

    } catch (error) {
      console.error('AI Chat Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'AI service temporarily unavailable',
          fallback: 'Xin lỗi, tôi không thể trả lời ngay bây giờ. Hãy thử lại sau nhé!'
        },
        { status: 500 }
      );
    }
  }, { action: "chat_message" });
}
