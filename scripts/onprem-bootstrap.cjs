'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(51702311)');
    const existing = await client.query(`SELECT to_regclass('public."User"') AS table_name`);
    if (!existing.rows[0].table_name) {
      console.log('[bootstrap] Initializing PostgreSQL schema...');
      const sql = fs.readFileSync('/app/schema/onprem-init.sql', 'utf8');
      await client.query(sql);
      console.log('[bootstrap] PostgreSQL schema ready');
    }
    await client.query(`CREATE TABLE IF NOT EXISTS aeroedu_schema_migrations (
      version TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const migrationDir = '/app/onprem-migrations';
    const expectedManifest = JSON.parse(fs.readFileSync('/app/schema/migration-manifest.json', 'utf8'));
    const files = fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort();
    if (!files.length) throw new Error('No on-prem migrations found');
    files.forEach((file, index) => {
      const match = /^(\d{4})[-_][a-z0-9][a-z0-9-_]*\.sql$/.exec(file);
      if (!match) throw new Error(`Invalid migration filename: ${file}`);
      const expected = String(index + 1).padStart(4, '0');
      if (match[1] !== expected) throw new Error(`Migration sequence gap: expected ${expected}, got ${match[1]}`);
    });
    if (expectedManifest.length !== files.length || expectedManifest.some((entry, index) => entry.version !== files[index])) {
      throw new Error('Migration file set does not match the image manifest');
    }
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      if (expectedManifest.find((entry) => entry.version === file)?.sha256 !== checksum) throw new Error(`Migration image-manifest mismatch: ${file}`);
      const applied = await client.query('SELECT checksum FROM aeroedu_schema_migrations WHERE version=$1', [file]);
      if (applied.rows.length) {
        if (applied.rows[0].checksum !== checksum) throw new Error(`Migration checksum mismatch: ${file}`);
        continue;
      }
      console.log(`[bootstrap] Applying migration ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO aeroedu_schema_migrations(version, checksum) VALUES($1,$2)', [file, checksum]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(51702311)').catch(() => {});
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[bootstrap] Failed:', error);
  process.exit(1);
});
