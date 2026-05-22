/**
 * 5 core tools `aeroedu:course.*` cho MVP Tháng 1.
 *
 * Tools:
 *   1. aeroedu_course_list       — Liệt kê khoá học của teacher (GET /api/instructor/courses)
 *   2. aeroedu_course_create     — Tạo khoá học mới (POST /api/instructor/courses)
 *   3. aeroedu_chapter_add       — Thêm chương vào khoá (POST /api/instructor/courses/:id/chapters)
 *   4. aeroedu_lesson_add        — Thêm bài học vào chương (POST /api/instructor/chapters/:id/lessons)
 *   5. aeroedu_exam_create       — Tạo đề thi (POST /api/instructor/exams)
 *
 * MCP tool naming convention: dùng `_` thay vì `:` hoặc `.` vì MCP spec yêu cầu
 * tên tool match regex `[a-zA-Z0-9_-]+`. Trong UI Claude sẽ vẫn hiển thị
 * description tiếng Việt → user dễ nhận diện.
 */

import { z } from "zod";
import type { AeroEduApiClient } from "../lib/api-client.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  handler: (args: unknown, client: AeroEduApiClient) => Promise<unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. course.list
// ─────────────────────────────────────────────────────────────────────────────
const ListCoursesSchema = z.object({
  status: z
    .enum(["draft", "published", "archived", "all"])
    .optional()
    .describe("Lọc theo trạng thái khoá học. Mặc định 'all'."),
  limit: z.number().int().min(1).max(100).optional().describe("Số lượng tối đa (1-100)."),
});

