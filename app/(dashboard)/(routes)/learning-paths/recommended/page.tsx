'use client';

import React, { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Badge,
  BadgeProps,
} from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  Sparkles,
  BookOpen,
  Clock,
  Users,
  Search,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Heart,
  Share2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface Domain {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface TemplateCard {
  id: string;
  title: string;
  description: string;
  domains: Domain[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedWeeks: number;
  rating: number;
  ratingCount: number;
  enrollmentCount: number;
  image?: string;
  matchScore?: number;
  matchReasons?: string[];
  isEnrolled?: boolean;
}

interface StudentPath {
  id: string;
  title: string;
  description: string;
  domains: Domain[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedWeeks: number;
  status: 'pending_review' | 'in_review' | 'approved' | 'needs_revision' | 'rejected' | 'active' | 'completed';
  approvalProgress?: number;
  approvalTotal?: number;
  progress?: number;
  enrolledAt?: string;
  completedAt?: string;
}

const DOMAIN_DISPLAY: Record<string, Domain> = {
  math: { id: 'math', name: 'Toán học', icon: '🧮', color: 'text-blue-400' },
  physics: { id: 'physics', name: 'Vật lý', icon: '⚛️', color: 'text-cyan-400' },
  chemistry: { id: 'chemistry', name: 'Hóa học', icon: '🧪', color: 'text-green-400' },
  biology: { id: 'biology', name: 'Sinh học', icon: '🧬', color: 'text-emerald-400' },
  computer_science: { id: 'computer_science', name: 'Tin học', icon: '💻', color: 'text-violet-400' },
  music: { id: 'music', name: 'Âm nhạc', icon: '🎵', color: 'text-pink-400' },
  art: { id: 'art', name: 'Nghệ thuật', icon: '🎨', color: 'text-rose-400' },
  language: { id: 'language', name: 'Ngôn ngữ', icon: '📝', color: 'text-amber-400' },
  history: { id: 'history', name: 'Lịch sử', icon: '📜', color: 'text-orange-400' },
  geography: { id: 'geography', name: 'Địa lý', icon: '🌍', color: 'text-teal-400' },
  economics: { id: 'economics', name: 'Kinh tế', icon: '📈', color: 'text-yellow-400' },
  philosophy: { id: 'philosophy', name: 'Triết học', icon: '💭', color: 'text-indigo-400' },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending_review: { label: 'Chờ duyệt', color: 'bg-yellow-500/20 text-yellow-400' },
  in_review: { label: 'Đang duyệt', color: 'bg-blue-500/20 text-blue-400' },
  approved: { label: 'Đã duyệt', color: 'bg-green-500/20 text-green-400' },
  needs_revision: { label: 'Cần chỉnh sửa', color: 'bg-orange-500/20 text-orange-400' },
  rejected: { label: 'Từ chối', color: 'bg-red-500/20 text-red-400' },
  active: { label: 'Đang học', color: 'bg-emerald-500/20 text-emerald-400' },
  completed: { label: 'Hoàn thành', color: 'bg-purple-500/20 text-purple-400' },
};

const DIFFICULTY_MAP: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  advanced: 'bg-red-500/20 text-red-400',
};

function TemplateCardComponent({
  template,
  showMatchScore = false,
  onEnroll,
  onViewDetails,
}: {
  template: TemplateCard;
  showMatchScore?: boolean;
  onEnroll?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}) {
  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-blue-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg text-white line-clamp-2">
              {template.title}
            </CardTitle>
          </div>
          {showMatchScore && template.matchScore && (
            <Badge className="bg-blue-500/30 text-blue-300 border-0 whitespace-nowrap">
              {template.matchScore}% phù hợp
            </Badge>
          )}
        </div>
        <CardDescription className="text-gray-400 line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Domains */}
        <div className="flex flex-wrap gap-2">
          {template.domains.map((domain) => (
            <Badge
              key={domain.id}
              variant="outline"
              className={`border-gray-600 ${domain.color} text-xs`}
            >
              <span className="mr-1">{domain.icon}</span>
              {domain.name}
            </Badge>
          ))}
        </div>

        {/* Difficulty & Duration */}
        <div className="flex gap-3 text-sm">
          <Badge className={DIFFICULTY_COLORS[template.difficulty]}>
            {DIFFICULTY_MAP[template.difficulty]}
          </Badge>
          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{template.estimatedWeeks} tuần</span>
          </div>
        </div>

        {/* Rating & Enrollment */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(template.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-400">
              {template.rating.toFixed(1)} ({template.ratingCount})
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Users className="w-4 h-4" />
            <span>{template.enrollmentCount}</span>
          </div>
        </div>

        {/* Match Reasons */}
        {showMatchScore && template.matchReasons && template.matchReasons.length > 0 && (
          <div className="bg-gray-700/30 rounded p-2">
            <p className="text-xs font-semibold text-gray-300 mb-1">Lý do phù hợp:</p>
            <ul className="text-xs text-gray-400 space-y-0.5">
              {template.matchReasons.slice(0, 2).map((reason, idx) => (
                <li key={idx} className="flex gap-1">
                  <span>•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {showMatchScore ? (
            <Button
              onClick={() => onEnroll?.(template.id)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={template.isEnrolled}
            >
              {template.isEnrolled ? 'Đã đăng ký' : 'Bắt đầu học'}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => onViewDetails?.(template.id)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Xem chi tiết
              </Button>
              <Button
                onClick={() => onEnroll?.(template.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={template.isEnrolled}
              >
                {template.isEnrolled ? '✓ Đã đăng ký' : 'Đăng ký'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StudentPathCard({
  path,
  onViewDetails,
}: {
  path: StudentPath;
  onViewDetails?: (id: string) => void;
}) {
  const statusInfo = STATUS_MAP[path.status];

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg text-white line-clamp-2">
              {path.title}
            </CardTitle>
          </div>
          <Badge className={statusInfo.color}>
            {statusInfo.label}
          </Badge>
        </div>
        <CardDescription className="text-gray-400 line-clamp-2">
          {path.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Domains */}
        <div className="flex flex-wrap gap-2">
          {path.domains.map((domain) => (
            <Badge
              key={domain.id}
              variant="outline"
              className={`border-gray-600 ${domain.color} text-xs`}
            >
              <span className="mr-1">{domain.icon}</span>
              {domain.name}
            </Badge>
          ))}
        </div>

        {/* Difficulty & Duration */}
        <div className="flex gap-3 text-sm">
          <Badge className={DIFFICULTY_COLORS[path.difficulty]}>
            {DIFFICULTY_MAP[path.difficulty]}
          </Badge>
          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{path.estimatedWeeks} tuần</span>
          </div>
        </div>

        {/* Approval Progress or Progress Bar */}
        {(path.status === 'pending_review' || path.status === 'in_review') &&
         path.approvalProgress !== undefined && path.approvalTotal !== undefined ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Tiến độ duyệt</span>
              <span className="text-gray-300 font-medium">
                {path.approvalProgress}/{path.approvalTotal} phần
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(path.approvalProgress / path.approvalTotal) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (path.status === 'active' || path.status === 'completed') &&
            path.progress !== undefined ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Tiến độ học tập</span>
              <span className="text-gray-300 font-medium">{path.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  path.status === 'completed' ? 'bg-green-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${path.progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Enrolled/Completed Date */}
        {path.enrolledAt && (
          <div className="text-xs text-gray-500">
            Đăng ký: {new Date(path.enrolledAt).toLocaleDateString('vi-VN')}
          </div>
        )}
        {path.completedAt && (
          <div className="text-xs text-green-500">
            Hoàn thành: {new Date(path.completedAt).toLocaleDateString('vi-VN')}
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={() => onViewDetails?.(path.id)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Xem chi tiết
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function RecommendedLearningPathsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('recommended');

  // Recommended Tab State
  const [recommendedTemplates, setRecommendedTemplates] = useState<TemplateCard[]>([]);
  const [hasSurvey, setHasSurvey] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

  // All Templates Tab State
  const [allTemplates, setAllTemplates] = useState<TemplateCard[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [loadingAll, setLoadingAll] = useState(true);

  // My Paths Tab State
  const [studentPaths, setStudentPaths] = useState<StudentPath[]>([]);
  const [loadingPaths, setLoadingPaths] = useState(true);

  // Load recommended templates
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadRecommended = async () => {
      try {
        setLoadingRecommended(true);

        // Check if student has completed survey
        const surveyData = localStorage.getItem('studentSurvey');
        if (!surveyData) {
          setHasSurvey(false);
          setLoadingRecommended(false);
          return;
        }

        setHasSurvey(true);

        // Fetch recommended templates
        const response = await fetch('/api/learning-path/templates/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surveyData }),
        });

        if (response.ok) {
          const data = await response.json();
          setRecommendedTemplates(data.recommendations || []);
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error);
      } finally {
        setLoadingRecommended(false);
      }
    };

    loadRecommended();
  }, [session]);

  // Load all templates
  useEffect(() => {
    const loadAllTemplates = async () => {
      try {
        setLoadingAll(true);
        const response = await fetch('/api/learning-path/templates');
        if (response.ok) {
          const data = await response.json();
          setAllTemplates(data.templates || []);
          setFilteredTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoadingAll(false);
      }
    };

    loadAllTemplates();
  }, []);

  // Load student's learning paths
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadStudentPaths = async () => {
      try {
        setLoadingPaths(true);
        const response = await fetch(`/api/learning-path/student/${session.user.id}`);
        if (response.ok) {
          const data = await response.json();
          setStudentPaths(data.paths || []);
        }
      } catch (error) {
        console.error('Failed to load student paths:', error);
      } finally {
        setLoadingPaths(false);
      }
    };

    loadStudentPaths();
  }, [session]);

  // Filter all templates
  useEffect(() => {
    let filtered = allTemplates;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    if (selectedDomain !== 'all') {
      filtered = filtered.filter((t) =>
        t.domains.some((d) => d.id === selectedDomain)
      );
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((t) => t.difficulty === selectedDifficulty);
    }

    setFilteredTemplates(filtered);
  }, [allTemplates, searchQuery, selectedDomain, selectedDifficulty]);

  const handleEnroll = async (templateId: string) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(
        `/api/learning-path/templates/${templateId}/enroll`,
        { method: 'POST' }
      );

      if (response.ok) {
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to enroll:', error);
    }
  };

  const handleViewDetails = (templateId: string) => {
    // Navigate to template details page
    // This would typically be a modal or separate page
    console.log('View details:', templateId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Lộ trình học tập
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Khám phá các lộ trình học tập được gợi ý dành cho bạn
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border border-gray-700 p-1 mb-8">
            <TabsTrigger
              value="recommended"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Gợi ý cho bạn</span>
              <span className="sm:hidden">Gợi ý</span>
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-gray-300 transition-colors"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Tất cả lộ trình</span>
              <span className="sm:hidden">Tất cả</span>
            </TabsTrigger>
            <TabsTrigger
              value="my-paths"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-gray-300 transition-colors"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Lộ trình của tôi</span>
              <span className="sm:hidden">Của tôi</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Recommended for You */}
          <TabsContent value="recommended" className="space-y-6">
            {!hasSurvey ? (
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="pt-6">
                  <div className="flex gap-4 items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-yellow-300 mb-2">
                        Hoàn thành khảo sát để nhận gợi ý cá nhân hóa
                      </h3>
                      <p className="text-yellow-300/80 text-sm mb-4">
                        Khảo sát giúp chúng tôi hiểu rõ hơn về mục tiêu và sở thích học tập của bạn.
                      </p>
                      <Link href="/dashboard/assessment">
                        <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                          Làm khảo sát ngay
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : loadingRecommended ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card
                    key={i}
                    className="bg-gray-800 border-gray-700 animate-pulse h-96"
                  />
                ))}
              </div>
            ) : recommendedTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedTemplates.map((template) => (
                  <TemplateCardComponent
                    key={template.id}
                    template={template}
                    showMatchScore={true}
                    onEnroll={handleEnroll}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">
                      Chưa có gợi ý nào
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Hãy hoàn thành khảo sát để nhận được các gợi ý được cá nhân hóa
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: All Learning Paths */}
          <TabsContent value="all" className="space-y-6">
            {/* Filter Bar */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <Input
                      placeholder="Tìm kiếm lộ trình..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Lĩnh vực
                      </label>
                      <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Chọn lĩnh vực" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="all">Tất cả lĩnh vực</SelectItem>
                          {Object.entries(DOMAIN_DISPLAY).map(([key, domain]) => (
                            <SelectItem key={key} value={key}>
                              {domain.icon} {domain.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Mức độ
                      </label>
                      <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Chọn mức độ" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="all">Tất cả mức độ</SelectItem>
                          <SelectItem value="beginner">Cơ bản</SelectItem>
                          <SelectItem value="intermediate">Trung bình</SelectItem>
                          <SelectItem value="advanced">Nâng cao</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedDomain('all');
                          setSelectedDifficulty('all');
                        }}
                        variant="outline"
                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        Xóa bộ lọc
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {loadingAll ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <Card
                    key={i}
                    className="bg-gray-800 border-gray-700 animate-pulse h-96"
                  />
                ))}
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Tìm thấy {filteredTemplates.length} lộ trình
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <TemplateCardComponent
                      key={template.id}
                      template={template}
                      showMatchScore={false}
                      onEnroll={handleEnroll}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">
                      Không tìm thấy lộ trình nào
                    </h3>
                    <p className="text-gray-500">
                      Hãy thử điều chỉnh bộ lọc để xem thêm kết quả
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 3: My Learning Paths */}
          <TabsContent value="my-paths" className="space-y-6">
            {loadingPaths ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card
                    key={i}
                    className="bg-gray-800 border-gray-700 animate-pulse h-80"
                  />
                ))}
              </div>
            ) : studentPaths.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {studentPaths.map((path) => (
                  <StudentPathCard
                    key={path.id}
                    path={path}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">
                      Chưa có lộ trình nào
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Hãy duyệt các lộ trình được gợi ý hoặc tất cả lộ trình để bắt đầu
                    </p>
                    <Button
                      onClick={() => setActiveTab('recommended')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Khám phá lộ trình
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
