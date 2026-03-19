'use client';

import { useState } from 'react';
import { FileText, Plus, Calendar, Users, CheckCircle, Clock, Sparkles, Eye, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  students: number;
  submitted: number;
  status: 'draft' | 'published' | 'closed';
  maxScore?: number;
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
function AIBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const variants = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200',
    success: 'bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-[hsl(var(--warning)/0.3)]',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-red-600 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${variants[variant]}`}>
      {children}
    </span>
  );
}

export default function AssignmentsPage() {
  const { t } = useLanguage();

  const [assignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Bài tập Toán - Đạo hàm',
      description: 'Giải các bài tập về đạo hàm cơ bản',
      dueDate: '2024-10-25',
      students: 25,
      submitted: 18,
      status: 'published',
      maxScore: 10
    },
    {
      id: '2',
      title: 'Bài tập Vật lý - Cơ học',
      description: 'Bài tập về chuyển động thẳng đều',
      dueDate: '2024-10-28',
      students: 25,
      submitted: 12,
      status: 'published',
      maxScore: 10
    },
    {
      id: '3',
      title: 'Bài tập Hóa học - Phản ứng',
      description: 'Viết phương trình phản ứng hóa học',
      dueDate: '2024-10-30',
      students: 25,
      submitted: 0,
      status: 'draft',
      maxScore: 10
    }
  ]);

  const [viewMode, setViewMode] = useState<'assignments' | 'submissions'>('assignments');
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <AIBadge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Đã đăng</AIBadge>;
      case 'draft': return <AIBadge variant="warning"><Clock className="w-3 h-3 mr-1" /> Nháp</AIBadge>;
      case 'closed': return <AIBadge className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Đã đóng</AIBadge>;
      default: return <AIBadge>Không xác định</AIBadge>;
    }
  };

  const filteredAssignments = assignments.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* AI Native Header */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-purple-600">Quản lý Bài tập</h1>
                <p className="text-sm text-gray-600">Tạo và theo dõi bài tập với AI grading</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 glass-panel rounded-xl px-3 py-2">
                <button
                  onClick={() => setViewMode('assignments')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    viewMode === 'assignments'
                      ? 'ai-button-primary text-white'
                      : 'ai-button text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Bài tập
                </button>
                <button
                  onClick={() => setViewMode('submissions')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    viewMode === 'submissions'
                      ? 'ai-button-primary text-white'
                      : 'ai-button text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Bài nộp
                </button>
              </div>
              <button className="ai-button-primary text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Tạo bài tập
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Search Bar */}
        <GlassCard>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
            <input
              type="text"
              placeholder="Tìm kiếm bài tập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ai-input w-full pl-12 pr-4 py-3 rounded-xl"
            />
          </div>
        </GlassCard>

        {/* Assignments Grid */}
        {viewMode === 'assignments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => (
              <GlassCard key={assignment.id} className="transition-all duration-300 hover:border-purple-200 hover:shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{assignment.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{assignment.description}</p>
                  </div>
                  {getStatusBadge(assignment.status)}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {assignment.submitted}/{assignment.students} đã nộp
                    </span>
                    <span className="text-purple-600 font-semibold">{Math.round(assignment.submitted / assignment.students * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-[hsl(var(--muted))]/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] rounded-full"
                      style={{ width: `${assignment.submitted / assignment.students * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button className="ai-button text-gray-900 px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-2 flex-1">
                    <Eye className="w-4 h-4" />
                    Xem
                  </button>
                  <button className="ai-button-primary text-white px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-2 flex-1">
                    <Sparkles className="w-4 h-4" />
                    Chấm AI
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Submissions View */}
        {viewMode === 'submissions' && (
          <GlassCard>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Danh sách bài nộp</h2>
            <div className="space-y-3">
              {assignments.flatMap(a => Array.from({ length: a.submitted }, (_, i) => ({
                studentName: `Học sinh ${i + 1}`,
                assignmentTitle: a.title,
                submittedAt: new Date().toLocaleDateString('vi-VN'),
                status: 'pending' as const,
              }))).slice(0, 10).map((submission, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl glass-panel border border-gray-200 hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">{submission.studentName.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{submission.studentName}</h3>
                      <p className="text-sm text-gray-600">{submission.assignmentTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <AIBadge variant="warning"><Clock className="w-3 h-3 mr-1" /> Chờ chấm</AIBadge>
                    <button className="ai-button-primary text-white px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Chấm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
