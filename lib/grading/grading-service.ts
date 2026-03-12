/**
 * Advanced Grading Service
 * Grades essays/assignments using LLM with Knowledge Graph context
 * 
 * Phase 3 Component: Essay grading with rubric-based feedback
 */

import { prisma } from "@/lib/prisma";
import type {
  GradingRubric,
  RubricCriterion,
  StudentSubmission,
  SubmissionGrade,
} from "@prisma/client";

export interface GradingResult {
  finalScore: number;
  percentage: number;
  status: "pass" | "fail" | "needs_improvement";
  feedback: string;
  criterionScores: Record<string, number>;
  criterionFeedback: Record<string, string>;
  strengths: string[];
  improvements: string[];
  grammarIssues: string[];
  conceptErrors: string[];
  recommendedConcepts: string[];
  confidenceScore: number;
}

/**
 * Calls the analyst agent for grading
 */
async function callAnalystAgent(prompt: string): Promise<string> {
  const baseUrl = process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1";
  const model = process.env.OPENAI_MODEL || "edu-assistant:latest";

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `Bạn là Analyst thông minh của Aeroeduvison - chuyên gia chấm điểm bài tập.
            
HƯỚNG DẪN CHẤM ĐIỂM:
1. Đánh giá dựa trên rubric được cung cấp
2. Cho điểm chi tiết cho từng tiêu chí
3. Xác định các lỗi hiểu biết/khái niệm
4. Ghi nhận điểm mạnh của học sinh
5. Đưa ra phản hồi xây dựng bằng tiếng Việt
6. Gợi ý những khái niệm cần ôn tập
            `,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from LLM");
    }

    return content;
  } catch (error) {
    console.error("Analyst agent error:", error);
    throw error;
  }
}

/**
 * Creates a grading rubric with criteria
 */
export async function createRubric(
  name: string,
  subject: string,
  grade: string,
  criteria: Array<{
    criterion: string;
    description?: string;
    maxPoints?: number;
    weight?: number;
    examples?: string[];
  }>,
  options?: {
    createdBy?: string;
    maxScore?: number;
    minPassingScore?: number;
    description?: string;
  }
): Promise<GradingRubric> {
  const rubric = await prisma.gradingRubric.create({
    data: {
      name,
      subject,
      grade,
      description: options?.description,
      createdBy: options?.createdBy ?? "system",
      maxScore: options?.maxScore ?? 100,
      minPassingScore: options?.minPassingScore ?? 60,
    },
  });

  // Add criteria
  for (let i = 0; i < criteria.length; i++) {
    const crit = criteria[i];
    await prisma.rubricCriterion.create({
      data: {
        rubricId: rubric.id,
        criterion: crit.criterion,
        description: crit.description,
        maxPoints: crit.maxPoints ?? 10,
        weight: crit.weight ?? 1.0,
        order: i,
        examples: crit.examples ?? [],
      },
    });
  }

  return prisma.gradingRubric.findUniqueOrThrow({
    where: { id: rubric.id },
    include: { criteria: true },
  });
}

/**
 * Gets rubric with all criteria
 */
export async function getRubricWithCriteria(rubricId: string) {
  return prisma.gradingRubric.findUnique({
    where: { id: rubricId },
    include: { criteria: { orderBy: { order: "asc" } } },
  });
}

/**
 * Submits an essay for grading
 */
export async function submitForGrading(
  userId: string,
  rubricId: string,
  content: string,
  options?: {
    title?: string;
    sessionId?: string;
    conceptIds?: string[];
    subject?: string;
  }
): Promise<StudentSubmission> {
  return prisma.studentSubmission.create({
    data: {
      userId,
      rubricId,
      content,
      title: options?.title,
      sessionId: options?.sessionId,
      conceptIds: options?.conceptIds ?? [],
      subject: options?.subject,
      status: "pending",
    },
  });
}

/**
 * Grades a submission using analyst agent + KG context
 */
