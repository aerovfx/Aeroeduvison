/**
 * Dashboard Home — clone chính xác của app/(dashboard)/(routes)/dashboard/page.tsx
 * Tất cả sub-component (StatsSection, CompetenciesSection) được inline vào một file.
 * Dùng đúng cùng class Tailwind với Next.js để CSS override (text-white/xx, bg-white/xx) hoạt động giống nhau.
 */
'use client';

import React, { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { GalaxyHero } from '@/components/common/GalaxyHero';
import { LevelXPCard } from '@/components/common/LevelXPCard';
import {
  Brain, Target, Lightbulb, MessageCircle, Trophy, Calendar, Activity,
  Rocket, X, ChevronRight, CheckCircle, Clock, Award, Star, Play, ArrowRight,
  TrendingUp, Zap, Cpu, Heart, Sparkles, Network,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Beaker icon (not in standard lucide — recreate)
// ─────────────────────────────────────────────
function Beaker({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 3h15" /><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" /><path d="M6 14h12" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SkillDetail {
  name: string;
  level: number;
  icon: string;
  xp: number;
  barColor: string;
  breakdown: { knowledge: number; engagement: number; mastery: number; achievements: number; social: number };
  learningVelocity: number;
}

interface Competency {
  name: string;
  level: number;
  icon: string;
  xp: number;
  gradient: string;
  glow: string;
  accentColor: string;
  barColor: string;
  learningVelocity: number;
  lastActivity: string;
}

interface EmotionalState {
  name: string;
  level: number;
  color: string;
  dotColor: string;
}

// ─────────────────────────────────────────────
// Stats Section
// ─────────────────────────────────────────────
const StatsSection = React.memo(({
  overallProgress = 78,
  learningStreak = 15,
  totalXP = 13210,
  currentLevel = 8,
  xpToNextLevel = 550,
}: {
  overallProgress?: number;
  learningStreak?: number;
  totalXP?: number;
  currentLevel?: number;
  xpToNextLevel?: number;
}) => {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Tổng quan &amp; Tiến độ học tập</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Progress */}
        <div className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-[0_0_30px_rgba(99,102,241,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-blue-400">{overallProgress}%</span>
          </div>
          <h3 className="text-sm font-semibold text-white/90 mb-0.5">Tiến độ tổng</h3>
          <p className="text-xs text-white/40">Tuần này <span className="text-emerald-400">+12%</span></p>
          <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>

        {/* Learning Streak */}
        <div className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-2xl font-bold text-amber-400">{learningStreak}</span>
          </div>
          <h3 className="text-sm font-semibold text-white/90 mb-0.5">Ngày liên tiếp</h3>
          <p className="text-xs text-white/40">Kỷ lục: <span className="text-amber-400/70">23 ngày</span></p>
        </div>

        {/* AI-Driven XP */}
        <div className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-[0_0_30px_rgba(120,100,255,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-2xl font-bold text-violet-400">{totalXP.toLocaleString()}</span>
          </div>
          <h3 className="text-sm font-semibold text-white/90 mb-0.5">AI-Driven XP</h3>
          <p className="text-xs text-white/40">Tuần này <span className="text-emerald-400">+1,250 XP</span></p>
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              { label: 'Knowledge', pct: '40%', color: 'text-blue-400/60' },
              { label: 'Engage', pct: '20%', color: 'text-emerald-400/60' },
              { label: 'Mastery', pct: '20%', color: 'text-violet-400/60' },
              { label: 'Achieve', pct: '10%', color: 'text-amber-400/60' },
              { label: 'Social', pct: '10%', color: 'text-pink-400/60' },
            ].map(item => (
              <span key={item.label} className={`text-[0.6rem] ${item.color}`}>{item.label} {item.pct}</span>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-[0_0_30px_rgba(168,85,247,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-purple-400">Lv.{currentLevel}</span>
          </div>
          <h3 className="text-sm font-semibold text-white/90 mb-0.5">Cấp độ hiện tại</h3>
          <p className="text-xs text-white/40"><span className="text-purple-400/70">{xpToNextLevel} XP</span> đến Lv.{currentLevel + 1}</p>
        </div>
      </div>
    </section>
  );
});
StatsSection.displayName = 'StatsSection';

// ─────────────────────────────────────────────
// Competency Card
// ─────────────────────────────────────────────
const CompetencyCard = memo(({ skill, onClick }: { skill: Competency; onClick: (s: Competency) => void }) => (
  <button
    onClick={() => onClick(skill)}
    className={`group text-left rounded-lg border border-white/[0.04] bg-gradient-to-br ${skill.gradient} p-3.5 transition-all duration-300 hover:border-white/[0.1] ${skill.glow}`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-lg">{skill.icon}</span>
      <div className="text-right">
        <span className={`text-sm font-bold ${skill.accentColor}`}>{skill.level}%</span>
        <div className="text-[0.6rem] text-white/30">{skill.xp} XP</div>
      </div>
    </div>
    <h4 className="text-xs font-medium text-white/80 mb-2">{skill.name}</h4>
    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-2">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${skill.barColor}`}
        style={{ width: `${skill.level}%` }}
      />
    </div>
    <div className="flex items-center justify-between text-[0.6rem] text-white/30">
      <span>{skill.learningVelocity} XP/tuần</span>
      <span>{skill.lastActivity}</span>
    </div>
  </button>
));
CompetencyCard.displayName = 'CompetencyCard';

// ─────────────────────────────────────────────
// Competencies Section
// ─────────────────────────────────────────────
const DEFAULT_COMPETENCIES: Competency[] = [
  { name: 'Toán học', level: 85, icon: '🔢', xp: 2450, gradient: 'from-blue-500/20 to-indigo-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]', accentColor: 'text-blue-400', barColor: 'from-blue-500 to-indigo-500', learningVelocity: 12.5, lastActivity: '2 giờ trước' },
  { name: 'Vật lý', level: 72, icon: '⚛️', xp: 1890, gradient: 'from-violet-500/20 to-purple-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]', accentColor: 'text-violet-400', barColor: 'from-violet-500 to-purple-500', learningVelocity: 8.2, lastActivity: '1 ngày trước' },
  { name: 'Hóa học', level: 68, icon: '🧪', xp: 1650, gradient: 'from-emerald-500/20 to-teal-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]', accentColor: 'text-emerald-400', barColor: 'from-emerald-500 to-teal-500', learningVelocity: 6.8, lastActivity: '3 ngày trước' },
  { name: 'Sinh học', level: 74, icon: '🧬', xp: 1920, gradient: 'from-green-500/20 to-emerald-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]', accentColor: 'text-green-400', barColor: 'from-green-500 to-emerald-500', learningVelocity: 9.1, lastActivity: '5 giờ trước' },
  { name: 'Programming', level: 91, icon: '💻', xp: 3200, gradient: 'from-amber-500/20 to-orange-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]', accentColor: 'text-amber-400', barColor: 'from-amber-500 to-orange-500', learningVelocity: 18.5, lastActivity: '30 phút trước' },
  { name: 'AI/ML', level: 78, icon: '🤖', xp: 2100, gradient: 'from-pink-500/20 to-rose-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]', accentColor: 'text-pink-400', barColor: 'from-pink-500 to-rose-500', learningVelocity: 11.2, lastActivity: '1 giờ trước' },
];

const DEFAULT_EMOTIONAL_STATES: EmotionalState[] = [
  { name: 'Motivation', level: 88, color: 'from-amber-400 to-yellow-500', dotColor: 'bg-amber-400' },
  { name: 'Confidence', level: 75, color: 'from-blue-400 to-indigo-500', dotColor: 'bg-blue-400' },
  { name: 'Curiosity', level: 92, color: 'from-violet-400 to-purple-500', dotColor: 'bg-violet-400' },
  { name: 'Focus', level: 69, color: 'from-emerald-400 to-teal-500', dotColor: 'bg-emerald-400' },
  { name: 'Creativity', level: 81, color: 'from-pink-400 to-rose-500', dotColor: 'bg-pink-400' },
];

function CompetenciesSection({ onSkillClick }: { onSkillClick: (skill: SkillDetail) => void }) {
  const handleClick = useCallback((skill: Competency) => {
    onSkillClick({
      name: skill.name,
      level: skill.level,
      icon: skill.icon,
      xp: skill.xp,
      barColor: skill.barColor,
      breakdown: {
        knowledge: Math.round(skill.xp * 0.4),
        engagement: Math.round(skill.xp * 0.2),
        mastery: Math.round(skill.xp * 0.2),
        achievements: Math.round(skill.xp * 0.1),
        social: Math.round(skill.xp * 0.1),
      },
      learningVelocity: skill.learningVelocity,
    });
  }, [onSkillClick]);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-4 h-4 text-cyan-500" />
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Năng lực &amp; Cảm xúc học tập</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Competency Heatmap */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            Bản đồ năng lực
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {DEFAULT_COMPETENCIES.map((skill, index) => (
              <CompetencyCard key={index} skill={skill} onClick={handleClick} />
            ))}
          </div>
        </div>

        {/* Emotional State */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" />
            Trạng thái cảm xúc
          </h3>
          <div className="space-y-4">
            {DEFAULT_EMOTIONAL_STATES.map((emotion, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${emotion.dotColor} shadow-[0_0_6px_currentColor]`} />
                  <span className="text-sm text-white/70">{emotion.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${emotion.color}`}
                      style={{ width: `${emotion.level}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white/60 w-8 text-right">{emotion.level}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* AI Insight */}
          <div className="mt-6 p-3 rounded-lg border border-indigo-400/10 bg-[hsl(245,85%,65%)]/[0.04]">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-white/50 leading-relaxed">
                  AI phát hiện: Curiosity cao (92%) - thời điểm lý tưởng để khám phá chủ đề mới. Focus hơi thấp (69%) - nên chia nhỏ bài học.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Path */}
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          Lộ trình học tập cá nhân hóa
        </h3>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { label: 'Tuần 1: Toán cơ bản', color: 'from-emerald-500 to-teal-500', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]', active: true },
            { label: 'Tuần 2: Vật lý', color: 'from-blue-500 to-indigo-500', glow: 'shadow-[0_0_12px_rgba(99,102,241,0.2)]', active: true },
            { label: 'Tuần 3: Lập trình', color: 'from-violet-500 to-purple-500', glow: 'shadow-[0_0_12px_rgba(139,92,246,0.2)]', active: true },
            { label: 'Tuần 4: AI/ML', color: 'from-amber-500 to-orange-500', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]', active: false },
            { label: 'Tuần 5: Dự án tổng hợp', color: '', glow: '', active: false },
          ].map((week, i) => (
            <div key={i} className="flex items-center gap-3 flex-shrink-0">
              {i > 0 && <div className={`w-6 h-px ${week.active ? 'bg-white/20' : 'bg-white/[0.06]'}`} />}
              <div className={`px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                week.active
                  ? `bg-gradient-to-r ${week.color} text-white ${week.glow}`
                  : 'bg-white/[0.04] text-white/30 border border-white/[0.06]'
              }`}>
                {week.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Skill Detail Modal
// ─────────────────────────────────────────────
function SkillDetailModal({ skill, onClose }: { skill: SkillDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-background shadow-[0_0_60px_rgba(120,100,255,0.1)] custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white/90 flex items-center gap-2">
              <span className="text-xl">{skill.icon}</span>
              {skill.name}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* XP Overview */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Tổng XP', value: `${skill.xp}`, unit: 'XP', color: 'text-blue-400' },
              { label: 'Thành thạo', value: `${skill.level}`, unit: '%', color: 'text-emerald-400' },
              { label: 'Tốc độ', value: `${skill.learningVelocity}`, unit: 'XP/w', color: 'text-amber-400' },
            ].map(stat => (
              <div key={stat.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-[0.6rem] text-white/30 ml-0.5">{stat.unit}</span>
                <p className="text-[0.6rem] text-white/30 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${skill.barColor}`}
                style={{ width: `${skill.level}%` }}
              />
            </div>
          </div>

          {/* XP Breakdown */}
          <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">XP Breakdown</h4>
          <div className="space-y-2 mb-6">
            {[
              { label: 'Knowledge (40%)', desc: 'Bài học × độ khó × tỉ lệ đúng', value: skill.breakdown.knowledge, color: 'border-blue-500/10 bg-blue-500/[0.04]', textColor: 'text-blue-400' },
              { label: 'Engagement (20%)', desc: 'Thời gian học × engagement score', value: skill.breakdown.engagement, color: 'border-emerald-500/10 bg-emerald-500/[0.04]', textColor: 'text-emerald-400' },
              { label: 'Mastery (20%)', desc: 'Tiến độ module / dự đoán nắm vững', value: skill.breakdown.mastery, color: 'border-violet-500/10 bg-violet-500/[0.04]', textColor: 'text-violet-400' },
              { label: 'Achievements (10%)', desc: 'Huy hiệu, milestone', value: skill.breakdown.achievements, color: 'border-amber-500/10 bg-amber-500/[0.04]', textColor: 'text-amber-400' },
              { label: 'Social (10%)', desc: 'Tham gia nhóm, peer review', value: skill.breakdown.social, color: 'border-pink-500/10 bg-pink-500/[0.04]', textColor: 'text-pink-400' },
            ].map(item => (
              <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg border ${item.color}`}>
                <div>
                  <span className="text-xs font-medium text-white/70">{item.label}</span>
                  <p className="text-[0.6rem] text-white/30">{item.desc}</p>
                </div>
                <span className={`text-sm font-bold ${item.textColor}`}>{item.value} XP</span>
              </div>
            ))}
          </div>

          {/* AI Recommendations */}
          <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">AI Recommendations</h4>
          <div className="space-y-2 mb-6">
            <div className="p-3 rounded-lg border border-blue-500/10 bg-blue-500/[0.04]">
              <p className="text-xs text-white/50 leading-relaxed">
                {skill.level > 80
                  ? 'Bạn đã thành thạo! Hãy thử thách với dự án nâng cao và liên ngành.'
                  : skill.level > 60
                  ? 'Tốt! Tập trung vào luyện tập nâng cao và củng cố kiến thức.'
                  : 'Bắt đầu với lộ trình cơ bản và củng cố nền tảng.'}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-violet-500/10 bg-violet-500/[0.04]">
              <p className="text-xs text-white/50 leading-relaxed">
                {skill.breakdown.engagement < 300
                  ? 'Tăng engagement bằng cách học 30 phút/ngày'
                  : 'Duy trì momentum! Bạn đang học rất hiệu quả.'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              to="/student/exam-prep"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white text-sm font-medium text-center shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:brightness-110 transition-all"
            >
              Bắt đầu học
            </Link>
            <Link
              to="/learning-paths"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/70 text-sm font-medium text-center hover:bg-white/[0.06] hover:text-white/90 transition-all"
            >
              Xem lộ trình
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [showSkillDetail, setShowSkillDetail] = useState(false);

  const handleSkillClick = useCallback((skill: SkillDetail) => {
    setSelectedSkill(skill);
    setShowSkillDetail(true);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Galaxy Hero — Meteor-style cosmic banner ── */}
        <GalaxyHero
          badge="AI-Driven Education Platform"
          title={<>AERO<br/>EDU·VISION</>}
          description="Học theo não bộ và cảm xúc của chính mình. Mỗi bài làm cộng XP, mỗi ngày mở khoá thành tích mới."
          ctaLabel="Bắt đầu luyện tập"
          ctaTo="/student/exam-prep"
          orbEmoji="🚀"
        />

        {/* Level XP card — gamification */}
        <LevelXPCard />

        {/* ── LAYER 1: Stats Cards ── */}
        <StatsSection />

        {/* ── Khám phá tri thức — featured Knowledge Graph hero ── */}
        <Link
          to="/dashboard/knowledge-graph"
          className="group block relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-600/15 via-blue-600/10 to-violet-600/10 p-6 hover:border-cyan-400/50 transition-all hover:scale-[1.005]"
        >
          {/* Background glow */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-cyan-500/15 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

          {/* Animated mini-graph SVG illustration */}
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none hidden md:block"
            width="220" height="160" viewBox="0 0 220 160"
          >
            {/* Edges */}
            <line x1="110" y1="80" x2="40"  y2="40"  stroke="rgba(34,211,238,0.6)" strokeWidth="1.5" />
            <line x1="110" y1="80" x2="180" y2="40"  stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" />
            <line x1="110" y1="80" x2="40"  y2="130" stroke="rgba(251,146,60,0.6)" strokeWidth="1.5" />
            <line x1="110" y1="80" x2="180" y2="130" stroke="rgba(52,211,153,0.6)" strokeWidth="1.5" />
            <line x1="110" y1="80" x2="170" y2="80"  stroke="rgba(250,204,21,0.6)" strokeWidth="1.5" />
            <line x1="110" y1="80" x2="60"  y2="80"  stroke="rgba(244,114,182,0.6)" strokeWidth="1.5" />
            {/* Nodes */}
            <circle cx="40"  cy="40"  r="10" fill="rgba(34,211,238,0.25)" stroke="#22d3ee" strokeWidth="1.5">
              <animate attributeName="r" values="9;12;9" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="180" cy="40"  r="10" fill="rgba(167,139,250,0.25)" stroke="#a78bfa" strokeWidth="1.5" />
            <circle cx="40"  cy="130" r="10" fill="rgba(251,146,60,0.25)" stroke="#fb923c" strokeWidth="1.5" />
            <circle cx="180" cy="130" r="10" fill="rgba(52,211,153,0.25)" stroke="#34d399" strokeWidth="1.5">
              <animate attributeName="r" values="9;13;9" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="170" cy="80"  r="8"  fill="rgba(250,204,21,0.25)" stroke="#facc15" strokeWidth="1.5" />
            <circle cx="60"  cy="80"  r="8"  fill="rgba(244,114,182,0.25)" stroke="#f472b6" strokeWidth="1.5" />
            {/* Center node — bigger, animated */}
            <circle cx="110" cy="80" r="18" fill="rgba(34,211,238,0.4)" stroke="#22d3ee" strokeWidth="2.5">
              <animate attributeName="r" values="16;22;16" dur="2s" repeatCount="indefinite" />
            </circle>
            <text x="110" y="84" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold" style={{ userSelect: 'none' }}>
              Vật lí
            </text>
          </svg>

          {/* Content */}
          <div className="relative max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Khám phá Đồ thị Tri thức</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-bold uppercase tracking-wider">
                  ✨ Mới
                </span>
              </div>
            </div>
            <p className="text-sm text-white/75 leading-relaxed mb-4">
              Thay vì học từng bài tuyến tính, hãy gõ <strong className="text-cyan-300">"động lượng"</strong> hoặc{' '}
              <strong className="text-cyan-300">"phương trình Newton"</strong> để thấy ngay mạng lưới <strong>khái niệm</strong>,
              {' '}<strong>công thức</strong>, <strong>bài tập</strong> và <strong>nghề nghiệp</strong> liên quan.
              AI tự động liên kết kiến thức — bạn chỉ cần khám phá.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-2 text-cyan-300 font-bold text-sm group-hover:gap-3 transition-all">
                <Sparkles className="w-4 h-4" /> Bắt đầu khám phá
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-xs text-white/40">
                · 80+ nodes Vật lí 11 sẵn sàng · AI extract từ giáo án
              </span>
            </div>
          </div>
        </Link>

        {/* ── LAYER 2: Competencies & Emotions ── */}
        <CompetenciesSection onSkillClick={handleSkillClick} />

        {/* ── LAYER 3: Tasks, AI Suggestions, Achievements ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Nhiệm vụ &amp; Gợi ý AI</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Daily Tasks */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Nhiệm vụ hôm nay
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Hoàn thành bài toán khó', href: '/dashboard/assignments', icon: CheckCircle, iconColor: 'text-emerald-400', bgColor: 'hover:bg-emerald-500/[0.06]' },
                  { label: 'Làm 3 bài quiz Vật lý', href: '/dashboard/quizzes', icon: Clock, iconColor: 'text-amber-400', bgColor: 'hover:bg-amber-500/[0.06]' },
                  { label: 'Thí nghiệm LabTwin', href: '/dashboard/labtwin', icon: Play, iconColor: 'text-violet-400', bgColor: 'hover:bg-violet-500/[0.06]' },
                ].map((task, i) => (
                  <Link key={i} to={task.href} className="block">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-white/[0.06] ${task.bgColor} transition-all group`}>
                      <task.icon className={`w-4 h-4 ${task.iconColor} flex-shrink-0`} />
                      <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{task.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-violet-400" />
                Gợi ý AI
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-violet-500/10 bg-violet-500/[0.04]">
                  <p className="text-xs text-white/50 leading-relaxed mb-2">
                    &ldquo;Dựa trên tiến độ của bạn, tôi đề xuất tập trung vào bài tập tích phân hôm nay.&rdquo;
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_4px_rgba(139,92,246,0.5)]" />
                    <span className="text-[0.65rem] font-medium text-violet-400/80">AI Tutor</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border border-blue-500/10 bg-blue-500/[0.04]">
                  <p className="text-xs text-white/50 leading-relaxed mb-2">
                    &ldquo;Bạn đang có động lực cao, hãy thử thách bản thân với bài toán khó hơn!&rdquo;
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.5)]" />
                    <span className="text-[0.65rem] font-medium text-blue-400/80">AI Coach</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Achievements */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Thành tích gần đây
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/10 bg-amber-500/[0.04]">
                  <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white/80">Master Mathematician</p>
                    <p className="text-[0.65rem] text-white/35">Hoàn thành 50 bài toán khó</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04]">
                  <Star className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white/80">Lab Explorer</p>
                    <p className="text-[0.65rem] text-white/35">Khám phá 10 thí nghiệm mới</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Quick Access Modules ── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'LabTwin', desc: '25+ thí nghiệm ảo tương tác', href: '/dashboard/labtwin', icon: Beaker, gradient: 'from-blue-600 to-indigo-600', glow: 'hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]' },
              { title: 'Study Dashboard', desc: 'Giao diện học tập hiện đại', href: '/dashboard/study-dashboard', icon: Target, gradient: 'from-emerald-600 to-teal-600', glow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]' },
              { title: 'Learning Paths', desc: 'Lộ trình học tập cá nhân hóa', href: '/dashboard/learning-paths-demo', icon: Brain, gradient: 'from-violet-600 to-purple-600', glow: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]' },
              { title: 'STEM Projects', desc: 'Dự án STEM thực tế', href: '/dashboard/stem', icon: Rocket, gradient: 'from-orange-600 to-red-600', glow: 'hover:shadow-[0_0_40px_rgba(249,115,22,0.15)]' },
            ].map((module) => (
              <Link key={module.href} to={module.href} className="block group">
                <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${module.gradient} p-5 transition-all duration-300 ${module.glow} hover:translate-y-[-2px]`}>
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold text-white">{module.title}</h3>
                      <module.icon className="w-6 h-6 text-white/60" />
                    </div>
                    <p className="text-xs text-white/60 mb-3">{module.desc}</p>
                    <div className="flex items-center text-white/50 group-hover:text-white/80 transition-colors">
                      <Play className="w-3 h-3 mr-1" />
                      <span className="text-xs">Khám phá ngay</span>
                      <ArrowRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>

      {/* ── Skill Detail Modal ── */}
      {showSkillDetail && selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          onClose={() => setShowSkillDetail(false)}
        />
      )}
    </div>
  );
}
