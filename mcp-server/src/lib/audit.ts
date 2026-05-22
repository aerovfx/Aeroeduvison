/**
 * Audit log — ghi mọi tool call vào local JSONL file.
 *
 * MVP: ~/.aeroedu-mcp/audit-YYYY-MM-DD.jsonl (1 file/ngày, rotate tự động)
 * Phase 2: sync lên POST /api/mcp/audit (background queue)
 *
 * Format mỗi dòng:
 * {"ts":"2026-05-22T07:12:00.000Z","tool":"aeroedu_course_list","args":{},"ok":true,"ms":142,"user":"teacher@x.com"}
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LOG_DIR = join(homedir(), ".aeroedu-mcp");

function ensureDir() {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    /* already exists */
  }
}

function todayFile(): string {
  const d = new Date().toISOString().slice(0, 10);
  return join(LOG_DIR, `audit-${d}.jsonl`);
}

/** Sanitise args — redact values of sensitive-looking keys. */
function sanitize(args: unknown): unknown {
  if (typeof args !== "object" || args === null) return args;
  const SENSITIVE = /token|password|secret|key|jwt|auth/i;
  return Object.fromEntries(
    Object.entries(args as Record<string, unknown>).map(([k, v]) => [
      k,
      SENSITIVE.test(k) ? "[REDACTED]" : v,
    ]),
  );
}

export interface AuditEntry {
  tool: string;
  args: unknown;
  ok: boolean;
  ms: number;
  error?: string;
  user?: string;
}

export function writeAudit(entry: AuditEntry): void {
  try {
    ensureDir();
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      tool: entry.tool,
      args: sanitize(entry.args),
      ok: entry.ok,
      ms: entry.ms,
      ...(entry.error ? { error: entry.error.slice(0, 200) } : {}),
      ...(entry.user ? { user: entry.user } : {}),
    });
    appendFileSync(todayFile(), line + "\n", { encoding: "utf8" });
  } catch {
    /* never crash the tool call because of audit failure */
  }
}
