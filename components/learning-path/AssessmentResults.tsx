'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  CheckCircle,
  AlertCircle,
  Zap,
  Brain,
  Users,
  Cpu,
  Calendar,
  Clock,
  TrendingUp,
  Play,
  RefreshCw,
} from 'lucide-react';
import { CompositeAssessment } from '@/lib/learning-path/assessment-types';

interface AssessmentResultsProps {
  assessment: CompositeAssessment;
  onStartLearning: () => void;
  onRetakeSurvey: () => void;
}

const platformNameMap: Record<string, string> = {
  openai: 'OpenAI GPT-4',
  gemini: 'Google Gemini',
  grok: 'xAI Grok',
  claude: 'Anthropic Claude',
};

const getScoreColor = (score: number) => {
  if (score >= 75) return 'from-emerald-400 to-emerald-600';
  if (score >= 50) return 'from-amber-400 to-amber-600';
  return 'from-rose-400 to-rose-600';
};

const getScoreBgColor = (score: number) => {
  if (score >= 75) return 'bg-emerald-500/20 border-emerald-500/30';
  if (score >= 50) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-rose-500/20 border-rose-500/30';
};

export default function AssessmentResults({
  assessment,
  onStartLearning,
  onRetakeSurvey,
}: AssessmentResultsProps) {
  const platformScores = useMemo(() => {
    const raw = assessment.aiScoringMatrix?.platformScores;
    if (!raw) return [];

    // platformScores can be an array of { platform, totalScore, dimensions }
    // or a Record<string, number> — handle both formats
    if (Array.isArray(raw)) {
      return raw
        .map((item: any) => ({
          platform: item.platform || 'unknown',
          displayName: platformNameMap[item.platform] || item.platform || 'Unknown',
          score: typeof item.totalScore === 'number' ? item.totalScore : 0,
        }))
        .sort((a, b) => b.score - a.score);
    }

    // Legacy format: Record<string, number>
    return Object.entries(raw)
      .map(([platform, score]) => ({
        platform,
        displayName: platformNameMap[platform] || platform,
        score: typeof score === 'number' ? score : 0,
      }))
      .sort((a, b) => b.score - a.score);
  }, [assessment.aiScoringMatrix]);

  const nextReassessmentDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  const scoreIndicator = (score: number) => {
    if (score >= 75) return { icon: CheckCircle, color: 'text-emerald-400' };
    if (score >= 50) return { icon: AlertCircle, color: 'text-amber-400' };
    return { icon: AlertCircle, color: 'text-rose-400' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Kết Quả Đánh Giá
          </h1>
          <p className="text-white/60">
            Phân tích toàn diện về lộ trình học tập phù hợp với bạn
          </p>
        </div>

        {/* 1. Overall Score Card */}
        <div className="mb-8 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Circular Progress */}
            <div className="flex-shrink-0">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke={
                      assessment.compositeScore >= 75
                        ? 'url(#scoreGradientGreen)'
                        : assessment.compositeScore >= 50
                          ? 'url(#scoreGradientAmber)'
                          : 'url(#scoreGradientRed)'
                    }
                    strokeWidth="8"
                    strokeDasharray={`${(assessment.compositeScore / 100) * (2 * Math.PI * 88)} ${2 * Math.PI * 88}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient
                      id="scoreGradientGreen"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient
                      id="scoreGradientAmber"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient
                      id="scoreGradientRed"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold">
                    {Math.round(assessment.compositeScore)}
                  </span>
                  <span className="text-white/60 text-sm">/ 100</span>
                </div>
              </div>
            </div>

            {/* Score Info */}
            <div className="flex-1">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.1] mb-4">
                  <span className="text-white/80 text-sm">
                    Loại đánh giá:
                  </span>
                  <span className="font-semibold text-blue-400">
                    {assessment.assessmentType || 'Toàn diện'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Đánh Giá Tổng Thể
                  </h3>
                  <p className="text-white/70">
                    {assessment.compositeScore >= 75
                      ? 'Bạn có nền tảng tuyệt vời để bắt đầu hành trình học tập. Chúng tôi sẽ tối ưu hóa lộ trình cho bạn.'
                      : assessment.compositeScore >= 50
                        ? 'Bạn có những nền tảng cơ bản tốt. Chúng tôi sẽ giúp bạn phát triển từng bước.'
                        : 'Bạn cần hỗ trợ thêm. Chúng tôi sẽ tạo một lộ trình phù hợp từ cơ bản.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  {[
                    {
                      label: 'Hồ sơ học sinh',
                      value: Math.round(assessment.studentProfile?.overallReadiness || 0),
                      weight: '35%',
                    },
                    {
                      label: 'Xác thực cố vấn',
                      value: Math.round(
                        (assessment.mentorValidation || []).reduce((sum: number, m) => {
                          const avg = (m.contentAccuracy + m.difficultyAppropriateness + m.prerequisiteCompleteness + m.pedagogicalSoundness) / 4;
                          return sum + avg;
                        }, 0) / Math.max(1, (assessment.mentorValidation || []).length)
                      ),
                      weight: '25%',
                    },
                    {
                      label: 'Hội đồng đa ngành',
                      value: Math.round(
                        assessment.crossDisciplinaryPanel?.coherenceScore || 0
                      ),
                      weight: '20%',
                    },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {item.value}
                      </div>
                      <p className="text-xs text-white/60 mt-1">{item.label}</p>
                      <p className="text-xs text-white/40">{item.weight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 4 Dimension Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Chi Tiết 4 Chiều Đánh Giá</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Profile Score */}
            <div
              className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 hover:border-blue-400/50 ${getScoreBgColor(assessment.studentProfile?.overallReadiness || 0)}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold">Hồ Sơ Học Sinh</h3>
                <span className="text-xs text-white/60 ml-auto">35%</span>
              </div>

              <div className="text-3xl font-bold mb-4 text-blue-400">
                {Math.round(assessment.studentProfile?.overallReadiness || 0)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Sự sẵn sàng</span>
                  <span className="font-medium">
                    {assessment.studentProfile?.overallReadiness || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Phong cách học</span>
                  <span className="font-medium">
                    {assessment.studentProfile?.learningStyleMatch || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Kiến thức trước</span>
                  <span className="font-medium">
                    {assessment.studentProfile?.priorKnowledgeLevel || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Động lực</span>
                  <span className="font-medium">
                    {assessment.studentProfile?.motivationIndex || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Thời gian có sẵn</span>
                  <span className="font-medium">
                    {assessment.studentProfile?.timeAvailabilityScore || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Mentor Validation */}
            <div
              className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 hover:border-purple-400/50 ${getScoreBgColor(
                (assessment.mentorValidation || []).reduce((sum: number, m) => {
                  const avg = (m.contentAccuracy + m.difficultyAppropriateness + m.prerequisiteCompleteness + m.pedagogicalSoundness) / 4;
                  return sum + avg;
                }, 0) / Math.max(1, (assessment.mentorValidation || []).length)
              )}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold">Xác Thực Cố Vấn</h3>
                <span className="text-xs text-white/60 ml-auto">25%</span>
              </div>

              <div className="text-3xl font-bold mb-4 text-purple-400">
                {Math.round(
                  (assessment.mentorValidation || []).reduce((sum: number, m) => {
                    const avg = (m.contentAccuracy + m.difficultyAppropriateness + m.prerequisiteCompleteness + m.pedagogicalSoundness) / 4;
                    return sum + avg;
                  }, 0) / Math.max(1, (assessment.mentorValidation || []).length)
                )}
              </div>

              <p className="text-white/70 text-sm mb-4">
                Trung bình đánh giá từ các cố vấn
              </p>

              <div className="space-y-2">
                {assessment.mentorValidation && assessment.mentorValidation.length > 0 ? (
                  assessment.mentorValidation.slice(0, 3).map((mentor: any, idx: number) => {
                    const avgScore = (mentor.contentAccuracy + mentor.difficultyAppropriateness + mentor.prerequisiteCompleteness + mentor.pedagogicalSoundness) / 4;
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-white/60 truncate">
                          {mentor.mentorId || `Cố vấn ${idx + 1}`}
                        </span>
                        <span className="font-medium text-purple-300">
                          {Math.round(avgScore)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-white/50 text-sm">Chưa có đánh giá</p>
                )}
              </div>
            </div>

            {/* Cross-Disciplinary Panel */}
            <div
              className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 hover:border-pink-400/50 ${getScoreBgColor(assessment.crossDisciplinaryPanel?.coherenceScore || 0)}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-pink-400" />
                <h3 className="font-semibold">Hội Đồng Đa Ngành</h3>
                <span className="text-xs text-white/60 ml-auto">20%</span>
              </div>

              <div className="text-3xl font-bold mb-4 text-pink-400">
                {Math.round(assessment.crossDisciplinaryPanel?.coherenceScore || 0)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Chất lượng chuyển tiếp</span>
                  <span className="font-medium">
                    {assessment.crossDisciplinaryPanel?.transitionQuality || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Tích hợp kiến thức</span>
                  <span className="font-medium">
                    {assessment.crossDisciplinaryPanel?.knowledgeIntegration ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Tính thực tế</span>
                  <span className="font-medium">
                    {assessment.crossDisciplinaryPanel?.practicalRelevance || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Sự liên kết</span>
                  <span className="font-medium">
                    {assessment.crossDisciplinaryPanel?.coherenceScore || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Scoring Matrix */}
            <div
              className={`p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 hover:border-cyan-400/50 ${getScoreBgColor(
                (assessment.aiScoringMatrix?.platformScores || []).reduce((sum: number, p) => sum + (p.totalScore || 0), 0) / Math.max(1, (assessment.aiScoringMatrix?.platformScores || []).length)
              )}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold">Ma Trận Chấm Điểm AI</h3>
                <span className="text-xs text-white/60 ml-auto">20%</span>
              </div>

              <div className="text-3xl font-bold mb-4 text-cyan-400">
                {Math.round(
                  (assessment.aiScoringMatrix?.platformScores || []).reduce((sum: number, p) => sum + (p.totalScore || 0), 0) / Math.max(1, (assessment.aiScoringMatrix?.platformScores || []).length)
                )}
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-white/70 mb-3">
                  Nền tảng được đề xuất:{' '}
                  <span className="text-cyan-400 font-medium">
                    {platformNameMap[
                      (assessment.aiScoringMatrix?.platformScores || []).length > 0
                        ? (assessment.aiScoringMatrix?.platformScores || [])[0].platform
                        : 'openai'
                    ] || 'OpenAI GPT-4'}
                  </span>
                </p>
                {assessment.aiScoringMatrix?.platformScores && assessment.aiScoringMatrix.platformScores.length > 0 && (
                  <div className="space-y-1">
                    {assessment.aiScoringMatrix.platformScores
                      .slice(0, 2)
                      .map((comp: any, idx: number) => (
                        <div key={idx} className="text-xs text-white/60">
                          {platformNameMap[comp.platform] || comp.platform}:{' '}
                          <span className="text-cyan-300 font-medium">
                            {comp.totalScore}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. AI Platform Recommendation */}
        <div className="mb-8 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-300">
          <h2 className="text-2xl font-bold mb-6">Khuyến Nghị Nền Tảng AI</h2>

          <div className="space-y-4">
            {platformScores.map((platform, idx) => (
              <div key={platform.platform} className="group">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-sm font-semibold text-white/60 w-2">
                    {idx + 1}
                  </span>
                  <span className="font-medium flex-1">{platform.displayName}</span>
                  <span className="text-sm font-bold text-blue-400">
                    {Math.round(platform.score)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="ml-6 h-2 bg-white/[0.05] rounded-full overflow-hidden mb-2 border border-white/[0.1]">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${platform.score}%` }}
                  />
                </div>

                {/* Recommendation Text */}
                <p className="ml-6 text-xs text-white/60">
                  {idx === 0
                    ? 'Lựa chọn hàng đầu dựa trên hồ sơ của bạn'
                    : idx === 1
                      ? 'Lựa chọn thay thế tốt'
                      : 'Có thể sử dụng cho các mục đích chuyên biệt'}
                </p>
              </div>
            ))}
          </div>

          {/* Hybrid Recommendation Timeline */}
          <div className="mt-8 p-6 bg-white/[0.05] rounded-xl border border-white/[0.1]">
            <h3 className="font-semibold mb-4 text-white/90">
              Lịch Trình Khuyến Nghị Hybrid
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Giai đoạn 1-2: Nền tảng chính</p>
                  <p className="text-xs text-white/60">
                    {platformNameMap[
                      (assessment.aiScoringMatrix?.platformScores || []).length > 0
                        ? (assessment.aiScoringMatrix?.platformScores || [])[0].platform
                        : 'openai'
                    ] || 'OpenAI GPT-4'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Giai đoạn 3: Nền tảng bổ sung</p>
                  <p className="text-xs text-white/60">
                    {platformScores[1]?.displayName || 'Theo khuyến nghị'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-pink-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Giai đoạn 4+: Đa dạng hóa</p>
                  <p className="text-xs text-white/60">
                    Khám phá theo tùy chọn cá nhân
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Recommended Learning Path */}
        <div className="mb-8 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-300">
          <h2 className="text-2xl font-bold mb-6">Lộ Trình Học Tập Được Khuyến Nghị</h2>

          {/* Timeline */}
          <div className="relative">
            {/* Difficulty Indicator */}
            <div className="mb-6 p-4 bg-white/[0.05] rounded-lg border border-white/[0.1]">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold">Mức Khó Bắt Đầu</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-2 flex-1">
                  {['Cơ bản', 'Trung bình', 'Nâng cao'].map((level, idx) => (
                    <div
                      key={level}
                      className={`flex-1 h-2 rounded-full ${
                        idx === 0
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          : 'bg-white/[0.1]'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-white/60 font-medium">
                  Cơ bản
                </span>
              </div>
            </div>

            {/* Weekly Plan */}
            <div className="space-y-4">
              {[
                {
                  week: 'Tuần 1-2',
                  domain: 'Kiến thức cơ bản',
                  hours: 10,
                  color: 'from-blue-500 to-blue-600',
                  milestone: 'Hiểu khái niệm',
                },
                {
                  week: 'Tuần 3-4',
                  domain: 'Ứng dụng thực tế',
                  hours: 15,
                  color: 'from-purple-500 to-purple-600',
                  milestone: 'Thực hành cơ bản',
                },
                {
                  week: 'Tuần 5-6',
                  domain: 'Dự án tích hợp',
                  hours: 20,
                  color: 'from-pink-500 to-pink-600',
                  milestone: 'Hoàn thành dự án',
                },
                {
                  week: 'Tuần 7+',
                  domain: 'Chuyên sâu',
                  hours: 15,
                  color: 'from-cyan-500 to-cyan-600',
                  milestone: 'Nâng cao kỹ năng',
                },
              ].map((item, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-start gap-4">
                    {/* Timeline Dot */}
                    <div className="mt-2">
                      <div
                        className={`w-4 h-4 rounded-full bg-gradient-to-br ${item.color} ring-2 ring-slate-900 group-hover:ring-4 transition-all`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-8 border-l border-white/[0.1] ml-2 group-last:border-l-transparent">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                        <span className="font-semibold text-white/90">
                          {item.week}
                        </span>
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${item.color} text-white`}
                          >
                            {item.domain}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-white/60">
                            <Clock className="w-4 h-4" />
                            {item.hours}h
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-white/70">
                        <CheckCircle className="w-4 h-4 inline mr-2 text-green-400" />
                        {item.milestone}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Duration */}
            <div className="mt-8 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center gap-2 text-white/80">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span>
                  <span className="font-semibold">Thời gian dự kiến:</span> 7-8
                  tuần (60 giờ)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Next Re-Assessment & CTA */}
        <div className="mb-12 p-8 rounded-2xl bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-white/[0.01] border border-white/[0.1] backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Reassessment Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Đánh Giá Lại Tiếp Theo
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-white/[0.05] rounded-lg border border-white/[0.1]">
                  <p className="text-sm text-white/60 mb-2">Ngày dự kiến</p>
                  <p className="text-xl font-bold text-blue-400">
                    {nextReassessmentDate}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-white/60 mb-3 font-semibold">
                    Các yếu tố kích hoạt đánh giá sớm:
                  </p>
                  <ul className="space-y-2 text-sm">
                    {[
                      'Hoàn thành 2 giai đoạn học tập',
                      'Đạt mốc 50 giờ học tập',
                      'Thay đổi mục tiêu học tập',
                      'Yêu cầu từ cố vấn',
                    ].map((trigger, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        <span className="text-white/70">{trigger}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-4">Bắt Đầu Học Tập</h3>
                <p className="text-white/70 text-sm mb-6">
                  Bạn đã sẵn sàng bắt đầu lộ trình học tập được cá nhân hóa.
                  Nhấp dưới đây để tiếp tục.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={onStartLearning}
                  className="w-full group relative px-6 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  <span>Bắt Đầu Học</span>
                </button>

                <button
                  onClick={onRetakeSurvey}
                  className="w-full px-6 py-3 rounded-xl font-semibold text-white/80 border border-white/20 hover:border-white/40 hover:bg-white/[0.05] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Làm Lại Khảo Sát</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
