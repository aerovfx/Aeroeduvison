'use client';

/**
 * Multi-Disciplinary Learning Paths Dashboard
 * For teachers to manage cross-domain learning paths
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BookOpen, Users, Brain, Network, CheckCircle, Clock,
  AlertTriangle, TrendingUp, MessageSquare, Eye, Plus,
  GitBranch, Target, Award, Sparkles, ChevronRight
} from 'lucide-react';

interface LearningPath {
  id: string;
  studentName: string;
  title: string;
  involvedDomains: string[];
  progress: number;
  status: string;
  mentors: string[];
  transitionsCount: number;
  lastUpdate: string;
}

// AI Native Glass Card
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  );
}

// AI Native Badge
function AIBadge({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; className?: string; }) {
  const variants = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200',
    success: 'bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-yellow-200',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-red-600 border-red-200',
    info: 'bg-[hsl(var(--info)/0.15)] text-blue-600 border-[hsl(var(--info)/0.3)]',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default function MultiDisciplinaryPathsPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      setLoading(true);

      // Mock data - in production, fetch from API
      const mockPaths: LearningPath[] = [
        {
          id: 'path_1',
          studentName: 'Nguyễn Văn A',
          title: 'Lộ trình: AI & Âm nhạc',
          involvedDomains: ['Toán học', 'Vật lý', 'Âm nhạc', 'Tin học'],
          progress: 45,
          status: 'active',
          mentors: ['Mentor Toán', 'Mentor Vật lý', 'Mentor Âm nhạc', 'Mentor Tin học'],
          transitionsCount: 3,
          lastUpdate: '2 giờ trước',
        },
        {
          id: 'path_2',
          studentName: 'Trần Thị B',
          title: 'Lộ trình: Thiết kế & Lập trình Web',
          involvedDomains: ['Nghệ thuật', 'Tin học'],
          progress: 78,
          status: 'active',
          mentors: ['Mentor Nghệ thuật', 'Mentor Tin học'],
          transitionsCount: 2,
          lastUpdate: '1 ngày trước',
        },
        {
          id: 'path_3',
          studentName: 'Lê Văn C',
          title: 'Lộ trình: Sinh học & AI',
          involvedDomains: ['Sinh học', 'Tin học', 'Toán học'],
          progress: 20,
          status: 'pending',
          mentors: ['Mentor Sinh học', 'Mentor Tin học', 'Mentor Toán'],
          transitionsCount: 2,
          lastUpdate: '3 giờ trước',
        },
      ];

      setPaths(mockPaths);
    } catch (error) {
      console.error('Error loading paths:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPaths = paths.filter(path => {
    if (filter === 'all') return true;
    return path.status === filter;
  });

  const getDomainColor = (domain: string): string => {
    const colors: Record<string, string> = {
      'Toán học': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Vật lý': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Hóa học': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Sinh học': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'Tin học': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      'Âm nhạc': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Nghệ thuật': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      'Ngôn ngữ': 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    };
    return colors[domain] || 'bg-[hsl(var(--muted-foreground)/0.2)] text-gray-900 border-[hsl(var(--muted-foreground)/0.3)]';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải lộ trình học...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <GlassCard className="relative overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-sm">
                <Network className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-purple-600 mb-2">
                  Lộ trình Đa Chuyên Môn
                </h1>
                <p className="text-sm text-gray-600">
                  AI-Orchestrated Multi-Disciplinary Learning Paths
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/teacher/multi-disciplinary-paths/create')}
              className="ai-button-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Tạo lộ trình mới</span>
            </button>
          </div>
        </GlassCard>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <GlassCard className="transition-all hover:border-purple-200 hover:shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Network className="w-8 h-8 text-purple-600" />
              <span className="text-3xl font-black text-gray-900">{paths.length}</span>
            </div>
            <div className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Tổng lộ trình</div>
          </GlassCard>

          <GlassCard className="transition-all hover:border-green-200 hover:shadow-[0_0_15px_hsl(var(--success)/0.2)]">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-black text-gray-900">
                {paths.filter(p => p.status === 'active').length}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Đang hoạt động</div>
          </GlassCard>

          <GlassCard className="transition-all hover:border-yellow-200 hover:shadow-[0_0_15px_hsl(var(--warning)/0.2)]">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-600" />
              <span className="text-3xl font-black text-gray-900">
                {paths.filter(p => p.status === 'pending').length}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Chờ xác nhận</div>
          </GlassCard>

          <GlassCard className="transition-all hover:border-[hsl(var(--info)/0.3)] hover:shadow-[0_0_15px_hsl(var(--info)/0.2)]">
            <div className="flex items-center justify-between mb-2">
              <GitBranch className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-black text-gray-900">
                {paths.reduce((sum, p) => sum + p.transitionsCount, 0)}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Điểm chuyển ngành</div>
          </GlassCard>
        </div>

        {/* Filter Tabs */}
        <GlassCard className="mb-6 p-2">
           <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'active', label: 'Đang hoạt động' },
              { id: 'pending', label: 'Chờ xác nhận' },
              { id: 'completed', label: 'Hoàn thành' }
            ].map((status) => (
              <button
                key={status.id}
                onClick={() => setFilter(status.id as any)}
                className={`flex-1 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  filter === status.id
                    ? 'ai-button-primary text-white shadow-lg'
                    : 'ai-button text-gray-900 hover:bg-white/5 border border-transparent hover:border-gray-200'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Paths List */}
        <div className="space-y-6">
          {filteredPaths.map((path) => (
            <GlassCard
              key={path.id}
              className="hover:border-purple-200 transition-all hover:shadow-sm flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-xl font-bold text-purple-600">{path.title}</h3>
                    <AIBadge variant={
                      path.status === 'active' ? 'success' :
                      path.status === 'pending' ? 'warning' : 'default'
                    }>
                      {path.status === 'active' && 'Đang học'}
                      {path.status === 'pending' && 'Chờ duyệt'}
                      {path.status === 'completed' && 'Hoàn thành'}
                    </AIBadge>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span className="text-gray-900">{path.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[hsl(var(--secondary))]" />
                      <span>{path.lastUpdate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-blue-600" />
                      <span>{path.transitionsCount} chuyển ngành</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/teacher/multi-disciplinary-paths/${path.id}`)}
                    className="ai-button px-4 py-2 text-gray-900 rounded-xl text-sm font-semibold flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Chi tiết</span>
                  </button>
                  <button className="ai-button-primary px-4 py-2 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-2">
                 {/* Domains */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-600 tracking-widest mb-2">Lĩnh vực liên quan</div>
                  <div className="flex flex-wrap gap-2">
                    {path.involvedDomains.map((domain, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full border text-[10px] font-black tracking-wider uppercase ${getDomainColor(domain)}`}
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mentors */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-600 tracking-widest mb-2">Giáo viên hướng dẫn</div>
                  <div className="flex flex-wrap gap-2">
                    {path.mentors.map((mentor, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1 bg-[hsl(var(--muted-foreground)/0.1)] rounded-full border border-gray-200"
                      >
                        <div className="w-5 h-5 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                          {mentor.charAt(7) || mentor.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-gray-900">{mentor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-2 bg-[hsl(var(--muted-foreground)/0.05)] p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-bold tracking-widest text-gray-600">Tiến độ tổng thể</span>
                  <span className="text-sm font-black text-purple-600">{path.progress}%</span>
                </div>
                <div className="w-full bg-[hsl(var(--muted-foreground)/0.2)] rounded-full h-2.5 overflow-hidden shadow-inner flex">
                  <div
                    className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] h-full rounded-full transition-all duration-500 shadow-sm relative"
                    style={{ width: `${path.progress}%` }}
                  >
                     <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Empty State */}
        {filteredPaths.length === 0 && (
          <GlassCard className="p-16 text-center border-dashed border-2">
            <div className="w-24 h-24 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Network className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-purple-600 mb-3">
              Chưa có lộ trình học nào
            </h3>
            <p className="text-gray-600 mb-8 font-medium">
              Tạo lộ trình đa chuyên môn đầu tiên cho học sinh để phát triển toàn diện
            </p>
            <button
              onClick={() => router.push('/teacher/multi-disciplinary-paths/create')}
              className="inline-flex items-center space-x-2 bg-[hsl(var(--primary))] text-white px-8 py-4 rounded-2xl hover:bg-[hsl(var(--primary)/0.8)] font-bold text-lg shadow-sm transition-all"
            >
              <Plus className="w-6 h-6" />
              <span>Bắt đầu Tạo lộ trình mới</span>
            </button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
