// Shared constants for Question Bank, Exam Matrix, and related features
// Single source of truth — import from here in all components

/**
 * question-bank.ts — Hằng số dùng chung cho Ngân hàng câu hỏi, Ma trận đề thi
 * và các tính năng liên quan. Nguồn chân lý (single source of truth): mọi
 * component import từ đây. Chứa danh sách môn/gia, mức độ nhận thức Bloom,
 * loại câu hỏi (UI ↔ DB ↔ ma trận), độ khó, loại đề, preset ma trận.
 */
 // Tên môn chuẩn CT GDPT 2018 (đồng bộ với SUBJECT_CATEGORIES trong QuestionBank
// + lib/subject-normalize.cjs): "Vật lí"/"Hoá học"/"Địa lí"/"Mĩ thuật".
// Bao gồm đủ môn & hoạt động giáo dục THPT.
export const SUBJECTS = [
  "Toán",
  "Ngữ văn",
  // Ngoại ngữ 1
  "Tiếng Anh",
  "Tiếng Nga",
  "Tiếng Pháp",
  "Tiếng Trung",
  "Tiếng Nhật",
  "Tiếng Hàn",
  "Tiếng Đức",
  // Khoa học tự nhiên
  "Vật lí",
  "Hoá học",
  "Sinh học",
  // Khoa học xã hội
  "Lịch sử",
  "Địa lí",
  "Giáo dục kinh tế và pháp luật",
  // Công nghệ - Tin học - Nghệ thuật
  "Công nghệ",
  "Tin học",
  "Nghệ thuật",
  "Âm nhạc",
  "Mĩ thuật",
  // Thể chất - QP-AN
  "Giáo dục thể chất",
  "Giáo dục Quốc phòng và An ninh",
  // Hoạt động giáo dục
  "Nội dung giáo dục của địa phương",
  "Hoạt động trải nghiệm, hướng nghiệp",
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const GRADES = [
  "Khối 1",
  "Khối 2",
  "Khối 3",
  "Khối 4",
  "Khối 5",
  "Khối 6",
  "Khối 7",
  "Khối 8",
  "Khối 9",
  "Khối 10",
  "Khối 11",
  "Khối 12",
] as const;

export type Grade = (typeof GRADES)[number];

/** Bloom's taxonomy — 6 levels, from lowest to highest */
export const COGNITIVE_LEVELS = [
  "Biết",
  "Hiểu",
  "Vận dụng",
  "Phân tích",
  "Đánh giá",
  "Sáng tạo",
] as const;

export type CognitiveLevel = (typeof COGNITIVE_LEVELS)[number];

/** The 3 levels used in standard Vietnamese exam matrices (40/30/30 split) */
export const MATRIX_COGNITIVE_LEVELS = ["Biết", "Hiểu", "Vận dụng"] as const;

// ─── Question Types ──────────────────────────────────────────────────────────

/** Display names used in the UI (form values) */
export const QUESTION_TYPES_DISPLAY = [
  "TNKQ - Nhiều lựa chọn",
  "TNKQ - Đúng/Sai",
  "TNKQ - Trả lời ngắn",
  "Tự luận",
] as const;

export type QuestionTypeDisplay = (typeof QUESTION_TYPES_DISPLAY)[number];

/** Database enum values */
export const QUESTION_TYPES_DB = ["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"] as const;

export type QuestionTypeDB = (typeof QUESTION_TYPES_DB)[number];

/** Map: UI display → DB enum */
export const QUESTION_TYPE_DISPLAY_TO_DB: Record<QuestionTypeDisplay, QuestionTypeDB> = {
  "TNKQ - Nhiều lựa chọn": "MCQ",
  "TNKQ - Đúng/Sai": "TRUE_FALSE",
  "TNKQ - Trả lời ngắn": "SHORT_ANSWER",
  "Tự luận": "ESSAY",
};

/** Map: DB enum → UI display */
export const QUESTION_TYPE_DB_TO_DISPLAY: Record<QuestionTypeDB, QuestionTypeDisplay> = {
  MCQ: "TNKQ - Nhiều lựa chọn",
  TRUE_FALSE: "TNKQ - Đúng/Sai",
  SHORT_ANSWER: "TNKQ - Trả lời ngắn",
  ESSAY: "Tự luận",
};

/** Internal keys used in auto-matrix-generator (with underscores) */
export const QUESTION_TYPES_MATRIX = [
  "TNKQ_Nhiều_lựa_chọn",
  "TNKQ_Đúng_Sai",
  "TNKQ_Trả_lời_ngắn",
  "Tự_luận",
] as const;

export type QuestionTypeMatrix = (typeof QUESTION_TYPES_MATRIX)[number];

/** Map: matrix key → DB enum */
export const QUESTION_TYPE_MATRIX_TO_DB: Record<QuestionTypeMatrix, QuestionTypeDB> = {
  TNKQ_Nhiều_lựa_chọn: "MCQ",
  TNKQ_Đúng_Sai: "TRUE_FALSE",
  TNKQ_Trả_lời_ngắn: "SHORT_ANSWER",
  Tự_luận: "ESSAY",
};

// ─── Difficulty ──────────────────────────────────────────────────────────────

export const DIFFICULTIES_DISPLAY = ["Dễ", "Trung bình", "Khó"] as const;

export type DifficultyDisplay = (typeof DIFFICULTIES_DISPLAY)[number];

export const DIFFICULTIES_DB = ["EASY", "MEDIUM", "HARD"] as const;

export type DifficultyDB = (typeof DIFFICULTIES_DB)[number];

export const DIFFICULTY_DISPLAY_TO_DB: Record<DifficultyDisplay, DifficultyDB> = {
  "Dễ": "EASY",
  "Trung bình": "MEDIUM",
  "Khó": "HARD",
};

export const DIFFICULTY_DB_TO_DISPLAY: Record<DifficultyDB, DifficultyDisplay> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

/** Map: cognitive level → difficulty (used in exam generator) */
export const COGNITIVE_TO_DIFFICULTY: Record<string, DifficultyDB> = {
  "Biết": "EASY",
  "Hiểu": "MEDIUM",
  "Vận dụng": "HARD",
  "Phân tích": "HARD",
  "Đánh giá": "HARD",
  "Sáng tạo": "HARD",
};

// ─── Exam Types ──────────────────────────────────────────────────────────────

export const EXAM_TYPES = [
  "Kiểm tra 15 phút",
  "Kiểm tra 1 tiết",
  "Kiểm tra giữa kỳ",
  "Kiểm tra học kỳ",
] as const;

export type ExamType = (typeof EXAM_TYPES)[number];

/** Suggested defaults per exam type */
export const EXAM_TYPE_PRESETS: Record<
  ExamType,
  { suggestedQuestions: number; suggestedDuration: number; mcqRatio: number }
> = {
  "Kiểm tra 15 phút": { suggestedQuestions: 12, suggestedDuration: 15, mcqRatio: 0.8 },
  "Kiểm tra 1 tiết": { suggestedQuestions: 28, suggestedDuration: 45, mcqRatio: 0.65 },
  "Kiểm tra giữa kỳ": { suggestedQuestions: 40, suggestedDuration: 90, mcqRatio: 0.6 },
  "Kiểm tra học kỳ": { suggestedQuestions: 50, suggestedDuration: 90, mcqRatio: 0.55 },
};

// ─── Question Status ─────────────────────────────────────────────────────────

export const QUESTION_STATUSES = ["Nháp", "Đã duyệt", "Lưu trữ"] as const;

export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

// ─── Matrix Section & Types ───────────────────────────────────────────────────

/** A column group in the matrix table (e.g. "PHẦN I - TN 4 lựa chọn") */
export interface MatrixSection {
  key: string        // question type key (TNKQ_Nhiều_lựa_chọn | TNKQ_Đúng_Sai | TNKQ_Trả_lời_ngắn | Tự_luận)
  label: string      // PHẦN I / PHẦN II / ...
  sublabel: string   // (TN 4 lựa chọn) / (TN đúng sai) / ...
}

/** Available question-type sections teachers can choose from */
export const AVAILABLE_SECTIONS: MatrixSection[] = [
  { key: "TNKQ_Nhiều_lựa_chọn", label: "PHẦN I",   sublabel: "(TN 4 lựa chọn)" },
  { key: "TNKQ_Đúng_Sai",        label: "PHẦN II",  sublabel: "(TN đúng sai)"   },
  { key: "TNKQ_Trả_lời_ngắn",    label: "PHẦN III", sublabel: "(Trả lời ngắn)"  },
  { key: "Tự_luận",               label: "PHẦN IV",  sublabel: "(Tự luận)"       },
];

/** Tailwind bg color class per section index (safe-listed, never dynamic) */
export const SECTION_COLOR_CLASSES = [
  "bg-blue-50/50",
  "bg-emerald-50/50",
  "bg-amber-50/50",
  "bg-purple-50/50",
] as const;

export interface MatrixTypeConfig {
  id: "type1" | "type2" | "type3" | "custom"
  name: string
  badge: string
  description: string
  sections: MatrixSection[]
  defaultSectionScores: Record<string, number>
}

/** All preset matrix types + custom */
export const MATRIX_TYPES: MatrixTypeConfig[] = [
  {
    id: "type1",
    name: "Loại 1",
    badge: "100% TNKQ",
    description:
      "Hoàn toàn trắc nghiệm — TN 4 lựa chọn + Đúng sai + Trả lời ngắn. Mẫu VL12 GKII 2025-2026.",
    sections: [
      { key: "TNKQ_Nhiều_lựa_chọn", label: "PHẦN I",   sublabel: "(TN 4 lựa chọn)"  },
      { key: "TNKQ_Đúng_Sai",        label: "PHẦN II",  sublabel: "(TN đúng sai)"    },
      { key: "TNKQ_Trả_lời_ngắn",    label: "PHẦN III", sublabel: "(Trả lời ngắn)"   },
    ],
    defaultSectionScores: {
      TNKQ_Nhiều_lựa_chọn: 4.5,
      TNKQ_Đúng_Sai: 4,
      TNKQ_Trả_lời_ngắn: 1.5,
    },
  },
  {
    id: "type2",
    name: "Loại 2",
    badge: "4 PHẦN",
    description:
      "Kết hợp 4 phần — TN 4 lựa chọn + Đúng sai + Trả lời ngắn + Tự luận. Mẫu VL10 GKII 2025-2026 v2.",
    sections: [
      { key: "TNKQ_Nhiều_lựa_chọn", label: "PHẦN I",   sublabel: "(TN 4 lựa chọn)" },
      { key: "TNKQ_Đúng_Sai",        label: "PHẦN II",  sublabel: "(TN đúng sai)"   },
      { key: "TNKQ_Trả_lời_ngắn",    label: "PHẦN III", sublabel: "(Trả lời ngắn)"  },
      { key: "Tự_luận",               label: "PHẦN IV",  sublabel: "(Tự luận)"       },
    ],
    defaultSectionScores: {
      TNKQ_Nhiều_lựa_chọn: 4,
      TNKQ_Đúng_Sai: 2,
      TNKQ_Trả_lời_ngắn: 2,
      Tự_luận: 2,
    },
  },
  {
    id: "type3",
    name: "Loại 3",
    badge: "3 PHẦN",
    description:
      "Chuẩn mới 2025 của Bộ GD-ĐT — TN 4 lựa chọn + Đúng sai + Tự luận. Mẫu VL10 GKII 2025-2026.",
    sections: [
      { key: "TNKQ_Nhiều_lựa_chọn", label: "PHẦN I",   sublabel: "(TN 4 lựa chọn)" },
      { key: "TNKQ_Đúng_Sai",        label: "PHẦN II",  sublabel: "(TN đúng sai)"   },
      { key: "Tự_luận",               label: "PHẦN III", sublabel: "(Tự luận)"       },
    ],
    defaultSectionScores: {
      TNKQ_Nhiều_lựa_chọn: 5,
      TNKQ_Đúng_Sai: 2,
      Tự_luận: 3,
    },
  },
  {
    id: "custom",
    name: "Tuỳ chỉnh",
    badge: "CUSTOM",
    description: "Giáo viên tự cấu hình các phần thi, nhãn và tỉ lệ điểm theo ý muốn",
    sections: [],
    defaultSectionScores: {},
  },
];
