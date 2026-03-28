/**
 * Assessment Engine - Scoring System for Learning Path Assessment
 *
 * Hệ thống chấm điểm cho đánh giá lộ trình học tập
 * Tích hợp 4 yếu tố: Hồ sơ học sinh, Xác nhận chuyên gia, Đánh giá liên môn, Chấm điểm AI
 */

import { SubjectDomain } from './types';
import {
  StudentProfileSurvey,
  StudentProfileScore,
  MentorValidationScore,
  CrossDisciplinaryPanelScore,
  AIScoringMatrix,
  CompositeAssessment,
  DimensionScore,
  ReassessmentTrigger,
  ReassessmentTriggerType,
  ReassessmentResult,
} from './assessment-types';

/**
 * AssessmentEngine - Lớp chính cho hệ thống đánh giá
 *
 * Chức năng chính:
 * 1. Đánh giá hồ sơ học sinh (35%)
 * 2. Mô phỏng xác nhận chuyên gia (25%)
 * 3. Đánh giá đa ngành (20%)
 * 4. Chấm điểm nền tảng AI (20%)
 */
export class AssessmentEngine {
  private readonly STUDENT_PROFILE_WEIGHT = 0.35;
  private readonly MENTOR_VALIDATION_WEIGHT = 0.25;
  private readonly CROSS_DISCIPLINARY_WEIGHT = 0.2;
  private readonly AI_SCORING_WEIGHT = 0.2;

  /**
   * Đánh giá hồ sơ học sinh
   * Tính toán: Năng lực, phong cách học tập, kiến thức nền, động lực, thời gian
   */
  evaluateStudentProfile(survey: StudentProfileSurvey): StudentProfileScore {
    // Tính năng lực tổng quát (Overall Readiness)
    const overallReadiness = this.calculateOverallReadiness(survey);

    // Tính điểm phù hợp phong cách học tập
    const learningStyleMatch = this.calculateLearningStyleMatch(survey);

    // Tính mức kiến thức nền tảng
    const priorKnowledgeLevel = this.calculatePriorKnowledgeLevel(survey);

    // Tính chỉ số động lực
    const motivationIndex = this.calculateMotivationIndex(survey);

    // Tính điểm sẵn có thời gian
    const timeAvailabilityScore = this.calculateTimeAvailability(survey);

    // Xác định độ khó khởi đầu đề xuất
    const recommendedStartingDifficulty = this.determineStartingDifficulty(
      overallReadiness,
      priorKnowledgeLevel
    );

    // Xác định lĩnh vực mạnh và khoảng trống
    const strengthDomains = survey.strongSubjects || [];
    const gapDomains = survey.weakSubjects || [];

    return {
      overallReadiness,
      learningStyleMatch,
      priorKnowledgeLevel,
      motivationIndex,
      timeAvailabilityScore,
      recommendedStartingDifficulty,
      strengthDomains,
      gapDomains,
    };
  }

  /**
   * Mô phỏng xác nhận chuyên gia cho các lĩnh vực
   */
  simulateMentorValidation(domains: SubjectDomain[]): MentorValidationScore[] {
    return domains.map((domain, index) => {
      const contentAccuracy = this.randomScore(85, 98);
      const difficultyAppropriateness = this.randomScore(75, 95);
      const prerequisiteCompleteness = this.randomScore(80, 95);
      const pedagogicalSoundness = this.randomScore(78, 96);

      const overallScore = (
        contentAccuracy +
        difficultyAppropriateness +
        prerequisiteCompleteness +
        pedagogicalSoundness
      ) / 4;

      const overallValidation =
        overallScore >= 90
          ? ('approved' as const)
          : overallScore >= 75
            ? ('needs_revision' as const)
            : ('rejected' as const);

      return {
        mentorId: `mentor_${domain}_${index}`,
        domain,
        contentAccuracy,
        difficultyAppropriateness,
        prerequisiteCompleteness,
        pedagogicalSoundness,
        overallValidation,
        feedback: this.generateMentorFeedback(domain, overallScore),
        suggestedModifications: this.generateModifications(domain),
      };
    });
  }

