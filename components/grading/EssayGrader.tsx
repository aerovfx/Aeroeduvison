/**
 * Essay Grader Component
 * Displays essay submission form and grading results
 */

"use client";

import { useState } from "react";
import { useGrading, useGradeDisplay, type GradingResult } from "@/hooks/useGrading";
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

interface EssayGraderProps {
  rubricId: string;
  subject?: string;
  sessionId?: string;
  title?: string;
  onGradeComplete?: (grade: GradingResult) => void;
}

/**
 * Submission form component
 */
function SubmissionForm({
  rubricId,
  subject,
  sessionId,
  title,
  onSubmit,
  isLoading,
}: EssayGraderProps & {
  onSubmit: (content: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [content, setContent] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (content.length < 50) {
      setError("Essay must be at least 50 characters");
      return;
    }

    try {
      await onSubmit(content);
      setContent("");
      setCharCount(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Submission failed"
      );
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setCharCount(value.length);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📝 Bài Essay/Bài Câu Trả Lời
        </label>
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          disabled={isLoading}
          placeholder="Viết câu trả lời của bạn... (tối thiểu 50 ký tự)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-vertical"
          rows={6}
        />
      </div>

      <div className="flex justify-between items-center text-sm">
        <div className="text-gray-600">
          {charCount > 0 && (
            <span>
              {charCount} ký tự {charCount < 50 ? `(${50 - charCount} thêm)` : "(✓)"}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={isLoading || charCount < 50}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 transition"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang chấm điểm...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Nộp & Chấm Điểm
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Lỗi</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Grading results display
 */
function GradingResultsDisplay({
  grade,
  isChecking,
  onReview,
}: {
  grade: GradingResult | null;
  isChecking: boolean;
  onReview?: (gradeId: string) => void;
}) {
  const display = useGradeDisplay(grade);

  if (isChecking) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Đang chấm điểm essay... Vui lòng chờ</p>
      </div>
    );
  }

  if (!grade) {
    return null;
  }

  const StatusIcon =
    grade.status === "pass"
      ? CheckCircle
      : grade.status === "needs_improvement"
        ? AlertTriangle
        : XCircle;
  const statusColorClass =
    grade.status === "pass"
      ? "text-green-600"
      : grade.status === "needs_improvement"
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Score Summary */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Kết Quả Chấm Điểm</h3>
          <StatusIcon className={`w-8 h-8 ${statusColorClass}`} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Điểm</p>
            <p className="text-3xl font-bold text-gray-900">
              {grade.finalScore.toFixed(1)}/{grade.percentage >= 70 ? "100" : "100"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Tỷ lệ %</p>
            <p className={`text-3xl font-bold ${display.statusColor === "green" ? "text-green-600" : display.statusColor === "yellow" ? "text-yellow-600" : "text-red-600"}`}>
              {grade.percentage.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-white rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Kết luận:</p>
          <p className={`text-base font-semibold ${statusColorClass}`}>
            {display.statusLabel}
          </p>
        </div>
      </div>

      {/* Overall Feedback */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Phản Hồi Chung</h4>
        <p className="text-gray-700">{grade.feedback}</p>
      </div>

      {/* Strengths */}
      {grade.strengths.length > 0 && (
        <div>
          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Điểm Mạnh
          </h4>
          <ul className="space-y-2">
            {grade.strengths.map((strength, idx) => (
              <li
                key={idx}
                className="p-3 bg-green-50 border-l-4 border-green-600 rounded-lg text-green-900"
              >
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas for Improvement */}
      {grade.improvements.length > 0 && (
        <div>
          <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Cần Cải Thiện
          </h4>
          <ul className="space-y-2">
            {grade.improvements.map((improvement, idx) => (
              <li
                key={idx}
                className="p-3 bg-yellow-50 border-l-4 border-yellow-600 rounded-lg text-yellow-900"
              >
                {improvement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grammar Issues */}
      {grade.grammarIssues.length > 0 && (
        <div>
          <h4 className="font-semibold text-red-900 mb-3">Vấn Đề Ngôn Ngữ</h4>
          <ul className="space-y-2">
            {grade.grammarIssues.map((issue, idx) => (
              <li
                key={idx}
                className="p-3 bg-red-50 border-l-4 border-red-600 rounded-lg text-red-900 text-sm"
              >
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Misconceptions */}
      {grade.conceptErrors.length > 0 && (
        <div>
          <h4 className="font-semibold text-red-900 mb-3">Lỗi Hiểu Biết</h4>
          <ul className="space-y-2">
            {grade.conceptErrors.map((error, idx) => (
              <li
                key={idx}
                className="p-3 bg-red-50 border-l-4 border-red-600 rounded-lg text-red-900 text-sm"
              >
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Concepts */}
      {grade.recommendedConcepts.length > 0 && (
        <div>
          <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Khái Niệm Nên Ôn Tập
          </h4>
          <div className="flex flex-wrap gap-2">
            {grade.recommendedConcepts.map((concept, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-indigo-100 text-indigo-900 rounded-full text-sm font-medium"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Score */}
      {grade.confidenceScore && (
        <div className="p-4 bg-gray-100 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Độ tin cậy của điểm:
          </span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${grade.confidenceScore * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {(grade.confidenceScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Essay Grader Component
 */
export function EssayGrader({
  rubricId,
  subject,
  sessionId,
  title,
  onGradeComplete,
}: EssayGraderProps) {
  const {
    submitForGrading,
    grade,
    isSubmitting,
    isChecking,
    error,
    clearSubmission,
  } = useGrading();

  const handleSubmit = async (content: string) => {
    try {
      await submitForGrading(rubricId, content, {
        title,
        subject,
        sessionId,
      });
    } catch (err) {
      console.error("Submission error:", err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Nộp Bài & Chấm Điểm</h2>
        <p className="text-gray-600 mt-2">
          {subject && <>Môn: {subject} • </>}
          {title && <>Bài: {title}</>}
        </p>
      </div>

      {!grade ? (
        <SubmissionForm
          rubricId={rubricId}
          subject={subject}
          sessionId={sessionId}
          title={title}
          onSubmit={handleSubmit}
          isLoading={isSubmitting || isChecking}
        />
      ) : (
        <GradingResultsDisplay
          grade={grade}
          isChecking={isChecking}
          onReview={() => {
            /* TODO: Implement review */
          }}
        />
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Lỗi</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {grade && (
        <button
          onClick={clearSubmission}
          className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
        >
          ← Nộp Bài Khác
        </button>
      )}
    </div>
  );
}

/**
 * Grade Card Component (for viewing past submissions)
 */
export function GradeCard({
  submissionId,
  title,
  submittedAt,
  grade,
}: {
  submissionId: string;
  title: string;
  submittedAt: Date;
  grade: GradingResult | null;
}) {
  const display = useGradeDisplay(grade);

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-600">
            {new Date(submittedAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {grade ? grade.finalScore.toFixed(1) : "-"}
          </p>
          <p
            className={`text-sm font-semibold ${
              display.statusColor === "green"
                ? "text-green-600"
                : display.statusColor === "yellow"
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}
          >
            {display.statusLabel}
          </p>
        </div>
      </div>

      {grade && (
        <div className="pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-700 line-clamp-2">{grade.feedback}</p>
        </div>
      )}
    </div>
  );
}
