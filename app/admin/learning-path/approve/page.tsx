'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface LearningPath {
  id: string;
  studentName: string;
  studentId: string;
  title: string;
  description: string;
  submittedAt: string;
  status: 'pending' | 'in_review' | 'approved' | 'needs_revision' | 'rejected';
  approvalProgress: {
    goals: 'pending' | 'approved' | 'needs_revision' | 'rejected';
    domains: 'pending' | 'approved' | 'needs_revision' | 'rejected';
    segments: 'pending' | 'approved' | 'needs_revision' | 'rejected';
    weekly_plan: 'pending' | 'approved' | 'needs_revision' | 'rejected';
    overall: 'pending' | 'approved' | 'needs_revision' | 'rejected';
  };
}

interface DashboardStats {
  totalPending: number;
  inReview: number;
  needsRevision: number;
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { label: 'Chờ duyệt', variant: 'outline' as const, color: 'text-yellow-400' },
    in_review: { label: 'Đang xem xét', variant: 'outline' as const, color: 'text-blue-400' },
    approved: { label: 'Đã duyệt', variant: 'default' as const, color: 'text-green-400' },
    needs_revision: { label: 'Cần chỉnh sửa', variant: 'outline' as const, color: 'text-orange-400' },
    rejected: { label: 'Từ chối', variant: 'outline' as const, color: 'text-red-400' },
  };
  return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
};

const getApprovalProgressPercentage = (progress: LearningPath['approvalProgress']): number => {
  const sections = Object.values(progress);
  const approved = sections.filter(s => s === 'approved').length;
  return Math.round((approved / sections.length) * 100);
};

export default function ApproveLearnngPathPage() {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalPending: 0, inReview: 0, needsRevision: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPendingPaths();
  }, []);

  const fetchPendingPaths = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/learning-path/approval/pending');
      if (!response.ok) throw new Error('Failed to fetch pending paths');
      const data = await response.json();
      setLearningPaths(data.paths || []);
      setStats({
        totalPending: data.stats?.totalPending || 0,
        inReview: data.stats?.inReview || 0,
        needsRevision: data.stats?.needsRevision || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredPaths = learningPaths.filter(path =>
    path.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    path.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Duyệt Lộ trình học tập</h1>
          <p className="text-gray-400">Xem xét và phê duyệt lộ trình học tập của học sinh</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Chờ duyệt</p>
                  <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.totalPending}</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Đang xem xét</p>
                  <p className="text-3xl font-bold text-blue-400 mt-2">{stats.inReview}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Cần chỉnh sửa</p>
                  <p className="text-3xl font-bold text-orange-400 mt-2">{stats.needsRevision}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-orange-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Tìm kiếm theo tên học sinh hoặc tiêu đề lộ trình..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />
        </div>

        {/* Error Message */}
        {error && (
          <Card className="bg-red-900 border-red-700 mb-6">
            <CardContent className="pt-6">
              <p className="text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Learning Paths List */}
        <div className="space-y-4">
          {filteredPaths.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <p className="text-gray-400 text-center py-8">Không có lộ trình học tập nào</p>
              </CardContent>
            </Card>
          ) : (
            filteredPaths.map((path) => (
              <Card key={path.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{path.title}</h3>
                        <Badge variant={getStatusBadge(path.status).variant as any}>
                          {getStatusBadge(path.status).label}
                        </Badge>
                      </div>
                      <p className="text-gray-400 mb-2">Học sinh: <span className="text-white">{path.studentName}</span></p>
                      <p className="text-gray-500 text-sm mb-4">{path.description}</p>

                      {/* Approval Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Tiến độ duyệt</span>
                          <span className="text-sm font-semibold text-white">
                            {getApprovalProgressPercentage(path.approvalProgress)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getApprovalProgressPercentage(path.approvalProgress)}%` }}
                          />
                        </div>
                      </div>

                      {/* Section Status */}
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(path.approvalProgress).map(([section, status]) => {
                          const sectionLabels = {
                            goals: 'Mục tiêu',
                            domains: 'Môn học',
                            segments: 'Nội dung',
                            weekly_plan: 'Thứ lịch',
                            overall: 'Tổng thể',
                          };
                          const statusIcons = {
                            pending: <Clock className="w-4 h-4" />,
                            approved: <CheckCircle className="w-4 h-4 text-green-400" />,
                            needs_revision: <AlertCircle className="w-4 h-4 text-orange-400" />,
                            rejected: <XCircle className="w-4 h-4 text-red-400" />,
                          };
                          return (
                            <div key={section} className="flex items-center gap-2 text-xs">
                              {statusIcons[status as keyof typeof statusIcons]}
                              <span className="text-gray-400">{sectionLabels[section as keyof typeof sectionLabels]}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Submission Date */}
                      <p className="text-gray-500 text-xs mt-4">
                        Gửi lúc: {new Date(path.submittedAt).toLocaleString('vi-VN')}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/admin/learning-path/${path.id}/review`}>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          Xem xét
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setExpandedId(expandedId === path.id ? null : path.id)}
                        className="border-gray-600 text-gray-400 hover:text-white"
                      >
                        {expandedId === path.id ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Preview */}
                  {expandedId === path.id && (
                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <p className="text-gray-300 mb-2">Mô tả chi tiết:</p>
                      <p className="text-gray-400">{path.description}</p>
                      <p className="text-gray-500 text-sm mt-4">
                        ID: {path.id}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