  /**
   * Mô phỏng đánh giá từ hội đồng đa ngành
   */
  simulateCrossDisciplinaryPanel(
    domains: SubjectDomain[]
  ): CrossDisciplinaryPanelScore {
    const reviewers = domains.slice(0, 3).map((domain, index) => ({
      mentorId: `panel_mentor_${index}`,
      domain,
      score: this.randomScore(75, 95),
      feedback: `Đánh giá chi tiết cho lĩnh vực ${domain}`,
    }));

    const transitionQuality = this.randomScore(70, 92);
    const knowledgeIntegration = this.randomScore(72, 90);
    const practicalRelevance = this.randomScore(68, 88);
    const coherenceScore = this.randomScore(75, 93);

    const avgScore =
      (transitionQuality +
        knowledgeIntegration +
        practicalRelevance +
        coherenceScore) /
      4;

    const consensusLevel =
      avgScore >= 90
        ? ('unanimous' as const)
        : avgScore >= 75
          ? ('majority' as const)
          : avgScore >= 60
            ? ('split' as const)
            : ('disagreement' as const);

    const overallRecommendation =
      avgScore >= 85
        ? ('proceed' as const)
        : avgScore >= 70
          ? ('modify' as const)
          : avgScore >= 50
            ? ('restructure' as const)
            : ('reject' as const);

    return {
      panelId: `panel_${Date.now()}`,
      reviewers,
      transitionQuality,
      knowledgeIntegration,
      practicalRelevance,
      coherenceScore,
      consensusLevel,
      overallRecommendation,
    };
  }

  /**
   * Tính toán ma trận chấm điểm AI
   * Sử dụng logic dựa trên mục tiêu và ngôn ngữ ưa thích
   */
  calculateAIScoringMatrix(survey: StudentProfileSurvey): AIScoringMatrix {
    const platformScores = this.scorePlatforms(survey);
    const hybridRecommendation = this.generateHybridRecommendation(
      survey,
      platformScores
    );

    return {
      studentId: `student_${Date.now()}`,
      evaluatedAt: new Date(),
      platformScores,
      hybridRecommendation,
    };
  }

