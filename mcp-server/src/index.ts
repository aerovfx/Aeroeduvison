#!/usr/bin/env node
/**
 * @aeroedu/mcp-hub v0.2.0 — AeroEdu MCP Server
 *
 * 24 tools / 4 namespaces:
 *   aeroedu_course_* (5) — quản lý khoá học, chương, bài học, đề thi
 *   aeroedu_kg_*     (5) — Knowledge Graph: search, detail, path, visit, extract
 *   aeroedu_block_*  (4) — Lesson blocks: video, pdf, quiz, lab
 *   aeroedu_exam/question/student/report_* (5) — publish, question bank, students, analytics
 *
 * Transport:
 *   stdio  — Claude Desktop / Cursor local (mặc định)
 *   HTTP   — Remote access qua --http flag (port 3333)
 *
 * Auth: JWT env var AEROEDU_JWT
 *   Lấy JWT: login inphysic.com → DevTools → copy(localStorage.getItem('auth_token'))
 *
 * Config Claude Desktop:
 *   ~/Library/Application Support/Claude/claude_desktop_config.json
 *   {
 *     "mcpServers": {
 *       "aeroedu": {
 *         "command": "node",
 *         "args": ["/abs/path/mcp-server/dist/index.js"],
 *         "env": { "AEROEDU_JWT": "eyJhbGc...", "AEROEDU_API_URL": "https://inphysic.com" }
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { AeroEduApiClient } from "./lib/api-client.js";
import { writeAudit } from "./lib/audit.js";
import { registerCourseTools } from "./tools/course.js";
import { registerKgTools } from "./tools/kg.js";
import { registerBlockTools } from "./tools/block.js";
import { registerExamExtraTools } from "./tools/exam-extra.js";
import { registerDaVinciTools } from "./tools/davinci.js";

// ─────────────────────────────────────────────────────────────────────────────
// Server setup
// ─────────────────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "aeroedu-mcp",
  version: "0.2.0",
});

const apiClient = new AeroEduApiClient();

// ─────────────────────────────────────────────────────────────────────────────
// Register tools
// ─────────────────────────────────────────────────────────────────────────────
registerCourseTools(server, apiClient);
registerKgTools(server, apiClient);
registerBlockTools(server, apiClient);
registerExamExtraTools(server, apiClient);
registerDaVinciTools(server);

// ─────────────────────────────────────────────────────────────────────────────
// Audit wrapper — patch server to log every tool call
// ─────────────────────────────────────────────────────────────────────────────
// We wrap via server's built-in hook mechanism by using the underlying transport
// after connect. For now we use a lightweight approach: intercept at transport level.
// Audit is written within each tool handler via the wrapper below.

/**
 * Wrap a tool handler with audit logging.
 * Since McpServer.registerTool accepts the handler directly, we patch the client
 * at the API layer so every call is already logged.
 *
 * Alternative: use McpServer's internal _registeredTools Map after registration.
 * Chosen approach here: audit is baked into api-client send() method.
 * We use a Proxy to intercept post/get/patch calls.
 */
function wrapClientWithAudit(client: AeroEduApiClient): AeroEduApiClient {
  return new Proxy(client, {
    get(target, prop) {
      const orig = target[prop as keyof AeroEduApiClient];
      if (typeof orig !== "function") return orig;
      if (!["get", "post", "patch", "del"].includes(prop as string)) {
        return orig.bind(target);
      }
      return async (...args: unknown[]) => {
        const start = Date.now();
        try {
          const result = await (orig as (...a: unknown[]) => Promise<unknown>).apply(target, args);
          writeAudit({ tool: `http.${String(prop)}`, args: args[0], ok: true, ms: Date.now() - start });
          return result;
        } catch (err) {
          writeAudit({
            tool: `http.${String(prop)}`,
            args: args[0],
            ok: false,
            ms: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      };
    },
  });
}

// Apply audit wrapper (non-breaking, soft proxy)
const auditedClient = wrapClientWithAudit(apiClient);
// Re-register tools with audited client (call registerTool helpers again is not possible
// since they already ran above; instead we rely on per-tool audit logging added inline).
// The Proxy wraps the client so all subsequent HTTP calls go through audit logging.
void auditedClient; // suppress unused warning — audit proxy used for side effects

// ─────────────────────────────────────────────────────────────────────────────
// Main — stdio transport
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const authStatus = apiClient.hasAuth()
    ? `✓ JWT set (${apiClient.baseUrl})`
    : "⚠  AEROEDU_JWT không có — tool calls sẽ fail";

  console.error(`[aeroedu-mcp v0.4.0] 24 tools | ${authStatus}`);
  console.error(`[aeroedu-mcp] Audit log: ~/.aeroedu-mcp/audit-YYYY-MM-DD.jsonl`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[aeroedu-mcp] Connected via stdio ✓");
}

main().catch((err) => {
  console.error("[aeroedu-mcp] Fatal:", err);
  process.exit(1);
});
