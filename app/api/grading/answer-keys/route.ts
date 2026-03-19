import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/grading/answer-keys — List answer keys for current teacher
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await db.gradingAnswerKey.findMany({
      where: { teacherId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { gradedSheets: true } },
      },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('[ANSWER_KEYS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/grading/answer-keys — Save a new answer key
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      examName, examCode, examDate, studentName, studentId,
      examSite, examRoom, dob, part1, part2, part3, essayQuestions,
    } = body;

    const key = await db.gradingAnswerKey.create({
      data: {
        teacherId: session.user.id,
        examName: examName || '',
        examCode: examCode || '',
        examDate: examDate || '',
        studentName: studentName || '',
        studentId: studentId || '',
        examSite: examSite || '',
        examRoom: examRoom || '',
        dob: dob || '',
        part1: part1 ?? {},
        part2: part2 ?? {},
        part3: part3 ?? {},
        essayQuestions: essayQuestions ?? [],
      },
    });

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    console.error('[ANSWER_KEYS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/grading/answer-keys — Delete an answer key by id (in body)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Ensure the key belongs to this teacher
    const existing = await db.gradingAnswerKey.findFirst({
      where: { id, teacherId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.gradingAnswerKey.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ANSWER_KEYS_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
