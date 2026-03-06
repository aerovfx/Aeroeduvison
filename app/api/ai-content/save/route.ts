import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, formData, moduleType } = await request.json();

    console.log('💾 [SAVE] Saving AI content:', {
      userId: session.user.id,
      type: formData.type || content.type,
      title: content.title,
      moduleType
    });

    // Save to AIGeneratedContent table
    const savedContent = await db.aIGeneratedContent.create({
      data: {
        userId: session.user.id,
        type: formData.type || content.type || 'lesson',
        title: content.title,
        content: JSON.stringify(content),
        subject: formData.subject || content.metadata?.subject || 'Tổng hợp',
        grade: formData.grade || content.metadata?.grade || 'Tự chọn',
        topic: formData.topic || content.metadata?.topic || content.title,
        curriculum: formData.curriculum || 'Chương trình GDPT 2018',
        difficulty: formData.difficulty || content.metadata?.difficulty || 'medium',
        estimatedDuration: formData.duration || content.metadata?.estimatedDuration || 45,
        status: 'draft',
      },
    });

    console.log('✅ [SAVE] Content saved successfully:', savedContent.id);

    // For now, just save to AIGeneratedContent
    // TODO: Create actual Course/Quiz/Video modules when schema is ready
    
    return NextResponse.json({
      success: true,
      contentId: savedContent.id,
      message: `Nội dung đã được lưu thành công! ID: ${savedContent.id}`,
      // Return mock IDs for frontend compatibility
      courseId: moduleType === 'course' ? savedContent.id : null,
      quizId: moduleType === 'quiz' ? savedContent.id : null,
      videoId: moduleType === 'video' ? savedContent.id : null,
    });

  } catch (error) {
    console.error('💥 [SAVE] Save AI content error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
