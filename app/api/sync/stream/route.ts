import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, schoolId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create a readable stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial response
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            userRole: user.role,
            schoolId: user.schoolId,
            timestamp: new Date().toISOString()
          })}\n\n`));

          // Stream users data first (fastest)
          const users = await db.user.findMany({
            where: user.role === 'ADMIN' 
              ? { schoolId: user.schoolId }
              : { 
                  schoolId: user.schoolId,
                  role: { in: ['STUDENT', 'TEACHER'] }
                },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true
            }
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'users',
            data: users,
            count: users.length
          })}\n\n`));

          // Stream courses data
          const courses = await db.course.findMany({
            where: user.role === 'ADMIN'
              ? { schoolId: user.schoolId }
              : user.role === 'TEACHER'
              ? { 
                  schoolId: user.schoolId,
                  userId: (await db.user.findFirst({ where: { schoolId: user.schoolId, role: 'TEACHER' } }))?.id
                }
              : { 
                  schoolId: user.schoolId,
                  isPublished: true
                },
            include: {
              user: {
                select: { name: true, email: true }
              },
              _count: {
                select: { purchases: true }
              }
            }
          });

          const formattedCourses = courses.map(course => ({
            id: course.id,
            title: course.title,
            description: course.description,
            teacherId: course.userId,
            teacherName: course.user.name || course.user.email,
            studentsCount: course._count.purchases,
            status: course.isPublished ? 'published' : 'draft',
            createdAt: course.createdAt,
            updatedAt: course.updatedAt
          }));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'courses',
            data: formattedCourses,
            count: formattedCourses.length
          })}\n\n`));

          // Stream other data (assignments, quizzes, etc.)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'assignments',
            data: [],
            count: 0
          })}\n\n`));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'quizzes',
            data: [],
            count: 0
          })}\n\n`));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'stemProjects',
            data: [],
            count: 0
          })}\n\n`));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'competitions',
            data: [],
            count: 0
          })}\n\n`));

          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            timestamp: new Date().toISOString()
          })}\n\n`));

          controller.close();

        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('Error in streaming sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
