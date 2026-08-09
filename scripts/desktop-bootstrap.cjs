'use strict';

const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const accounts = [
  ['admin-user', 'Admin User', 'admin@example.com', 'admin123', 'ADMIN'],
  ['teacher-user', 'John Teacher', 'teacher@example.com', 'teacher123', 'TEACHER'],
  ['teacher2-user', 'Sarah Teacher', 'teacher2@example.com', 'teacher123', 'TEACHER'],
  ['student-user', 'Alice Student', 'student@example.com', 'student123', 'STUDENT'],
  ['student2-user', 'Bob Student', 'student2@example.com', 'student123', 'STUDENT'],
  ['student3-user', 'Charlie Student', 'student3@example.com', 'student123', 'STUDENT'],
  ['student4-user', 'Diana Student', 'student4@example.com', 'student123', 'STUDENT'],
];

async function main() {
  const schemaFile = process.env.AEROEDU_DESKTOP_SCHEMA;
  if (!schemaFile || !fs.existsSync(schemaFile)) throw new Error('AEROEDU_DESKTOP_SCHEMA is missing');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  let client;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { client = await pool.connect(); break; }
    catch (error) {
      if (attempt === 49) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  try {
    await client.query('SELECT pg_advisory_lock(51702321)');
    const existing = await client.query(`SELECT to_regclass('public."User"') AS user_table`);
    if (!existing.rows[0].user_table) {
      console.log('[desktop] Creating persistent database schema');
      await client.query(fs.readFileSync(schemaFile, 'utf8'));
    }
    const hashes = new Map();
    for (const password of new Set(accounts.map((account) => account[3]))) hashes.set(password, await bcrypt.hash(password, 12));
    for (const [id, name, email, password, role] of accounts) {
      const passwordHash = hashes.get(password);
      await client.query(`INSERT INTO "User" (id,name,email,password,role,"updatedAt") VALUES($1,$2,$3,$4,$5,now())
        ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role`, [id, name, email, passwordHash, role]);
    }
    console.log(`[desktop] Initial accounts ready (${accounts.length}); existing passwords were preserved`);
  } finally {
    await client.query('SELECT pg_advisory_unlock(51702321)').catch(() => {});
    client?.release();
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
