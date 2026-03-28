/**
 * Essay Grader
 * Specialized grader for Vietnamese and English essays with deep content analysis
 */

import { AIServiceOrchestrator } from '../ai-service-orchestrator';
import { AIMessage } from '../providers/base-provider';
import { GradingRubric, getRubric } from '../rubrics/grading-rubrics';

/**
 * Essay Analysis Result
 */
export interface EssayAnalysis {
  // Content Analysis
  thesis: {
    present: boolean;
    clarity: number; // 0-10
    strength: number; // 0-10
    comment: string;
  };

  arguments: {
    count: number;
    quality: number; // 0-10
    evidence: {
      present: boolean;
      types: string[]; // examples, quotes, statistics, etc.
      quality: number; // 0-10
    };
    comment: string;
  };

  // Structure Analysis
  structure: {
    hasIntroduction: boolean;
    hasBody: boolean;
    hasConclusion: boolean;
    paragraphCount: number;
    flow: number; // 0-10, coherence between paragraphs
    transitions: {
      quality: number; // 0-10
      examples: string[];
    };
    comment: string;
  };

  // Language Analysis
  language: {
    vocabulary: {
      level: 'basic' | 'intermediate' | 'advanced' | 'sophisticated';
      diversity: number; // 0-10
      appropriateness: number; // 0-10
      examples: string[]; // Notable words/phrases
    };
    grammar: {
      errorCount: number;
      errorTypes: string[];
      severity: 'minor' | 'moderate' | 'major';
      examples: string[];
    };
    style: {
      clarity: number; // 0-10
      engagement: number; // 0-10
      tone: string; // formal, informal, persuasive, etc.
      comment: string;
    };
  };

  // Creativity & Originality
  creativity: {
    originalIdeas: number; // 0-10
    uniquePerspective: boolean;
    examples: string[];
    comment: string;
  };

  // Overall Assessment
  wordCount: number;
  readingLevel: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

/**
 * Essay Grading Result
 */
export interface EssayGradingResult {
  score: number; // 0-10
  percentage: number; // 0-100
  grade: string; // A, B, C, D, F

  criteriaScores: {
    content: number;
    structure: number;
    language: number;
    mechanics: number;
  };

  analysis: EssayAnalysis;

  feedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  };

  confidence: number; // 0-1
  needsHumanReview: boolean;
  reviewReason?: string;
}

/**
 * Essay Grader
 */
export class EssayGrader {
  constructor(private aiService: AIServiceOrchestrator) {}

  /**
   * Grade an essay with deep analysis
   */
  async gradeEssay(
    essay: string,
    subject: 'vietnamese' | 'english',
    grade?: string,
    topic?: string
  ): Promise<EssayGradingResult> {
    // Get rubric
    const rubric = getRubric(subject, grade);

    // Perform parallel analysis
    const [analysis, scoring] = await Promise.all([
      this.analyzeEssay(essay, subject, topic),
      this.scoreEssay(essay, subject, rubric, topic),
    ]);

    // Combine results
    const result: EssayGradingResult = {
      ...scoring,
      analysis,
      feedback: this.generateDetailedFeedback(analysis, scoring),
    };

    // Determine if needs review
    result.needsHumanReview = this.shouldReview(result);
    if (result.needsHumanReview) {
      result.reviewReason = this.getReviewReason(result);
    }

    return result;
  }

  /**
   * Analyze essay structure and content
   */
  private async analyzeEssay(
    essay: string,
    subject: 'vietnamese' | 'english',
    topic?: string
  ): Promise<EssayAnalysis> {
    const prompt = this.buildAnalysisPrompt(essay, subject, topic);

    const response = await this.aiService.complete({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      options: {
        temperature: 0.3,
        maxTokens: 2000,
        model: 'gpt-4',
      },
    });

    return this.parseAnalysisResponse(response.content, essay);
  }

