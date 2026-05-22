/**
 * Lesson Block tools (4 tools) — aeroedu_block_*
 *
 * LessonBlock là content unit trong 1 bài học. 1 lesson có nhiều blocks
 * sắp xếp theo position. Backend types: video, pdf, text, audio, quiz,
 * pptx, simulation, lab, game, link, embed.
 *
 * 1. aeroedu_block_add_video  — thêm video block (YouTube/GCS URL)
 * 2. aeroedu_block_add_pdf    — thêm PDF block
 * 3. aeroedu_block_add_quiz   — link đề thi vào bài học
 * 4. aeroedu_block_add_lab    — thêm lab/simulation challenge
 *
 * Endpoint: POST /api/instructor/lessons/:lessonId/blocks
 *   body: { type, title, content, metadata, position }
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AeroEduApiClient } from "../lib/api-client.js";

interface BlockResponse {
  id: string;
  lessonId: string;
  type: string;
  title: string | null;
  position: number;
}

export function registerBlockTools(server: McpServer, client: AeroEduApiClient) {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. aeroedu_block_add_video
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_block_add_video",
    {
      description:
        "Thêm video block vào bài học. Hỗ trợ YouTube (youtube.com/watch?v=...), " +
        "Google Drive, hoặc URL trực tiếp MP4/WebM (từ GCS bucket AeroEdu). " +
        "Video sẽ xuất hiện theo thứ tự position trong bài học.",
      inputSchema: z.object({
        lesson_id: z.string().min(1).describe("lessonId từ aeroedu_lesson_add"),
        video_url: z
          .string()
          .url()
          .describe(
            "URL video. Hỗ trợ: youtube.com/watch?v=..., youtu.be/..., " +
            "drive.google.com/..., storage.googleapis.com/... (GCS public URL)",
          ),
        title: z.string().max(300).optional().describe("Tiêu đề hiển thị (bỏ trống = tự lấy từ URL)"),
        duration_seconds: z.number().int().min(0).optional().describe("Thời lượng video (giây)"),
        position: z.number().int().min(1).optional().describe("Vị trí trong bài học. Bỏ trống = thêm cuối"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ lesson_id, video_url, title, duration_seconds, position }) => {
      const block = await client.post<BlockResponse>(
        `/api/instructor/lessons/${encodeURIComponent(lesson_id)}/blocks`,
        {
          type: "video",
          title: title ?? null,
          content: video_url,
          metadata: { url: video_url, durationSeconds: duration_seconds },
          position,
        },
      );
      const result = {
        success: true,
        block_id: block.id,
        lesson_id: block.lessonId,
        type: "video",
        position: block.position,
        url: video_url,
        next_step: "Dùng aeroedu_block_add_quiz hoặc aeroedu_block_add_lab để thêm block tiếp theo",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 2. aeroedu_block_add_pdf
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_block_add_pdf",
    {
      description:
        "Đính kèm tài liệu PDF vào bài học (sách giáo khoa, handout, slide). " +
        "PDF được hiển thị inline trong trình xem bài học của học sinh.",
      inputSchema: z.object({
        lesson_id: z.string().min(1).describe("lessonId từ aeroedu_lesson_add"),
        pdf_url: z.string().url().describe("URL công khai của file PDF"),
        title: z.string().max(300).optional().describe("Tên tài liệu PDF"),
        page_count: z.number().int().min(1).optional().describe("Số trang (tuỳ chọn, để hiển thị UI)"),
        position: z.number().int().min(1).optional().describe("Vị trí trong bài học"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ lesson_id, pdf_url, title, page_count, position }) => {
      const block = await client.post<BlockResponse>(
        `/api/instructor/lessons/${encodeURIComponent(lesson_id)}/blocks`,
        {
          type: "pdf",
          title: title ?? null,
          content: pdf_url,
          metadata: { url: pdf_url, pageCount: page_count },
          position,
        },
      );
      const result = {
        success: true,
        block_id: block.id,
        lesson_id: block.lessonId,
        type: "pdf",
        position: block.position,
        url: pdf_url,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. aeroedu_block_add_quiz
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_block_add_quiz",
    {
      description:
        "Gắn 1 đề thi/quiz vào bài học để học sinh làm bài ngay trong khoá học. " +
        "Dùng exam_id từ aeroedu_exam_create. Học sinh làm xong → điểm tự động ghi vào GradeBook.",
      inputSchema: z.object({
        lesson_id: z.string().min(1).describe("lessonId từ aeroedu_lesson_add"),
        exam_id: z.string().min(1).describe("examId từ aeroedu_exam_create"),
        title: z.string().max(300).optional().describe("Tên hiển thị của quiz block (bỏ trống = dùng tên đề thi)"),
        required: z
          .boolean()
          .optional()
          .default(false)
          .describe("Bắt buộc hoàn thành quiz mới được học bài tiếp (true) hay tuỳ chọn (false)"),
        position: z.number().int().min(1).optional().describe("Vị trí trong bài học"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ lesson_id, exam_id, title, required, position }) => {
      const block = await client.post<BlockResponse>(
        `/api/instructor/lessons/${encodeURIComponent(lesson_id)}/blocks`,
        {
          type: "quiz",
          title: title ?? null,
          content: exam_id,
          metadata: { examId: exam_id, required: required ?? false },
          position,
        },
      );
      const result = {
        success: true,
        block_id: block.id,
        lesson_id: block.lessonId,
        type: "quiz",
        exam_id,
        required: required ?? false,
        position: block.position,
        url: `https://inphysic.com/teacher/exams/${exam_id}`,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 4. aeroedu_block_add_lab
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_block_add_lab",
    {
      description:
        "Thêm lab challenge thực hành vào bài học. Các loại lab AeroEdu hỗ trợ: " +
        "circuit (mạch điện Wokwi), graph (đồ thị toán), python (thực thi code), " +
        "arduino (mô phỏng board), custom (iframe embed). " +
        "HS tương tác trực tiếp trong trình duyệt không cần cài đặt.",
      inputSchema: z.object({
        lesson_id: z.string().min(1).describe("lessonId từ aeroedu_lesson_add"),
        lab_type: z
          .enum(["circuit", "graph", "python", "arduino", "custom"])
          .describe("Loại lab: circuit=mạch điện, graph=đồ thị, python=code, arduino=board, custom=iframe"),
        title: z.string().min(2).max(300).describe("Tên bài lab"),
        description: z.string().max(2000).optional().describe("Mô tả mục tiêu lab"),
        embed_url: z
          .string()
          .url()
          .optional()
          .describe("URL embed cho lab_type='custom' (Wokwi, GeoGebra, PhET, v.v.)"),
        config: z
          .record(z.unknown())
          .optional()
          .describe("Cấu hình lab JSON (circuit diagram, graph params, starter code...)"),
        position: z.number().int().min(1).optional().describe("Vị trí trong bài học"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ lesson_id, lab_type, title, description, embed_url, config, position }) => {
      const block = await client.post<BlockResponse>(
        `/api/instructor/lessons/${encodeURIComponent(lesson_id)}/blocks`,
        {
          type: "lab",
          title,
          content: description ?? "",
          metadata: {
            labType: lab_type,
            embedUrl: embed_url,
            config: config ?? {},
          },
          position,
        },
      );
      const result = {
        success: true,
        block_id: block.id,
        lesson_id: block.lessonId,
        type: "lab",
        lab_type,
        position: block.position,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );
}
