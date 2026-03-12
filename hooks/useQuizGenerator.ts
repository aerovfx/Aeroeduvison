/**
 * useQuizGenerator Hook
 * React hook for generating and validating quizzes
 */

'use client';

import { useState, useCallback } from 'react';
import type { Quiz } from '@/lib/validators/quiz-validator';

interface GenerateOptions {
  topic: string;
  subject: string;
  grade: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  additionalContext?: string;
  language?: 'vi' | 'en';
}

interface GenerateResponse {
  success: boolean;
  data?: {
    quiz: Quiz;
    quality: {
      score: number;
      isValid: boolean;
      issues: string[];
    };
    metadata: {
      generatedAt: string;
      generatedBy: string;
      generationTime: number;
      apiVersion: string;
    };
  };
  error?: string;
}

interface ValidateOptions {
  strict?: boolean;
}

interface ValidateResponse {
  success: boolean;
  data?: {
    quiz: Quiz;
    quality: {
      score: number;
      isValid: boolean;
      issues: string[];
    };
    validation: {
      passed: boolean;
      corrected: boolean;
      totalQuestions: number;
      questionTypes: string[];
      difficultyDistribution: {
        easy: number;
        medium: number;
        hard: number;
      };
      estimatedTime: number;
    };
  };
  error?: string;
  code?: string;
}

interface QuizGeneratorState {
  quiz: Quiz | null;
  isLoading: boolean;
  error: string | null;
  quality: { score: number; isValid: boolean; issues: string[] } | null;
}

export function useQuizGenerator() {
  const [state, setState] = useState<QuizGeneratorState>({
    quiz: null,
    isLoading: false,
    error: null,
    quality: null,
  });

  /**
   * Generate a new quiz
   */
  const generateQuiz = useCallback(
    async (options: GenerateOptions): Promise<boolean> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch('/api/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        });

        const data: GenerateResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate quiz');
        }

        setState(prev => ({
          ...prev,
          quiz: data.data?.quiz || null,
          quality: data.data?.quality || null,
          isLoading: false,
        }));

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        return false;
      }
    },
    []
  );

  /**
   * Validate a quiz
   */
  const validateQuiz = useCallback(
    async (quiz: unknown, options?: ValidateOptions): Promise<boolean> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch('/api/quiz/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz, ...options }),
        });

        const data: ValidateResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Validation failed');
        }

        setState(prev => ({
          ...prev,
          quiz: data.data?.quiz || null,
          quality: data.data?.quality || null,
          isLoading: false,
        }));

        return !!data.data?.quiz;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        return false;
      }
    },
    []
  );

  /**
   * Clear current quiz
   */
  const clearQuiz = useCallback(() => {
    setState({
      quiz: null,
      isLoading: false,
      error: null,
      quality: null,
    });
  }, []);

  /**
   * Export quiz as JSON
   */
  const exportQuiz = useCallback((): string | null => {
    if (!state.quiz) return null;
    return JSON.stringify(state.quiz, null, 2);
  }, [state.quiz]);

  /**
   * Get quality score percentage
   */
  const getQualityPercentage = useCallback((): number => {
    return state.quality?.score || 0;
  }, [state.quality]);

  /**
   * Check if quiz is valid
   */
  const isValid = useCallback((): boolean => {
    return !!state.quiz && (state.quality?.isValid ?? false);
  }, [state.quiz, state.quality]);

  return {
    // State
    quiz: state.quiz,
    isLoading: state.isLoading,
    error: state.error,
    quality: state.quality,

    // Methods
    generateQuiz,
    validateQuiz,
    clearQuiz,
    exportQuiz,
    getQualityPercentage,
    isValid,
  };
}

/**
 * Hook to use quiz from context or state
 */
export function useQuizData(quiz: Quiz | null) {
  const getTotalQuestions = useCallback(() => {
    return quiz?.questions.length ?? 0;
  }, [quiz]);

  const getQuestionByIndex = useCallback((index: number) => {
    return quiz?.questions[index] ?? null;
  }, [quiz]);

  const getDifficultyStats = useCallback(() => {
    if (!quiz) return { easy: 0, medium: 0, hard: 0 };
    return {
      easy: quiz.questions.filter(q => q.difficulty === 'easy').length,
      medium: quiz.questions.filter(q => q.difficulty === 'medium').length,
      hard: quiz.questions.filter(q => q.difficulty === 'hard').length,
    };
  }, [quiz]);

  const getEstimatedTime = useCallback(() => {
    return quiz?.metadata?.estimatedTime ?? (getTotalQuestions() * 1.5);
  }, [quiz, getTotalQuestions]);

  const getQuestionTypes = useCallback(() => {
    if (!quiz) return [];
    return [...new Set(quiz.questions.map(q => q.type))];
  }, [quiz]);

  return {
    getTotalQuestions,
    getQuestionByIndex,
    getDifficultyStats,
    getEstimatedTime,
    getQuestionTypes,
    title: quiz?.title,
    metadata: quiz?.metadata,
  };
}
