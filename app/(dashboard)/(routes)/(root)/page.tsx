'use client';

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { 
  Sparkles, 
  FlaskConical, 
  Map, 
  Trophy, 
  BookOpen,
  Brain,
  Zap,
  Target,
  Users,
  Award
} from "lucide-react";

import { CoursesList } from "@/components/courses-list";

import { ModuleCard } from "./_components/module-card";
import { QuickStats } from "./_components/quick-stats";
import { WelcomeSection } from "./_components/welcome-section";
import { RecentActivity } from "./_components/recent-activity";
import { LoadingSkeleton } from "./_components/loading-skeleton";
import { ModuleIntro } from "./_components/module-intro";
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return <LoadingSkeleton />;
  }

  if (!session?.user?.id) {
    return null; // Will redirect via useEffect
  }

  // Mock data for demo - in real app, fetch from API
  const completedCourses: any[] = [];
  const coursesInProgress: any[] = [];

  // Mock data for demonstration - in real app, this would come from database
  const totalCourses = completedCourses.length + coursesInProgress.length;
  const totalXP = (completedCourses.length * 100) + (coursesInProgress.length * 50);
  const currentStreak = 7; // This would be calculated from user activity
  const achievements = 12; // This would come from user achievements

  // Mock recent activities
  const recentActivities = [
    {
      id: "1",
      type: "course_completed" as const,
      title: "Hoàn thành khóa học Toán cơ bản",
      description: "Bạn đã hoàn thành tất cả các chương trong khóa học",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      courseTitle: "Toán cơ bản",
      xp: 100,
      icon: Award,
      color: "text-green-600"
    },
    {
      id: "2",
      type: "chapter_completed" as const,
      title: "Hoàn thành chương 3: Đại số",
      description: "Bạn đã học xong chương về phương trình bậc nhất",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      courseTitle: "Toán nâng cao",
      chapterTitle: "Đại số",
      xp: 25,
      icon: BookOpen,
      color: "text-purple-600"
    },
    {
      id: "3",
      type: "achievement" as const,
      title: "Đạt thành tích 'Học viên chăm chỉ'",
      description: "Bạn đã học liên tục 7 ngày",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      xp: 50,
      icon: Award,
      color: "text-yellow-600"
    }
  ];

  // Define available modules based on user role
  const getAvailableModules = () => {
  const { t } = useLanguage();
    const baseModules = [
      {
        title: "AI Content Generator",
        description: "Tạo nội dung học tập thông minh với trí tuệ nhân tạo. Tạo bài tập, câu hỏi và tài liệu học tập tự động chỉ trong vài phút.",
        icon: Sparkles,
        href: "/dashboard/ai-content-generator",
        variant: "premium" as const,
        stats: {
          users: 1250,
          completion: 85,
          rating: 4.8,
          duration: "5-10 phút"
        },
        features: [
          "🤖 Tạo bài tập tự động theo chủ đề",
          "❓ Câu hỏi trắc nghiệm thông minh", 
          "📚 Tài liệu học tập cá nhân hóa",
          "🎯 Đánh giá và phản hồi tức thì"
        ],
        isNew: true,
        isPopular: true,
        category: "AI & Machine Learning",
        benefits: [
          "Tiết kiệm 80% thời gian tạo nội dung",
          "Chất lượng nội dung chuyên nghiệp",
          "Phù hợp với mọi trình độ học viên"
        ],
        useCases: "Giảng viên tạo bài tập, học viên ôn tập, phụ huynh hỗ trợ con học"
      },
      {
        title: "AeroEdu - Virtual Labs",
        description: "Khám phá khoa học qua các thí nghiệm ảo tương tác. Học vật lý, hóa học, sinh học với mô phỏng 3D chân thực và an toàn.",
        icon: FlaskConical,
        href: "/dashboard/labtwin",
        variant: "featured" as const,
        stats: {
          users: 2100,
          completion: 78,
          rating: 4.9,
          duration: "15-30 phút"
        },
        features: [
          "🧪 25+ thí nghiệm ảo tương tác",
          "🎮 Mô phỏng 3D chân thực",
          "📊 Phân tích dữ liệu thời gian thực",
          "🔬 Nhiều môn: Vật lý, Hóa học, Sinh học"
        ],
        isPopular: true,
        category: "Khoa học & Thí nghiệm",
        benefits: [
          "Thí nghiệm an toàn 100%",
          "Tiết kiệm chi phí thiết bị",
          "Học mọi lúc, mọi nơi"
        ],
        useCases: "Học sinh thực hành, giáo viên giảng dạy, nghiên cứu khoa học"
      },
      {
        title: "Learning Paths",
        description: "Lộ trình học tập được cá nhân hóa theo mục tiêu và trình độ của bạn. Theo dõi tiến độ và đạt được mục tiêu học tập một cách hiệu quả.",
        icon: Map,
        href: "/learning-paths-demo",
        variant: "new" as const,
        stats: {
          users: 890,
          completion: 92,
          rating: 4.7,
          duration: "Tùy chỉnh"
        },
        features: [
          "🗺️ Lộ trình học tập cá nhân hóa",
          "📈 Theo dõi tiến độ chi tiết",
          "🎯 Đặt và theo dõi mục tiêu",
          "🏆 Hệ thống thành tích và khen thưởng"
        ],
        isNew: true,
        category: "Học tập & Phát triển",
        benefits: [
          "Tăng 60% hiệu quả học tập",
          "Động lực học tập cao hơn",
          "Lộ trình rõ ràng và có mục tiêu"
        ],
        useCases: "Học viên tự học, giáo viên hướng dẫn, phụ huynh theo dõi tiến độ"
      }
    ];

    if (session.user.role === "STUDENT") {
      return [
        ...baseModules,
        {
          title: "Student Dashboard",
          description: "Bảng điều khiển học viên với thống kê chi tiết, tiến độ học tập và thành tích cá nhân. Theo dõi hành trình học tập của bạn một cách trực quan.",
          icon: Trophy,
          href: "/dashboard",
          variant: "default" as const,
          stats: {
            users: 3500,
            completion: 88,
            rating: 4.6,
            duration: "2-5 phút"
          },
          features: [
            "📊 Thống kê học tập chi tiết",
            "📈 Theo dõi tiến độ khóa học",
            "🏆 Hệ thống thành tích và huy hiệu",
            "📅 Lịch học và nhắc nhở"
          ],
          category: "Dashboard & Thống kê",
          benefits: [
            "Tổng quan toàn diện về học tập",
            "Động lực học tập cao hơn",
            "Theo dõi mục tiêu cá nhân"
          ],
          useCases: "Học viên theo dõi tiến độ, phụ huynh giám sát, giáo viên đánh giá"
        }
      ];
    }

    if (session.user.role === "TEACHER") {
      return [
        ...baseModules,
        {
          title: "Course Management",
          description: "Quản lý khóa học toàn diện, tạo nội dung phong phú, theo dõi học viên và phân tích hiệu quả giảng dạy một cách chuyên nghiệp.",
          icon: BookOpen,
          href: "/teacher/courses",
          variant: "default" as const,
          stats: {
            users: 450,
            completion: 95,
            rating: 4.8,
            duration: "10-20 phút"
          },
          features: [
            "📚 Tạo và quản lý khóa học",
            "📝 Soạn thảo nội dung đa phương tiện",
            "👥 Theo dõi tiến độ học viên",
            "📊 Phân tích hiệu quả giảng dạy"
          ],
          category: "Giảng dạy & Quản lý",
          benefits: [
            "Tăng 70% hiệu quả quản lý khóa học",
            "Theo dõi học viên chi tiết",
            "Tối ưu hóa phương pháp giảng dạy"
          ],
          useCases: "Giảng viên tạo khóa học, quản lý lớp học, đánh giá học viên"
        }
      ];
    }

    if (session.user.role === "ADMIN") {
      return [
        ...baseModules,
        {
          title: "Admin Dashboard",
          description: "Bảng điều khiển quản trị viên với thống kê toàn hệ thống, quản lý người dùng và phân tích hiệu suất chi tiết.",
          icon: Users,
          href: "/admin/dashboard",
          variant: "premium" as const,
          stats: {
            users: 25,
            completion: 100,
            rating: 4.9,
            duration: "5-15 phút"
          },
          features: [
            "📊 Thống kê hệ thống toàn diện",
            "👥 Quản lý người dùng và quyền hạn",
            "📈 Phân tích hiệu suất và báo cáo",
            "⚙️ Cấu hình hệ thống và bảo mật"
          ],
          category: "Quản trị & Phân tích",
          benefits: [
            "Kiểm soát toàn bộ hệ thống",
            "Báo cáo chi tiết và chính xác",
            "Bảo mật và quản lý rủi ro"
          ],
          useCases: "Quản trị viên giám sát hệ thống, phân tích dữ liệu, quản lý người dùng"
        }
      ];
    }

    return baseModules;
  };

  const availableModules = getAvailableModules();

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 relative overflow-hidden">
        {/* Soft background elements for students */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-pink-100/40 to-rose-100/40 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-yellow-100/40 to-orange-100/40 rounded-full animate-bounce"></div>
          <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-br from-pink-100/30 to-purple-100/30 rounded-full animate-pulse"></div>
          <div className="absolute bottom-40 right-1/3 w-28 h-28 bg-gradient-to-br from-rose-100/40 to-pink-100/40 rounded-full animate-bounce"></div>
        </div>
        
        <div className="relative z-10 p-6 space-y-8">
        {/* Welcome Section */}
        <WelcomeSection
          userName={session.user.name || "Người dùng"}
          userRole={session.user.role}
          lastLogin="Hôm nay"
          currentStreak={currentStreak}
          nextGoal="Hoàn thành 3 chương mới"
        />

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 bg-clip-text text-transparent">
              📊 Thống kê nhanh
            </h2>
            <div className="flex gap-1">
                            <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
          <QuickStats
            totalCourses={totalCourses}
            completedCourses={completedCourses.length}
            inProgressCourses={coursesInProgress.length}
            totalXP={totalXP}
            streak={currentStreak}
            achievements={achievements}
          />
        </div>

        {/* Module Introduction */}
        <ModuleIntro
          totalModules={availableModules.length}
          totalUsers={availableModules.reduce((sum, module) => sum + (module.stats?.users || 0), 0)}
          averageRating={Number((availableModules.reduce((sum, module) => sum + (module.stats?.rating || 0), 0) / availableModules.length).toFixed(1))}
          completionRate={Math.round(availableModules.reduce((sum, module) => sum + (module.stats?.completion || 0), 0) / availableModules.length)}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Modules Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 bg-clip-text text-transparent">
                  🎯 Các module học tập
                </h2>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm bg-gradient-to-r from-pink-100 to-rose-100 px-3 py-1 rounded-full border border-pink-200">
                <Zap className="h-4 w-4 text-pink-600" />
                <span className="text-pink-700 font-medium">{availableModules.length} module có sẵn</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableModules.map((module, index) => (
                <ModuleCard
                  key={index}
                  title={module.title}
                  description={module.description}
                  icon={module.icon}
                  href={module.href}
                  variant={module.variant}
                  stats={module.stats}
                  features={module.features}
                  benefits={module.benefits}
                  useCases={module.useCases}
                  isNew={module.isNew}
                  isPopular={module.isPopular}
                  category={module.category}
                />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <RecentActivity activities={recentActivities} />
            
            {/* Quick Actions - Student style */}
            <div className="bg-gradient-to-br from-white to-pink-50/30 rounded-xl border border-pink-200 p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-bold text-gray-900 text-lg">⚡ Hành động nhanh</h3>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
              <div className="space-y-3">
                <button className="w-full text-left p-4 rounded-xl border border-pink-200 hover:border-pink-300 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-300 group transform hover:scale-105 active:scale-95">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl group-hover:from-pink-200 group-hover:to-rose-200 transition-all duration-300 shadow-md">
                      <BookOpen className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">📚 Tiếp tục học</p>
                      <p className="text-sm text-gray-600">Khóa học đang học</p>
                    </div>
                  </div>
                </button>
                
                <button className="w-full text-left p-4 rounded-xl border border-orange-200 hover:border-orange-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-yellow-50 transition-all duration-300 group transform hover:scale-105 active:scale-95">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl group-hover:from-orange-200 group-hover:to-yellow-200 transition-all duration-300 shadow-md">
                      <Target className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">🎯 Đặt mục tiêu</p>
                      <p className="text-sm text-gray-600">Mục tiêu học tập mới</p>
                    </div>
                  </div>
                </button>
                
                <button className="w-full text-left p-4 rounded-xl border border-purple-200 hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300 group transform hover:scale-105 active:scale-95">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl group-hover:from-purple-200 group-hover:to-pink-200 transition-all duration-300 shadow-md">
                      <Award className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">🏆 Xem thành tích</p>
                      <p className="text-sm text-gray-600">Thành tích đã đạt</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Courses Section */}
        {(coursesInProgress.length > 0 || completedCourses.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 bg-clip-text text-transparent">
                📚 Khóa học của bạn
              </h2>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
            <CoursesList
              items={[...coursesInProgress, ...completedCourses]}
            />
          </div>
        )}
        </div>
      </div>
    </Suspense>
  )
}