  /**
   * Tính toán đánh giá tổng hợp từ 4 yếu tố
   */
  generateCompositeAssessment(
    survey: StudentProfileSurvey
  ): CompositeAssessment {
    const studentProfile = this.evaluateStudentProfile(survey);
    const mentorValidation = this.simulateMentorValidation(
      survey.interestedDomains
    );
    const crossDisciplinaryPanel =
      this.simulateCrossDisciplinaryPanel(survey.interestedDomains);
    const aiScoringMatrix = this.calculateAIScoringMatrix(survey);

    // Tính toán điểm từng chiều
    const studentProfileDimensionScore = this.normalizeScore(
      (studentProfile.overallReadiness +
        studentProfile.learningStyleMatch +
        studentProfile.priorKnowledgeLevel +
        studentProfile.motivationIndex +
        studentProfile.timeAvailabilityScore) /
        5
    );

    const mentorValidationDimensionScore = this.normalizeScore(
      mentorValidation.reduce((sum, m) => {
        const score =
          (m.contentAccuracy +
            m.difficultyAppropriateness +
            m.prerequisiteCompleteness +
            m.pedagogicalSoundness) /
          4;
        return sum + score;
      }, 0) / mentorValidation.length
    );

    const crossDisciplinaryDimensionScore = this.normalizeScore(
      (crossDisciplinaryPanel.transitionQuality +
        crossDisciplinaryPanel.knowledgeIntegration +
        crossDisciplinaryPanel.practicalRelevance +
        crossDisciplinaryPanel.coherenceScore) /
        4
    );

    const aiScoringDimensionScore = this.normalizeScore(
      aiScoringMatrix.platformScores.reduce(
        (sum, p) => sum + p.totalScore,
        0
      ) / aiScoringMatrix.platformScores.length
    );

    // Tính toán điểm tổng hợp (Composite Score)
    const compositeScore =
      studentProfileDimensionScore * this.STUDENT_PROFILE_WEIGHT +
      mentorValidationDimensionScore * this.MENTOR_VALIDATION_WEIGHT +
      crossDisciplinaryDimensionScore * this.CROSS_DISCIPLINARY_WEIGHT +
      aiScoringDimensionScore * this.AI_SCORING_WEIGHT;

    // Tạo danh sách chi tiết điểm từng chiều
    const dimensionBreakdown: DimensionScore[] = [
      {
        dimension: 'Hồ sơ Học sinh',
        score: studentProfileDimensionScore,
        weight: this.STUDENT_PROFILE_WEIGHT,
        reasoning:
          'Đánh giá dựa trên năng lực, phong cách, kiến thức nền, động lực và thời gian',
        subScores: [
          {
            factor: 'Năng lực tổng quát',
            value: studentProfile.overallReadiness,
            evidence: 'Tính từ GPA, trình độ học vấn và thành tích',
          },
          {
            factor: 'Phù hợp phong cách học tập',
            value: studentProfile.learningStyleMatch,
            evidence: 'Khớp với loại nội dung ưa thích',
          },
          {
            factor: 'Kiến thức nền',
            value: studentProfile.priorKnowledgeLevel,
            evidence: 'Dựa trên các môn học mạnh',
          },
          {
            factor: 'Chỉ số động lực',
            value: studentProfile.motivationIndex,
            evidence: 'Từ lợi dụng động lực và mục tiêu',
          },
          {
            factor: 'Sẵn có thời gian',
            value: studentProfile.timeAvailabilityScore,
            evidence: 'Từ cam kết hàng tuần và ngày khả dụng',
          },
        ],
      },
      {
        dimension: 'Xác nhận Chuyên gia',
        score: mentorValidationDimensionScore,
        weight: this.MENTOR_VALIDATION_WEIGHT,
        reasoning: 'Xác nhận từ các chuyên gia về chất lượng nội dung',
        subScores: [
          {
            factor: 'Độ chính xác nội dung',
            value: mentorValidation[0]?.contentAccuracy ?? 0,
            evidence: 'Kiểm tra xác thực từ chuyên gia',
          },
          {
            factor: 'Phù hợp độ khó',
            value: mentorValidation[0]?.difficultyAppropriateness ?? 0,
            evidence: 'Đánh giá mức độ phù hợp',
          },
        ],
      },
      {
        dimension: 'Đánh giá Đa ngành',
        score: crossDisciplinaryDimensionScore,
        weight: this.CROSS_DISCIPLINARY_WEIGHT,
        reasoning: 'Đánh giá tính liền mạch và tích hợp kiến thức',
        subScores: [
          {
            factor: 'Chất lượng chuyển đổi',
            value: crossDisciplinaryPanel.transitionQuality,
            evidence: 'Đánh giá sự chuyển đổi giữa các môn',
          },
          {
            factor: 'Tích hợp kiến thức',
            value: crossDisciplinaryPanel.knowledgeIntegration,
            evidence: 'Cách kết hợp các lĩnh vực',
          },
        ],
      },
      {
        dimension: 'Chấm điểm AI',
        score: aiScoringDimensionScore,
        weight: this.AI_SCORING_WEIGHT,
        reasoning: 'So sánh hiệu suất giữa các nền tảng AI',
        subScores: [
          {
            factor: 'OpenAI',
            value: aiScoringMatrix.platformScores[0]?.totalScore ?? 0,
            evidence: 'Chuyên môn miền và tính tương tác',
          },
          {
            factor: 'Gemini',
            value: aiScoringMatrix.platformScores[1]?.totalScore ?? 0,
            evidence: 'Chất lượng nội dung và hiệu quả chi phí',
          },
        ],
      },
    ];

    // Tạo lộ trình đề xuất
    const recommendedPath = this.generateRecommendedPath(
      survey,
      studentProfile,
      compositeScore
    );

    // Lập lịch đánh giá lại tiếp theo
    const nextReassessmentDate = this.scheduleNextReassessment(
      'periodic'
    );

    const reassessmentTriggers: ReassessmentTrigger[] = [];

    return {
      id: `assessment_${Date.now()}`,
      studentId: `student_${Date.now()}`,
      createdAt: new Date(),
      assessmentType: 'initial',
      studentProfile,
      mentorValidation,
      crossDisciplinaryPanel,
      aiScoringMatrix,
      compositeScore: Math.round(compositeScore),
      dimensionBreakdown,
      recommendedPath,
      nextReassessmentDate,
      reassessmentTriggers,
    };
  }

