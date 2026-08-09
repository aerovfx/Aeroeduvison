'use strict';

const path = require('path');

function isSqlite() {
  return Boolean(process.env.LOCAL_DATABASE_PATH)
    || String(process.env.DATABASE_URL || '').startsWith('sqlite:');
}

function sqlitePath() {
  const configured = process.env.LOCAL_DATABASE_PATH
    || String(process.env.DATABASE_URL || '').replace(/^sqlite:(?:\/\/)?/, '');
  return path.resolve(configured || 'data/aeroedu-offline.db');
}

function translate(sql, params) {
  let text = String(sql)
    .replace(/\$\d+::(?:jsonb|json|text\[\]|uuid|int|integer|bigint|float|double precision|boolean|timestamp|timestamptz)/gi, (m) => m.split('::')[0])
    .replace(/::(?:jsonb|json|text|uuid|int|integer|bigint|float|double precision|boolean|timestamp|timestamptz)/gi, '')
    .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bILIKE\b/gi, 'LIKE')
    .replace(/\bJSONB\b/gi, 'TEXT')
    .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
    .replace(/\bBIGSERIAL\b/gi, 'INTEGER')
    .replace(/\bSERIAL\b/gi, 'INTEGER')
    .replace(/\bBOOLEAN\b/gi, 'INTEGER');

  const order = [];
  text = text.replace(/\$(\d+)/g, (_match, n) => {
    order.push(Number(n) - 1);
    return '?';
  });
  const values = order.map((index) => {
    const value = params[index];
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value);
    return value;
  });
  return { text, values };
}

class SqlitePool {
  constructor() {
    let Database;
    try {
      Database = require('better-sqlite3');
    } catch {
      // Node 22.5+ ships an embedded SQLite implementation, so offline mode
      // also works before npm dependencies have been installed.
      Database = require('node:sqlite').DatabaseSync;
    }
    const file = sqlitePath();
    require('fs').mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    this.initialize();
    console.log(`[database] SQLite offline: ${file}`);
  }

  initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY, name TEXT, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        "emailVerified" TEXT, image TEXT, "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        role TEXT NOT NULL DEFAULT 'STUDENT', "schoolId" TEXT NOT NULL DEFAULT 'default-school',
        xp INTEGER NOT NULL DEFAULT 0, "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
        "lockedUntil" TEXT, "lastLoginAt" TEXT, "lastLoginIp" TEXT,
        "twoFactorEnabled" INTEGER NOT NULL DEFAULT 0, "twoFactorSecret" TEXT,
        "twoFactorBackupCodes" TEXT NOT NULL DEFAULT '[]',
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, password TEXT,
        "dateOfBirth" TEXT, gender TEXT, "idNumber" TEXT, banned INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"(email);
      CREATE TABLE IF NOT EXISTS "Account" (
        id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, type TEXT NOT NULL,
        provider TEXT NOT NULL, "providerAccountId" TEXT NOT NULL,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, "providerAccountId"),
        FOREIGN KEY("userId") REFERENCES "User"(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "UserProfile" (
        user_id TEXT PRIMARY KEY, account_type TEXT, data TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES "User"(id) ON DELETE CASCADE
      );
    `);
  }

  async query(sql, params = []) {
    const trimmed = String(sql).trim();
    if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(trimmed)) {
      this.db.exec(trimmed);
      return { rows: [], rowCount: 0 };
    }
    const { text, values } = translate(sql, params);
    const statement = this.db.prepare(text);
    if (/^(SELECT|PRAGMA|WITH)\b/i.test(trimmed) || /\bRETURNING\b/i.test(trimmed)) {
      const rows = statement.all(...values);
      return { rows, rowCount: rows.length };
    }
    const result = statement.run(...values);
    return { rows: [], rowCount: result.changes };
  }

  async connect() { return { query: this.query.bind(this), release() {} }; }
  async end() { this.db.close(); }
}

module.exports = isSqlite() ? { Pool: SqlitePool, isSqlite: true } : {
  Pool: require('pg').Pool,
  isSqlite: false,
};