  /**
   * Score essay against rubric
   */
  private async scoreEssay(
    essay: string,
    subject: 'vietnamese' | 'english',
    rubric: GradingRubric,
    topic?: string
  ): Promise<Omit<EssayGradingResult, 'analysis' | 'feedback'>> {
    const prompt = this.buildScoringPrompt(essay, subject, rubric, topic);

    const response = await this.aiService.complete({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      options: {
        temperature: 0.2,
        maxTokens: 1500,
        model: 'gpt-4',
      },
    });

    return this.parseScoringResponse(response.content, rubric);
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(
    essay: string,
    subject: 'vietnamese' | 'english',
    topic?: string
  ) {
    const isVietnamese = subject === 'vietnamese';

    const systemPrompt = isVietnamese
      ? `Bạn là chuyên gia phân tích bài văn tiếng Việt. Nhiệm vụ của bạn là phân tích chi tiết về:
1. Luận điểm và luận cứ
2. Cấu trúc bài văn
3. Ngôn ngữ và tu từ
4. Tính sáng tạo

Hãy phân tích khách quan, chi tiết và đưa ra nhận xét xây dựng.`
      : `You are an expert English essay analyst. Analyze the essay for:
1. Thesis statement and arguments
2. Essay structure and organization
3. Language use and style
4. Creativity and originality

Provide objective, detailed analysis with constructive feedback.`;

    const userPrompt = isVietnamese
      ? `Phân tích bài văn sau:\n\n${topic ? `Đề bài: ${topic}\n\n` : ''}${essay}\n\nHãy phân tích chi tiết theo các tiêu chí đã nêu.`
      : `Analyze the following essay:\n\n${topic ? `Topic: ${topic}\n\n` : ''}${essay}\n\nProvide detailed analysis based on the criteria above.`;

    return { system: systemPrompt, user: userPrompt };
  }

  /**
   * Build scoring prompt
   */
  private buildScoringPrompt(
    essay: string,
    subject: 'vietnamese' | 'english',
    rubric: GradingRubric,
    topic?: string
  ) {
    const isVietnamese = subject === 'vietnamese';

    const criteriaText = rubric.criteria
      .map(c => `- ${c.name} (${c.weight * 100}%): ${c.description}`)
      .join('\n');

    const systemPrompt = isVietnamese
      ? `Bạn là giáo viên chấm bài văn. Chấm điểm theo tiêu chí:\n\n${criteriaText}\n\nĐiểm từ 0-10, chính xác đến 0.5 điểm.`
      : `You are an essay grader. Score based on:\n\n${criteriaText}\n\nScore from 0-10, accurate to 0.5 points.`;

    const userPrompt = isVietnamese
      ? `Chấm bài văn:\n\n${topic ? `Đề bài: ${topic}\n\n` : ''}${essay}\n\nĐưa ra điểm cho từng tiêu chí.`
      : `Grade this essay:\n\n${topic ? `Topic: ${topic}\n\n` : ''}${essay}\n\nProvide scores for each criterion.`;

    return { system: systemPrompt, user: userPrompt };
  }

  /**
   * Parse analysis response from AI
   */
  private parseAnalysisResponse(response: string, essay: string): EssayAnalysis {
    const wordCount = essay.split(/\s+/).length;

    // Extract thesis analysis
    const thesisMatch = response.match(/thesis|luận điểm/i);
    const thesis = {
      present: !!thesisMatch,
      clarity: this.extractScore(response, ['thesis clarity', 'rõ ràng']) || 7,
      strength: this.extractScore(response, ['thesis strength', 'mạnh mẽ']) || 7,
      comment: this.extractComment(response, ['thesis', 'luận điểm']),
    };

    // Extract arguments analysis
    const arguments = {
      count: this.countArguments(response),
      quality: this.extractScore(response, ['argument quality', 'chất lượng luận cứ']) || 7,
      evidence: {
        present: response.toLowerCase().includes('evidence') || response.includes('dẫn chứng'),
        types: this.extractEvidenceTypes(response),
        quality: this.extractScore(response, ['evidence quality', 'dẫn chứng']) || 7,
      },
      comment: this.extractComment(response, ['arguments', 'luận cứ']),
    };

    // Extract structure analysis
    const structure = {
      hasIntroduction: response.toLowerCase().includes('introduction') || response.includes('mở bài'),
      hasBody: response.toLowerCase().includes('body') || response.includes('thân bài'),
      hasConclusion: response.toLowerCase().includes('conclusion') || response.includes('kết bài'),
      paragraphCount: this.countParagraphs(essay),
      flow: this.extractScore(response, ['flow', 'coherence', 'mạch lạc']) || 7,
      transitions: {
        quality: this.extractScore(response, ['transitions', 'liên kết']) || 7,
        examples: this.extractExamples(response, ['transition', 'liên kết']),
      },
      comment: this.extractComment(response, ['structure', 'cấu trúc']),
    };

    // Extract language analysis
    const language = {
      vocabulary: {
        level: this.determineVocabLevel(response),
        diversity: this.extractScore(response, ['vocabulary diversity', 'từ vựng']) || 7,
        appropriateness: this.extractScore(response, ['word choice', 'phù hợp']) || 7,
        examples: this.extractExamples(response, ['vocabulary', 'từ vựng']),
      },
      grammar: {
        errorCount: this.extractErrorCount(response),
        errorTypes: this.extractErrorTypes(response),
        severity: this.determineErrorSeverity(response),
        examples: this.extractExamples(response, ['error', 'lỗi']),
      },
      style: {
        clarity: this.extractScore(response, ['clarity', 'rõ ràng']) || 7,
        engagement: this.extractScore(response, ['engagement', 'hấp dẫn']) || 7,
        tone: this.extractTone(response),
        comment: this.extractComment(response, ['style', 'phong cách']),
      },
    };

    // Extract creativity
    const creativity = {
      originalIdeas: this.extractScore(response, ['originality', 'sáng tạo']) || 7,
      uniquePerspective: response.includes('unique') || response.includes('độc đáo'),
      examples: this.extractExamples(response, ['creative', 'sáng tạo']),
      comment: this.extractComment(response, ['creativity', 'sáng tạo']),
    };

    return {
      thesis,
      arguments,
      structure,
      language,
      creativity,
      wordCount,
      readingLevel: this.determineReadingLevel(wordCount, language.vocabulary.level),
      strengths: this.extractList(response, ['strengths', 'điểm mạnh']),
      weaknesses: this.extractList(response, ['weaknesses', 'điểm yếu', 'cần cải thiện']),
      recommendations: this.extractList(response, ['recommendations', 'gợi ý']),
    };
  }

  /**
   * Parse scoring response from AI
   */
  private parseScoringResponse(
    response: string,
    rubric: GradingRubric
  ): Omit<EssayGradingResult, 'analysis' | 'feedback'> {
    // Extract scores for each criterion
    const criteriaScores: any = {};

    for (const criterion of rubric.criteria) {
      const score = this.extractScore(response, [criterion.name]) || 7;
      criteriaScores[criterion.name.toLowerCase().replace(/\s+/g, '')] = score;
    }

    // Calculate total score
    const totalScore = rubric.criteria.reduce((sum, criterion) => {
      const score = criteriaScores[criterion.name.toLowerCase().replace(/\s+/g, '')] || 7;
      return sum + (score * criterion.weight);
    }, 0);

    // Determine grade
    const grade = this.scoreToGrade(totalScore);
    const percentage = (totalScore / rubric.totalScore) * 100;

    // Calculate confidence
    const confidence = this.calculateConfidence(response);

    return {
      score: totalScore,
      percentage,
      grade,
      criteriaScores: {
        content: criteriaScores.content || criteriaScores.noidung || 7,
        structure: criteriaScores.structure || criteriaScores.cautruc || 7,
        language: criteriaScores.language || criteriaScores.ngonngu || 7,
        mechanics: criteriaScores.mechanics || criteriaScores.chinhta || 7,
      },
      confidence,
      needsHumanReview: false,
    };
  }

  /**
   * Generate detailed feedback
   */
  private generateDetailedFeedback(
    analysis: EssayAnalysis,
    scoring: Omit<EssayGradingResult, 'analysis' | 'feedback'>
  ) {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const suggestions: string[] = [];

    // Analyze thesis
    if (analysis.thesis.present && analysis.thesis.clarity >= 7) {
      strengths.push('Luận điểm rõ ràng và mạnh mẽ');
    } else if (!analysis.thesis.present) {
      improvements.push('Cần có luận điểm trung tâm rõ ràng hơn');
      suggestions.push('Thêm câu luận điểm ngay đầu bài hoặc cuối phần mở bài');
    }

    // Analyze structure
    if (analysis.structure.flow >= 7) {
      strengths.push('Bài văn mạch lạc, logic tốt');
    } else {
      improvements.push('Cần cải thiện tính mạch lạc giữa các đoạn văn');
      suggestions.push('Sử dụng từ nối để liên kết các ý tưởng');
    }

    // Analyze language
    if (analysis.language.vocabulary.level === 'advanced' || analysis.language.vocabulary.level === 'sophisticated') {
      strengths.push('Từ vựng phong phú, đa dạng');
    } else {
      improvements.push('Nên mở rộng vốn từ vựng');
      suggestions.push('Đọc nhiều sách, văn chương để học từ mới');
    }

    // Analyze grammar
    if (analysis.language.grammar.errorCount === 0) {
      strengths.push('Không có lỗi ngữ pháp');
    } else if (analysis.language.grammar.errorCount <= 3) {
      improvements.push('Có một số lỗi ngữ pháp nhỏ');
      suggestions.push('Đọc lại bài cẩn thận trước khi nộp');
    } else {
      improvements.push('Nhiều lỗi ngữ pháp cần sửa');
      suggestions.push('Ôn tập lại các quy tắc ngữ pháp cơ bản');
    }

    // Add analysis strengths/weaknesses
    strengths.push(...analysis.strengths);
    improvements.push(...analysis.weaknesses);
    suggestions.push(...analysis.recommendations);

    const summary = this.generateSummary(scoring.score, strengths.length, improvements.length);

    return { summary, strengths, improvements, suggestions };
  }

  /**
   * Generate summary feedback
   */
  private generateSummary(score: number, strengthCount: number, improvementCount: number): string {
    if (score >= 9) {
      return `Bài văn xuất sắc với ${strengthCount} điểm mạnh nổi bật. Tiếp tục phát huy!`;
    } else if (score >= 7) {
      return `Bài văn tốt với nhiều điểm mạnh. Cần cải thiện thêm ${improvementCount} điểm.`;
    } else if (score >= 5) {
      return `Bài văn đạt yêu cầu nhưng cần cải thiện ${improvementCount} điểm để đạt điểm cao hơn.`;
    } else {
      return `Bài văn cần cải thiện đáng kể. Hãy tập trung vào ${improvementCount} điểm yếu chính.`;
    }
  }

  /**
   * Helper methods
   */
  private extractScore(text: string, keywords: string[]): number | null {
    for (const keyword of keywords) {
      const patterns = [
        new RegExp(`${keyword}[:\\s]*(\\d+(?:\\.\\d+)?)[/\\s]?10`, 'i'),
        new RegExp(`${keyword}[^0-9]*(\\d+(?:\\.\\d+)?)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const score = parseFloat(match[1]);
          if (score >= 0 && score <= 10) {
            return score;
          }
        }
      }
    }
    return null;
  }

  private extractComment(text: string, keywords: string[]): string {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\\s]*([^\\n]+)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  }

  private extractList(text: string, headers: string[]): string[] {
    for (const header of headers) {
      const regex = new RegExp(`${header}[:\\s]*\\n([\\s\\S]*?)(?=\\n[A-Z]|$)`, 'i');
      const match = text.match(regex);

      if (match && match[1]) {
        return match[1]
          .split(/\\n/)
          .map(line => line.trim())
          .filter(line => line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line))
          .map(line => line.replace(/^[-•]\\s*|\\d+\\.\\s*/, '').trim())
          .filter(line => line.length > 0);
      }
    }
    return [];
  }

  private extractExamples(text: string, keywords: string[]): string[] {
    const examples: string[] = [];
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\\s]*["']([^"']+)["']`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        examples.push(match[1]);
      }
    }
    return examples.slice(0, 5); // Limit to 5 examples
  }

  private countArguments(text: string): number {
    const markers = ['firstly', 'secondly', 'thirdly', 'thứ nhất', 'thứ hai', 'thứ ba'];
    let count = 0;
    for (const marker of markers) {
      if (text.toLowerCase().includes(marker)) count++;
    }
    return Math.max(count, 2); // Default to 2 if not found
  }

  private countParagraphs(essay: string): number {
    return essay.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  }

  private extractEvidenceTypes(text: string): string[] {
    const types: string[] = [];
    if (text.includes('example') || text.includes('ví dụ')) types.push('examples');
    if (text.includes('quote') || text.includes('trích dẫn')) types.push('quotes');
    if (text.includes('statistic') || text.includes('số liệu')) types.push('statistics');
    if (text.includes('research') || text.includes('nghiên cứu')) types.push('research');
    return types;
  }

  private determineVocabLevel(text: string): 'basic' | 'intermediate' | 'advanced' | 'sophisticated' {
    if (text.includes('sophisticated') || text.includes('phức tạp')) return 'sophisticated';
    if (text.includes('advanced') || text.includes('nâng cao')) return 'advanced';
    if (text.includes('intermediate') || text.includes('trung bình')) return 'intermediate';
    return 'basic';
  }

  private extractErrorCount(text: string): number {
    const patterns = [
      /(\d+)\s*errors/i,
      /(\d+)\s*lỗi/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    return 0;
  }

  private extractErrorTypes(text: string): string[] {
    const types: string[] = [];
    if (text.includes('spelling') || text.includes('chính tả')) types.push('spelling');
    if (text.includes('grammar') || text.includes('ngữ pháp')) types.push('grammar');
    if (text.includes('punctuation') || text.includes('dấu câu')) types.push('punctuation');
    return types;
  }

  private determineErrorSeverity(text: string): 'minor' | 'moderate' | 'major' {
    if (text.includes('major') || text.includes('nghiêm trọng')) return 'major';
    if (text.includes('moderate') || text.includes('vừa phải')) return 'moderate';
    return 'minor';
  }

  private extractTone(text: string): string {
    if (text.includes('formal')) return 'formal';
    if (text.includes('informal')) return 'informal';
    if (text.includes('persuasive')) return 'persuasive';
    if (text.includes('descriptive')) return 'descriptive';
    if (text.includes('narrative')) return 'narrative';
    return 'neutral';
  }

  private determineReadingLevel(wordCount: number, vocabLevel: string): string {
    if (wordCount < 200) return 'Elementary';
    if (wordCount < 400) return 'Middle School';
    if (vocabLevel === 'sophisticated' && wordCount > 600) return 'College';
    if (vocabLevel === 'advanced') return 'High School';
    return 'Middle School';
  }

  private scoreToGrade(score: number): string {
    if (score >= 9) return 'A';
    if (score >= 7) return 'B';
    if (score >= 5) return 'C';
    if (score >= 3) return 'D';
    return 'F';
  }

  private calculateConfidence(response: string): number {
    let confidence = 1.0;

    if (response.length < 300) confidence -= 0.2;
    if (!response.includes('score') && !response.includes('điểm')) confidence -= 0.2;
    if (!response.includes('feedback') && !response.includes('nhận xét')) confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  private shouldReview(result: EssayGradingResult): boolean {
    if (result.confidence < 0.7) return true;
    if (result.score >= 9.5 || result.score <= 2) return true;
    if (result.analysis.language.grammar.errorCount > 10) return true;
    return false;
  }

  private getReviewReason(result: EssayGradingResult): string {
    if (result.confidence < 0.7) {
      return `Độ tin cậy thấp (${(result.confidence * 100).toFixed(0)}%)`;
    }
    if (result.score >= 9.5) return 'Điểm rất cao, cần xác nhận';
    if (result.score <= 2) return 'Điểm rất thấp, cần xác nhận';
    if (result.analysis.language.grammar.errorCount > 10) {
      return 'Quá nhiều lỗi ngữ pháp';
    }
    return 'Cần xem xét thêm';
  }
}

/**
 * Create essay grader instance
 */
export function createEssayGrader(aiService: AIServiceOrchestrator): EssayGrader {
  return new EssayGrader(aiService);
}