  /**
   * Kiểm tra các kích hoạt đánh giá lại thích ứng
   */
  checkAdaptiveTriggers(
    current: CompositeAssessment,
    performance: {
      avgScore: number;
      streak: number;
      completionRate: number;
    }
  ): ReassessmentTrigger[] {
    const triggers: ReassessmentTrigger[] = [];
    const now = new Date();

    // Kích hoạt 1: Giảm hiệu suất (>10%)
    if (performance.avgScore < current.compositeScore - 10) {
      triggers.push({
        type: 'performance_drop',
        triggeredAt: now,
        reason: `Điểm số giảm từ ${current.compositeScore} xuống ${performance.avgScore}`,
        priority: 'high',
        autoTriggered: true,
        metrics: [
          {
            metric: 'Điểm số trung bình',
            previousValue: current.compositeScore,
            currentValue: performance.avgScore,
            threshold: 10,
          },
        ],
      });
    }

    // Kích hoạt 2: Tăng hiệu suất vượt bậc (>15%)
    if (performance.avgScore > current.compositeScore + 15) {
      triggers.push({
        type: 'performance_surge',
        triggeredAt: now,
        reason: `Tiến bộ vượt bậc: từ ${current.compositeScore} lên ${performance.avgScore}`,
        priority: 'medium',
        autoTriggered: true,
        metrics: [
          {
            metric: 'Điểm số trung bình',
            previousValue: current.compositeScore,
            currentValue: performance.avgScore,
            threshold: 15,
          },
        ],
      });
    }

    // Kích hoạt 3: Mất streak > 7 ngày
    if (performance.streak > 7) {
      triggers.push({
        type: 'streak_break',
        triggeredAt: now,
        reason: `Mất chuỗi học tập trong ${performance.streak} ngày`,
        priority: 'high',
        autoTriggered: true,
        metrics: [
          {
            metric: 'Số ngày không học',
            previousValue: 0,
            currentValue: performance.streak,
            threshold: 7,
          },
        ],
      });
    }

    // Kích hoạt 4: Mất cân bằng độ khó
    if (performance.completionRate < 30 || performance.completionRate > 90) {
      triggers.push({
        type: 'difficulty_mismatch',
        triggeredAt: now,
        reason:
          performance.completionRate < 30
            ? 'Nội dung quá khó (tỷ lệ hoàn thành < 30%)'
            : 'Nội dung quá dễ (tỷ lệ hoàn thành > 90%)',
        priority: 'medium',
        autoTriggered: true,
        metrics: [
          {
            metric: 'Tỷ lệ hoàn thành',
            previousValue: 50,
            currentValue: performance.completionRate,
            threshold: performance.completionRate < 30 ? 30 : 90,
          },
        ],
      });
    }

    return triggers;
  }

  /**
   * Tạo kết quả đánh giá lại với so sánh và điều chỉnh lộ trình
   */
  generateReassessmentResult(
    previous: CompositeAssessment,
    current: CompositeAssessment,
    trigger: ReassessmentTrigger
  ): ReassessmentResult {
    // So sánh các chiều
    const comparison = previous.dimensionBreakdown.map((prevDim, index) => {
      const currDim = current.dimensionBreakdown[index];
      const change = currDim.score - prevDim.score;
      const trend =
        change > 5 ? ('improving' as const) : change < -5 ? ('declining' as const) : ('stable' as const);

      return {
        dimension: prevDim.dimension,
        previousScore: Math.round(prevDim.score),
        currentScore: Math.round(currDim.score),
        change: Math.round(change),
        trend,
      };
    });

    // Tạo điều chỉnh lộ trình
    const pathAdjustments = this.generatePathAdjustments(
      trigger,
      previous,
      current,
      comparison
    );

    // Lập lịch đánh giá lại tiếp theo
    const nextScheduledReassessment = this.scheduleNextReassessment(
      trigger.type
    );

    // Tạo các điểm kiểm tra thích ứng (mỗi tuần)
    const adaptiveCheckpoints: Date[] = [];
    for (let i = 1; i <= 4; i++) {
      const checkpointDate = new Date();
      checkpointDate.setDate(checkpointDate.getDate() + i * 7);
      adaptiveCheckpoints.push(checkpointDate);
    }

    return {
      id: `reassessment_${Date.now()}`,
      studentId: current.studentId,
      previousAssessmentId: previous.id,
      trigger,
      performedAt: new Date(),
      comparison,
      pathAdjustments,
      nextScheduledReassessment,
      adaptiveCheckpoints,
    };
  }

