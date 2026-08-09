'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const directory = process.argv[2] || path.join(__dirname, '..', 'onprem-migrations');
const files = fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
if (!files.length) throw new Error('At least one migration is required');
const manifest = [];
files.forEach((file, index) => {
  const match = /^(\d{4})[-_][a-z0-9][a-z0-9-_]*\.sql$/.exec(file);
  if (!match) throw new Error(`Invalid migration filename: ${file}`);
  const expected = String(index + 1).padStart(4, '0');
  if (match[1] !== expected) throw new Error(`Migration sequence gap: expected ${expected}, got ${match[1]}`);
  const sql = fs.readFileSync(path.join(directory, file), 'utf8');
  if (/\b(BEGIN|COMMIT|ROLLBACK)\s*;/i.test(sql)) throw new Error(`Migration controls its own transaction: ${file}`);
  manifest.push({ version: file, sha256: crypto.createHash('sha256').update(sql).digest('hex') });
});
console.log(JSON.stringify(manifest, null, 2));
