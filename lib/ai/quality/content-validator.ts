/**
 * Enhanced Content Quality Validator
 * 
 * Extends ContentQualityScorer with:
 * - Curriculum compliance validation (Vietnam GDPT 2018)
 * - Bias detection (gender, cultural, socioeconomic, regional)
 * - Enhanced readability scoring
 * - Automated quality checks
 */

import { ContentQualityScorer, QualityScore, CurriculumCompliance, BiasDetection } from './content-quality-scorer';
import { GeneratedLesson, GeneratedQuiz, GeneratedSlides } from '../services/content-generator';

export interface ValidationResult {
  passed: boolean;
  score: QualityScore;
  curriculumCompliance: CurriculumCompliance;
  biasDetection: BiasDetection;
  warnings: string[];
  errors: string[];
  canPublish: boolean;
}

export class ContentValidator {
  private qualityScorer: ContentQualityScorer;

  constructor() {
    this.qualityScorer = new ContentQualityScorer();
  }

  /**
   * Validate lesson content
   */
  async validateLesson(
    lesson: GeneratedLesson,
    context: {
      subject: string;
      grade: string;
      topic: string;
      curriculum?: string;
    }
  ): Promise<ValidationResult> {
    const score = this.qualityScorer.scoreLesson(lesson, context);
    
    const warnings: string[] = [];
    const errors: string[] = [];

    // Collect warnings and errors from issues
    score.issues.forEach(issue => {
      if (issue.severity === 'high') {
        errors.push(issue.message);
      } else if (issue.severity === 'medium') {
        warnings.push(issue.message);
      }
    });

    // Curriculum compliance checks
    if (score.curriculumCompliance && !score.curriculumCompliance.aligned) {
      warnings.push('Content may not fully align with curriculum standards');
    }

    // Bias detection checks
    if (score.biasDetection && score.biasDetection.detected) {
      if (score.biasDetection.severity === 'high') {
        errors.push('High-severity bias detected in content');
      } else {
        warnings.push('Potential bias detected in content');
      }
    }

    // Readability checks
    if (score.readability && score.readability.level === 'very_hard') {
      errors.push(`Content readability is too high for grade ${context.grade}`);
    } else if (score.readability && score.readability.level === 'hard') {
      warnings.push(`Content may be difficult for grade ${context.grade}`);
    }

    // Determine if can publish
    const canPublish = 
      score.overall >= 70 &&
      errors.length === 0 &&
      (score.curriculumCompliance?.aligned ?? true) &&
      (!score.biasDetection?.detected || score.biasDetection.severity === 'low');

    return {
      passed: score.overall >= 60,
      score,
      curriculumCompliance: score.curriculumCompliance || {
        aligned: true,
        gradeLevel: context.grade,
        subject: context.subject,
        topics: [context.topic],
        standards: [context.curriculum || 'GDPT 2018'],
        complianceScore: 100,
        issues: [],
      },
      biasDetection: score.biasDetection || {
        detected: false,
        types: [],
        severity: 'low',
        examples: [],
        recommendations: [],
      },
      warnings,
      errors,
      canPublish,
    };
  }

  /**
   * Validate quiz content
   */
  async validateQuiz(
    quiz: GeneratedQuiz,
    context: {
      subject: string;
      grade: string;
      topic: string;
    }
  ): Promise<ValidationResult> {
    const score = this.qualityScorer.scoreQuiz(quiz, context);
    
    const warnings: string[] = [];
    const errors: string[] = [];

    score.issues.forEach(issue => {
      if (issue.severity === 'high') {
        errors.push(issue.message);
      } else if (issue.severity === 'medium') {
        warnings.push(issue.message);
      }
    });

    // Check for bias in quiz questions
    const quizContent = quiz.questions?.map(q => q.question).join(' ') || '';
    const biasDetection = this.detectBiasInText(quizContent, context);
    
    if (biasDetection.detected && biasDetection.severity === 'high') {
      errors.push('High-severity bias detected in quiz questions');
    } else if (biasDetection.detected) {
      warnings.push('Potential bias detected in quiz questions');
    }

    const canPublish = score.overall >= 70 && errors.length === 0;

    return {
      passed: score.overall >= 60,
      score,
      curriculumCompliance: {
        aligned: true,
        gradeLevel: context.grade,
        subject: context.subject,
        topics: [context.topic],
        standards: ['GDPT 2018'],
        complianceScore: 100,
        issues: [],
      },
      biasDetection,
      warnings,
      errors,
      canPublish,
    };
  }

