#!/usr/bin/env node
/**
 * E2E test với PDF có thật từ disk:
 *   POST base64 → /api/teacher/quiz-extract  → in JSON
 *   POST result → /api/teacher/quiz-publish  → in examId
 *
 * Chạy:  node scripts/test-api-real.cjs <path-to-pdf>
 */
'use strict';

const http = require('http');
const fs = require('fs');

const PORT = 8091;
const PDF_PATH = process.argv[2] || '/Users/pixidev/Downloads/Phụ lục tự đánh giá trường học an toàn, phòng, chống tai nạn thương tích năm học 2025 - 2026.pdf';

function postJSON(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: 'localhost', port: PORT, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); }
        catch { resolve({ status: res.statusCode, raw: Buffer.concat(chunks).toString('utf8') }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('[e2e-real] PDF:', PDF_PATH);
  const buf = fs.readFileSync(PDF_PATH);
  console.log('[e2e-real] size:', buf.length, 'bytes');

  console.log('[e2e-real] POST /api/teacher/quiz-extract …');
  const t0 = Date.now();
  const ext = await postJSON('/api/teacher/quiz-extract', {
    fileBase64: buf.toString('base64'),
    filename: PDF_PATH.split('/').pop(),
    mode: 'extract',
    subject: 'Vật lí',
    grade: '11',
    language: 'Vietnamese',
  });
  console.log(`[e2e-real] status=${ext.status}  took=${Date.now() - t0}ms`);
  if (!ext.json?.success) {
    console.error('[e2e-real] extract FAIL:', ext.json || ext.raw);
    process.exit(1);
  }
  const qs = ext.json.questions;
  console.log(`[e2e-real] ✅ extracted ${qs.length} questions; meta:`, ext.json.meta);
  for (const q of qs.slice(0, 3)) {
    console.log(`  ${String(q.index).padStart(2,' ')}. [${q.questionType}] ${q.content.slice(0, 70)}…  → ${q.correctAnswer}`);
  }

  console.log('[e2e-real] POST /api/teacher/quiz-publish …');
  const pub = await postJSON('/api/teacher/quiz-publish', {
    title: 'Real PDF — extracted',
    subject: 'Vật lí', grade: '11', duration: 45,
    questions: qs,
  });
  console.log(`[e2e-real] status=${pub.status} examId=${pub.json?.examId} mock=${pub.json?.mock}`);

  if (pub.json?.success) console.log('[e2e-real] ✅ ALL PASS');
  else { console.error('[e2e-real] publish FAIL:', pub.json || pub.raw); process.exit(1); }
})().catch(err => { console.error('[e2e-real] CRASH:', err); process.exit(1); });
