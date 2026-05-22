/**
 * Knowledge Graph tools (5 tools) — aeroedu_kg_*
 *
 * 1. aeroedu_kg_search       — POST /api/kg/smart-query (AI natural language search)
 * 2. aeroedu_kg_node_detail  — GET  /api/kg/node/:id
 * 3. aeroedu_kg_path_find    — POST /api/kg/path/find (learning path A→B)
 * 4. aeroedu_kg_record_visit — POST /api/kg/visits (ghi nhận HS đã học node)
 * 5. aeroedu_kg_extract      — POST /api/kg/extract (trích xuất KG từ văn bản/tài liệu)
 *
 * Backend endpoints — tất cả đã có trong server.cjs:
 *   POST /api/kg/smart-query   → AI search NL → graph slice
 *   GET  /api/kg/node/:id      → node detail + relations
 *   POST /api/kg/path/find     → BFS path find + estimated time
 *   POST /api/kg/visits        → record student visit (tính mastery)
 *   POST /api/kg/extract       → Claude-powered doc → KG nodes
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AeroEduApiClient } from "../lib/api-client.js";

export function registerKgTools(server: McpServer, client: AeroEduApiClient) {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. aeroedu_kg_search
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_kg_search",
    {
      description:
        "Tìm kiếm ngữ nghĩa trong Knowledge Graph của AeroEdu bằng ngôn ngữ tự nhiên. " +
        "AI tự phân tích câu hỏi → trả về các khái niệm (node) liên quan kèm mô tả, " +
        "môn học, lớp, độ khó và liên kết với node khác. " +
        "Ví dụ: 'dao động điều hoà lớp 11', 'phương trình bậc 2 toán 9', 'tế bào sinh học 10'.",
      inputSchema: z.object({
        query: z.string().min(3).max(500).describe(
          "Câu hỏi hoặc từ khoá tìm kiếm (tiếng Việt hoặc tiếng Anh)",
        ),
        subject: z
          .enum(["math", "physics", "chemistry", "biology", "literature", "english", "history", "geography", "informatics", "technology", "all"])
          .optional()
          .default("all")
          .describe("Giới hạn tìm theo môn. Mặc định: tất cả môn"),
        grade: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe("Giới hạn tìm theo lớp (1-12). Bỏ trống = tất cả lớp"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(30)
          .optional()
          .default(10)
          .describe("Số node kết quả tối đa (1-30). Mặc định: 10"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ query, subject, grade, limit }) => {
      const resp = await client.post<{
        nodes?: unknown[];
        slice?: unknown[];
        query?: string;
        explanation?: string;
      }>("/api/kg/smart-query", {
        query,
        subject: subject === "all" ? undefined : subject,
        grade,
        limit,
      });

      const nodes = resp.nodes ?? resp.slice ?? [];
      const truncated = nodes.slice(0, limit);

      const result = {
        query,
        total_found: nodes.length,
        returned: truncated.length,
        explanation: resp.explanation,
        nodes: truncated.map((n: unknown) => {
          const o = n as Record<string, unknown>;
          return {
            id: o.id,
            label: o.label ?? o.name,
            subject: o.subject,
            grade: o.grade,
            difficulty: o.difficulty,
            description: typeof o.description === "string" ? o.description.slice(0, 300) : undefined,
            relations_count: Array.isArray(o.relations) ? (o.relations as unknown[]).length : undefined,
          };
        }),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 2. aeroedu_kg_node_detail
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_kg_node_detail",
    {
      description:
        "Xem chi tiết 1 node trong Knowledge Graph: mô tả đầy đủ, các khái niệm liên quan, " +
        "tài liệu học tập gắn với node, thống kê mastery của học sinh. " +
        "Dùng node_id từ kết quả aeroedu_kg_search.",
      inputSchema: z.object({
        node_id: z.string().min(1).describe("ID node KG (từ aeroedu_kg_search hoặc URL graph)"),
        include_resources: z
          .boolean()
          .optional()
          .default(true)
          .describe("Bao gồm danh sách tài liệu học tập (video/bài đọc/quiz liên kết). Mặc định: true"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ node_id, include_resources }) => {
      const [nodeResp, resourcesResp] = await Promise.all([
        client.get<Record<string, unknown>>(`/api/kg/node/${encodeURIComponent(node_id)}`),
        include_resources
          ? client.get<unknown>(`/api/kg/node/${encodeURIComponent(node_id)}/resources`).catch(() => null)
          : Promise.resolve(null),
      ]);

      const result = {
        id: nodeResp.id,
        label: nodeResp.label ?? nodeResp.name,
        subject: nodeResp.subject,
        grade: nodeResp.grade,
        difficulty: nodeResp.difficulty,
        description: nodeResp.description,
        prerequisites: nodeResp.prerequisites ?? [],
        relations: Array.isArray(nodeResp.relations)
          ? (nodeResp.relations as unknown[]).slice(0, 20)
          : [],
        mastery_stats: nodeResp.masteryStats ?? nodeResp.mastery_stats,
        resources: resourcesResp,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. aeroedu_kg_path_find
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_kg_path_find",
    {
      description:
        "Tìm lộ trình học tập tối ưu từ khái niệm A đến khái niệm B trong Knowledge Graph. " +
        "Dùng BFS để tìm đường ngắn nhất qua các prerequisite. " +
        "Trả về danh sách node cần học theo thứ tự + thời gian ước tính.",
      inputSchema: z.object({
        from_node_id: z.string().min(1).describe("Node xuất phát (khái niệm học sinh đã biết)"),
        to_node_id: z.string().min(1).describe("Node đích (khái niệm muốn học)"),
        max_depth: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .default(10)
          .describe("Độ sâu tìm kiếm tối đa. Mặc định: 10"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ from_node_id, to_node_id, max_depth }) => {
      const resp = await client.post<{
        path?: unknown[];
        nodes?: unknown[];
        total_minutes?: number;
        found?: boolean;
      }>("/api/kg/path/find", {
        fromNodeId: from_node_id,
        toNodeId: to_node_id,
        maxDepth: max_depth,
      });

      const path = resp.path ?? resp.nodes ?? [];
      const result = {
        found: resp.found ?? path.length > 0,
        path_length: path.length,
        estimated_minutes: resp.total_minutes,
        path: path.map((n: unknown, i: number) => {
          const o = n as Record<string, unknown>;
          return {
            step: i + 1,
            id: o.id,
            label: o.label ?? o.name,
            subject: o.subject,
            difficulty: o.difficulty,
            estimated_minutes: o.estimatedMinutes ?? o.estimated_minutes,
          };
        }),
        tip: path.length === 0
          ? "Không tìm thấy lộ trình — thử dùng aeroedu_kg_search để tìm node ID đúng."
          : `Lộ trình ${path.length} bước. Dùng aeroedu_kg_path_save để lưu thành Learning Path.`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 4. aeroedu_kg_record_visit
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_kg_record_visit",
    {
      description:
        "Ghi nhận học sinh đã học / ôn tập 1 node trong Knowledge Graph. " +
        "Cập nhật mastery score của học sinh. " +
        "Dùng sau khi HS hoàn thành bài học liên quan đến khái niệm đó.",
      inputSchema: z.object({
        node_id: z.string().min(1).describe("ID node KG vừa học"),
        mastery_score: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Điểm thành thạo 0-100 (0=chưa hiểu, 100=nắm vững). Nếu bỏ trống → tính từ kết quả quiz"),
        duration_seconds: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Thời gian học (giây)"),
        source: z
          .enum(["lesson", "quiz", "practice", "review", "ai_tutor"])
          .optional()
          .default("ai_tutor")
          .describe("Nguồn học: lesson/quiz/practice/review/ai_tutor"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ node_id, mastery_score, duration_seconds, source }) => {
      const resp = await client.post<{ success?: boolean; new_mastery?: number }>(
        "/api/kg/visits",
        {
          nodeId: node_id,
          masteryScore: mastery_score,
          durationSeconds: duration_seconds,
          source: source ?? "ai_tutor",
        },
      );

      const result = {
        success: resp.success ?? true,
        node_id,
        new_mastery: resp.new_mastery,
        message: `Đã ghi nhận lượt học node ${node_id}. Mastery mới: ${resp.new_mastery ?? "đang tính"}%`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 5. aeroedu_kg_extract
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_kg_extract",
    {
      description:
        "Trích xuất các khái niệm (node) Knowledge Graph từ văn bản hoặc tài liệu giáo khoa. " +
        "AI (Claude) phân tích nội dung → xác định khái niệm chính, mối quan hệ prerequisite, " +
        "và đề xuất thêm vào KG. Dùng để mở rộng KG từ giáo trình, bài giảng, sách giáo khoa.",
      inputSchema: z.object({
        text: z
          .string()
          .min(50)
          .max(20_000)
          .describe(
            "Nội dung văn bản cần phân tích (tối đa 20,000 ký tự). " +
            "Có thể là đoạn sách giáo khoa, bài giảng, handout.",
          ),
        subject: z
          .enum(["math", "physics", "chemistry", "biology", "literature", "english", "history", "geography", "informatics", "technology", "stem", "other"])
          .describe("Môn học của tài liệu"),
        grade: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe("Lớp của tài liệu"),
        auto_add: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Tự động thêm node mới vào KG (true) hay chỉ preview (false). " +
            "Mặc định false — nên preview trước khi thêm.",
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ text, subject, grade, auto_add }) => {
      const resp = await client.post<{
        nodes?: unknown[];
        concepts?: unknown[];
        added_count?: number;
        preview?: boolean;
      }>("/api/kg/extract", {
        text,
        subject,
        grade,
        autoAdd: auto_add,
      });

      const nodes = resp.nodes ?? resp.concepts ?? [];
      const result = {
        extracted_count: nodes.length,
        auto_added: auto_add,
        added_count: resp.added_count ?? (auto_add ? nodes.length : 0),
        nodes: nodes.slice(0, 50).map((n: unknown) => {
          const o = n as Record<string, unknown>;
          return {
            label: o.label ?? o.name,
            description: typeof o.description === "string" ? o.description.slice(0, 200) : undefined,
            prerequisites: o.prerequisites ?? [],
            difficulty: o.difficulty,
            is_new: o.isNew ?? o.is_new ?? true,
          };
        }),
        tip: !auto_add
          ? "Đây là preview. Gọi lại với auto_add=true để thêm các node này vào Knowledge Graph."
          : `Đã thêm ${resp.added_count ?? nodes.length} node mới vào Knowledge Graph.`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );
}
