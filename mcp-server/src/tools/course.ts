/**
 * Course & Exam tools (5 tools) — aeroedu_course_*
 *
 * 1. aeroedu_course_list     — GET  /api/instructor/courses
 * 2. aeroedu_course_create   — POST /api/instructor/courses
 * 3. aeroedu_chapter_add     — POST /api/instructor/courses/:id/chapters
 * 4. aeroedu_lesson_add      — POST /api/instructor/chapters/:id/lessons
 * 5. aeroedu_exam_create     — POST /api/instructor/exams
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AeroEduApiClient } from "../lib/api-client.js";

export function registerCourseTools(server: McpServer, client: AeroEduApiClient) {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. aeroedu_course_list
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_course_list",
    {
      description:
        "Liệt kê các khoá học của giáo viên hiện tại trên AeroEdu (inphysic.com). " +
        "Trả về id, tên, môn học, lớp, trạng thái, số chương, số học sinh. " +
        "Dùng status='all' để xem tất cả kể cả draft/archived.",
      inputSchema: z.object({
        status: z
          .enum(["draft", "published", "archived", "all"])
          .optional()
          .default("all")
          .describe("Lọc theo trạng thái. Mặc định: all"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(20)
          .describe("Số khoá tối đa trả về (1-100). Mặc định: 20"),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Bỏ qua N khoá đầu (cho pagination)."),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ status, limit, offset }) => {
      const all = await client.get<unknown[]>("/api/instructor/courses");
      if (!Array.isArray(all)) {
        return { content: [{ type: "text", text: JSON.stringify({ count: 0, courses: [] }) }] };
      }

      let filtered = all;
      if (status !== "all") {
        filtered = all.filter(
          (c) => typeof c === "object" && c !== null && (c as Record<string, unknown>).status === status,
        );
      }

      const page = filtered.slice(offset, offset + limit);
      const result = {
        total_count: filtered.length,
        has_more: offset + limit < filtered.length,
        next_offset: offset + limit < filtered.length ? offset + limit : null,
        count: page.length,
        courses: page.map((c) => {
          const o = c as Record<string, unknown>;
          return {
            id: o.id,
            title: o.title,
            subject: o.subject,
            grade: o.grade,
            status: o.status,
            chapters_count: o.chaptersCount ?? o.chapters_count ?? 0,
            students_count: o.studentsCount ?? o.students_count ?? 0,
            updated_at: o.updatedAt ?? o.updated_at,
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
  // 2. aeroedu_course_create
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_course_create",
    {
      description:
        "Tạo khoá học mới trên AeroEdu (trạng thái draft). " +
        "Trả về courseId để dùng cho aeroedu_chapter_add. " +
        "Môn học hỗ trợ: math, physics, chemistry, biology, literature, " +
        "english, history, geography, informatics, technology, stem, other.",
      inputSchema: z.object({
        title: z.string().min(3).max(200).describe("Tên khoá học (3-200 ký tự)"),
        subject: z
          .enum([
            "math", "physics", "chemistry", "biology", "literature",
            "english", "history", "geography", "informatics", "technology",
            "stem", "other",
          ])
          .describe("Môn học chính"),
        grade: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe("Lớp 1-12. Bỏ trống nếu khoá đa cấp"),
        description: z.string().max(2000).optional().describe("Mô tả khoá học"),
        is_premium: z.boolean().optional().default(false).describe("Khoá trả phí (true) hay miễn phí (false)"),
        price: z.number().min(0).max(10_000_000).optional().describe("Giá VND. Bỏ trống nếu free"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, subject, grade, description, is_premium, price }) => {
      const created = await client.post<{ id: string; title: string }>("/api/instructor/courses", {
        title,
        subject,
        grade,
        description: description ?? "",
        isPremium: is_premium ?? false,
        price: price ?? 0,
        status: "draft",
      });
      const result = {
        success: true,
        course_id: created.id,
        title: created.title,
        next_step: `Dùng aeroedu_chapter_add với course_id="${created.id}" để thêm chương`,
        url: `https://inphysic.com/teacher/courses/${created.id}`,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. aeroedu_chapter_add
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_chapter_add",
    {
      description:
        "Thêm 1 chương mới vào khoá học. " +
        "Trả về chapter_id để dùng cho aeroedu_lesson_add.",
      inputSchema: z.object({
        course_id: z.string().min(1).describe("courseId từ aeroedu_course_create hoặc aeroedu_course_list"),
        title: z.string().min(2).max(200).describe("Tên chương"),
        order: z.number().int().min(1).optional().describe("Thứ tự (1-based). Bỏ trống = thêm cuối"),
        description: z.string().max(1000).optional().describe("Mô tả chương"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ course_id, title, order, description }) => {
      const created = await client.post<{ id: string; title: string }>(
        `/api/instructor/courses/${encodeURIComponent(course_id)}/chapters`,
        { title, order, description: description ?? "" },
      );
      const result = {
        success: true,
        chapter_id: created.id,
        title: created.title,
        next_step: `Dùng aeroedu_lesson_add với chapter_id="${created.id}" để thêm bài học`,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 4. aeroedu_lesson_add
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_lesson_add",
    {
      description:
        "Thêm 1 bài học vào chương. 5 loại: " +
        "video (có videoUrl), reading (nội dung markdown), " +
        "quiz (trắc nghiệm), assignment (bài tập nộp), lab (thí nghiệm). " +
        "Trả về lesson_id.",
      inputSchema: z.object({
        chapter_id: z.string().min(1).describe("chapterId từ aeroedu_chapter_add"),
        title: z.string().min(2).max(200).describe("Tên bài học"),
        type: z
          .enum(["video", "reading", "quiz", "assignment", "lab"])
          .describe("Loại bài học"),
        duration_minutes: z
          .number()
          .int()
          .min(1)
          .max(600)
          .optional()
          .describe("Thời lượng dự kiến (phút)"),
        video_url: z.string().url().optional().describe("URL video (chỉ type='video')"),
        content: z.string().max(50_000).optional().describe("Nội dung markdown (type='reading')"),
        order: z.number().int().min(1).optional().describe("Thứ tự bài trong chương"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ chapter_id, title, type, duration_minutes, video_url, content, order }) => {
      const created = await client.post<{ id: string; title: string }>(
        `/api/instructor/chapters/${encodeURIComponent(chapter_id)}/lessons`,
        { title, type, durationMinutes: duration_minutes, videoUrl: video_url, content, order },
      );
      const result = { success: true, lesson_id: created.id, title: created.title, type };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 5. aeroedu_exam_create
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_exam_create",
    {
      description:
        "Tạo đề thi với danh sách câu hỏi. 4 loại câu: " +
        "mcq (trắc nghiệm 4 đáp án), true_false_4 (Đúng-Sai 4 mệnh đề chuẩn THPT VN), " +
        "short_answer (trả lời ngắn), essay (tự luận). " +
        "Hỗ trợ LaTeX trong nội dung câu hỏi (\\frac, \\sqrt, v.v.).",
      inputSchema: z.object({
        title: z.string().min(3).max(200).describe("Tên đề thi"),
        subject: z.string().describe("Môn học"),
        grade: z.number().int().min(1).max(12).optional().describe("Lớp"),
        duration_minutes: z.number().int().min(5).max(360).describe("Thời lượng (phút)"),
        questions: z
          .array(
            z.object({
              type: z.enum(["mcq", "true_false_4", "short_answer", "essay"]),
              question: z.string().min(5).describe("Nội dung câu hỏi (hỗ trợ LaTeX)"),
              options: z.array(z.string()).optional().describe("Đáp án (MCQ / true_false_4)"),
              answer: z.union([z.string(), z.array(z.string())]).optional().describe("Đáp án đúng"),
              points: z.number().min(0).max(10).optional().default(1),
              explanation: z.string().optional().describe("Lời giải"),
            }),
          )
          .min(1)
          .max(100)
          .describe("Danh sách câu hỏi (1-100 câu)"),
        course_id: z.string().optional().describe("courseId liên kết (tuỳ chọn)"),
        start_time: z.string().optional().describe("ISO timestamp giờ bắt đầu thi"),
        end_time: z.string().optional().describe("ISO timestamp giờ kết thúc thi"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, subject, grade, duration_minutes, questions, course_id, start_time, end_time }) => {
      const created = await client.post<{ id: string; title: string }>("/api/instructor/exams", {
        title,
        subject,
        grade,
        durationMinutes: duration_minutes,
        questions,
        courseId: course_id,
        startTime: start_time,
        endTime: end_time,
      });
      const result = {
        success: true,
        exam_id: created.id,
        title: created.title,
        question_count: questions.length,
        url: `https://inphysic.com/teacher/exams/${created.id}`,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );
}
