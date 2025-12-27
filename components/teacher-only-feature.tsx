"use client";

import { useSession } from "next-auth/react";
import { Lock, GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface TeacherOnlyFeatureProps {
  featureName?: string;
  description?: string;
  redirectUrl?: string;
  autoRedirect?: boolean;
}

export function TeacherOnlyFeature({
  featureName = "Tính năng Gen AI",
  description = "Tính năng này chỉ dành cho giáo viên để tạo và quản lý nội dung học tập.",
  redirectUrl = "/dashboard",
  autoRedirect = false,
}: TeacherOnlyFeatureProps) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Auto redirect after 3 seconds if enabled
    if (autoRedirect && session?.user?.role === "STUDENT") {
      const timer = setTimeout(() => {
        router.push(redirectUrl);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoRedirect, redirectUrl, router, session]);

  if (session?.user?.role !== "STUDENT") {
    return null; // Don't show if not a student
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-full mb-4">
              <Lock className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Tính năng dành cho Giáo viên</h1>
            <p className="text-purple-100 text-lg">Teacher-Only Feature</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Feature name */}
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
            <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900">{featureName}</h2>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>

          {/* Why teacher only */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              Tại sao chỉ dành cho giáo viên?
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Tạo và quản lý nội dung học tập chất lượng cao</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Sử dụng AI để tối ưu hóa bài giảng và bài tập</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Phân tích và đánh giá tiến độ học sinh hiệu quả</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Tính năng chuyên nghiệp dành cho giảng dạy</span>
              </li>
            </ul>
          </div>

          {/* What students can do */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              💡 Dành cho học sinh
            </h3>
            <p className="text-blue-700 text-sm">
              Bạn có thể sử dụng các tính năng học tập tuyệt vời khác:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              <li>• LabTwin - Thí nghiệm thực hành ảo</li>
              <li>• Learning Paths - Lộ trình học tập cá nhân hóa</li>
              <li>• Quizzes & Assignments - Bài tập và kiểm tra</li>
              <li>• Progress Tracking - Theo dõi tiến độ</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              href={redirectUrl}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
            >
              Về Trang chủ
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard/labtwin"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all border-2 border-purple-200"
            >
              Khám phá LabTwin
              <Sparkles className="w-5 h-5" />
            </Link>
          </div>

          {/* Contact info */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Bạn là giáo viên?{" "}
              <Link
                href="/contact-sales"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Liên hệ để nâng cấp tài khoản
              </Link>
            </p>
          </div>

          {/* Auto redirect notice */}
          {autoRedirect && (
            <div className="text-center">
              <p className="text-xs text-gray-400">
                Tự động chuyển hướng sau 3 giây...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

