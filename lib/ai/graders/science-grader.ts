/**
 * Science Grader
 * Specialized grader for Physics, Chemistry, and Biology
 */

import { AIServiceOrchestrator } from '../ai-service-orchestrator';
import { AIMessage } from '../providers/base-provider';
import { GradingRubric, getRubric } from '../rubrics/grading-rubrics';

/**
 * Science Subject Type
 */
export type ScienceSubject = 'physics' | 'chemistry' | 'biology';

/**
 * Chemical Equation Analysis
 */
export interface ChemicalEquation {
  equation: string;
  balanced: boolean;
  reactants: string[];
  products: string[];
  states: string[]; // solid, liquid, gas, aqueous
  coefficients: number[];
  errors: string[];
}

/**
 * Physics Calculation
 */
export interface PhysicsCalculation {
  step: number;
  formula: string;
  substitution: string;
  calculation: string;
  result: string;
  units: string;
  correct: boolean;
  error?: string;
}

/**
 * Biology Concept
 */
export interface BiologyConcept {
  name: string;
  understood: boolean;
  accuracy: number; // 0-10
  explanation: string;
  examples: string[];
  errors: string[];
}

/**
 * Science Problem Analysis
 */
export interface ScienceProblemAnalysis {
  subject: ScienceSubject;
  problemType: string;

  // Problem Understanding
  problemAnalysis: {
    correctlyIdentified: boolean;
    givenData: string[];
    requiredToFind: string[];
    missingUnderstanding: string[];
  };

  // Subject-specific Analysis
  physics?: {
    formulas: Array<{
      formula: string;
      correct: boolean;
      application: string;
      error?: string;
    }>;
    calculations: PhysicsCalculation[];
    units: {
      consistent: boolean;
      correct: boolean;
      conversions: Array<{ from: string; to: string; correct: boolean }>;
    };
    diagram: {
      present: boolean;
      accurate: boolean;
      helpful: boolean;
      comment: string;
    };
  };

  chemistry?: {
    equations: ChemicalEquation[];
    molCalculations: {
      present: boolean;
      correct: boolean;
      steps: Array<{ description: string; correct: boolean }>;
    };
    stoichiometry: {
      understood: boolean;
      ratiosCorrect: boolean;
      conversions: Array<{ from: string; to: string; correct: boolean }>;
    };
    nomenclature: {
      correct: boolean;
      errors: string[];
    };
  };

  biology?: {
    concepts: BiologyConcept[];
    terminology: {
      correct: boolean;
      errors: string[];
      suggestions: string[];
    };
    examples: {
      present: boolean;
      relevant: boolean;
      accurate: boolean;
      quality: number; // 0-10
    };
    diagrams: {
      present: boolean;
      labeled: boolean;
      accurate: boolean;
      comment: string;
    };
  };

  // Explanation Quality
  explanation: {
    clarity: number; // 0-10
    depth: number; // 0-10
    accuracy: number; // 0-10
    logicalFlow: number; // 0-10
    comment: string;
  };

  // Final Answer
  conclusion: {
    present: boolean;
    correct: boolean;
    reasonable: boolean;
    units: boolean;
    interpretation: string;
  };

  // Assessment
  strengths: string[];
  weaknesses: string[];
  misconceptions: string[];
  recommendations: string[];
}

/**
 * Science Grading Result
 */
export interface ScienceGradingResult {
  score: number; // 0-10
  percentage: number; // 0-100
  grade: string;

  criteriaScores: {
    problemAnalysis: number;
    scientificMethod: number; // formulas/equations/concepts
    calculation: number; // math or reasoning
    conclusion: number;
  };

  analysis: ScienceProblemAnalysis;

  feedback: {
    summary: string;
    correct: string[];
    errors: string[];
    hints: string[];
    resources?: string[];
  };

  confidence: number;
  needsHumanReview: boolean;
  reviewReason?: string;
}

/**
 * Science Grader
 */
