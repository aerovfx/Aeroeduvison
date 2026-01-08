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
    curriculumCompliance?: number; // 0-100
    biasFree?: number; // 0-100
  };
  issues: QualityIssue[];
  recommendations: string[];
  needsReview: boolean;
  curriculumCompliance?: CurriculumCompliance;
  biasDetection?: BiasDetection;
  readability?: {
    score: number; // 0-100
    level: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
    avgSentenceLength: number;
    avgWordsPerSentence: number;
    gradeLevel: string;
  };
}

export interface QualityIssue {
  type: 'accuracy' | 'completeness' | 'clarity' | 'formatting' | 'inappropriate' | 'curriculum' | 'bias';
  severity: 'low' | 'medium' | 'high';
  message: string;
  location?: string;
}

export interface CurriculumCompliance {
  aligned: boolean;
  gradeLevel: string;
  subject: string;
  topics: string[];
  standards: string[];
  complianceScore: number; // 0-100
  issues: string[];
}

export interface BiasDetection {
  detected: boolean;
  types: ('gender' | 'cultural' | 'socioeconomic' | 'regional' | 'other')[];
  severity: 'low' | 'medium' | 'high';
  examples: string[];
  recommendations: string[];
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
    const scores: {
      accuracy: number;
      completeness: number;
      clarity: number;
      engagement: number;
      appropriateness: number;
      curriculumCompliance?: number;
      biasFree?: number;
    } = {
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
    const readability = this.getReadabilityDetails(lesson.content, context.grade);
    if (readabilityScore < 60) {
      issues.push({
        type: 'clarity',
        severity: 'medium',
        message: `Content may be too complex for target grade level (readability: ${readability.level})`,
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

    // 6. Check curriculum compliance
    const curriculumCompliance = this.checkCurriculumCompliance(lesson, context);
    if (!curriculumCompliance.aligned) {
      curriculumCompliance.issues.forEach(issue => {
        issues.push({
          type: 'curriculum',
          severity: 'high',
          message: issue,
        });
      });
      scores.curriculumCompliance = curriculumCompliance.complianceScore;
    } else {
      scores.curriculumCompliance = 100;
    }

    // 7. Check for bias
    const biasDetection = this.detectBias(lesson.content, context);
    if (biasDetection.detected) {
      biasDetection.types.forEach(type => {
        issues.push({
          type: 'bias',
          severity: biasDetection.severity,
          message: `Potential ${type} bias detected`,
        });
      });
      scores.biasFree = biasDetection.severity === 'high' ? 50 : biasDetection.severity === 'medium' ? 70 : 85;
    } else {
      scores.biasFree = 100;
    }

    // Calculate overall score (weighted average)
    const weights = {
      accuracy: 0.25,
      completeness: 0.20,
      clarity: 0.20,
      engagement: 0.15,
      appropriateness: 0.10,
      curriculumCompliance: 0.05,
      biasFree: 0.05,
    };
    
    const overall = 
      scores.accuracy * weights.accuracy +
      scores.completeness * weights.completeness +
      scores.clarity * weights.clarity +
      scores.engagement * weights.engagement +
      scores.appropriateness * weights.appropriateness +
      (scores.curriculumCompliance || 100) * weights.curriculumCompliance +
      (scores.biasFree || 100) * weights.biasFree;

    return {
      overall: Math.max(0, Math.min(100, overall)),
      dimensions: {
        accuracy: Math.max(0, scores.accuracy),
        completeness: Math.max(0, scores.completeness),
        clarity: Math.max(0, scores.clarity),
        engagement: Math.max(0, scores.engagement),
        appropriateness: Math.max(0, scores.appropriateness),
        curriculumCompliance: scores.curriculumCompliance || 100,
        biasFree: scores.biasFree || 100,
      },
      issues,
      recommendations: this.generateRecommendations(issues, scores),
      needsReview: overall < 70 || issues.some(i => i.severity === 'high'),
      curriculumCompliance,
      biasDetection,
      readability,
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

    if (scores.curriculumCompliance && scores.curriculumCompliance < 80) {
      recommendations.push('Review content alignment with curriculum standards');
      recommendations.push('Ensure topics match grade-level expectations');
    }

    if (scores.biasFree && scores.biasFree < 90) {
      recommendations.push('Review content for potential bias');
      recommendations.push('Ensure examples represent diverse perspectives');
    }

    if (issues.some(i => i.severity === 'high')) {
      recommendations.push('Address high-severity issues before using this content');
    }

    return recommendations;
  }

  /**
   * Check curriculum compliance (Vietnam GDPT 2018)
   */
  private checkCurriculumCompliance(
    lesson: GeneratedLesson,
    context: { subject: string; grade: string; topic: string }
  ): CurriculumCompliance {
    const issues: string[] = [];
    let complianceScore = 100;

    // Grade level validation
    const gradeNum = parseInt(context.grade.replace(/\D/g, ''));
    if (isNaN(gradeNum) || gradeNum < 6 || gradeNum > 12) {
      issues.push(`Invalid grade level: ${context.grade}`);
      complianceScore -= 20;
    }

    // Subject validation
    const validSubjects = [
      'Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Ngữ văn',
      'Lịch sử', 'Địa lý', 'Giáo dục công dân', 'Tiếng Anh',
      'Công nghệ', 'Tin học', 'Thể dục', 'Mỹ thuật', 'Âm nhạc'
    ];
    if (!validSubjects.some(s => context.subject.includes(s))) {
      issues.push(`Subject may not align with curriculum: ${context.subject}`);
      complianceScore -= 15;
    }

    // Check for curriculum keywords
    const curriculumKeywords = [
      'GDPT 2018', 'chương trình giáo dục phổ thông',
      'năng lực', 'phẩm chất', 'kiến thức', 'kỹ năng'
    ];
    const hasCurriculumKeywords = curriculumKeywords.some(keyword =>
      lesson.content.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!hasCurriculumKeywords && lesson.content.length > 500) {
      issues.push('Content may not explicitly reference curriculum standards');
      complianceScore -= 10;
    }

    // Check learning objectives format (SMART)
    if (lesson.objectives) {
      const smartKeywords = ['hiểu', 'phân tích', 'áp dụng', 'đánh giá', 'tạo ra'];
      const hasSmartObjectives = lesson.objectives.some(obj =>
        smartKeywords.some(keyword => obj.toLowerCase().includes(keyword))
      );
      if (!hasSmartObjectives) {
        issues.push('Learning objectives may not follow SMART format');
        complianceScore -= 10;
      }
    }

    return {
      aligned: complianceScore >= 80,
      gradeLevel: context.grade,
      subject: context.subject,
      topics: [context.topic],
      standards: ['GDPT 2018'],
      complianceScore: Math.max(0, Math.min(100, complianceScore)),
      issues,
    };
  }

  /**
   * Detect bias in content
   */
  private detectBias(
    content: string,
    context: { subject: string; grade: string; topic: string }
  ): BiasDetection {
    const detectedTypes: BiasDetection['types'] = [];
    const examples: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    const contentLower = content.toLowerCase();

    // Gender bias detection
    const genderPatterns = {
      male: /\b(ông|anh|nam|chàng|trai|bạn nam)\b/gi,
      female: /\b(bà|cô|chị|nữ|nàng|gái|bạn nữ)\b/gi,
    };
    const maleMatches = (contentLower.match(genderPatterns.male) || []).length;
    const femaleMatches = (contentLower.match(genderPatterns.female) || []).length;
    
    if (maleMatches > 0 || femaleMatches > 0) {
      const ratio = maleMatches / (maleMatches + femaleMatches);
      if (ratio > 0.75 || ratio < 0.25) {
        detectedTypes.push('gender');
        examples.push(`Gender representation imbalance: ${Math.round(ratio * 100)}% male, ${Math.round((1 - ratio) * 100)}% female`);
        severity = ratio > 0.9 || ratio < 0.1 ? 'high' : 'medium';
      }
    }

    // Cultural bias detection (check for diverse examples)
    const culturalMarkers = [
      /\b(việt nam|vietnam|hà nội|sài gòn|hồ chí minh)\b/gi,
      /\b(mỹ|america|usa|new york|los angeles)\b/gi,
      /\b(trung quốc|china|beijing|shanghai)\b/gi,
      /\b(nhật bản|japan|tokyo|osaka)\b/gi,
    ];
    const culturalMatches = culturalMarkers.map(pattern => 
      (contentLower.match(pattern) || []).length
    );
    const totalCultural = culturalMatches.reduce((a, b) => a + b, 0);
    
    if (totalCultural > 0) {
      const maxCultural = Math.max(...culturalMatches);
      const maxRatio = maxCultural / totalCultural;
      if (maxRatio > 0.8) {
        detectedTypes.push('cultural');
        examples.push('Content may over-represent a single culture');
        severity = maxRatio > 0.9 ? 'high' : 'medium';
      }
    }

    // Socioeconomic bias (check for expensive/elite examples)
    const socioeconomicMarkers = [
      /\b(xe hơi|ô tô|du lịch nước ngoài|nhà lầu|biệt thự)\b/gi,
      /\b(giàu có|thượng lưu|quý tộc)\b/gi,
    ];
    const socioeconomicMatches = socioeconomicMarkers.some(pattern =>
      pattern.test(contentLower)
    );
    if (socioeconomicMatches && !contentLower.includes('ví dụ') && !contentLower.includes('example')) {
      detectedTypes.push('socioeconomic');
      examples.push('Content may assume higher socioeconomic background');
      severity = 'medium';
    }

    // Regional bias (check for urban vs rural)
    const urbanMarkers = /\b(thành phố|đô thị|hà nội|sài gòn|hồ chí minh)\b/gi;
    const ruralMarkers = /\b(nông thôn|làng quê|miền núi|vùng sâu|vùng xa)\b/gi;
    const urbanMatches = (contentLower.match(urbanMarkers) || []).length;
    const ruralMatches = (contentLower.match(ruralMarkers) || []).length;
    
    if (urbanMatches > 0 && ruralMatches === 0) {
      detectedTypes.push('regional');
      examples.push('Content may favor urban perspectives');
      severity = urbanMatches > 3 ? 'medium' : 'low';
    }

    const recommendations: string[] = [];
    if (detectedTypes.includes('gender')) {
      recommendations.push('Include balanced gender representation in examples');
    }
    if (detectedTypes.includes('cultural')) {
      recommendations.push('Include diverse cultural perspectives and examples');
    }
    if (detectedTypes.includes('socioeconomic')) {
      recommendations.push('Use examples accessible to all socioeconomic backgrounds');
    }
    if (detectedTypes.includes('regional')) {
      recommendations.push('Include examples from both urban and rural contexts');
    }

    return {
      detected: detectedTypes.length > 0,
      types: detectedTypes,
      severity,
      examples,
      recommendations,
    };
  }

  /**
   * Get detailed readability information
   */
  private getReadabilityDetails(text: string, grade: string): QualityScore['readability'] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    const avgSentenceLength = this.calculateAverageSentenceLength(text);
    const readabilityScore = this.calculateReadabilityScore(text, grade);

    let level: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
    if (readabilityScore >= 80) level = 'very_easy';
    else if (readabilityScore >= 70) level = 'easy';
    else if (readabilityScore >= 60) level = 'medium';
    else if (readabilityScore >= 50) level = 'hard';
    else level = 'very_hard';

    return {
      score: readabilityScore,
      level,
      avgSentenceLength,
      avgWordsPerSentence,
      gradeLevel: grade,
    };
  }
}

/**
 * Create default quality scorer
 */
export function createContentQualityScorer(): ContentQualityScorer {
  return new ContentQualityScorer();
}