export async function gradeSubmission(
  submissionId: string
): Promise<GradingResult> {
  // Get submission and rubric
  const submission = await prisma.studentSubmission.findUnique({
    where: { id: submissionId },
    include: { rubric: { include: { criteria: true } } },
  });

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  if (!submission.rubric) {
    throw new Error(`Rubric not found for submission`);
  }

  // Update status
  await prisma.studentSubmission.update({
    where: { id: submissionId },
    data: { status: "grading" },
  });

  try {
    // Build grading prompt
    const rubric = submission.rubric;
    const criteriaText = rubric.criteria
      .map(
        (c) =>
          `- ${c.criterion} (Max ${c.maxPoints} points): ${c.description || "N/A"}`
      )
      .join("\n");

    const prompt = `You are an expert teacher and analyst. Grade the following student submission based on the rubric provided.

**RUBRIC (Total ${rubric.maxScore} points):**
${criteriaText}

**STUDENT SUBMISSION:**
Subject: ${submission.subject || "General"}
Title: ${submission.title || "Untitled"}

---
${submission.content}
---

**GRADING INSTRUCTIONS:**
1. Score each criterion based on the rubric (0 to max points)
2. Identify grammar issues
3. Identify misconceptions or conceptual errors
4. Highlight student strengths
5. Suggest improvements
6. Recommend which concepts to review

**RESPOND IN THIS EXACT Vietnamese FORMAT:**

ĐIỂM SỐ:
- [Criterion 1]: [score]/[max] - Phản hồi chi tiết
- [Criterion 2]: [score]/[max] - Phản hồi chi tiết
(Repeat for each criterion)

TỔNG ĐIỂM: [total]/[maxScore]

PHẢN HỒI CHUNG:
[Overall feedback in Vietnamese]

VẤNĐỀ NGÔN NGỮ:
- [Grammar issue 1]
- [Grammar issue 2]

LỖIHIỂU BIẾT:
- [Misconception 1]
- [Misconception 2]

ĐIỂM MẠNH:
- [Strength 1]
- [Strength 2]

CẦN CẢI THIỆN:
- [Improvement 1]
- [Improvement 2]

KHÁI NIỆM CẦN RÀO BỔNG:
- [Concept 1]
- [Concept 2]`;

    // Call analyst agent
    const response = await callAnalystAgent(prompt);

    // Parse response
    const result = parseGradingResponse(response, rubric.criteria, rubric.maxScore);

    // Save grade
    const grade = await prisma.submissionGrade.create({
      data: {
        submissionId,
        finalScore: result.finalScore,
        percentage: result.percentage,
        status: result.status,
        feedback: result.feedback,
        criterionScores: result.criterionScores,
        criterionFeedback: result.criterionFeedback,
        strengths: result.strengths,
        improvements: result.improvements,
        grammarIssues: result.grammarIssues,
        conceptErrors: result.conceptErrors,
        recommendedConcepts: result.recommendedConcepts,
        confidenceScore: result.confidenceScore,
        modelUsed: "open-fang-analyst",
      },
    });

    // Update submission status
    await prisma.studentSubmission.update({
      where: { id: submissionId },
      data: { status: "graded" },
    });

    return result;
  } catch (error) {
    // Mark as failed
    await prisma.studentSubmission.update({
      where: { id: submissionId },
      data: { status: "failed" },
    });

    throw error;
  }
}

/**
 * Parses grading response from LLM
 */
export function parseGradingResponse(
  response: string,
  criteria: Awaited<ReturnType<typeof prisma.rubricCriterion.findMany>>,
  maxScore: number
): GradingResult {
  const criterionScores: Record<string, number> = {};
  const criterionFeedback: Record<string, string> = {};
  let totalScore = 0;

  // Parse criterion scores
  const scoreRegex = /- ([^:]+):\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*-?\s*(.+?)(?=\n-|\nTỔNG|\nPHẢN|$)/gs;
  let match;

  while ((match = scoreRegex.exec(response)) !== null) {
    const criterionName = match[1].trim();
    const score = parseFloat(match[2]);
    const feedback = match[4].trim();

    // Find matching criterion ID
    const criterion = criteria.find((c) =>
      c.criterion.toLowerCase().includes(criterionName.toLowerCase())
    );

    if (criterion) {
      criterionScores[criterion.id] = score;
      criterionFeedback[criterion.id] = feedback;
      totalScore += score;
    }
  }

  // Extract total score if mentioned
  const totalScoreRegex = /TỔNG\s*ĐIỂM:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i;
  const totalMatch = response.match(totalScoreRegex);
  if (totalMatch) {
    totalScore = parseFloat(totalMatch[1]);
  }

  // Extract feedback
  const feedbackRegex = /PHẢN\s*HỒI\s*CHUNG:\s*(.+?)(?=\nVẤNĐỀ|LỖIHIỂU|$)/is;
  const feedbackMatch = response.match(feedbackRegex);
  const feedback = feedbackMatch ? feedbackMatch[1].trim() : "No feedback provided";

  // Extract grammar issues
  const grammarRegex = /VẤN\s*ĐỀ\s*NGÔN\s*NGỮ:\s*(.+?)(?=\nLỖI|ĐIỂM|$)/is;
  const grammarMatch = response.match(grammarRegex);
  const grammarIssues = extractList(grammarMatch?.[1] || "");

  // Extract misconceptions
  const conceptRegex = /[LỖ]{2}\s*HI?ỂU\s*BI?ẾT:\s*(.+?)(?=\nDIỂM|CẦN|$)/is;
  const conceptMatch = response.match(conceptRegex);
  const conceptErrors = extractList(conceptMatch?.[1] || "");

  // Extract strengths
  const strengthRegex = /ĐIỂM\s*MẠNH:\s*(.+?)(?=\nCẦN|KHÁI|$)/is;
  const strengthMatch = response.match(strengthRegex);
  const strengths = extractList(strengthMatch?.[1] || "");

  // Extract improvements
  const improvementRegex = /CẦN\s*CẢI\s*THIỆN:\s*(.+?)(?=\nKHÁI|$)/is;
  const improvementMatch = response.match(improvementRegex);
  const improvements = extractList(improvementMatch?.[1] || "");

  // Extract recommended concepts
  const conceptsRegex = /KHÁI\s*NI\s*ỆM\s*CẦN\s*[RÀ]/i;
  const conceptStartIdx = response.search(conceptsRegex);
  let recommendedConcepts: string[] = [];
  if (conceptStartIdx !== -1) {
    const conceptSection = response.substring(conceptStartIdx);
    recommendedConcepts = extractList(conceptSection);
  }

  // Calculate percentage and status
  const percentage = (totalScore / maxScore) * 100;
  const status =
    percentage >= 70 ? "pass" : percentage >= 50 ? "needs_improvement" : "fail";

  return {
    finalScore: totalScore,
    percentage: Math.round(percentage * 100) / 100,
    status,
    feedback,
    criterionScores,
    criterionFeedback,
    strengths,
    improvements,
    grammarIssues,
    conceptErrors,
    recommendedConcepts,
    confidenceScore: 0.85, // Default confidence
  };
}

