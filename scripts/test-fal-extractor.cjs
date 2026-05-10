#!/usr/bin/env node
/**
 * Smoke test cho lib/fal-quiz-extractor.cjs
 *
 * Tạo một PDF mẫu (đề Vật lí 11) → gọi extractor → in JSON kết quả.
 *
 * Chạy:
 *   FAL_API_KEY=key:secret node scripts/test-fal-extractor.cjs
 */
'use strict';

const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { extractQuestionsFromPdf } = require('../lib/fal-quiz-extractor.cjs');

const SAMPLE_TEXT = `KIEM TRA CUOI HOC KY II - MON: VAT LI 11

Cau 1. Nguyen nhan gay ra hien tuong nong len cua nguon dien khi co dong dien chay qua la do:
A. dien tro trong cua nguon.
B. day dan qua dai.
C. tu dien.
D. nguon yeu.

Cau 2. Trong he SI, don vi do dien tro la:
A. Ohm.
B. Jun.
C. Oat.
D. Niuton.

Cau 3. Dien the tai mot diem dac trung cho dien truong ve phuong dien:
A. nang luong.
B. dong luong.
C. tac dung luc.
D. tac dung tu.

Cau 4. Hai tu dien mac song song co hieu dien the lan luot la U1, U2. Hieu dien the cua bo tu U bang:
A. U1 + U2.
B. U1 = U2.
C. U1 - U2.
D. U1 * U2.

DAP AN: 1A 2A 3A 4B
`;

async function buildSamplePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  let y = 800;
  for (const line of SAMPLE_TEXT.split('\n')) {
    page.drawText(line.slice(0, 90), { x: 40, y, size: 10, font, color: rgb(0,0,0) });
    y -= 14;
    if (y < 40) break;
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

(async () => {
  if (!process.env.FAL_API_KEY) {
    console.error('FAL_API_KEY env var required');
    process.exit(1);
  }
  console.log('[test] Building sample PDF...');
  const pdfBuf = await buildSamplePdf();
  console.log(`[test] PDF size: ${pdfBuf.length} bytes`);

  console.log('[test] Calling extractQuestionsFromPdf...');
  const result = await extractQuestionsFromPdf(pdfBuf, {
    subject: 'Vat li',
    grade: '11',
    language: 'Vietnamese',
  });

  console.log('\n=== META ===');
  console.log(result.meta);
  console.log('\n=== QUESTIONS ===');
  console.log(JSON.stringify(result.questions, null, 2));
  console.log(`\n[test] OK — extracted ${result.questions.length} questions`);
})().catch(err => {
  console.error('[test] FAILED:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
