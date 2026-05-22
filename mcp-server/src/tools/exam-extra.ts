/**
 * Exam & Question & Student tools (5 tools)
 *
 * 1. aeroedu_exam_publish        — POST /api/teacher/exams/:id/publish
 * 2. aeroedu_question_search     — GET  /api/questions
 * 3. aeroedu_question_create_bulk — POST /api/questions/batch
 * 4. aeroedu_student_list        — GET  /api/classes/:id/students
 * 5. aeroedu_report_exam         — GET  /api/teacher/exams/:id/analytics
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AeroEduApiClient } from "../lib/api-client.js";

export function registerExamExtraTools(server: McpServer, client: AeroEduApiClient) {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. aeroedu_exam_publish
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_exam_publish",
    {
      description:
        "Publish đề thi để học sinh có thể thấy và làm bài. " +
        "Sau khi publish có thể set thời gian bắt đầu/kết thúc (nếu là đề thi có lịch) " +
        "hoặc để trống cho đề luyện tập tự do. " +
        "Dùng exam_id từ aeroedu_exam_create.",
      inputSchema: z.object({
        exam_id: z.string().min(1).describe("examId cần publish"),
        is_public: z
          .boolean()
          .optional()
          .default(true)
          .describe("Cho phép HS tìm thấy đề (true) hay chỉ HS được giao (false). Mặc định true"),
        status: z
          .enum(["Đang diễn ra", "Sắp diễn ra", "Đã kết thúc"])
          .optional()
          .default("Đang diễn ra")
          .describe("Trạng thái đề thi sau khi publish"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ exam_id, is_public, status }) => {
      const resp = await client.post<{ success?: boolean; status?: string; message?: string }>(
        `/api/teacher/exams/${encodeURIComponent(exam_id)}/publish`,
        { isPublic: is_public, status: status ?? "Đang diễn ra" },
      );
      const result = {
        success: resp.success ?? true,
        exam_id,
        status: resp.status ?? status,
        is_public,
        url: `https://inphysic.com/teacher/exams/${exam_id}`,
        student_url: `https://inphysic.com/student/exams`,
        message: resp.message ?? `Đề thi đã được publish. HS có thể làm bài tại /student/exams`,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 2. aeroedu_question_search
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_question_search",
    {
      description:
        "Tìm kiếm câu hỏi trong Ngân hàng câu hỏi (Question Bank) của AeroEdu. " +
        "Hỗ trợ tìm theo môn, lớp, chương, chủ đề, độ khó, từ khoá, loại câu. " +
        "Kết quả có thể dùng trực tiếp cho aeroedu_exam_create questions array.",
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe("Full-text search: tìm trong nội dung câu, chủ đề, chương, lesson"),
        subject: z
          .string()
          .optional()
          .describe("Môn học (physics, math, chemistry, biology, v.v.)"),
        grade: z
          .union([z.number().int().min(1).max(12), z.string()])
          .optional()
          .describe("Lớp học (1-12)"),
        topic: z.string().optional().describe("Chủ đề / bài học (ILIKE search)"),
        chapter: z.string().optional().describe("Tên chương (ILIKE search)"),
        difficulty: z
          .enum(["Dễ", "Trung bình", "Khó", "Rất khó"])
          .optional()
          .describe("Độ khó của câu hỏi"),
        status: z
          .enum(["Hoạt động", "Nháp", "Lưu trữ"])
          .optional()
          .default("Hoạt động")
          .describe("Trạng thái câu. Mặc định: Hoạt động"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .default(20)
          .describe("Số câu tối đa trả về (1-200). Mặc định: 20"),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Bỏ qua N câu đầu (cho pagination)"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ search, subject, grade, topic, chapter, difficulty, status, limit, offset }) => {
      const query: Record<string, string | number | boolean> = {
        limit: limit ?? 20,
        offset: offset ?? 0,
      };
      if (search) query.search = search;
      if (subject) query.subject = subject;
      if (grade) query.grade = String(grade);
      if (topic) query.topic = topic;
      if (chapter) query.chapter = chapter;
      if (difficulty) query.difficulty = difficulty;
      if (status) query.status = status;

      const resp = await client.get<{
        success?: boolean;
        data?: { questions: unknown[]; pagination: { total: number; limit: number; offset: number } };
        questions?: unknown[];
        total?: number;
      }>("/api/questions", query);

      const questions = resp.data?.questions ?? resp.questions ?? [];
      const pagination = resp.data?.pagination ?? { total: resp.total ?? questions.length, limit: limit ?? 20, offset: offset ?? 0 };

      const result = {
        total_count: pagination.total,
        has_more: (pagination.offset + pagination.limit) < pagination.total,
        next_offset: (pagination.offset + pagination.limit) < pagination.total
          ? pagination.offset + pagination.limit
          : null,
        returned: questions.length,
        questions: (questions as Record<string, unknown>[]).map((q) => ({
          id: q.id,
          type: q.questionType ?? q.type,
          content: typeof q.content === "string" ? q.content.slice(0, 300) : q.content,
          subject: q.subject,
          grade: q.grade,
          topic: q.topic,
          chapter: q.chapter,
          difficulty: q.difficulty,
          options: q.options,
          correct_answer: q.correctAnswer ?? q.correct_answer,
          explanation: typeof q.explanation === "string"
            ? q.explanation.slice(0, 200)
            : undefined,
          usage_count: q.usageCount ?? q.usage_count,
        })),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 3. aeroedu_question_create_bulk
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_question_create_bulk",
    {
      description:
        "Tạo nhiều câu hỏi cùng lúc vào Ngân hàng câu hỏi (tối đa 50 câu/lần). " +
        "Lý tưởng sau khi Claude sinh câu hỏi từ tài liệu → import hàng loạt. " +
        "Câu hỏi sẽ có trạng thái 'Hoạt động' và gắn tên GV tạo.",
      inputSchema: z.object({
        subject: z.string().describe("Môn học chung cho toàn batch"),
        grade: z.number().int().min(1).max(12).describe("Lớp chung cho toàn batch"),
        questions: z
          .array(
            z.object({
              type: z
                .enum(["MCQ", "TrueFalse4", "ShortAnswer", "Essay"])
                .describe("Loại câu: MCQ / TrueFalse4 (Đ-S 4 mệnh đề) / ShortAnswer / Essay"),
              content: z.string().min(5).describe("Nội dung câu hỏi (hỗ trợ LaTeX)"),
              topic: z.string().optional().describe("Chủ đề / tên bài học"),
              chapter: z.string().optional().describe("Tên chương"),
              difficulty: z
                .enum(["Dễ", "Trung bình", "Khó", "Rất khó"])
                .optional()
                .default("Trung bình"),
              options: z.array(z.string()).optional().describe("Đáp án lựa chọn (MCQ / TrueFalse4)"),
              correct_answer: z
                .union([z.string(), z.array(z.string())])
                .optional()
                .describe("Đáp án đúng"),
              explanation: z.string().optional().describe("Lời giải / hướng dẫn"),
              tags: z.array(z.string()).optional().describe("Tags phân loại"),
            }),
          )
          .min(1)
          .max(50)
          .describe("Danh sách câu hỏi (1-50 câu)"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ subject, grade, questions }) => {
      const payload = questions.map((q) => ({
        subject,
        grade: String(grade),
        questionType: q.type,
        content: q.content,
        topic: q.topic,
        chapter: q.chapter,
        difficulty: q.difficulty ?? "Trung bình",
        options: q.options ?? [],
        correctAnswer: q.correct_answer,
        explanation: q.explanation ?? "",
        tags: q.tags ?? [],
        status: "Hoạt động",
        aiGenerated: false,
        humanReviewed: true,
      }));

      const resp = await client.post<{
        success?: boolean;
        created?: number;
        ids?: string[];
        questions?: { id: string }[];
      }>("/api/questions/batch", { questions: payload });

      const createdCount = resp.created ?? resp.ids?.length ?? resp.questions?.length ?? questions.length;
      const result = {
        success: resp.success ?? true,
        created_count: createdCount,
        ids: resp.ids ?? resp.questions?.map((q) => q.id) ?? [],
        tip: `${createdCount} câu đã vào Ngân hàng. Dùng aeroedu_question_search để tìm lại và aeroedu_exam_create để tạo đề.`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 4. aeroedu_student_list
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_student_list",
    {
      description:
        "Liệt kê học sinh trong 1 lớp. Trả về tên, email, mã số HS, " +
        "ngày sinh, giới tính. Dùng class_id từ danh sách lớp của GV " +
        "(xem tại https://inphysic.com/teacher/classes).",
      inputSchema: z.object({
        class_id: z.string().min(1).describe("ID lớp học (từ trang /teacher/classes của AeroEdu)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .default(50)
          .describe("Số học sinh tối đa (1-200). Mặc định: 50"),
        offset: z.number().int().min(0).optional().default(0).describe("Bỏ qua N HS đầu"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ class_id, limit, offset }) => {
      const resp = await client.get<{ students?: unknown[] }>(
        `/api/classes/${encodeURIComponent(class_id)}/students`,
      );

      const all = resp.students ?? [];
      const page = all.slice(offset, offset + limit);

      const result = {
        class_id,
        total_count: all.length,
        has_more: offset + limit < all.length,
        next_offset: offset + limit < all.length ? offset + limit : null,
        returned: page.length,
        students: page.map((s: unknown) => {
          const o = s as Record<string, unknown>;
          const student = (o.student ?? o) as Record<string, unknown>;
          return {
            id: student.id ?? o.studentId,
            name: student.name,
            email: student.email,
            student_number: o.studentNumber,
            gender: student.gender,
            date_of_birth: student.dateOfBirth,
          };
        }),
        note: "Mã định danh cá nhân (MSHS) không được hiển thị qua MCP. Xuất riêng tại /teacher/classes → Xuất Excel nếu cần.",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  // ─────────────────────────────────────────────────────────────────────────
  // 5. aeroedu_report_exam
  // ─────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "aeroedu_report_exam",
    {
      description:
        "Xem báo cáo phân tích kết quả đề thi: điểm trung bình, phân phối điểm, " +
        "tỉ lệ đúng/sai từng câu, chỉ số Cronbach alpha (độ tin cậy đề thi), " +
        "HS điểm cao nhất/thấp nhất. " +
        "Dùng exam_id từ aeroedu_exam_create hoặc aeroedu_exam_publish.",
      inputSchema: z.object({
        exam_id: z.string().min(1).describe("examId cần xem báo cáo"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ exam_id }) => {
      const resp = await client.get<Record<string, unknown>>(
        `/api/teacher/exams/${encodeURIComponent(exam_id)}/analytics`,
      );

      // Normalise — backend trả về nhiều shape khác nhau tuỳ context
      const result = {
        exam_id,
        title: resp.title ?? resp.examTitle,
        total_submissions: resp.totalSubmissions ?? resp.total ?? 0,
        average_score: resp.averageScore ?? resp.average ?? null,
        max_score: resp.maxScore ?? resp.max ?? null,
        min_score: resp.minScore ?? resp.min ?? null,
        pass_rate: resp.passRate ?? resp.pass_rate ?? null,
        cronbach_alpha: resp.cronbachAlpha ?? resp.reliability ?? null,
        score_distribution: resp.scoreDistribution ?? resp.distribution ?? [],
        question_analysis: Array.isArray(resp.questionAnalysis)
          ? (resp.questionAnalysis as unknown[]).slice(0, 50).map((q: unknown) => {
              const o = q as Record<string, unknown>;
              return {
                question_index: o.questionIndex ?? o.index,
                correct_rate: o.correctRate ?? o.correct_rate,
                most_common_wrong: o.mostCommonWrong ?? o.common_wrong,
                discrimination_index: o.discriminationIndex,
              };
            })
          : [],
        top_student: resp.topStudent ?? resp.highest,
        url: `https://inphysic.com/teacher/exams/${exam_id}`,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );
}