/**
 * Helper to extract list items from text
 */
function extractList(text: string): string[] {
  if (!text) return [];

  return text
    .split("\n")
    .filter((line) => line.trim().startsWith("-") || line.trim().startsWith("•"))
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Gets grade for a submission
 */
export async function getSubmissionGrade(
  submissionId: string
): Promise<SubmissionGrade | null> {
  return prisma.submissionGrade.findUnique({
    where: { submissionId },
  });
}

/**
 * Gets all submissions for a rubric
 */
export async function getSubmissionsByRubric(
  rubricId: string,
  userId?: string
) {
  return prisma.studentSubmission.findMany({
    where: {
      rubricId,
      userId: userId,
    },
    include: { grade: true },
    orderBy: { submittedAt: "desc" },
  });
}

/**
 * Calculates rubric analytics
 */
export async function calculateRubricAnalytics(rubricId: string) {
  const submissions = await prisma.studentSubmission.findMany({
    where: { rubricId, status: "graded" },
    include: { grade: true },
  });

  if (submissions.length === 0) {
    return {
      totalSubmissions: 0,
      avgScore: 0,
      stdDeviation: 0,
      passRate: 0,
      commonMistakes: [],
      topStrengths: [],
    };
  }

  const scores = submissions
    .map((s) => s.grade?.finalScore || 0)
    .filter((score) => score > 0);

  const avgScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
        100
      : 0;

  const variance =
    scores.length > 0
      ? scores.reduce((sum, score) => sum * Math.pow(score - avgScore, 2), 0) /
        scores.length
      : 0;

  const stdDeviation = Math.sqrt(variance);
  const passRate = (
    (submissions.filter((s) => s.grade?.status === "pass").length /
      submissions.length) *
    100
  ).toFixed(2);

  // Aggregate common mistakes and strengths
  const mistakeMap: Record<string, number> = {};
  const strengthMap: Record<string, number> = {};

  submissions.forEach((sub) => {
    if (sub.grade) {
      sub.grade.conceptErrors.forEach((err) => {
        mistakeMap[err] = (mistakeMap[err] || 0) + 1;
      });
      sub.grade.strengths.forEach((str) => {
        strengthMap[str] = (strengthMap[str] || 0) + 1;
      });
    }
  });

  const commonMistakes = Object.entries(mistakeMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([mistake]) => mistake);

  const topStrengths = Object.entries(strengthMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([strength]) => strength);

  return {
    totalSubmissions: submissions.length,
    avgScore,
    stdDeviation,
    passRate: parseFloat(passRate),
    commonMistakes,
    topStrengths,
  };
}

/**
 * Human review of an automated grade
 */
export async function reviewGrade(
  gradeId: string,
  reviewedBy: string,
  adjustedScore?: number,
  notes?: string
) {
  const data: any = {
    isHumanReviewed: true,
    reviewedBy,
    reviewedAt: new Date(),
  };

  if (notes) data.reviewNotes = notes;
  if (adjustedScore !== undefined) {
    data.finalScore = adjustedScore;
    data.percentage = Math.round((adjustedScore / 100) * 10000) / 100;
  }

  return prisma.submissionGrade.update({
    where: { id: gradeId },
    data,
  });
}