export class ScienceGrader {
  constructor(private aiService: AIServiceOrchestrator) {}

  /**
   * Grade a science problem (Physics, Chemistry, or Biology)
   */
  async gradeScienceProblem(
    subject: ScienceSubject,
    problem: string,
    solution: string,
    correctAnswer?: string,
    grade?: string
  ): Promise<ScienceGradingResult> {
    // Get rubric
    const rubric = getRubric(subject, grade);

    // Analyze solution
    const analysis = await this.analyzeSolution(subject, problem, solution, correctAnswer);

    // Score the solution
    const scoring = this.scoreSolution(analysis, rubric);

    // Generate feedback
    const feedback = this.generateFeedback(analysis, scoring);

    const result: ScienceGradingResult = {
      ...scoring,
      analysis,
      feedback,
    };

    // Determine if needs review
    result.needsHumanReview = this.shouldReview(result);
    if (result.needsHumanReview) {
      result.reviewReason = this.getReviewReason(result);
    }

    return result;
  }

  /**
   * Analyze science solution
   */
  private async analyzeSolution(
    subject: ScienceSubject,
    problem: string,
    solution: string,
    correctAnswer?: string
  ): Promise<ScienceProblemAnalysis> {
    const prompt = this.buildAnalysisPrompt(subject, problem, solution, correctAnswer);

    const response = await this.aiService.complete({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      options: {
        temperature: 0.2,
        maxTokens: 2500,
        model: 'gpt-4',
      },
    });

    return this.parseAnalysisResponse(subject, response.content, solution);
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(
    subject: ScienceSubject,
    problem: string,
    solution: string,
    correctAnswer?: string
  ) {
    const subjectNames = {
      physics: 'Vật lý',
      chemistry: 'Hóa học',
      biology: 'Sinh học',
    };

    const subjectGuidelines = {
      physics: `- Kiểm tra công thức vật lý có đúng không
- Kiểm tra đơn vị đo lường
- Xác minh các phép tính
- Đánh giá sơ đồ, hình vẽ (nếu có)`,
      chemistry: `- Kiểm tra phương trình hóa học (cân bằng, hóa trị)
- Kiểm tra tính toán mol, khối lượng, thể tích
- Xác minh các công thức hóa học
- Đánh giá hiểu biết về tỉ lệ mol`,
      biology: `- Kiểm tra thuật ngữ khoa học
- Đánh giá độ chính xác của kiến thức
- Kiểm tra ví dụ minh họa
- Xác minh sơ đồ, hình vẽ (nếu có)`,
    };

    const systemPrompt = `Bạn là giáo viên ${subjectNames[subject]} chuyên nghiệp. Nhiệm vụ: phân tích bài làm của học sinh.

Phân tích theo:
1. **Phân tích đề bài**: Học sinh hiểu đề đúng không?
2. **Phương pháp khoa học**: Áp dụng đúng công thức/định luật/khái niệm không?
3. **Tính toán/Lập luận**: Các bước giải/giải thích có chính xác không?
4. **Kết luận**: Đáp án/kết luận có đúng và hợp lý không?

Chú ý:
${subjectGuidelines[subject]}

Đánh giá khách quan, chỉ ra lỗi cụ thể, cho điểm từng phần.`;

    const userPrompt = `Đề bài: ${problem}

Bài làm của học sinh:
${solution}

${correctAnswer ? `Đáp án đúng: ${correctAnswer}` : ''}

Hãy phân tích chi tiết bài làm của học sinh.`;

    return { system: systemPrompt, user: userPrompt };
  }

  /**
   * Parse analysis response
   */
  private parseAnalysisResponse(
    subject: ScienceSubject,
    response: string,
    solution: string
  ): ScienceProblemAnalysis {
    const problemType = this.extractProblemType(response);

    // Problem analysis
    const problemAnalysis = {
      correctlyIdentified: !response.includes('misunderstood') && !response.includes('hiểu sai'),
      givenData: this.extractList(response, ['given', 'cho', 'đã cho']),
      requiredToFind: this.extractList(response, ['find', 'tìm', 'cần tìm']),
      missingUnderstanding: this.extractList(response, ['missing', 'thiếu hiểu biết']),
    };

    // Explanation quality
    const explanation = {
      clarity: this.extractScore(response, ['clarity', 'rõ ràng']) || 7,
      depth: this.extractScore(response, ['depth', 'sâu sắc']) || 7,
      accuracy: this.extractScore(response, ['accuracy', 'chính xác']) || 7,
      logicalFlow: this.extractScore(response, ['logical', 'logic']) || 7,
      comment: this.extractComment(response, ['explanation', 'giải thích']),
    };

    // Conclusion
    const conclusion = {
      present: response.includes('conclusion') || response.includes('kết luận'),
      correct: response.includes('correct answer') || response.includes('đáp án đúng'),
      reasonable: response.includes('reasonable') || response.includes('hợp lý'),
      units: response.includes('units') || response.includes('đơn vị'),
      interpretation: this.extractComment(response, ['conclusion', 'kết luận']),
    };

    const baseAnalysis: ScienceProblemAnalysis = {
      subject,
      problemType,
      problemAnalysis,
      explanation,
      conclusion,
      strengths: this.extractList(response, ['strengths', 'điểm mạnh', 'đúng']),
      weaknesses: this.extractList(response, ['weaknesses', 'điểm yếu', 'sai']),
      misconceptions: this.extractList(response, ['misconceptions', 'hiểu lầm']),
      recommendations: this.extractList(response, ['recommendations', 'gợi ý']),
    };

    // Add subject-specific analysis
    if (subject === 'physics') {
      baseAnalysis.physics = this.parsePhysicsAnalysis(response, solution);
    } else if (subject === 'chemistry') {
      baseAnalysis.chemistry = this.parseChemistryAnalysis(response, solution);
    } else if (subject === 'biology') {
      baseAnalysis.biology = this.parseBiologyAnalysis(response, solution);
    }

    return baseAnalysis;
  }

  /**
   * Parse Physics-specific analysis
   */
  private parsePhysicsAnalysis(response: string, solution: string) {
    return {
      formulas: this.extractFormulas(response),
      calculations: this.extractPhysicsCalculations(response),
      units: {
        consistent: !response.includes('inconsistent units') && !response.includes('đơn vị không nhất quán'),
        correct: !response.includes('wrong units') && !response.includes('sai đơn vị'),
        conversions: this.extractUnitConversions(response),
      },
      diagram: {
        present: response.includes('diagram') || response.includes('sơ đồ'),
        accurate: response.includes('accurate diagram') || response.includes('sơ đồ chính xác'),
        helpful: response.includes('helpful') || response.includes('hữu ích'),
        comment: this.extractComment(response, ['diagram', 'sơ đồ']),
      },
    };
  }

  /**
   * Parse Chemistry-specific analysis
   */
  private parseChemistryAnalysis(response: string, solution: string) {
    return {
      equations: this.extractChemicalEquations(solution, response),
      molCalculations: {
        present: response.includes('mol') || response.includes('mole'),
        correct: response.includes('correct mol') || response.includes('đúng mol'),
        steps: this.extractMolSteps(response),
      },
      stoichiometry: {
        understood: !response.includes('stoichiometry error') && !response.includes('lỗi tỉ lệ'),
        ratiosCorrect: response.includes('correct ratio') || response.includes('tỉ lệ đúng'),
        conversions: this.extractMolConversions(response),
      },
      nomenclature: {
        correct: !response.includes('nomenclature error') && !response.includes('sai tên'),
        errors: this.extractNomenclatureErrors(response),
      },
    };
  }

  /**
   * Parse Biology-specific analysis
   */
  private parseBiologyAnalysis(response: string, solution: string) {
    return {
      concepts: this.extractBiologyConcepts(response),
      terminology: {
        correct: !response.includes('terminology error') && !response.includes('sai thuật ngữ'),
        errors: this.extractTerminologyErrors(response),
        suggestions: this.extractList(response, ['correct term', 'thuật ngữ đúng']),
      },
      examples: {
        present: response.includes('example') || response.includes('ví dụ'),
        relevant: response.includes('relevant') || response.includes('phù hợp'),
        accurate: response.includes('accurate example') || response.includes('ví dụ chính xác'),
        quality: this.extractScore(response, ['example quality', 'chất lượng ví dụ']) || 7,
      },
      diagrams: {
        present: response.includes('diagram') || response.includes('sơ đồ'),
        labeled: response.includes('labeled') || response.includes('ghi chú'),
        accurate: response.includes('accurate') || response.includes('chính xác'),
        comment: this.extractComment(response, ['diagram', 'sơ đồ']),
      },
    };
  }

  /**
   * Score the solution
   */
  private scoreSolution(
    analysis: ScienceProblemAnalysis,
    rubric: GradingRubric
  ): Omit<ScienceGradingResult, 'analysis' | 'feedback'> {
    // Problem Analysis score (20%)
    let problemScore = analysis.problemAnalysis.correctlyIdentified ? 8 : 4;
    if (analysis.problemAnalysis.givenData.length > 0) problemScore += 1;
    if (analysis.problemAnalysis.requiredToFind.length > 0) problemScore += 1;
    problemScore = Math.min(10, problemScore);

    // Scientific Method score (30%)
    let methodScore = 7;
    if (analysis.subject === 'physics' && analysis.physics) {
      const correctFormulas = analysis.physics.formulas.filter(f => f.correct).length;
      const totalFormulas = analysis.physics.formulas.length;
      methodScore = totalFormulas > 0 ? (correctFormulas / totalFormulas) * 10 : 7;
    } else if (analysis.subject === 'chemistry' && analysis.chemistry) {
      const balancedEqs = analysis.chemistry.equations.filter(eq => eq.balanced).length;
      const totalEqs = analysis.chemistry.equations.length;
      methodScore = totalEqs > 0 ? (balancedEqs / totalEqs) * 10 : 7;
    } else if (analysis.subject === 'biology' && analysis.biology) {
      const understoodConcepts = analysis.biology.concepts.filter(c => c.understood).length;
      const totalConcepts = analysis.biology.concepts.length;
      methodScore = totalConcepts > 0 ? (understoodConcepts / totalConcepts) * 10 : 7;
    }

    // Calculation/Reasoning score (30%)
    let calculationScore = (analysis.explanation.accuracy + analysis.explanation.logicalFlow) / 2;

    // Conclusion score (20%)
    let conclusionScore = 0;
    if (analysis.conclusion.present) conclusionScore += 2;
    if (analysis.conclusion.correct) conclusionScore += 6;
    if (analysis.conclusion.units) conclusionScore += 1;
    if (analysis.conclusion.reasonable) conclusionScore += 1;

    // Calculate weighted total
    const totalScore = (
      problemScore * 0.2 +
      methodScore * 0.3 +
      calculationScore * 0.3 +
      conclusionScore * 0.2
    );

    const grade = this.scoreToGrade(totalScore);
    const percentage = (totalScore / 10) * 100;

    return {
      score: Math.round(totalScore * 10) / 10,
      percentage,
      grade,
      criteriaScores: {
        problemAnalysis: Math.round(problemScore * 10) / 10,
        scientificMethod: Math.round(methodScore * 10) / 10,
        calculation: Math.round(calculationScore * 10) / 10,
        conclusion: Math.round(conclusionScore * 10) / 10,
      },
      confidence: this.calculateConfidence(analysis),
      needsHumanReview: false,
    };
  }

  /**
   * Generate feedback
   */
  private generateFeedback(
    analysis: ScienceProblemAnalysis,
    scoring: Omit<ScienceGradingResult, 'analysis' | 'feedback'>
  ) {
    const correct: string[] = [];
    const errors: string[] = [];
    const hints: string[] = [];

    // Problem understanding
    if (analysis.problemAnalysis.correctlyIdentified) {
      correct.push('Hiểu đúng đề bài');
    } else {
      errors.push('Hiểu chưa chính xác về yêu cầu đề bài');
      hints.push('Đọc kỹ đề, xác định rõ dữ liệu cho và cần tìm');
    }

    // Subject-specific feedback
    if (analysis.subject === 'physics' && analysis.physics) {
      const wrongFormulas = analysis.physics.formulas.filter(f => !f.correct);
      if (wrongFormulas.length > 0) {
        errors.push(`Sai công thức: ${wrongFormulas.map(f => f.formula).join(', ')}`);
      }

      if (!analysis.physics.units.correct) {
        errors.push('Sai đơn vị hoặc thiếu đơn vị');
        hints.push('Luôn ghi rõ đơn vị và kiểm tra tính nhất quán');
      }
    } else if (analysis.subject === 'chemistry' && analysis.chemistry) {
      const unbalancedEqs = analysis.chemistry.equations.filter(eq => !eq.balanced);
      if (unbalancedEqs.length > 0) {
        errors.push('Phương trình hóa học chưa cân bằng hoặc sai');
        hints.push('Kiểm tra lại hệ số cân bằng và hóa trị các chất');
      }

      if (analysis.chemistry.nomenclature.errors.length > 0) {
        errors.push(`Sai tên hóa học: ${analysis.chemistry.nomenclature.errors.join(', ')}`);
      }
    } else if (analysis.subject === 'biology' && analysis.biology) {
      if (analysis.biology.terminology.errors.length > 0) {
        errors.push(`Sai thuật ngữ: ${analysis.biology.terminology.errors.join(', ')}`);
      }

      if (!analysis.biology.examples.present) {
        hints.push('Nên đưa ví dụ cụ thể để minh họa');
      } else if (!analysis.biology.examples.accurate) {
        errors.push('Ví dụ chưa chính xác hoặc không phù hợp');
      }
    }

    // Conclusion
    if (!analysis.conclusion.present) {
      errors.push('Thiếu kết luận');
      hints.push('Luôn viết rõ kết luận/đáp án cuối cùng');
    } else if (!analysis.conclusion.correct) {
      errors.push('Kết luận/đáp án chưa đúng');
    }

    // Add general recommendations
    hints.push(...analysis.recommendations);

    const summary = this.generateSummary(scoring.score, analysis);

    return {
      summary,
      correct,
      errors,
      hints,
    };
  }

  /**
   * Generate summary
   */
  private generateSummary(score: number, analysis: ScienceProblemAnalysis): string {
    const subjectName = {
      physics: 'Vật lý',
      chemistry: 'Hóa học',
      biology: 'Sinh học',
    }[analysis.subject];

    if (score >= 9) {
      return `Xuất sắc! Hiểu sâu kiến thức ${subjectName} và vận dụng tốt.`;
    } else if (score >= 7) {
      return `Tốt! Nắm vững kiến thức ${subjectName}. Sửa ${analysis.weaknesses.length} lỗi để đạt điểm cao hơn.`;
    } else if (score >= 5) {
      return `Đạt yêu cầu. Cần ôn lại một số khái niệm ${subjectName}.`;
    } else {
      return `Cần ôn tập lại kiến thức ${subjectName}. Tập trung vào ${analysis.misconceptions.length} điểm hiểu lầm.`;
    }
  }

  /**
   * Helper methods
   */
  private extractFormulas(text: string): Array<{ formula: string; correct: boolean; application: string; error?: string }> {
    const formulas: Array<{ formula: string; correct: boolean; application: string; error?: string }> = [];

    // This is a simplified extraction. Real implementation would need more sophisticated parsing
    const formulaRegex = /formula[:\s]*([^.\n]+)/gi;
    let match;

    while ((match = formulaRegex.exec(text)) !== null) {
      const formulaText = match[1].trim();
      const isCorrect = !formulaText.toLowerCase().includes('wrong') && !formulaText.toLowerCase().includes('error');

      formulas.push({
        formula: formulaText,
        correct: isCorrect,
        application: 'Applied',
        error: isCorrect ? undefined : 'Incorrect formula',
      });
    }

    return formulas;
  }

  private extractPhysicsCalculations(text: string): PhysicsCalculation[] {
    // Simplified - would need more sophisticated parsing
    return [];
  }

  private extractUnitConversions(text: string): Array<{ from: string; to: string; correct: boolean }> {
    return [];
  }

  private extractChemicalEquations(solution: string, response: string): ChemicalEquation[] {
    const equations: ChemicalEquation[] = [];

    // Look for chemical equations (simplified)
    const eqRegex = /([A-Z][a-z]?\d*\s*\+\s*)+[A-Z][a-z]?\d*\s*→\s*([A-Z][a-z]?\d*\s*\+\s*)*[A-Z][a-z]?\d*/g;
    let match;

    while ((match = eqRegex.exec(solution)) !== null) {
      equations.push({
        equation: match[0],
        balanced: !response.includes('unbalanced') && !response.includes('không cân bằng'),
        reactants: [],
        products: [],
        states: [],
        coefficients: [],
        errors: [],
      });
    }

    return equations;
  }

  private extractMolSteps(text: string): Array<{ description: string; correct: boolean }> {
    return [];
  }

  private extractMolConversions(text: string): Array<{ from: string; to: string; correct: boolean }> {
    return [];
  }

  private extractNomenclatureErrors(text: string): string[] {
    return this.extractList(text, ['nomenclature error', 'sai tên']);
  }

  private extractBiologyConcepts(text: string): BiologyConcept[] {
    return [];
  }

  private extractTerminologyErrors(text: string): string[] {
    return this.extractList(text, ['terminology error', 'sai thuật ngữ']);
  }

  private extractProblemType(text: string): string {
    const types = ['mechanics', 'thermodynamics', 'electromagnetism', 'organic', 'inorganic', 'ecology', 'genetics'];
    for (const type of types) {
      if (text.toLowerCase().includes(type)) return type;
    }
    return 'general';
  }

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
          .split(/\n/)
          .map(line => line.trim())
          .filter(line => line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line))
          .map(line => line.replace(/^[-•]\s*|\d+\.\s*/, '').trim())
          .filter(line => line.length > 0);
      }
    }
    return [];
  }

  private scoreToGrade(score: number): string {
    if (score >= 9) return 'A';
    if (score >= 7) return 'B';
    if (score >= 5) return 'C';
    if (score >= 3) return 'D';
    return 'F';
  }

  private calculateConfidence(analysis: ScienceProblemAnalysis): number {
    let confidence = 1.0;

    if (analysis.misconceptions.length > 2) confidence -= 0.2;
    if (!analysis.conclusion.present) confidence -= 0.2;
    if (analysis.weaknesses.length > 3) confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  private shouldReview(result: ScienceGradingResult): boolean {
    if (result.confidence < 0.7) return true;
    if (result.score >= 9.5 || result.score <= 2) return true;
    if (result.analysis.misconceptions.length > 3) return true;
    return false;
  }

  private getReviewReason(result: ScienceGradingResult): string {
    if (result.confidence < 0.7) {
      return `Độ tin cậy thấp (${(result.confidence * 100).toFixed(0)}%)`;
    }
    if (result.score >= 9.5) return 'Điểm rất cao, cần xác nhận';
    if (result.score <= 2) return 'Điểm rất thấp, cần xác nhận';
    if (result.analysis.misconceptions.length > 3) {
      return 'Quá nhiều điểm hiểu lầm';
    }
    return 'Cần xem xét thêm';
  }
}

/**
 * Create science grader instance
 */
export function createScienceGrader(aiService: AIServiceOrchestrator): ScienceGrader {
  return new ScienceGrader(aiService);
}
