import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/grading/graded-sheets?answerKeyId=xxx — List graded sheets for an answer key
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const answerKeyId = req.nextUrl.searchParams.get('answerKeyId');

    const where: any = { teacherId: session.user.id };
    if (answerKeyId) {
      where.answerKeyId = answerKeyId;
    }

    const sheets = await db.gradedSheet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ sheets });
  } catch (error) {
    console.error('[GRADED_SHEETS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/grading/graded-sheets — Save one or more graded sheets
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sheets } = body; // Array of graded sheet data

    if (!Array.isArray(sheets) || sheets.length === 0) {
      return NextResponse.json({ error: 'sheets array is required' }, { status: 400 });
    }

    // Verify answer key belongs to teacher
    const answerKeyId = sheets[0].answerKeyId;
    if (answerKeyId) {
      const answerKey = await db.gradingAnswerKey.findFirst({
        where: { id: answerKeyId, teacherId: session.user.id },
      });
      if (!answerKey) {
        return NextResponse.json({ error: 'Answer key not found' }, { status: 404 });
      }
    }

    const created = await db.$transaction(
      sheets.map((s: any) =>
        db.gradedSheet.create({
          data: {
            answerKeyId: s.answerKeyId,
            teacherId: session.user.id,
            studentName: s.studentName || '',
            studentId: s.studentId || '',
            frontImageUrl: s.frontImageUrl || null,
            backImageUrl: s.backImageUrl || null,
            detectedAnswers: s.detectedAnswers ?? {},
            detectedPart2: s.detectedPart2 ?? {},
            detectedPart3: s.detectedPart3 ?? {},
            essayScores: s.essayScores ?? {},
            essayNotes: s.essayNotes ?? {},
            overrides: s.overrides ?? [],
            totalScore: s.totalScore ?? 0,
            maxScore: s.maxScore ?? 10,
            percentage: s.percentage ?? 0,
            gradeLabel: s.gradeLabel || '',
            reviewed: s.reviewed ?? false,
            published: s.published ?? false,
            status: s.status || 'scanned',
          },
        })
      )
    );

    return NextResponse.json({ sheets: created }, { status: 201 });
  } catch (error) {
    console.error('[GRADED_SHEETS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/grading/graded-sheets — Update a graded sheet
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const existing = await db.gradedSheet.findFirst({
      where: { id, teacherId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only allow updating specific fields
    const allowedFields: Record<string, boolean> = {
      studentName: true, studentId: true, detectedAnswers: true,
      detectedPart2: true, detectedPart3: true, essayScores: true,
      essayNotes: true, overrides: true, totalScore: true, maxScore: true,
      percentage: true, gradeLabel: true, reviewed: true, published: true, status: true,
      frontImageUrl: true, backImageUrl: true,
    };

    const data: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key]) {
        data[key] = value;
      }
    }

    const updated = await db.gradedSheet.update({ where: { id }, data });

    return NextResponse.json({ sheet: updated });
  } catch (error) {
    console.error('[GRADED_SHEETS_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
