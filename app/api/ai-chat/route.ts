import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiTutorService } from '@/lib/ai-services';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, context, type } = await request.json();

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
      userId: session.user.id
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
}