export const courseListTool: ToolDefinition = {
  name: "aeroedu_course_list",
  description:
    "Liệt kê các khoá học của giáo viên hiện tại trên AeroEdu (inphysic.com). " +
    "Trả về danh sách courseId, tên, môn học, trạng thái, số bài học, số học sinh.",
  inputSchema: ListCoursesSchema,
  handler: async (rawArgs, client) => {
    const args = ListCoursesSchema.parse(rawArgs);
    const courses = await client.get<unknown[]>("/api/instructor/courses");
    if (!Array.isArray(courses)) return { count: 0, courses: [] };

    let filtered = courses;
    if (args.status && args.status !== "all") {
      filtered = courses.filter(
        (c) =>
          typeof c === "object" &&
          c !== null &&
          "status" in c &&
          (c as { status: string }).status === args.status,
      );
    }
    if (args.limit) filtered = filtered.slice(0, args.limit);

    return {
      count: filtered.length,
      courses: filtered.map((c) => {
        const obj = c as Record<string, unknown>;
        return {
          id: obj.id,
          title: obj.title,
          subject: obj.subject,
          grade: obj.grade,
          status: obj.status,
          chaptersCount: obj.chaptersCount ?? obj.chapters_count,
          studentsCount: obj.studentsCount ?? obj.students_count,
          updatedAt: obj.updatedAt ?? obj.updated_at,
        };
      }),
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. course.create
// ─────────────────────────────────────────────────────────────────────────────
const CreateCourseSchema = z.object({
  title: z.string().min(3).max(200).describe("Tên khoá học (3-200 ký tự)."),
  subject: z
    .enum(["math", "physics", "chemistry", "biology", "literature", "english", "history", "geography", "informatics", "technology", "stem", "other"])
    .describe("Môn học chính của khoá."),
  grade: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe("Lớp (1-12). Bỏ trống nếu khoá đa cấp."),
  description: z.string().max(2000).optional().describe("Mô tả khoá học."),
  isPremium: z.boolean().optional().describe("Khoá trả phí (true) hay miễn phí (false). Mặc định false."),
  price: z
    .number()
    .min(0)
    .max(10_000_000)
    .optional()
    .describe("Giá khoá học (VND). Bỏ trống nếu free."),
});

export const courseCreateTool: ToolDefinition = {
  name: "aeroedu_course_create",
  description:
    "Tạo khoá học mới trên AeroEdu. Trả về courseId để dùng cho các tool tiếp " +
    "theo (chapter.add, lesson.add). Khoá tạo ra sẽ ở trạng thái 'draft'.",
  inputSchema: CreateCourseSchema,
  handler: async (rawArgs, client) => {
    const args = CreateCourseSchema.parse(rawArgs);
    const created = await client.post<{ id: string; title: string }>(
      "/api/instructor/courses",
      {
        title: args.title,
        subject: args.subject,
        grade: args.grade,
        description: args.description ?? "",
        isPremium: args.isPremium ?? false,
        price: args.price ?? 0,
        status: "draft",
      },
    );
    return {
      success: true,
      courseId: created.id,
      title: created.title,
      hint: `Tiếp theo dùng aeroedu_chapter_add với courseId='${created.id}' để thêm chương.`,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. chapter.add
// ─────────────────────────────────────────────────────────────────────────────
const AddChapterSchema = z.object({
  courseId: z.string().min(1).describe("courseId trả về từ aeroedu_course_create hoặc aeroedu_course_list."),
  title: z.string().min(2).max(200).describe("Tên chương."),
  order: z.number().int().min(1).optional().describe("Thứ tự chương (1-based). Bỏ trống = thêm cuối."),
  description: z.string().max(1000).optional().describe("Mô tả chương."),
});

export const chapterAddTool: ToolDefinition = {
  name: "aeroedu_chapter_add",
  description:
    "Thêm 1 chương mới vào khoá học. Trả về chapterId để dùng cho aeroedu_lesson_add.",
  inputSchema: AddChapterSchema,
  handler: async (rawArgs, client) => {
    const args = AddChapterSchema.parse(rawArgs);
    const created = await client.post<{ id: string; title: string }>(
      `/api/instructor/courses/${encodeURIComponent(args.courseId)}/chapters`,
      {
        title: args.title,
        order: args.order,
        description: args.description ?? "",
      },
    );
    return {
      success: true,
      chapterId: created.id,
      title: created.title,
      hint: `Tiếp theo dùng aeroedu_lesson_add với chapterId='${created.id}' để thêm bài học.`,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. lesson.add
// ─────────────────────────────────────────────────────────────────────────────
const AddLessonSchema = z.object({
  chapterId: z.string().min(1).describe("chapterId trả về từ aeroedu_chapter_add."),
  title: z.string().min(2).max(200).describe("Tên bài học."),
  type: z
    .enum(["video", "reading", "quiz", "assignment", "lab"])
    .describe("Loại bài học: video / đọc / quiz / bài tập / lab thực hành."),
  durationMinutes: z.number().int().min(1).max(600).optional().describe("Thời lượng dự kiến (phút)."),
  videoUrl: z.string().url().optional().describe("URL video (chỉ áp dụng type='video')."),
  content: z.string().max(50_000).optional().describe("Nội dung markdown cho bài đọc."),
  order: z.number().int().min(1).optional().describe("Thứ tự bài trong chương."),
});

export const lessonAddTool: ToolDefinition = {
  name: "aeroedu_lesson_add",
  description:
    "Thêm 1 bài học vào chương. Hỗ trợ 5 loại: video, reading (markdown), quiz, " +
    "assignment, lab. Trả về lessonId.",
  inputSchema: AddLessonSchema,
  handler: async (rawArgs, client) => {
    const args = AddLessonSchema.parse(rawArgs);
    const created = await client.post<{ id: string; title: string }>(
      `/api/instructor/chapters/${encodeURIComponent(args.chapterId)}/lessons`,
      {
        title: args.title,
        type: args.type,
        durationMinutes: args.durationMinutes,
        videoUrl: args.videoUrl,
        content: args.content,
        order: args.order,
      },
    );
    return {
      success: true,
      lessonId: created.id,
      title: created.title,
      type: args.type,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. exam.create
// ─────────────────────────────────────────────────────────────────────────────
const QuestionSchema = z.object({
  type: z
    .enum(["mcq", "true_false_4", "short_answer", "essay"])
    .describe("Loại câu: MCQ 4 đáp án / Đúng-Sai 4 mệnh đề / Trả lời ngắn / Tự luận."),
  question: z.string().min(5).describe("Nội dung câu hỏi (hỗ trợ LaTeX)."),
  options: z.array(z.string()).optional().describe("Đáp án (chỉ MCQ và true_false_4)."),
  answer: z.string().or(z.array(z.string())).optional().describe("Đáp án đúng."),
  points: z.number().min(0).max(10).optional().describe("Điểm cho câu (mặc định 1)."),
  explanation: z.string().optional().describe("Lời giải / giải thích."),
});

const CreateExamSchema = z.object({
  title: z.string().min(3).max(200).describe("Tên đề thi."),
  subject: z.string().describe("Môn học."),
  grade: z.number().int().min(1).max(12).optional().describe("Lớp."),
  durationMinutes: z.number().int().min(5).max(360).describe("Thời lượng (phút)."),
  questions: z.array(QuestionSchema).min(1).max(100).describe("Danh sách câu hỏi (1-100 câu)."),
  courseId: z.string().optional().describe("courseId liên kết (nếu có)."),
  startTime: z.string().optional().describe("ISO timestamp giờ bắt đầu (nếu là đề thi có lịch)."),
  endTime: z.string().optional().describe("ISO timestamp giờ kết thúc."),
});

export const examCreateTool: ToolDefinition = {
  name: "aeroedu_exam_create",
  description:
    "Tạo đề thi mới với danh sách câu hỏi. Hỗ trợ 4 loại câu: MCQ, " +
    "true_false_4 (Đúng-Sai 4 mệnh đề chuẩn THPT VN), short_answer, essay. " +
    "Câu hỏi có thể chứa LaTeX (\\frac, \\sqrt, etc).",
  inputSchema: CreateExamSchema,
  handler: async (rawArgs, client) => {
    const args = CreateExamSchema.parse(rawArgs);
    const created = await client.post<{ id: string; title: string }>(
      "/api/instructor/exams",
      {
        title: args.title,
        subject: args.subject,
        grade: args.grade,
        durationMinutes: args.durationMinutes,
        questions: args.questions,
        courseId: args.courseId,
        startTime: args.startTime,
        endTime: args.endTime,
      },
    );
    return {
      success: true,
      examId: created.id,
      title: created.title,
      questionCount: args.questions.length,
      hint: `Mở đề tại https://inphysic.com/teacher/exams/${created.id}`,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────
export const courseTools: ToolDefinition[] = [
  courseListTool,
  courseCreateTool,
  chapterAddTool,
  lessonAddTool,
  examCreateTool,
];
