#!/usr/bin/env node
/**
 * Smoke test cho lib/fal-client.cjs:
 *   1. complete()              — text completion
 *   2. completeWithVision()    — vision (1 image)
 *   3. extractTextFromImage()  — OCR
 *
 * Chạy:
 *   FAL_API_KEY=key:secret node scripts/test-fal-client.cjs
 */
'use strict';

const fs = require('fs');
const fal = require('../lib/fal-client.cjs');

(async () => {
  if (!process.env.FAL_API_KEY) {
    console.error('FAL_API_KEY env var required');
    process.exit(1);
  }

  // ── 1. Text completion ────────────────────────────────────
  console.log('\n[1] complete() — text');
  const t0 = Date.now();
  const r1 = await fal.complete({
    messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
    model: 'google/gemini-flash-1.5',
  });
  console.log(`  ✅ took=${Date.now() - t0}ms model=${r1.model}`);
  console.log(`     content="${r1.content.trim().slice(0, 80)}"`);
  console.log(`     usage:`, r1.usage);

  // ── 2. Vision ────────────────────────────────────────────
  console.log('\n[2] completeWithVision() — describe image');
  const sampleImg = '/Users/pixidev/Aeroeduvison/.claude/worktrees/elated-khayyam-41c9ed/uploads/ocr/upload_2025-10-12T02-13-29-538Z.jpg';
  if (!fs.existsSync(sampleImg)) {
    console.log('  ⏭ skipped: no sample image');
  } else {
    const buf = fs.readFileSync(sampleImg);
    const t1 = Date.now();
    const r2 = await fal.completeWithVision({
      messages: [{ role: 'user', content: 'In one short sentence, describe what is in this image.' }],
      images: [{ mimeType: 'image/jpeg', data: buf.toString('base64') }],
    });
    console.log(`  ✅ took=${Date.now() - t1}ms model=${r2.model}`);
    console.log(`     content="${r2.content.trim().slice(0, 200)}"`);
  }

  // ── 3. OCR ───────────────────────────────────────────────
  console.log('\n[3] extractTextFromImage() — OCR');
  if (fs.existsSync(sampleImg)) {
    const buf = fs.readFileSync(sampleImg);
    const t2 = Date.now();
    const text = await fal.extractTextFromImage(buf.toString('base64'), 'image/jpeg', 'vi');
    console.log(`  ✅ took=${Date.now() - t2}ms`);
    console.log(`     extracted (first 200 chars): "${text.slice(0, 200)}"`);
  } else {
    console.log('  ⏭ skipped: no sample image');
  }

  console.log('\n[ALL PASS]');
})().catch(err => {
  console.error('CRASH:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