  /**
   * ====== HELPER METHODS ======
   */

  /**
   * Tính toán năng lực tổng quát
   */
  private calculateOverallReadiness(survey: StudentProfileSurvey): number {
    const gpaScore = (survey.currentGPA / 10) * 100;
    const academicLevelScore = this.academicLevelToScore(survey.academicLevel);
    const confidenceScore =
      Object.values(survey.selfRatedConfidence).reduce((a, b) => a + b, 0) /
      Object.keys(survey.selfRatedConfidence).length *
      20;

    return Math.round((gpaScore + academicLevelScore + confidenceScore) / 3);
  }

  /**
   * Chuyển đổi cấp độ học vấn thành điểm
   */
  private academicLevelToScore(level: string): number {
    const scoreMap: Record<string, number> = {
      thpt_10: 50,
      thpt_11: 60,
      thpt_12: 70,
      university_1: 75,
      university_2: 80,
      university_3: 85,
      university_4: 90,
      postgrad: 95,
    };
    return scoreMap[level] || 50;
  }

  /**
   * Tính điểm phù hợp phong cách học tập
   */
  private calculateLearningStyleMatch(survey: StudentProfileSurvey): number {
    // Các loại nội dung được ưa thích
    const contentTypeScore = {
      video: survey.learningStyle === 'visual' ? 25 : 15,
      text: survey.learningStyle === 'reading_writing' ? 25 : 15,
      interactive:
        survey.learningStyle === 'kinesthetic' ? 25 : 15,
      quiz: 15,
      project: survey.learningStyle === 'kinesthetic' ? 25 : 15,
    };

    const total = survey.preferredContentType.reduce((sum, type) => {
      return sum + (contentTypeScore[type as keyof typeof contentTypeScore] || 0);
    }, 0);

    return Math.min(100, total);
  }

  /**
   * Tính mức kiến thức nền
   */
  private calculatePriorKnowledgeLevel(survey: StudentProfileSurvey): number {
    const strongSubjectsCount = survey.strongSubjects.length;
    const totalDomains = Object.values(survey.selfRatedConfidence).length;
    const avgConfidence =
      Object.values(survey.selfRatedConfidence).reduce((a, b) => a + b, 0) /
      totalDomains;

    const strengthRatio = (strongSubjectsCount / Math.max(totalDomains, 1)) * 100;
    const confidenceScore = avgConfidence * 20;

    return Math.round((strengthRatio + confidenceScore) / 2);
  }

  /**
   * Tính chỉ số động lực
   */
  private calculateMotivationIndex(survey: StudentProfileSurvey): number {
    const motivationDriverScore =
      survey.motivationDrivers.length * 15 +
      (survey.motivationDrivers.includes('grades') ? 10 : 0) +
      (survey.motivationDrivers.includes('career') ? 10 : 0) +
      (survey.motivationDrivers.includes('self_improvement') ? 10 : 0);

    const goalScore =
      survey.primaryGoal === 'research'
        ? 30
        : survey.primaryGoal === 'career_oriented'
          ? 28
          : survey.primaryGoal === 'passion_project'
            ? 26
            : 20;

    return Math.min(100, Math.round(motivationDriverScore + goalScore));
  }

