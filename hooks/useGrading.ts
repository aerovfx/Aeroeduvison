/**
 * useGrading Hook
 * Client-side hook for essay grading functionality
 * 
 * Phase 3 Component: Frontend for essay submission and grading
 */

"use client";

import { useState, useCallback, useRef } from "react";

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

export interface SubmissionData {
  submissionId: string;
  status: "pending" | "grading" | "graded" | "failed";
  grade?: GradingResult;
  submittedAt: Date;
}

/**
 * Hook for essay grading
 */
export function useGrading() {
  const [currentSubmission, setCurrentSubmission] = useState<SubmissionData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState<GradingResult | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Submits essay for grading
   */
  const submitForGrading = useCallback(
    async (
      rubricId: string,
      content: string,
      options?: {
        title?: string;
        sessionId?: string;
        subject?: string;
        conceptIds?: string[];
      }
    ): Promise<string> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/grading/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            rubricId,
            content,
            title: options?.title,
            sessionId: options?.sessionId,
            subject: options?.subject,
            conceptIds: options?.conceptIds,
          }),
        });

        if (!response.ok) {
          throw new Error(`Submission failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Submission failed");
        }

        // Set initial submission
        const submission: SubmissionData = {
          submissionId: data.submissionId,
          status: "pending",
          submittedAt: new Date(),
        };

        setCurrentSubmission(submission);

        // Start polling for results
        pollForResults(data.submissionId);

        return data.submissionId;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Submission failed";
        setError(errorMsg);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  /**
   * Polls for grading results
   */
  const pollForResults = useCallback((submissionId: string) => {
    setIsChecking(true);

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch("/api/grading/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-results",
            submissionId,
          }),
        });

        if (response.status === 204) {
          // Still grading
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch results");
        }

        const data = await response.json();

        if (data.grade) {
          // Results ready
          setGrade(data.grade);
          setCurrentSubmission((prev) =>
            prev
              ? { ...prev, status: "graded", grade: data.grade }
              : null
          );

          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setIsChecking(false);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Poll every 2 seconds, max 30 attempts (1 minute)
    let attempts = 0;
    pollingRef.current = setInterval(() => {
      poll();
      attempts++;

      if (attempts >= 30) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        setIsChecking(false);
        setError("Grading timeout - please try again");
      }
    }, 2000);

    // Check immediately
    poll();
  }, []);

  /**
   * Gets grading results directly
   */
  const getGradingResults = useCallback(
    async (submissionId: string): Promise<GradingResult | null> => {
      setIsChecking(true);
      setError(null);

      try {
        const response = await fetch("/api/grading/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-results",
            submissionId,
          }),
        });

        if (response.status === 204) {
          return null;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch results");
        }

        const data = await response.json();
        setGrade(data.grade);
        return data.grade;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed";
        setError(errorMsg);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  /**
   * Creates a grading rubric
   */
  const createRubric = useCallback(
    async (rubricData: {
      name: string;
      subject: string;
      grade: string;
      criteria: Array<{
        criterion: string;
        description?: string;
        maxPoints?: number;
        weight?: number;
        examples?: string[];
      }>;
      description?: string;
      maxScore?: number;
      minPassingScore?: number;
    }): Promise<string> => {
      setError(null);

      try {
        const response = await fetch("/api/grading/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-rubric",
            ...rubricData,
          }),
        });

        if (!response.ok) {
          throw new Error(`Rubric creation failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Rubric creation failed");
        }

        return data.rubric.id;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed";
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  /**
   * Gets submissions for a rubric
   */
  const getSubmissions = useCallback(
    async (rubricId: string, userId?: string) => {
      setError(null);

      try {
        const params = new URLSearchParams({
          rubricId,
          action: "submissions",
          ...(userId && { userId }),
        });

        const response = await fetch(
          `/api/grading/grade?${params}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch submissions");
        }

        const data = await response.json();
        return data.submissions || [];
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed";
        setError(errorMsg);
        return [];
      }
    },
    []
  );

  /**
   * Gets rubric analytics
   */
  const getAnalytics = useCallback(async (rubricId: string) => {
    setError(null);

    try {
      const params = new URLSearchParams({
        rubricId,
        action: "analytics",
      });

      const response = await fetch(
        `/api/grading/grade?${params}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      return data.analytics || null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed";
      setError(errorMsg);
      return null;
    }
  }, []);

  /**
   * Reviews/adjusts a grade
   */
  const reviewGrade = useCallback(
    async (gradeId: string, adjustedScore?: number, notes?: string) => {
      setError(null);

      try {
        const response = await fetch("/api/grading/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "review",
            gradeId,
            adjustedScore,
            notes,
          }),
        });

        if (!response.ok) {
          throw new Error("Grade review failed");
        }

        const data = await response.json();
        return data.grade;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed";
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  /**
   * Clears current submission
   */
  const clearSubmission = useCallback(() => {
    setCurrentSubmission(null);
    setGrade(null);
    setError(null);

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup polling on unmount
  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  return {
    // Data
    currentSubmission,
    grade,
    isSubmitting,
    isChecking,
    error,

    // Methods
    submitForGrading,
    getGradingResults,
    createRubric,
    getSubmissions,
    getAnalytics,
    reviewGrade,
    clearSubmission,
    cleanup,

    // Derived
    isGrading: isSubmitting || isChecking,
    hasGrade: grade !== null,
    isPassing: grade && grade.status === "pass",
  };
}

/**
 * Hook for displaying grading results
 */
export function useGradeDisplay(grade: GradingResult | null) {
  const getStatusColor = () => {
    if (!grade) return "gray";
    if (grade.status === "pass") return "green";
    if (grade.status === "needs_improvement") return "yellow";
    return "red";
  };

  const getStatusLabel = () => {
    if (!grade) return "Not graded";
    if (grade.status === "pass") return "✓ Đạt";
    if (grade.status === "needs_improvement") return "⚠ Cần cải thiện";
    return "✗ Chưa đạt";
  };

  const getCriterionScore = (criterionId: string): number => {
    return grade?.criterionScores[criterionId] || 0;
  };

  const getCriterionFeedback = (criterionId: string): string => {
    return grade?.criterionFeedback[criterionId] || "";
  };

  return {
    statusColor: getStatusColor(),
    statusLabel: getStatusLabel(),
    getCriterionScore,
    getCriterionFeedback,
    scorePercentage: grade?.percentage || 0,
    isPassing: grade?.status === "pass",
  };
}
