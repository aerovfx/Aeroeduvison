'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const tables = [];
  let sequences; let schemaObjects;
  try {
    const result = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'aeroedu_license_runtime' ORDER BY tablename`);
    for (const { tablename } of result.rows) {
      const table = quote(tablename);
      const fingerprint = await pool.query(`SELECT count(*)::text AS count,
        md5(COALESCE(string_agg(row_hash, '' ORDER BY row_hash), '')) AS hash
        FROM (SELECT md5(row_to_json(t)::text) AS row_hash FROM ${table} t) rows`);
      tables.push({ name: tablename, rows: Number(fingerprint.rows[0].count), hash: fingerprint.rows[0].hash });
    }
    sequences = (await pool.query(`SELECT sequencename AS name, start_value::text, min_value::text, max_value::text,
      increment_by::text, cycle, cache_size::text, last_value::text
      FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`)).rows;
    schemaObjects = (await pool.query(`
      SELECT kind, name, definition FROM (
        SELECT 'column' AS kind, c.table_name || '.' || c.column_name AS name,
          concat_ws('|', c.data_type, c.udt_name, c.is_nullable, c.column_default, c.identity_generation, c.generation_expression) AS definition
        FROM information_schema.columns c WHERE c.table_schema='public'
        UNION ALL
        SELECT 'constraint', con.conrelid::regclass::text || '.' || con.conname, pg_get_constraintdef(con.oid, true)
        FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace WHERE n.nspname='public'
        UNION ALL
        SELECT 'index', schemaname || '.' || indexname, indexdef FROM pg_indexes WHERE schemaname='public'
        UNION ALL
        SELECT 'trigger', t.tgrelid::regclass::text || '.' || t.tgname, pg_get_triggerdef(t.oid, true)
        FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND NOT t.tgisinternal
        UNION ALL
        SELECT 'function', p.oid::regprocedure::text, pg_get_functiondef(p.oid)
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
      ) objects ORDER BY kind, name, definition`)).rows;
  } finally { await pool.end(); }

  const root = process.env.DATA_DIR || '/var/lib/aeroedu'; const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name); const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (relative === 'license-state.json' || relative === 'operations.jsonl' || relative.startsWith('logs/') || relative.startsWith('.restore-')) continue;
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push({ path: relative, size: fs.statSync(absolute).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex') });
    }
  }
  walk(root);
  const schemaObjectsSha256 = crypto.createHash('sha256').update(JSON.stringify(schemaObjects)).digest('hex');
  process.stdout.write(`${JSON.stringify({ schema: 2, tables, sequences, schemaObjectsSha256, files })}\n`);
}
main().catch((error) => { console.error(error); process.exit(1); });
