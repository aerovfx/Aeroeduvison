'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle, AlertCircle, XCircle, Send } from 'lucide-react';
import Link from 'next/link';

interface Goal {
  id: string;
  title: string;
  description: string;
}

interface Domain {
  id: string;
  name: string;
}

interface Segment {
  id: string;
  title: string;
  description: string;
  duration: number;
}

interface WeeklyPlan {
  week: number;
  topics: string[];
}

interface LearningPathData {
  id: string;
  studentName: string;
  studentId: string;
  title: string;
  description: string;
  submittedAt: string;
  data: {
    goals: Goal[];
    domains: string[];
    segments: Segment[];
    weekly_plan: WeeklyPlan[];
  };
  approvalProgress: {
    goals: 'pending' | 'approved' | 'needs_revision' | 'rejected';
    domains: 'pending' | 'approved' | 'needs_revision' | 'rejected';
    segments: 'pending' | 'approved' | 'needs_revision' | 'rejected';
    weekly_plan: 'pending' | 'approved' | 'needs_revision' | 'rejected';
    overall: 'pending' | 'approved' | 'needs_revision' | 'rejected';
  };
}

const DOMAIN_DISPLAY: Record<string, { name: string; icon: string; color: string }> = {
  math: { name: 'Toán học', icon: '🧮', color: 'text-blue-400' },
  physics: { name: 'Vật lý', icon: '⚛️', color: 'text-cyan-400' },
  chemistry: { name: 'Hóa học', icon: '🧪', color: 'text-green-400' },
  biology: { name: 'Sinh học', icon: '🧬', color: 'text-emerald-400' },
  computer_science: { name: 'Tin học', icon: '💻', color: 'text-violet-400' },
  music: { name: 'Âm nhạc', icon: '🎵', color: 'text-pink-400' },
  art: { name: 'Nghệ thuật', icon: '🎨', color: 'text-rose-400' },
  language: { name: 'Ngôn ngữ', icon: '📝', color: 'text-amber-400' },
  history: { name: 'Lịch sử', icon: '📜', color: 'text-orange-400' },
  geography: { name: 'Địa lý', icon: '🌍', color: 'text-teal-400' },
  economics: { name: 'Kinh tế', icon: '📈', color: 'text-yellow-400' },
  philosophy: { name: 'Triết học', icon: '💭', color: 'text-indigo-400' },
};

type SectionType = 'goals' | 'domains' | 'segments' | 'weekly_plan' | 'overall';

const SECTIONS: Array<{ id: SectionType; label: string; vietnameseName: string }> = [
  { id: 'goals', label: 'Goals', vietnameseName: 'Mục tiêu' },
  { id: 'domains', label: 'Domains', vietnameseName: 'Môn học' },
  { id: 'segments', label: 'Segments', vietnameseName: 'Nội dung bài học' },
  { id: 'weekly_plan', label: 'Weekly Plan', vietnameseName: 'Kế hoạch tuần' },
  { id: 'overall', label: 'Overall', vietnameseName: 'Tổng thể' },
];

const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { label: 'Chờ duyệt', color: 'bg-yellow-900 text-yellow-200', icon: AlertCircle },
    approved: { label: 'Đã duyệt', color: 'bg-green-900 text-green-200', icon: CheckCircle },
    needs_revision: { label: 'Cần chỉnh sửa', color: 'bg-orange-900 text-orange-200', icon: AlertCircle },
    rejected: { label: 'Từ chối', color: 'bg-red-900 text-red-200', icon: XCircle },
  };
  return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
};

