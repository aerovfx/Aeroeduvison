#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function canonical(value) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
}

const command = process.argv[2];
const file = process.env.AEROEDU_AUDIT_LOG || path.join(process.env.AEROEDU_HOME || process.cwd(), 'state', 'operations.jsonl');
const lock = `${file}.lock`;

function withLock(action) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  try { fs.mkdirSync(lock, { mode: 0o700 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let stale = false;
    try {
      const owner = JSON.parse(fs.readFileSync(path.join(lock, 'owner.json'), 'utf8'));
      try { process.kill(owner.pid, 0); } catch (processError) { if (processError.code === 'ESRCH') stale = true; }
      if (Date.now() - Number(owner.createdAt) > 5 * 60_000) stale = true;
    } catch { stale = Date.now() - fs.statSync(lock).mtimeMs > 5 * 60_000; }
    if (!stale) throw new Error('Operations audit log is busy');
    fs.rmSync(lock, { recursive: true });
    fs.mkdirSync(lock, { mode: 0o700 });
  }
  fs.writeFileSync(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, createdAt: Date.now() }), { mode: 0o600 });
  try { return action(); } finally { fs.unlinkSync(path.join(lock, 'owner.json')); fs.rmdirSync(lock); }
}

if (command === 'record') {
  const event = process.argv[3];
  if (!event || !/^[a-z0-9_.-]+$/.test(event)) throw new Error('A safe event name is required');
  withLock(() => {
    let previousHash = 'GENESIS';
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
      if (lines.length) previousHash = JSON.parse(lines.at(-1)).hash;
    }
    const entry = {
      timestamp: new Date().toISOString(), event, previousHash,
      installationId: process.env.INSTALLATION_ID || 'unknown',
      version: process.env.AEROEDU_VERSION || 'unknown',
      image: process.env.AEROEDU_IMAGE || 'unknown',
      digest: process.env.AEROEDU_IMAGE_DIGEST || 'unknown',
      sourceSha: process.env.EXPECTED_SOURCE_SHA || 'unknown',
    };
    entry.hash = crypto.createHash('sha256').update(canonical(entry)).digest('hex');
    const fd = fs.openSync(file, 'a', 0o600);
    try { fs.writeSync(fd, `${JSON.stringify(entry)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    console.log(entry.hash);
  });
} else if (command === 'verify') {
  withLock(() => {
    if (!fs.existsSync(file)) throw new Error(`Audit log not found: ${file}`);
    let previousHash = 'GENESIS';
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
    lines.forEach((line, index) => {
      const entry = JSON.parse(line); const hash = entry.hash; delete entry.hash;
      const calculated = crypto.createHash('sha256').update(canonical(entry)).digest('hex');
      if (entry.previousHash !== previousHash || hash !== calculated) throw new Error(`Audit chain mismatch at line ${index + 1}`);
      previousHash = hash;
    });
    console.log(JSON.stringify({ valid: true, entries: lines.length, head: previousHash }));
  });
} else {
  console.error('Usage: ops-event.cjs record EVENT | verify'); process.exitCode = 2;
}
