'use client';

import React, { useMemo } from 'react';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Zap,
  Activity,
  Calendar,
  Target,
  BookOpen,
} from 'lucide-react';
import { CompositeAssessment, ReassessmentResult, ReassessmentTriggerType } from '@/lib/learning-path/assessment-types';

interface ReAssessmentDashboardProps {
  currentAssessment: CompositeAssessment;
  reassessmentHistory: ReassessmentResult[];
  onTriggerReassessment: () => void;
  performanceData: {
    avgScore: number;
    streak: number;
    completionRate: number;
    weeklyHoursActual: number;
  };
}

const TRIGGER_LABELS: Record<ReassessmentTriggerType, string> = {
  scheduled_periodic: 'Định kỳ',
  post_module: 'Sau module',
  performance_drop: 'Điểm giảm',
  performance_surge: 'Tiến bộ vượt bậc',
  goal_change: 'Thay đổi mục tiêu',
  streak_break: 'Mất streak',
  difficulty_mismatch: 'Độ khó không phù hợp',
  time_availability_change: 'Thay đổi thời gian',
};

const TRIGGER_COLORS: Record<ReassessmentTriggerType, { bg: string; border: string; icon: string }> = {
  scheduled_periodic: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400' },
  post_module: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: 'text-purple-400' },
  performance_drop: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-400' },
  performance_surge: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: 'text-green-400' },
  goal_change: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: 'text-cyan-400' },
  streak_break: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'text-orange-400' },
  difficulty_mismatch: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400' },
  time_availability_change: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', icon: 'text-indigo-400' },
};

const TRIGGER_EXPLANATIONS: Record<ReassessmentTriggerType, string> = {
  scheduled_periodic: 'Đã đến lúc đánh giá định kỳ',
  post_module: 'Vừa hoàn thành một module',
  performance_drop: 'Điểm số giảm đáng kể',
  performance_surge: 'Tiến bộ vượt mục tiêu',
  goal_change: 'Mục tiêu học tập được thay đổi',
  streak_break: 'Chuỗi hoàn thành bị gián đoạn',
  difficulty_mismatch: 'Độ khó không phù hợp với trình độ',
  time_availability_change: 'Thời gian sẵn có thay đổi',
};