export default function ReviewLearningPathPage() {
  const params = useParams();
  const router = useRouter();
  const pathId = params.id as string;

  const [pathData, setPathData] = useState<LearningPathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<SectionType>('goals');
  const [reviewing, setReviewing] = useState<{
    section: SectionType;
    status: 'pending' | 'approved' | 'needs_revision' | 'rejected' | null;
    notes: string;
    isOpen: boolean;
  }>({
    section: 'goals',
    status: null,
    notes: '',
    isOpen: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPathData();
  }, [pathId]);

  const fetchPathData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/learning-path/approval/${pathId}`);
      if (!response.ok) throw new Error('Failed to fetch path data');
      const data = await response.json();
      setPathData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSection = async (section: SectionType, status: 'approved' | 'needs_revision' | 'rejected') => {
    if (!pathData) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/learning-path/approval/${pathId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          status,
          teacherNotes: reviewing.notes,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit review');

      // Update local state
      setPathData({
        ...pathData,
        approvalProgress: {
          ...pathData.approvalProgress,
          [section]: status,
        },
      });

      // Reset review state
      setReviewing({ section: 'goals', status: null, notes: '', isOpen: false });
      setExpandedSection(section);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error || !pathData) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/admin/learning-path/approve">
            <Button variant="outline" className="mb-6 border-gray-600 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <Card className="bg-red-900 border-red-700">
            <CardContent className="pt-6">
              <p className="text-red-200">{error || 'Không thể tải dữ liệu'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/learning-path/approve">
            <Button variant="outline" className="mb-4 border-gray-600 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{pathData.title}</h1>
              <p className="text-gray-400 mb-2">Học sinh: <span className="text-white font-semibold">{pathData.studentName}</span></p>
              <p className="text-gray-500 text-sm">Gửi lúc: {new Date(pathData.submittedAt).toLocaleString('vi-VN')}</p>
            </div>
            <Badge className={`${getStatusBadge(pathData.approvalProgress.overall).color} px-4 py-2`}>
              {getStatusBadge(pathData.approvalProgress.overall).label}
            </Badge>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {SECTIONS.map((section, idx) => (
              <div key={section.id} className="flex items-center flex-1">
                <button
                  onClick={() => setExpandedSection(section.id)}
                  className={`flex items-center gap-2 pb-2 px-2 border-b-2 transition-colors ${
                    expandedSection === section.id
                      ? 'border-blue-400 text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    pathData.approvalProgress[section.id as SectionType] === 'approved'
                      ? 'bg-green-600 text-white'
                      : pathData.approvalProgress[section.id as SectionType] === 'rejected'
                      ? 'bg-red-600 text-white'
                      : pathData.approvalProgress[section.id as SectionType] === 'needs_revision'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium">{section.vietnameseName}</span>
                </button>
                {idx < SECTIONS.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-700 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {/* Goals Section */}
          {expandedSection === 'goals' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader
                onClick={() => setExpandedSection(expandedSection === 'goals' ? 'goals' : 'goals')}
                className="cursor-pointer flex items-center justify-between"
              >
                <div>
                  <CardTitle className="text-white">Mục tiêu</CardTitle>
                  <CardDescription>Các mục tiêu học tập của lộ trình</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadge(pathData.approvalProgress.goals).color}>
                    {getStatusBadge(pathData.approvalProgress.goals).label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {pathData.data.goals.map((goal) => (
                    <div key={goal.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h4 className="font-semibold text-white mb-2">{goal.title}</h4>
                      <p className="text-gray-300">{goal.description}</p>
                    </div>
                  ))}
                </div>

                {/* Review Controls */}
                <SectionReviewControls
                  section="goals"
                  status={pathData.approvalProgress.goals}
                  reviewing={reviewing}
                  setReviewing={setReviewing}
                  onSubmit={handleReviewSection}
                  submitting={submitting}
                />
              </CardContent>
            </Card>
          )}

          {/* Domains Section */}
          {expandedSection === 'domains' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Môn học</CardTitle>
                  <CardDescription>Các môn học được chọn</CardDescription>
                </div>
                <Badge className={getStatusBadge(pathData.approvalProgress.domains).color}>
                  {getStatusBadge(pathData.approvalProgress.domains).label}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {pathData.data.domains.map((domain) => {
                    const display = DOMAIN_DISPLAY[domain] || { name: domain, icon: '📚', color: 'text-gray-400' };
                    return (
                      <div key={domain} className="bg-gray-700 rounded-lg p-4 border border-gray-600 flex items-center gap-3">
                        <span className="text-3xl">{display.icon}</span>
                        <span className={`font-semibold ${display.color}`}>{display.name}</span>
                      </div>
                    );
                  })}
                </div>

                <SectionReviewControls
                  section="domains"
                  status={pathData.approvalProgress.domains}
                  reviewing={reviewing}
                  setReviewing={setReviewing}
                  onSubmit={handleReviewSection}
                  submitting={submitting}
                />
              </CardContent>
            </Card>
          )}

          {/* Segments Section */}
          {expandedSection === 'segments' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Nội dung bài học</CardTitle>
                  <CardDescription>Các bài học trong lộ trình</CardDescription>
                </div>
                <Badge className={getStatusBadge(pathData.approvalProgress.segments).color}>
                  {getStatusBadge(pathData.approvalProgress.segments).label}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {pathData.data.segments.map((segment, idx) => (
                    <div key={segment.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-semibold text-white mb-1">
                            <span className="text-gray-400">Bài {idx + 1}:</span> {segment.title}
                          </h4>
                          <p className="text-gray-300 mb-2">{segment.description}</p>
                          <span className="text-sm text-gray-400">Thời lượng: {segment.duration} giờ</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <SectionReviewControls
                  section="segments"
                  status={pathData.approvalProgress.segments}
                  reviewing={reviewing}
                  setReviewing={setReviewing}
                  onSubmit={handleReviewSection}
                  submitting={submitting}
                />
              </CardContent>
            </Card>
          )}

          {/* Weekly Plan Section */}
          {expandedSection === 'weekly_plan' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Kế hoạch tuần</CardTitle>
                  <CardDescription>Lịch học theo tuần</CardDescription>
                </div>
                <Badge className={getStatusBadge(pathData.approvalProgress.weekly_plan).color}>
                  {getStatusBadge(pathData.approvalProgress.weekly_plan).label}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {pathData.data.weekly_plan.map((week) => (
                    <div key={week.week} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h4 className="font-semibold text-white mb-3">Tuần {week.week}</h4>
                      <div className="space-y-2">
                        {week.topics.map((topic, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-300">{topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <SectionReviewControls
                  section="weekly_plan"
                  status={pathData.approvalProgress.weekly_plan}
                  reviewing={reviewing}
                  setReviewing={setReviewing}
                  onSubmit={handleReviewSection}
                  submitting={submitting}
                />
              </CardContent>
            </Card>
          )}

          {/* Overall Section */}
          {expandedSection === 'overall' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Tổng thể</CardTitle>
                  <CardDescription>Đánh giá chung về lộ trình</CardDescription>
                </div>
                <Badge className={getStatusBadge(pathData.approvalProgress.overall).color}>
                  {getStatusBadge(pathData.approvalProgress.overall).label}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-700 rounded-lg p-6 border border-gray-600 mb-6">
                  <h4 className="font-semibold text-white mb-4">Tóm tắt tiến độ duyệt</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {SECTIONS.filter(s => s.id !== 'overall').map((section) => {
                      const status = pathData.approvalProgress[section.id as SectionType];
                      const statusConfig = getStatusBadge(status);
                      return (
                        <div key={section.id} className="text-center">
                          <div className="text-2xl mb-2">
                            {status === 'approved' && '✓'}
                            {status === 'rejected' && '✗'}
                            {status === 'needs_revision' && '!'}
                            {status === 'pending' && '○'}
                          </div>
                          <p className="text-xs font-medium text-gray-300">{section.vietnameseName}</p>
                          <p className="text-xs text-gray-400">{statusConfig.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <SectionReviewControls
                  section="overall"
                  status={pathData.approvalProgress.overall}
                  reviewing={reviewing}
                  setReviewing={setReviewing}
                  onSubmit={handleReviewSection}
                  submitting={submitting}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface SectionReviewControlsProps {
  section: SectionType;
  status: string;
  reviewing: {
    section: SectionType;
    status: 'pending' | 'approved' | 'needs_revision' | 'rejected' | null;
    notes: string;
    isOpen: boolean;
  };
  setReviewing: (state: any) => void;
  onSubmit: (section: SectionType, status: 'approved' | 'needs_revision' | 'rejected') => Promise<void>;
  submitting: boolean;
}

function SectionReviewControls({
  section,
  status,
  reviewing,
  setReviewing,
  onSubmit,
  submitting,
}: SectionReviewControlsProps) {
  const isReviewing = reviewing.isOpen && reviewing.section === section;

  return (
    <div className="border-t border-gray-700 pt-4">
      {!isReviewing ? (
        <div className="flex gap-2">
          <Button
            onClick={() => setReviewing({ section, status: null, notes: '', isOpen: true })}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Xem xét
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Ghi chú (nếu cần)</label>
            <textarea
              value={reviewing.notes}
              onChange={(e) => setReviewing({ ...reviewing, notes: e.target.value })}
              placeholder="Nhập ghi chú hoặc lý do từ chối/yêu cầu chỉnh sửa..."
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => onSubmit(section, 'approved')}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
            >
              {submitting ? 'Đang xử lý...' : 'Duyệt'}
            </Button>
            <Button
              onClick={() => onSubmit(section, 'needs_revision')}
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
            >
              {submitting ? 'Đang xử lý...' : 'Yêu cầu chỉnh sửa'}
            </Button>
            <Button
              onClick={() => onSubmit(section, 'rejected')}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
            >
              {submitting ? 'Đang xử lý...' : 'Từ chối'}
            </Button>
            <Button
              onClick={() => setReviewing({ section, status: null, notes: '', isOpen: false })}
              disabled={submitting}
              variant="outline"
              className="border-gray-600 text-gray-400 hover:text-white"
            >
              Hủy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
