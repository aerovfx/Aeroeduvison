/**
 * Exam Export to PDF
 * 
 * API endpoint for exporting exams to PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(
  request: NextRequest,
  { params }: { params: { exam_id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const examId = params.exam_id;
    const body = await request.json();
    const { variant = 'A' } = body;

    // Fetch exam data
    const examResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/ai/exam/preview/${examId}`);
    if (!examResponse.ok) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const examData = await examResponse.json();
    const { exam, statistics } = examData;

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Add pages
    const examPage = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = examPage.getSize();

    // Title
    examPage.drawText(`Exam - Variant ${variant}`, {
      x: 50,
      y: height - 50,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Metadata
    examPage.drawText(`Matrix: ${exam.matrix_id}`, {
      x: 50,
      y: height - 80,
      size: 12,
      font,
    });

    examPage.drawText(`Duration: ${statistics.estimated_duration_minutes} minutes`, {
      x: 50,
      y: height - 100,
      size: 12,
      font,
    });

    examPage.drawText(`Total Score: ${statistics.total_questions} questions`, {
      x: 50,
      y: height - 120,
      size: 12,
      font,
    });

    // Questions
    let y = height - 160;
    exam.questions.forEach((q: any, idx: number) => {
      if (y < 100) {
        // New page
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }

      newPage.drawText(`Question ${idx + 1} (${q.question_type}) - ${q.assigned_score} points`, {
        x: 50,
        y,
        size: 12,
        font: boldFont,
      });

      y -= 30;
    });

    // Serialize PDF
    const pdfBytes = await pdfDoc.save();

    // Return PDF
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="exam-${examId}-${variant}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF' },
      { status: 500 }
    );
  }
}