  /**
   * Tính điểm sẵn có thời gian
   */
  private calculateTimeAvailability(survey: StudentProfileSurvey): number {
    const weeklyHoursScore = {
      light: 30,
      moderate: 60,
      intensive: 85,
      fulltime: 100,
    };

    const availableDaysScore = (survey.availableDays.length / 7) * 40;
    const sessionDurationScore = {
      '15min': 20,
      '30min': 40,
      '45min': 60,
      '60min': 80,
      '90min': 100,
    };

    const durationScore =
      sessionDurationScore[
        survey.studySessionDuration as keyof typeof sessionDurationScore
      ] || 50;
    const internetScore =
      survey.hasInternetAccess === 'always'
        ? 30
        : survey.hasInternetAccess === 'mostly'
          ? 20
          : 10;

    return Math.round(
      (weeklyHoursScore[survey.weeklyHours] +
        availableDaysScore +
        durationScore +
        internetScore) /
        3
    );
  }

  /**
   * Xác định độ khó khởi đầu
   */
  private determineStartingDifficulty(
    readiness: number,
    priorKnowledge: number
  ): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 {
    const avg = (readiness + priorKnowledge) / 2;
    if (avg >= 85) return 8;
    if (avg >= 75) return 6;
    if (avg >= 65) return 5;
    if (avg >= 50) return 4;
    if (avg >= 35) return 3;
    return 1;
  }

  /**
   * Chấm điểm các nền tảng AI dựa trên mục tiêu và ngôn ngữ
   */
  private scorePlatforms(survey: StudentProfileSurvey) {
    const isCoding = survey.interestedDomains.includes(SubjectDomain.COMPUTER_SCIENCE);
    const isResearch = survey.primaryGoal === 'research';
    const isVietnamesePriority = survey.preferredLanguage === 'vi';
    const isBudgetConscious = survey.weeklyHours === 'light';
    const isBeginnerLevel = survey.academicLevel.startsWith('thpt');

    return [
      this.scorePlatform(
        'openai',
        {
          contentQuality: isCoding ? 92 : 85,
          personalization: isCoding ? 88 : 80,
          interactivity: isCoding ? 90 : 82,
          costEfficiency: 70,
          domainExpertise: isCoding ? 95 : 85,
          languageSupport: isVietnamesePriority ? 75 : 85,
        }
      ),
      this.scorePlatform(
        'gemini',
        {
          contentQuality: isBeginnerLevel ? 95 : 88,
          personalization: isBeginnerLevel ? 93 : 85,
          interactivity: isBeginnerLevel ? 87 : 80,
          costEfficiency: isBudgetConscious ? 95 : 85,
          domainExpertise: isResearch ? 88 : 82,
          languageSupport: isVietnamesePriority ? 78 : 82,
        }
      ),
      this.scorePlatform(
        'grok',
        {
          contentQuality: 78,
          personalization: 75,
          interactivity: 76,
          costEfficiency: 80,
          domainExpertise: 72,
          languageSupport: 70,
        }
      ),
      this.scorePlatform(
        'claude',
        {
          contentQuality: isResearch ? 93 : 88,
          personalization: 87,
          interactivity: 85,
          costEfficiency: 75,
          domainExpertise: isResearch ? 92 : 85,
          languageSupport: isVietnamesePriority ? 98 : 88,
        }
      ),
    ];
  }

  /**
   * Chấm điểm nền tảng AI riêng lẻ
   */
  private scorePlatform(
    platform: string,
    dimensions: {
      contentQuality: number;
      personalization: number;
      interactivity: number;
      costEfficiency: number;
      domainExpertise: number;
      languageSupport: number;
    }
  ) {
    const totalScore = Math.round(
      (dimensions.contentQuality +
        dimensions.personalization +
        dimensions.interactivity +
        dimensions.costEfficiency +
        dimensions.domainExpertise +
        dimensions.languageSupport) /
        6
    );

    return {
      platform: platform as 'openai' | 'gemini' | 'grok' | 'claude',
      totalScore,
      dimensions,
    };
  }

