'use strict';

const { Pool } = require('pg');
const { loadAndVerifyLicense } = require('../lib/license.cjs');

async function main() {
  const payload = loadAndVerifyLicense();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await pool.query('BEGIN');
    await pool.query('SELECT pg_advisory_xact_lock(51702312)');
    const active = await pool.query('SELECT count(*)::int AS count FROM "User" WHERE COALESCE(banned, FALSE) = FALSE');
    if (Number(active.rows[0]?.count || 0) > payload.seats) {
      throw new Error(`License seat downgrade refused: ${active.rows[0].count} active users exceed ${payload.seats} seats`);
    }
    await pool.query(
      `INSERT INTO aeroedu_license_runtime(singleton, license_id, seats, expires_at, image_digest, synced_at)
       VALUES(TRUE,$1,$2,$3,$4,now())
       ON CONFLICT(singleton) DO UPDATE SET license_id=EXCLUDED.license_id, seats=EXCLUDED.seats,
         expires_at=EXCLUDED.expires_at, image_digest=EXCLUDED.image_digest, synced_at=now()`,
      [payload.licenseId, payload.seats, payload.expiresAt, payload.imageDigest]
    );
    await pool.query('COMMIT');
    console.log(`[license] synchronized id=${payload.licenseId} seats=${payload.seats}`);
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error('[license] synchronization failed:', error.message); process.exit(1); });