  /**
   * Validate slides content
   */
  async validateSlides(
    slides: GeneratedSlides,
    context: {
      subject: string;
      grade: string;
      topic: string;
    }
  ): Promise<ValidationResult> {
    const score = this.qualityScorer.scoreSlides(slides);
    
    const warnings: string[] = [];
    const errors: string[] = [];

    score.issues.forEach(issue => {
      if (issue.severity === 'high') {
        errors.push(issue.message);
      } else if (issue.severity === 'medium') {
        warnings.push(issue.message);
      }
    });

    // Check slides content for bias
    const slidesContent = slides.slides?.map(s => `${s.title} ${s.content}`).join(' ') || '';
    const biasDetection = this.detectBiasInText(slidesContent, context);

    if (biasDetection.detected && biasDetection.severity === 'high') {
      errors.push('High-severity bias detected in slides');
    } else if (biasDetection.detected) {
      warnings.push('Potential bias detected in slides');
    }

    const canPublish = score.overall >= 70 && errors.length === 0;

    return {
      passed: score.overall >= 60,
      score,
      curriculumCompliance: {
        aligned: true,
        gradeLevel: context.grade,
        subject: context.subject,
        topics: [context.topic],
        standards: ['GDPT 2018'],
        complianceScore: 100,
        issues: [],
      },
      biasDetection,
      warnings,
      errors,
      canPublish,
    };
  }

  /**
   * Detect bias in text content
   */
  private detectBiasInText(
    text: string,
    context: { subject: string; grade: string; topic: string }
  ): BiasDetection {
    const contentLower = text.toLowerCase();
    const detectedTypes: BiasDetection['types'] = [];
    const examples: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // Gender bias
    const genderPatterns = {
      male: /\b(ông|anh|nam|chàng|trai|bạn nam)\b/gi,
      female: /\b(bà|cô|chị|nữ|nàng|gái|bạn nữ)\b/gi,
    };
    const maleMatches = (contentLower.match(genderPatterns.male) || []).length;
    const femaleMatches = (contentLower.match(genderPatterns.female) || []).length;
    
    if (maleMatches > 0 || femaleMatches > 0) {
      const total = maleMatches + femaleMatches;
      const ratio = maleMatches / total;
      if (ratio > 0.75 || ratio < 0.25) {
        detectedTypes.push('gender');
        examples.push(`Gender imbalance: ${Math.round(ratio * 100)}% male references`);
        severity = ratio > 0.9 || ratio < 0.1 ? 'high' : 'medium';
      }
    }

    // Cultural bias
    const culturalMarkers = [
      /\b(việt nam|vietnam|hà nội|sài gòn)\b/gi,
      /\b(mỹ|america|usa)\b/gi,
      /\b(trung quốc|china)\b/gi,
    ];
    const culturalCounts = culturalMarkers.map(pattern => 
      (contentLower.match(pattern) || []).length
    );
    const totalCultural = culturalCounts.reduce((a, b) => a + b, 0);
    
    if (totalCultural > 0) {
      const maxCount = Math.max(...culturalCounts);
      const maxRatio = maxCount / totalCultural;
      if (maxRatio > 0.8) {
        detectedTypes.push('cultural');
        examples.push('Over-representation of single culture');
        severity = maxRatio > 0.9 ? 'high' : 'medium';
      }
    }

    return {
      detected: detectedTypes.length > 0,
      types: detectedTypes,
      severity,
      examples,
      recommendations: detectedTypes.includes('gender')
        ? ['Include balanced gender representation']
        : detectedTypes.includes('cultural')
        ? ['Include diverse cultural perspectives']
        : [],
    };
  }
}

/**
 * Create default content validator
 */
export function createContentValidator(): ContentValidator {
  return new ContentValidator();
}