  /**
   * Tạo khuyến nghị kết hợp nền tảng AI
   */
  private generateHybridRecommendation(
    survey: StudentProfileSurvey,
    platformScores: ReturnType<AssessmentEngine['scorePlatforms']>
  ) {
    const isCoding = survey.interestedDomains.includes(SubjectDomain.COMPUTER_SCIENCE);
    const isResearch = survey.primaryGoal === 'research';

    const phases = [];

    // Giai đoạn 1: Khởi đầu
    const beginnerPlatform = platformScores.reduce((best, current) =>
      current.totalScore > best.totalScore ? current : best
    );
    phases.push({
      phase: 'Khởi đầu (Tuần 1-2)',
      primaryPlatform: beginnerPlatform.platform,
      reason: 'Nền tảng tốt nhất cho giáo dục nền tảng và cá nhân hóa',
    });

    // Giai đoạn 2: Phát triển
    if (isCoding) {
      phases.push({
        phase: 'Phát triển (Tuần 3-6)',
        primaryPlatform: 'openai',
        reason: 'OpenAI vượt trội trong chuyên môn coding và tương tác',
      });
    } else if (isResearch) {
      phases.push({
        phase: 'Phát triển (Tuần 3-6)',
        primaryPlatform: 'claude',
        reason: 'Claude xuất sắc trong nghiên cứu và độ sâu',
      });
    } else {
      phases.push({
        phase: 'Phát triển (Tuần 3-6)',
        primaryPlatform: 'gemini',
        reason: 'Gemini cân bằng tốt trong chất lượng nội dung',
      });
    }

    // Giai đoạn 3: Nâng cao
    phases.push({
      phase: 'Nâng cao (Tuần 7+)',
      primaryPlatform: 'claude',
      reason: 'Claude cung cấp sự hiểu biết sâu sắc nhất cho nội dung phức tạp',
    });

    return phases;
  }

  /**
   * Tạo lộ trình học tập đề xuất
   */
  private generateRecommendedPath(
    survey: StudentProfileSurvey,
    profile: StudentProfileScore,
    compositeScore: number
  ) {
    const domainsToLearn = survey.interestedDomains.slice(0, 4);
    const estimatedMonths = compositeScore > 80 ? '3-4' : compositeScore > 60 ? '4-6' : '6-8';

    const weeklyPlan = [];
    const weeksTotal = compositeScore > 80 ? 12 : compositeScore > 60 ? 16 : 20;

    for (let week = 1; week <= Math.min(8, weeksTotal); week++) {
      const domainIndex = (week - 1) % domainsToLearn.length;
      weeklyPlan.push({
        week,
        focus: `Khám phá ${domainsToLearn[domainIndex]}`,
        domains: [domainsToLearn[domainIndex]],
        hours: Math.ceil(
          (survey.weeklyHours === 'light'
            ? 5
            : survey.weeklyHours === 'moderate'
              ? 10
              : survey.weeklyHours === 'intensive'
                ? 15
                : 20) / 4
        ),
        milestones: [
          `Hoàn thành bài học lý thuyết`,
          `Thực hành bài tập`,
          `Quiz kiểm tra`,
        ],
      });
    }

    return {
      domains: domainsToLearn,
      estimatedDuration: `${estimatedMonths} tháng`,
      startingDifficulty: profile.recommendedStartingDifficulty,
      weeklyPlan,
    };
  }

