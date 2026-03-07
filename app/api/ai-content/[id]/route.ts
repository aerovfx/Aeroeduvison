import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 [GET-CONTENT] Loading AI content:', params.id);

    // Load from AIGeneratedContent table
    const content = await db.aIGeneratedContent.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!content) {
      console.log('❌ [GET-CONTENT] Content not found:', params.id);
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Check if user owns this content or is admin
    if (content.userId !== session.user.id && session.user.role !== 'ADMIN') {
      console.log('❌ [GET-CONTENT] Unauthorized access attempt');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('✅ [GET-CONTENT] Content loaded successfully:', content.title);

    // Parse content if it's JSON string
    let parsedContent = content.content;
    if (typeof content.content === 'string') {
      try {
        parsedContent = JSON.parse(content.content);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    return NextResponse.json({
      id: content.id,
      title: content.title,
      type: content.type,
      subject: content.subject,
      grade: content.grade,
      topic: content.topic,
      difficulty: content.difficulty,
      estimatedDuration: content.estimatedDuration,
      status: content.status,
      content: parsedContent,
      quiz: parsedContent.quiz || null,
      slides: parsedContent.slides || null,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    });

  } catch (error) {
    console.error('💥 [GET-CONTENT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('✏️ [PATCH-CONTENT] Updating AI content:', params.id);

    // Check ownership
    const content = await db.aIGeneratedContent.findUnique({
      where: { id: params.id },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update
    const updated = await db.aIGeneratedContent.update({
      where: { id: params.id },
      data: {
        title: body.title || content.title,
        content: JSON.stringify(body.content || body),
        subject: body.subject || content.subject,
        grade: body.grade || content.grade,
        topic: body.topic || content.topic,
        difficulty: body.difficulty || content.difficulty,
        updatedAt: new Date(),
      },
    });

    console.log('✅ [PATCH-CONTENT] Updated successfully');

    // Parse and return
    let parsedContent = updated.content;
    if (typeof updated.content === 'string') {
      try {
        parsedContent = JSON.parse(updated.content);
      } catch (e) {}
    }

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      type: updated.type,
      subject: updated.subject,
      grade: updated.grade,
      topic: updated.topic,
      difficulty: updated.difficulty,
      estimatedDuration: updated.estimatedDuration,
      status: updated.status,
      content: parsedContent,
      quiz: parsedContent.quiz || null,
      slides: parsedContent.slides || null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });

  } catch (error) {
    console.error('💥 [PATCH-CONTENT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗑️ [DELETE-CONTENT] Deleting AI content:', params.id);

    // Check ownership
    const content = await db.aIGeneratedContent.findUnique({
      where: { id: params.id },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete
    await db.aIGeneratedContent.delete({
      where: { id: params.id },
    });

    console.log('✅ [DELETE-CONTENT] Deleted successfully');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('💥 [DELETE-CONTENT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

