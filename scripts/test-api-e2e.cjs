#!/usr/bin/env node
/**
 * Test end-to-end API flow:
 *   1. Tạo PDF mẫu
 *   2. Base64 encode → POST /api/teacher/quiz-extract  (qua dev-quiz-server :8091)
 *   3. POST kết quả → /api/teacher/quiz-publish
 *
 * Chạy:
 *   node scripts/test-api-e2e.cjs
 *
 * Yêu cầu dev-quiz-server đang chạy ở port 8091.
 */
'use strict';

const http = require('http');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const HOST = 'localhost';
const PORT = 8091;

// Match smoke test exactly to reproduce its working behavior.
const SAMPLE = `KIEM TRA CUOI HOC KY II - MON: VAT LI 11

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

async function makePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  let y = 800;
  for (const line of SAMPLE.split('\n')) {
    page.drawText(line.slice(0, 90), { x: 40, y, size: 10, font, color: rgb(0, 0, 0) });
    y -= 14;
    if (y < 40) break;
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

function postJSON(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: HOST, port: PORT, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode, json: JSON.parse(text) }); }
        catch { resolve({ status: res.statusCode, raw: text }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('[e2e] Step 1: build sample PDF');
  const pdfBuf = await makePdf();
  console.log(`        PDF size = ${pdfBuf.length} bytes`);

  console.log('[e2e] Step 2: POST /api/teacher/quiz-extract');
  const fileBase64 = pdfBuf.toString('base64');
  const extract = await postJSON('/api/teacher/quiz-extract', {
    fileBase64, filename: 's-3.pdf',
    mode: 'extract', subject: 'Vật lí', grade: '11', language: 'Vietnamese',
  });
  console.log(`        status=${extract.status}`);
  if (!extract.json?.success) {
    console.error('        FAIL:', extract.json || extract.raw);
    process.exit(1);
  }
  console.log(`        ✅ extracted ${extract.json.questions.length} questions in ${extract.json.meta?.tookMs}ms`);
  console.log(`        first Q: ${extract.json.questions[0]?.content.slice(0, 80)}…`);
  console.log(`        answers: ${extract.json.questions.map(q => `${q.index}${q.correctAnswer}`).join(' ')}`);

  console.log('[e2e] Step 3: POST /api/teacher/quiz-publish');
  const publish = await postJSON('/api/teacher/quiz-publish', {
    title: 'Test E2E — Vật lí 11',
    subject: 'Vật lí', grade: '11', duration: 45,
    questions: extract.json.questions,
  });
  console.log(`        status=${publish.status}`);
  if (!publish.json?.success) {
    console.error('        FAIL:', publish.json || publish.raw);
    process.exit(1);
  }
  console.log(`        ✅ examId=${publish.json.examId} (mock=${publish.json.mock})`);

  console.log('\n[e2e] ✅ ALL PASS — full flow PDF→fal.ai→extract→publish OK');
})().catch(err => { console.error('[e2e] CRASH:', err); process.exit(1); });
