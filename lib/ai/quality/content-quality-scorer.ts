/**
 * Content Quality Scoring System
 * Evaluate quality of AI-generated educational content
 */

import { GeneratedLesson, GeneratedQuiz, GeneratedSlides } from '../services/content-generator';

export interface QualityScore {
  overall: number; // 0-100
  dimensions: {
    accuracy: number;
    completeness: number;
    clarity: number;
    engagement: number;
    appropriateness: number;
  };
  issues: QualityIssue[];
  recommendations: string[];
  needsReview: boolean;
}

export interface QualityIssue {
  type: 'accuracy' | 'completeness' | 'clarity' | 'formatting' | 'inappropriate';
  severity: 'low' | 'medium' | 'high';
  message: string;
  location?: string;
}

export class ContentQualityScorer {
  /**
   * Score a lesson
   */
  scoreLesson(lesson: GeneratedLesson, context: {
    subject: string;
    grade: string;
    topic: string;
  }): QualityScore {
    const issues: QualityIssue[] = [];
    const scores = {
      accuracy: 100,
      completeness: 100,
      clarity: 100,
      engagement: 100,
      appropriateness: 100,
    };

    // 1. Check completeness
    if (!lesson.objectives || lesson.objectives.length === 0) {
      issues.push({
        type: 'completeness',
        severity: 'high',
        message: 'Missing learning objectives',
      });
      scores.completeness -= 30;
    } else if (lesson.objectives.length < 3) {
      issues.push({
        type: 'completeness',
        severity: 'medium',
        message: 'Too few learning objectives (recommended: 3-5)',
      });
      scores.completeness -= 15;
    }

    if (!lesson.content || lesson.content.length < 500) {
      issues.push({
        type: 'completeness',
        severity: 'high',
        message: 'Content is too short (minimum 500 characters)',
      });
      scores.completeness -= 40;
    }

    if (!lesson.exercises || lesson.exercises.length === 0) {
      issues.push({
        type: 'completeness',
        severity: 'medium',
        message: 'Missing practice exercises',
      });
      scores.completeness -= 20;
    }

    if (!lesson.summary || lesson.summary.length < 50) {
      issues.push({
        type: 'completeness',
        severity: 'low',
        message: 'Missing or inadequate summary',
      });
      scores.completeness -= 10;
    }

    // 2. Check clarity
    const avgSentenceLength = this.calculateAverageSentenceLength(lesson.content);
    if (avgSentenceLength > 30) {
      issues.push({
        type: 'clarity',
        severity: 'medium',
        message: 'Sentences are too long (may affect readability)',
      });
      scores.clarity -= 15;
    }

    const readabilityScore = this.calculateReadabilityScore(lesson.content, context.grade);
    if (readabilityScore < 60) {
      issues.push({
        type: 'clarity',
        severity: 'medium',
        message: 'Content may be too complex for target grade level',
      });
      scores.clarity -= 20;
    }

    // 3. Check engagement
    const hasExamples = /ví dụ|example|for instance/i.test(lesson.content);
    if (!hasExamples) {
      issues.push({
        type: 'engagement',
        severity: 'medium',
        message: 'Missing practical examples',
      });
      scores.engagement -= 20;
    }

    const hasVisualCues = /```|##|###|\*\*/g.test(lesson.content);
    if (!hasVisualCues) {
      issues.push({
        type: 'engagement',
        severity: 'low',
        message: 'Limited use of formatting for visual engagement',
      });
      scores.engagement -= 10;
    }

    // 4. Check appropriateness
    const hasInappropriateContent = this.checkInappropriateContent(lesson.content);
    if (hasInappropriateContent.length > 0) {
      hasInappropriateContent.forEach(issue => {
        issues.push({
          type: 'inappropriate',
          severity: 'high',
          message: issue,
        });
        scores.appropriateness -= 50;
      });
    }

    // 5. Check accuracy (basic checks)
    const hasMathErrors = this.checkMathErrors(lesson.content);
    if (hasMathErrors.length > 0) {
      hasMathErrors.forEach(error => {
        issues.push({
          type: 'accuracy',
          severity: 'high',
          message: `Potential math error: ${error}`,
        });
        scores.accuracy -= 20;
      });
    }

    const overall = Object.values(scores).reduce((a, b) => a + b, 0) / 5;

    return {
      overall: Math.max(0, Math.min(100, overall)),
      dimensions: {
        accuracy: Math.max(0, scores.accuracy),
        completeness: Math.max(0, scores.completeness),
        clarity: Math.max(0, scores.clarity),
        engagement: Math.max(0, scores.engagement),
        appropriateness: Math.max(0, scores.appropriateness),
      },
      issues,
      recommendations: this.generateRecommendations(issues, scores),
      needsReview: overall < 70 || issues.some(i => i.severity === 'high'),
    };
  }

  /**
   * Score a quiz
   */
  scoreQuiz(quiz: GeneratedQuiz, context: {
    subject: string;
    grade: string;
    topic: string;
  }): QualityScore {
    const issues: QualityIssue[] = [];
    const scores = {
      accuracy: 100,
      completeness: 100,
      clarity: 100,
      engagement: 100,
      appropriateness: 100,
    };

    // 1. Check completeness
    if (!quiz.questions || quiz.questions.length < 5) {
      issues.push({
        type: 'completeness',
        severity: 'high',
        message: `Too few questions (${quiz.questions?.length || 0}/10 recommended)`,
      });
      scores.completeness -= 40;
    }

    quiz.questions?.forEach((q, index) => {
      // Check question structure
      if (!q.question || q.question.length < 10) {
        issues.push({
          type: 'completeness',
          severity: 'high',
          message: `Question ${index + 1}: Question text is missing or too short`,
          location: `Question ${index + 1}`,
        });
        scores.completeness -= 5;
      }

      if (!q.options || q.options.length !== 4) {
        issues.push({
          type: 'completeness',
          severity: 'high',
          message: `Question ${index + 1}: Must have exactly 4 options`,
          location: `Question ${index + 1}`,
        });
        scores.completeness -= 10;
      }

      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) {
        issues.push({
          type: 'accuracy',
          severity: 'high',
          message: `Question ${index + 1}: Invalid correct answer index`,
          location: `Question ${index + 1}`,
        });
        scores.accuracy -= 10;
      }

      if (!q.explanation || q.explanation.length < 20) {
        issues.push({
          type: 'completeness',
          severity: 'medium',
          message: `Question ${index + 1}: Missing or inadequate explanation`,
          location: `Question ${index + 1}`,
        });
        scores.completeness -= 5;
      }

      // Check for duplicate options
      const uniqueOptions = new Set(q.options?.map(o => o.toLowerCase()));
      if (uniqueOptions.size < (q.options?.length || 0)) {
        issues.push({
          type: 'accuracy',
          severity: 'medium',
          message: `Question ${index + 1}: Duplicate answer options detected`,
          location: `Question ${index + 1}`,
        });
        scores.accuracy -= 5;
      }
    });

    // 2. Check difficulty distribution
    if (quiz.questions?.length >= 5) {
      const difficulties = quiz.questions.map(q => q.difficulty || 'medium');
      const easy = difficulties.filter(d => d === 'easy').length;
      const medium = difficulties.filter(d => d === 'medium').length;
      const hard = difficulties.filter(d => d === 'hard').length;

      const total = quiz.questions.length;
      const distribution = {
        easy: (easy / total) * 100,
        medium: (medium / total) * 100,
        hard: (hard / total) * 100,
      };

      // Ideal: 40% easy, 40% medium, 20% hard
      if (distribution.easy < 20 || distribution.easy > 60) {
        issues.push({
          type: 'appropriateness',
          severity: 'low',
          message: `Difficulty distribution may not be optimal (easy: ${distribution.easy.toFixed(0)}%)`,
        });
        scores.appropriateness -= 10;
      }
    }

    const overall = Object.values(scores).reduce((a, b) => a + b, 0) / 5;

    return {
      overall: Math.max(0, Math.min(100, overall)),
      dimensions: {
        accuracy: Math.max(0, scores.accuracy),
        completeness: Math.max(0, scores.completeness),
        clarity: Math.max(0, scores.clarity),
        engagement: Math.max(0, scores.engagement),
        appropriateness: Math.max(0, scores.appropriateness),
      },
      issues,
      recommendations: this.generateRecommendations(issues, scores),
      needsReview: overall < 70 || issues.some(i => i.severity === 'high'),
    };
  }

  /**
   * Score slides
   */
  scoreSlides(slides: GeneratedSlides): QualityScore {
    const issues: QualityIssue[] = [];
    const scores = {
      accuracy: 100,
      completeness: 100,
      clarity: 100,
      engagement: 100,
      appropriateness: 100,
    };

    if (!slides.slides || slides.slides.length < 5) {
      issues.push({
        type: 'completeness',
        severity: 'medium',
        message: 'Too few slides (recommended: 8-12)',
      });
      scores.completeness -= 20;
    }

    slides.slides?.forEach((slide, index) => {
      if (!slide.title || slide.title.length < 3) {
        issues.push({
          type: 'completeness',
          severity: 'medium',
          message: `Slide ${index + 1}: Missing or inadequate title`,
          location: `Slide ${index + 1}`,
        });
        scores.completeness -= 5;
      }

      if (!slide.content || slide.content.length < 20) {
        issues.push({
          type: 'completeness',
          severity: 'medium',
          message: `Slide ${index + 1}: Insufficient content`,
          location: `Slide ${index + 1}`,
        });
        scores.completeness -= 5;
      }

      // Check bullet point count
      const bulletPoints = slide.content.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'));
      if (bulletPoints.length > 7) {
        issues.push({
          type: 'clarity',
          severity: 'medium',
          message: `Slide ${index + 1}: Too many bullet points (${bulletPoints.length}), recommended max: 7`,
          location: `Slide ${index + 1}`,
        });
        scores.clarity -= 5;
      }
    });

    const overall = Object.values(scores).reduce((a, b) => a + b, 0) / 5;

    return {
      overall: Math.max(0, Math.min(100, overall)),
      dimensions: {
        accuracy: Math.max(0, scores.accuracy),
        completeness: Math.max(0, scores.completeness),
        clarity: Math.max(0, scores.clarity),
        engagement: Math.max(0, scores.engagement),
        appropriateness: Math.max(0, scores.appropriateness),
      },
      issues,
      recommendations: this.generateRecommendations(issues, scores),
      needsReview: overall < 70 || issues.some(i => i.severity === 'high'),
    };
  }

  /**
   * Calculate average sentence length
   */
  private calculateAverageSentenceLength(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = sentences.flatMap(s => s.split(/\s+/));
    return sentences.length > 0 ? words.length / sentences.length : 0;
  }

  /**
   * Calculate readability score (simplified Flesch-Kincaid)
   */
  private calculateReadabilityScore(text: string, grade: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 50;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease
    const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in a word (approximate)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = word.match(/[aeiouy]+/g);
    return vowels ? vowels.length : 1;
  }

  /**
   * Check for inappropriate content
   */
  private checkInappropriateContent(text: string): string[] {
    const issues: string[] = [];

    // Basic checks (would be enhanced with NLP in production)
    const inappropriatePatterns = [
      /\b(hate|violence|discrimination)\b/i,
      /\b(fuck|shit|damn)\b/i,
    ];

    inappropriatePatterns.forEach(pattern => {
      if (pattern.test(text)) {
        issues.push(`Potentially inappropriate language detected`);
      }
    });

    return issues;
  }

  /**
   * Check for basic math errors
   */
  private checkMathErrors(text: string): string[] {
    const errors: string[] = [];

    // Check for common patterns like "2 + 2 = 5"
    const mathExpressions = text.match(/(\d+)\s*([+\-*/])\s*(\d+)\s*=\s*(\d+)/g);

    if (mathExpressions) {
      mathExpressions.forEach(expr => {
        const match = expr.match(/(\d+)\s*([+\-*/])\s*(\d+)\s*=\s*(\d+)/);
        if (match) {
          const [, a, op, b, result] = match;
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          const numResult = parseFloat(result);

          let expected: number;
          switch (op) {
            case '+': expected = numA + numB; break;
            case '-': expected = numA - numB; break;
            case '*': expected = numA * numB; break;
            case '/': expected = numA / numB; break;
            default: return;
          }

          if (Math.abs(expected - numResult) > 0.01) {
            errors.push(`${expr} (expected ${expected})`);
          }
        }
      });
    }

    return errors;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(issues: QualityIssue[], scores: Record<string, number>): string[] {
    const recommendations: string[] = [];

    if (scores.completeness < 80) {
      recommendations.push('Add more comprehensive content to cover all key points');
      recommendations.push('Include practical examples and exercises');
    }

    if (scores.clarity < 80) {
      recommendations.push('Simplify complex sentences for better readability');
      recommendations.push('Use more visual formatting (headings, bullet points)');
    }

    if (scores.engagement < 80) {
      recommendations.push('Add real-world examples to increase engagement');
      recommendations.push('Include interactive elements or questions');
    }

    if (scores.accuracy < 90) {
      recommendations.push('Review content for factual accuracy');
      recommendations.push('Double-check all calculations and formulas');
    }

    if (issues.some(i => i.severity === 'high')) {
      recommendations.push('Address high-severity issues before using this content');
    }

    return recommendations;
  }
}

/**
 * Create default quality scorer
 */
export function createContentQualityScorer(): ContentQualityScorer {
  return new ContentQualityScorer();
}
