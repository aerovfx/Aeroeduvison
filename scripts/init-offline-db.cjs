'use strict';

const { Pool } = require('../lib/db-pool.cjs');

async function main() {
  const pool = new Pool();
  await pool.query('SELECT 1 AS ok');
  await pool.end();
  console.log('SQLite offline database is ready.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
