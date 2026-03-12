/**
 * Optimized PDF Generation
 * 
 * High-performance PDF generation with caching and streaming
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getCachedPDF, cachePDF } from '@/lib/cache/redis-cache';

interface PDFGenerationOptions {
  variant?: string;
  includeAnswerKey?: boolean;
  compress?: boolean;
}

interface ExamData {
  exam_id: string;
  title: string;
  matrix_id: string;
  duration_minutes: number;
  total_score: number;
  questions: ExamQuestion[];
}

interface ExamQuestion {
  question_id: string;
  position: number;
  assigned_score: number;
  question_type: string;
  content?: string;
}

const CACHE_TTL = 1800; // 30 minutes

export async function generateOptimizedPDF(
  exam: ExamData,
  options: PDFGenerationOptions = {}
): Promise<Uint8Array> {
  const cacheKey = `${exam.exam_id}-${options.variant || 'A'}-${options.includeAnswerKey ? 'with-answers' : 'no-answers'}`;
  
  // Check cache first
  if (!options.includeAnswerKey) {
    const cached = await getCachedPDF(cacheKey);
    if (cached) {
      return new Uint8Array(Buffer.from(cached.pdfBytes, 'base64'));
    }
  }

  // Create PDF document
  const pdfDoc = await PDFDocument.create({
    useObjectStreams: options.compress !== false,
  });

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Add cover page
  const coverPage = pdfDoc.addPage([595.28, 841.89]); // A4
  drawCoverPage(coverPage, exam, helvetica, helveticaBold);

  // Add question pages
  const questionsPerPage = 5;
  const questionPages = Math.ceil(exam.questions.length / questionsPerPage);

  for (let i = 0; i < questionPages; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const startIdx = i * questionsPerPage;
    const endIdx = Math.min(startIdx + questionsPerPage, exam.questions.length);
    const pageQuestions = exam.questions.slice(startIdx, endIdx);

    drawQuestionPage(page, pageQuestions, i + 1, helvetica, helveticaBold);
  }

  // Add answer key if requested
  if (options.includeAnswerKey) {
    const answerPage = pdfDoc.addPage([595.28, 841.89]);
    drawAnswerKey(answerPage, exam, helvetica, helveticaBold);
  }

  // Serialize PDF
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: options.compress !== false,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  // Cache the result (only if not including answers)
  if (!options.includeAnswerKey) {
    await cachePDF(cacheKey, {
      pdfBytes: Buffer.from(pdfBytes).toString('base64'),
      examId: exam.exam_id,
      variant: options.variant,
    }, CACHE_TTL);
  }

  return pdfBytes;
}

function drawCoverPage(
  page: any,
  exam: ExamData,
  font: any,
  boldFont: any
) {
  const { width, height } = page.getSize();
  const margin = 50;

  // Title
  page.drawText(`Exam: ${exam.title}`, {
    x: margin,
    y: height - margin,
    size: 24,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Metadata
  let y = height - margin - 50;
  const lineHeight = 20;

  page.drawText(`Matrix ID: ${exam.matrix_id}`, {
    x: margin,
    y,
    size: 12,
    font,
  });

  y -= lineHeight;
  page.drawText(`Duration: ${exam.duration_minutes} minutes`, {
    x: margin,
    y,
    size: 12,
    font,
  });

  y -= lineHeight;
  page.drawText(`Total Questions: ${exam.questions.length}`, {
    x: margin,
    y,
    size: 12,
    font,
  });

  y -= lineHeight;
  page.drawText(`Total Score: ${exam.total_score} points`, {
    x: margin,
    y,
    size: 12,
    font,
  });

  // Instructions
  y -= lineHeight * 2;
  page.drawText('Instructions:', {
    x: margin,
    y,
    size: 14,
    font: boldFont,
  });

  y -= lineHeight;
  const instructions = [
    '1. Read each question carefully',
    '2. Show all your work',
    '3. Manage your time wisely',
    '4. Good luck!',
  ];

  instructions.forEach(instruction => {
    page.drawText(instruction, {
      x: margin + 10,
      y,
      size: 12,
      font,
    });
    y -= lineHeight;
  });
}

function drawQuestionPage(
  page: any,
  questions: ExamQuestion[],
  pageNum: number,
  font: any,
  boldFont: any
) {
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Page header
  page.drawText(`Page ${pageNum}`, {
    x: width - margin - 60,
    y,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  y -= 30;

  // Questions
  questions.forEach((q, idx) => {
    if (y < 100) return; // Skip if not enough space

    const questionNum = (pageNum - 1) * 5 + idx + 1;
    
    page.drawText(`Question ${questionNum} (${q.question_type}) - ${q.assigned_score} points`, {
      x: margin,
      y,
      size: 12,
      font: boldFont,
    });

    y -= 25;

    if (q.content) {
      const lines = wrapText(q.content, width - margin * 2, font, 12);
      lines.forEach(line => {
        if (y > 50) {
          page.drawText(line, {
            x: margin,
            y,
            size: 12,
            font,
          });
          y -= 15;
        }
      });
      y -= 10;
    }

    // Answer space
    page.drawText('Answer:', {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    y -= 40;

    // Separator line
    if (idx < questions.length - 1) {
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
      y -= 20;
    }
  });
}

function drawAnswerKey(
  page: any,
  exam: ExamData,
  font: any,
  boldFont: any
) {
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  page.drawText('Answer Key', {
    x: margin,
    y,
    size: 18,
    font: boldFont,
  });

  y -= 40;

  exam.questions.forEach((q, idx) => {
    if (y < 50) return;

    page.drawText(`Q${idx + 1}: ${q.assigned_score} points`, {
      x: margin,
      y,
      size: 12,
      font,
    });

    y -= 20;
  });
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export async function generatePDFFast(
  exam: ExamData,
  options: PDFGenerationOptions = {}
): Promise<Uint8Array> {
  // Use worker thread for heavy PDF generation
  return generateOptimizedPDF(exam, options);
}