export const ReAssessmentDashboard: React.FC<ReAssessmentDashboardProps> = ({
  currentAssessment,
  reassessmentHistory,
  onTriggerReassessment,
  performanceData,
}) => {
  const daysUntilNext = useMemo(() => {
    if (!currentAssessment.nextReassessmentDate) return 0;
    const now = new Date();
    const next = new Date(currentAssessment.nextReassessmentDate);
    const diff = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [currentAssessment.nextReassessmentDate]);

  const activeTriggers = useMemo(() => {
    return (currentAssessment.reassessmentTriggers || [])
      .filter(t => t.priority !== 'low')
      .map(t => t.type);
  }, [currentAssessment.reassessmentTriggers]);

  const previousScore = useMemo(() => {
    if (reassessmentHistory.length === 0) return currentAssessment.compositeScore ?? 0;
    const lastResult = reassessmentHistory[reassessmentHistory.length - 1];
    return lastResult ? (lastResult as any).totalScore ?? currentAssessment.compositeScore ?? 0 : currentAssessment.compositeScore ?? 0;
  }, [reassessmentHistory, currentAssessment.compositeScore]);

  const scoreChange = (currentAssessment.compositeScore ?? 0) - (previousScore ?? 0);
  const scoreChangePercent = (previousScore ?? 0) > 0 ? ((scoreChange / (previousScore ?? 1)) * 100).toFixed(1) : 0;

  const assessmentTypeLabel = {
    scheduled_periodic: 'Đánh giá định kỳ',
    post_module: 'Đánh giá sau module',
    initial: 'Đánh giá ban đầu',
    periodic: 'Đánh giá định kỳ',
  }[(currentAssessment.assessmentType as string)] || 'Đánh giá';

  return (
    <div className="space-y-6">
      {/* Next Assessment Countdown */}
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-700/30 rounded-2xl p-6 hover:border-slate-600/50 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Đánh giá tiếp theo</h2>
            <p className="text-sm text-slate-400">{assessmentTypeLabel}</p>
          </div>
          <Clock className="w-6 h-6 text-cyan-400" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-cyan-400 mb-1">{daysUntilNext}</div>
            <p className="text-xs text-slate-400">Ngày còn lại</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-slate-300 mb-1">{(performanceData.avgScore ?? 0).toFixed(1)}</div>
            <p className="text-xs text-slate-400">Điểm trung bình</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-slate-300 mb-1">{performanceData.streak}</div>
            <p className="text-xs text-slate-400">Streak hiện tại</p>
          </div>
        </div>

        {activeTriggers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeTriggers.map((trigger: ReassessmentTriggerType) => {
              const color = TRIGGER_COLORS[trigger];
              return (
                <span
                  key={trigger}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${color.bg} ${color.border} text-slate-300`}
                >
                  {TRIGGER_LABELS[trigger]}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Trigger Alerts */}
      {activeTriggers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white px-1">Kích hoạt đánh giá</h3>
          {activeTriggers.map((trigger: ReassessmentTriggerType) => {
            const color = TRIGGER_COLORS[trigger];
            return (
              <div
                key={trigger}
                className={`bg-gradient-to-br ${color.bg} backdrop-blur-md border ${color.border} rounded-xl p-4`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color.icon}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{TRIGGER_LABELS[trigger]}</p>
                    <p className="text-xs text-slate-400 mt-1">{TRIGGER_EXPLANATIONS[trigger]}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Performance Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Average Score */}
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-700/30 rounded-xl p-4 hover:border-slate-600/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-300">Điểm trung bình</p>
            {scoreChange >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-white">{(performanceData.avgScore ?? 0).toFixed(1)}</span>
            <span className={`text-sm font-semibold ${scoreChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {scoreChange >= 0 ? '+' : ''}{scoreChangePercent}%
            </span>
          </div>
          <p className="text-xs text-slate-400">vs lần đánh giá trước: {(previousScore ?? 0).toFixed(1)}</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-700/30 rounded-xl p-4 hover:border-slate-600/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-300">Tỉ lệ hoàn thành</p>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mb-2">
            <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, performanceData.completionRate * 100)}%` }}
              />
            </div>
          </div>
          <p className="text-sm font-semibold text-white">{((performanceData.completionRate ?? 0) * 100).toFixed(0)}%</p>
        </div>

        {/* Current Streak */}
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-700/30 rounded-xl p-4 hover:border-slate-600/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-300">Streak hiện tại</p>
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{performanceData.streak}</p>
          <p className="text-xs text-slate-400">ngày liên tiếp hoàn thành</p>
        </div>

        {/* Weekly Hours */}
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-700/30 rounded-xl p-4 hover:border-slate-600/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-300">Giờ học/tuần</p>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">{(performanceData.weeklyHoursActual ?? 0).toFixed(1)}h</p>
          <p className="text-xs text-slate-400">thực tế hoàn thành</p>
        </div>
      </div>

      {/* Assessment History Timeline */}
      {reassessmentHistory.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-md border border-slate-700/30 rounded-2xl p-6 hover:border-slate-600/50 transition-all">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            Lịch sử đánh giá
          </h3>

          <div className="space-y-4 max-h-80 overflow-y-auto">
            {reassessmentHistory.slice().reverse().map((result: any, idx: number) => {
              const resultScore = result.totalScore ?? result.compositeScore ?? 0;
              const prevResult = idx === 0 ? null : reassessmentHistory[reassessmentHistory.length - 1 - idx];
              const prevScore = prevResult ? ((prevResult as any).totalScore ?? (prevResult as any).compositeScore ?? 0) : resultScore;
              const scoreChange = idx === 0 ? 0 : prevScore - resultScore;
              const isImprovement = scoreChange >= 0;

              return (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${
                        isImprovement
                          ? 'bg-green-500/30 border-green-500'
                          : 'bg-red-500/30 border-red-500'
                      }`}
                    />
                    {idx < reassessmentHistory.length - 1 && <div className="w-0.5 h-12 bg-slate-700/30 my-2" />}
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {TRIGGER_LABELS[(result.triggerType as ReassessmentTriggerType) || 'scheduled_periodic']}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(result.createdAt || result.assessmentDate).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-white">{(resultScore ?? 0).toFixed(1)}</span>
                    </div>

                    {scoreChange !== 0 && (
                      <p className={`text-xs ${isImprovement ? 'text-green-400' : 'text-red-400'}`}>
                        {isImprovement ? '+' : ''}{(scoreChange ?? 0).toFixed(1)} điểm
                      </p>
                    )}

                    {result.adjustments && result.adjustments.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Điều chỉnh: {result.adjustments.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onTriggerReassessment}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Yêu cầu đánh giá lại
        </button>

        <a
          href="#"
          className="flex-1 bg-gradient-to-br from-slate-800/60 to-slate-900/60 hover:from-slate-700/60 hover:to-slate-800/60 border border-slate-700/50 hover:border-slate-600/50 text-slate-200 font-medium py-3 px-4 rounded-xl transition-all text-center flex items-center justify-center gap-2"
        >
          <Target className="w-4 h-4" />
          Thay đổi mục tiêu
        </a>

        <a
          href="#"
          className="flex-1 bg-gradient-to-br from-slate-800/60 to-slate-900/60 hover:from-slate-700/60 hover:to-slate-800/60 border border-slate-700/50 hover:border-slate-600/50 text-slate-200 font-medium py-3 px-4 rounded-xl transition-all text-center flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Xem lộ trình hiện tại
        </a>
      </div>
    </div>
  );
};

export default ReAssessmentDashboard;
