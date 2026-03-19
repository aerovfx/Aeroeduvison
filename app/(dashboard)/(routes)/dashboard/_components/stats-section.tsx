'use client';

import React from 'react';
import {
  TrendingUp, Zap, Brain, Trophy,
} from 'lucide-react';

interface StatsSectionProps {
  overallProgress?: number;
  learningStreak?: number;
  totalXP?: number;
  currentLevel?: number;
  xpToNextLevel?: number;
}

export const StatsSection = React.memo(({
  overallProgress = 78,
  learningStreak = 15,
  totalXP = 13210,
  currentLevel = 8,
  xpToNextLevel = 550,
}: StatsSectionProps) => {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-[hsl(245,85%,65%)]" />
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Tổng quan & Tiến độ học tập</h2>
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