  /**
   * Tạo điều chỉnh lộ trình dựa trên kết quả đánh giá lại
   */
  private generatePathAdjustments(
    trigger: ReassessmentTrigger,
    _previous: CompositeAssessment,
    current: CompositeAssessment,
    comparison: Array<{
      dimension: string;
      previousScore: number;
      currentScore: number;
      change: number;
      trend: string;
    }>
  ) {
    const adjustments = [];

    if (trigger.type === 'performance_drop') {
      adjustments.push({
        type: 'difficulty_change' as const,
        description: 'Giảm độ khó để xây dựng lại tự tin',
        oldValue: `Độ khó ${current.recommendedPath.startingDifficulty}`,
        newValue: `Độ khó ${Math.max(1, current.recommendedPath.startingDifficulty - 2)}`,
        reasoning: 'Giảm độ khó sẽ giúp học sinh tránh được choáng ngợp',
      });
    }

    if (trigger.type === 'performance_surge') {
      adjustments.push({
        type: 'difficulty_change' as const,
        description: 'Tăng độ khó để duy trì thử thách',
        oldValue: `Độ khó ${current.recommendedPath.startingDifficulty}`,
        newValue: `Độ khó ${Math.min(10, current.recommendedPath.startingDifficulty + 2)}`,
        reasoning: 'Tăng độ khó sẽ ngăn chặn sự nhàm chán',
      });
    }

    if (trigger.type === 'difficulty_mismatch') {
      adjustments.push({
        type: 'content_swap' as const,
        description: 'Thay thế nội dung không phù hợp',
        oldValue: 'Nội dung hiện tại',
        newValue: 'Nội dung được lựa chọn lại',
        reasoning: 'Nội dung hiện tại không phù hợp với trình độ của học sinh',
      });
    }

    if (trigger.type === 'streak_break') {
      adjustments.push({
        type: 'pace_change' as const,
        description: 'Điều chỉnh lộ trình học tập linh hoạt hơn',
        oldValue: 'Lộ trình cứng nhắc',
        newValue: 'Lộ trình linh hoạt với những điểm dừng lại',
        reasoning: 'Xây dựng thói quen học tập với các khoảng thời gian ngắn hơn',
      });
    }

    const decliningDimensions = comparison.filter((c) => c.trend === 'declining');
    if (decliningDimensions.length > 0) {
      adjustments.push({
        type: 'domain_add' as const,
        description: `Thêm tài nguyên hỗ trợ cho ${decliningDimensions[0].dimension}`,
        oldValue: 'Tài nguyên hiện tại',
        newValue: 'Tài nguyên bổ sung',
        reasoning: `Điểm ${decliningDimensions[0].dimension} đang giảm, cần hỗ trợ bổ sung`,
      });
    }

    return adjustments.length > 0
      ? adjustments
      : [
          {
            type: 'milestone_shift' as const,
            description: 'Duy trì lộ trình hiện tại',
            oldValue: 'Lộ trình hiện tại',
            newValue: 'Lộ trình hiện tại',
            reasoning: 'Tiếp tục với lộ trình hiện tại vì tiến bộ ổn định',
          },
        ];
  }

  /**
   * Lập lịch đánh giá lại tiếp theo
   */
  private scheduleNextReassessment(
    triggerType: ReassessmentTriggerType
  ): Date {
    const nextDate = new Date();

    switch (triggerType) {
      case 'scheduled_periodic':
        nextDate.setDate(nextDate.getDate() + 21); // 3 tuần
        break;
      case 'post_module':
        nextDate.setDate(nextDate.getDate() + 7); // 1 tuần
        break;
      case 'performance_drop':
      case 'streak_break':
        nextDate.setDate(nextDate.getDate() + 14); // 2 tuần
        break;
      case 'performance_surge':
        nextDate.setDate(nextDate.getDate() + 28); // 4 tuần
        break;
      case 'difficulty_mismatch':
        nextDate.setDate(nextDate.getDate() + 7); // 1 tuần
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 21); // Mặc định 3 tuần
    }

    return nextDate;
  }

  /**
   * Tạo phản hồi từ chuyên gia
   */
  private generateMentorFeedback(domain: SubjectDomain, score: number): string {
    if (score >= 90) {
      return `Lộ trình cho lĩnh vực ${domain} được phê duyệt - Chất lượng nội dung xuất sắc`;
    }
    if (score >= 75) {
      return `Lộ trình cho lĩnh vực ${domain} cần sửa đổi nhẹ - Cân nhắc điều chỉnh độ khó`;
    }
    return `Lộ trình cho lĩnh vực ${domain} cần xây dựng lại - Xem xét lại cấu trúc`;
  }

  /**
   * Tạo các sửa đổi được đề xuất
   */
  private generateModifications(domain: SubjectDomain): string[] {
    return [
      `Thêm ví dụ thực tế cho ${domain}`,
      `Tăng bài tập tương tác`,
      `Sơn ghi mục tiên quyết đổi`,
      `Bổ sung tài liệu tham khảo`,
    ];
  }

  /**
   * Bình thường hóa điểm (0-100)
   */
  private normalizeScore(score: number): number {
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Tạo điểm ngẫu nhiên trong phạm vi
   */
  private randomScore(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

/**
 * Singleton instance
 */
export const assessmentEngine = new AssessmentEngine();
