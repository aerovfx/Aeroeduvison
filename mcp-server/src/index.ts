#!/usr/bin/env node
/**
 * @aeroedu/mcp-hub — MCP server cho phép Claude Desktop/Cursor thao tác trực
 * tiếp với inphysic.com qua Model Context Protocol.
 *
 * MVP Tháng 1 (theo docs/mcp-aeroedu-integration-plan.md):
 *   - Transport: stdio (đơn giản nhất cho Claude Desktop)
 *   - Auth: JWT từ env var AEROEDU_JWT
 *   - 5 tools: aeroedu_course_list/create, chapter_add, lesson_add, exam_create
 *   - API base: AEROEDU_API_URL (default https://inphysic.com)
 *
 * Cách dùng:
 *   1. Build: `npm run build`
 *   2. Lấy JWT: vào https://inphysic.com → login → DevTools Console:
 *        copy(localStorage.getItem('auth_token'))
 *   3. Config Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json
 *        {
 *          "mcpServers": {
 *            "aeroedu": {
 *              "command": "node",
 *              "args": ["/abs/path/to/mcp-server/dist/index.js"],
 *              "env": {
 *                "AEROEDU_JWT": "eyJhbGc...",
 *                "AEROEDU_API_URL": "https://inphysic.com"
 *              }
 *            }
 *          }
 *        }
 *   4. Restart Claude Desktop → mở chat → gõ "@aeroedu liệt kê khoá học của tôi"
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

import { AeroEduApiClient, ApiError } from "./lib/api-client.js";
import { courseTools, type ToolDefinition } from "./tools/course.js";

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────
const allTools: ToolDefinition[] = [...courseTools];

const toolsByName = new Map<string, ToolDefinition>();
for (const t of allTools) {
  toolsByName.set(t.name, t);
}

// ─────────────────────────────────────────────────────────────────────────────
// Server
// ─────────────────────────────────────────────────────────────────────────────
const server = new Server(
  {
    name: "aeroedu-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const apiClient = new AeroEduApiClient();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools: Tool[] = allTools.map((t) => ({
    name: t.name,
    description: t.description,
    // MCP SDK chấp nhận JSON Schema cho inputSchema, không phải Zod schema
    inputSchema: zodToJsonSchema(t.inputSchema, {
      $refStrategy: "none",
      target: "openApi3",
    }) as Tool["inputSchema"],
  }));
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const tool = toolsByName.get(name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Tool không tồn tại: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await tool.handler(args ?? {}, apiClient);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    let msg = err instanceof Error ? err.message : String(err);
    if (err instanceof ApiError) {
      msg = `[HTTP ${err.status}] ${err.message}`;
    }
    return {
      content: [{ type: "text", text: msg }],
      isError: true,
    };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  // Log to stderr (stdout dành cho MCP protocol JSON-RPC)
  const authMsg = apiClient.hasAuth()
    ? "✓ JWT đã cấu hình"
    : "⚠ AEROEDU_JWT chưa set — tool sẽ fail khi call API";
  console.error(`[aeroedu-mcp] starting (${allTools.length} tools, ${authMsg})`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[aeroedu-mcp] connected via stdio");
}

main().catch((err) => {
  console.error("[aeroedu-mcp] fatal:", err);
  process.exit(1);
});
