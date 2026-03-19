'use client';

import React, { useState, useCallback, memo } from 'react';
import { Cpu, Heart, Target, Sparkles, ChevronRight } from 'lucide-react';

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

interface CompetenciesSectionProps {
  competencies?: Competency[];
  emotionalStates?: EmotionalState[];
}

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

export const CompetenciesSection = memo(({
  competencies = [
    { name: 'Toán học', level: 85, icon: '🔢', xp: 2450, gradient: 'from-blue-500/20 to-indigo-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]', accentColor: 'text-blue-400', barColor: 'from-blue-500 to-indigo-500', learningVelocity: 12.5, lastActivity: '2 giờ trước' },
    { name: 'Vật lý', level: 72, icon: '⚛️', xp: 1890, gradient: 'from-violet-500/20 to-purple-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]', accentColor: 'text-violet-400', barColor: 'from-violet-500 to-purple-500', learningVelocity: 8.2, lastActivity: '1 ngày trước' },
    { name: 'Hóa học', level: 68, icon: '🧪', xp: 1650, gradient: 'from-emerald-500/20 to-teal-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]', accentColor: 'text-emerald-400', barColor: 'from-emerald-500 to-teal-500', learningVelocity: 6.8, lastActivity: '3 ngày trước' },
    { name: 'Sinh học', level: 74, icon: '🧬', xp: 1920, gradient: 'from-green-500/20 to-emerald-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]', accentColor: 'text-green-400', barColor: 'from-green-500 to-emerald-500', learningVelocity: 9.1, lastActivity: '5 giờ trước' },
    { name: 'Programming', level: 91, icon: '💻', xp: 3200, gradient: 'from-amber-500/20 to-orange-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]', accentColor: 'text-amber-400', barColor: 'from-amber-500 to-orange-500', learningVelocity: 18.5, lastActivity: '30 phút trước' },
    { name: 'AI/ML', level: 78, icon: '🤖', xp: 2100, gradient: 'from-pink-500/20 to-rose-500/20', glow: 'group-hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]', accentColor: 'text-pink-400', barColor: 'from-pink-500 to-rose-500', learningVelocity: 11.2, lastActivity: '1 giờ trước' },
  ],
  emotionalStates = [
    { name: 'Motivation', level: 88, color: 'from-amber-400 to-yellow-500', dotColor: 'bg-amber-400' },
    { name: 'Confidence', level: 75, color: 'from-blue-400 to-indigo-500', dotColor: 'bg-blue-400' },
    { name: 'Curiosity', level: 92, color: 'from-violet-400 to-purple-500', dotColor: 'bg-violet-400' },
    { name: 'Focus', level: 69, color: 'from-emerald-400 to-teal-500', dotColor: 'bg-emerald-400' },
    { name: 'Creativity', level: 81, color: 'from-pink-400 to-rose-500', dotColor: 'bg-pink-400' },
  ],
}: CompetenciesSectionProps) => {
  const [selectedSkill, setSelectedSkill] = useState<Competency | null>(null);

  const handleSkillClick = useCallback((skill: Competency) => {
    setSelectedSkill(skill);
  }, []);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-4 h-4 text-[hsl(175,80%,50%)]" />
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Năng lực & Cảm xúc học tập</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Competency Heatmap */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            Bản đồ năng lực
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {competencies.map((skill, index) => (
              <CompetencyCard key={index} skill={skill} onClick={handleSkillClick} />
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
            {emotionalStates.map((emotion, index) => (
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
          <div className="mt-6 p-3 rounded-lg border border-[hsl(245,85%,65%)]/10 bg-[hsl(245,85%,65%)]/[0.04]">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[hsl(245,85%,65%)] flex-shrink-0 mt-0.5" />
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
});

CompetenciesSection.displayName = 'CompetenciesSection';
