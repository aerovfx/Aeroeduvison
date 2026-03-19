'use client';

import React, { useState, lazy, Suspense, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Brain, Target, Lightbulb, MessageCircle, Trophy, Calendar, Activity,
  Rocket, Beaker, X, ChevronRight, CheckCircle, Clock, Award, Star, Play, ArrowRight
} from 'lucide-react';

// Lazy load heavy sections for better initial page load
const StatsSection = lazy(() => import('./_components/stats-section').then(m => ({ default: m.StatsSection })));
const CompetenciesSection = lazy(() => import('./_components/competencies-section').then(m => ({ default: m.CompetenciesSection })));

// Loading fallback component
const SectionSkeleton = () => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
    <div className="h-4 w-32 bg-white/[0.06] rounded mb-4" />
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-20 bg-white/[0.04] rounded" />
      ))}
    </div>
  </div>
);

interface SkillDetail {
  name: string;
  level: number;
  icon: string;
  xp: number;
  barColor: string;
  breakdown: { knowledge: number; engagement: number; mastery: number; achievements: number; social: number };
  learningVelocity: number;
}

export default function DashboardPage() {
  const { t } = useLanguage();

  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [showSkillDetail, setShowSkillDetail] = useState(false);

  const handleSkillClick = useCallback((skill: SkillDetail) => {
    setSelectedSkill(skill);
    setShowSkillDetail(true);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-8 md:p-10">
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(245,85%,65%)] opacity-[0.04] rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[hsl(175,80%,50%)] opacity-[0.03] rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center shadow-[0_0_20px_rgba(120,100,255,0.3)] mr-3">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text">
                You&apos;re learning with AI-Driven Edu
              </h1>
            </div>
            <div className="max-w-3xl mx-auto space-y-1.5">
              <p className="text-sm text-white/50">
                Học sinh được học theo não bộ và cảm xúc của chính mình.
              </p>
              <p className="text-sm text-white/50">
                Giáo viên trở thành người thiết kế hành trình học.
              </p>
              <p className="text-sm text-white/60 font-medium">
                Xã hội tiến tới một nền giáo dục cá nhân hóa đại chúng (Mass Personalization Education).
              </p>
            </div>
          </div>
        </div>

        {/* ── LAYER 1: Stats Cards ── */}
        <Suspense fallback={<SectionSkeleton />}>
          <StatsSection />
        </Suspense>

        {/* ── LAYER 2: Competencies & Emotions ── */}
        <Suspense fallback={<SectionSkeleton />}>
          <CompetenciesSection />
        </Suspense>

        {/* ── LAYER 3: Tasks, AI Suggestions, Achievements ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Nhiệm vụ & Gợi ý AI</h2>
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
                  <a key={i} href={task.href} className="block">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-white/[0.06] ${task.bgColor} transition-all group`}>
                      <task.icon className={`w-4 h-4 ${task.iconColor} flex-shrink-0`} />
                      <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{task.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
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
              <a key={module.href} href={module.href} className="block group">
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
              </a>
            ))}
          </div>
        </section>

        {/* ── Skill Detail Modal ── */}
        {showSkillDetail && selectedSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSkillDetail(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

            {/* Modal */}
            <div
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[hsl(225,15%,9%)] shadow-[0_0_60px_rgba(120,100,255,0.1)] animate-scale-in custom-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white/90 flex items-center gap-2">
                    <span className="text-xl">{selectedSkill.icon}</span>
                    {selectedSkill.name}
                  </h3>
                  <button
                    onClick={() => setShowSkillDetail(false)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* XP Overview */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Tổng XP', value: `${selectedSkill.xp}`, unit: 'XP', color: 'text-blue-400' },
                    { label: 'Thành thạo', value: `${selectedSkill.level}`, unit: '%', color: 'text-emerald-400' },
                    { label: 'Tốc độ', value: `${selectedSkill.learningVelocity}`, unit: 'XP/w', color: 'text-amber-400' },
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
                      className={`h-full rounded-full bg-gradient-to-r ${selectedSkill.barColor}`}
                      style={{ width: `${selectedSkill.level}%` }}
                    />
                  </div>
                </div>

                {/* XP Breakdown */}
                <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">XP Breakdown</h4>
                <div className="space-y-2 mb-6">
                  {[
                    { label: 'Knowledge (40%)', desc: 'Bài học × độ khó × tỉ lệ đúng', value: selectedSkill.breakdown.knowledge, color: 'border-blue-500/10 bg-blue-500/[0.04]', textColor: 'text-blue-400' },
                    { label: 'Engagement (20%)', desc: 'Thời gian học × engagement score', value: selectedSkill.breakdown.engagement, color: 'border-emerald-500/10 bg-emerald-500/[0.04]', textColor: 'text-emerald-400' },
                    { label: 'Mastery (20%)', desc: 'Tiến độ module / dự đoán nắm vững', value: selectedSkill.breakdown.mastery, color: 'border-violet-500/10 bg-violet-500/[0.04]', textColor: 'text-violet-400' },
                    { label: 'Achievements (10%)', desc: 'Huy hiệu, milestone', value: selectedSkill.breakdown.achievements, color: 'border-amber-500/10 bg-amber-500/[0.04]', textColor: 'text-amber-400' },
                    { label: 'Social (10%)', desc: 'Tham gia nhóm, peer review', value: selectedSkill.breakdown.social, color: 'border-pink-500/10 bg-pink-500/[0.04]', textColor: 'text-pink-400' },
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
                      {selectedSkill.level > 80
                        ? 'Bạn đã thành thạo! Hãy thử thách với dự án nâng cao và liên ngành.'
                        : selectedSkill.level > 60
                        ? 'Tốt! Tập trung vào luyện tập nâng cao và củng cố kiến thức.'
                        : 'Bắt đầu với lộ trình cơ bản và củng cố nền tảng.'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-violet-500/10 bg-violet-500/[0.04]">
                    <p className="text-xs text-white/50 leading-relaxed">
                      {selectedSkill.breakdown.engagement < 300
                        ? 'Tăng engagement bằng cách học 30 phút/ngày'
                        : 'Duy trì momentum! Bạn đang học rất hiệu quả.'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white text-sm font-medium shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:brightness-110 transition-all">
                    Bắt đầu học
                  </button>
                  <button className="flex-1 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/70 text-sm font-medium hover:bg-white/[0.06] hover:text-white/90 transition-all">
                    Xem lộ trình
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
