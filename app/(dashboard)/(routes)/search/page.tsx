'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

// Search is not needed - AI Tutor automatically suggests personalized content
export default function SearchPageRedirect() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.role === 'STUDENT') {
      // Redirect students to AI Tutor (which auto-selects content)
      router.replace('/ai-tutor');
    } else {
      // Teachers might still need search
      router.replace('/teacher/courses');
    }
  }, [session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Không cần tìm kiếm nữa! 🎯
        </h1>
        
        <p className="text-gray-600 mb-6">
          Với <strong>AI Tutor</strong>, bạn không cần phải tìm kiếm bài học.
          AI sẽ tự động phân tích và đề xuất nội dung phù hợp nhất cho bạn mỗi ngày!
        </p>
        
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 mb-6">
          <p className="text-sm text-purple-900">
            <strong>💡 Mẹo:</strong> AI Tutor phân tích cảm xúc, năng lực, và mục tiêu của bạn
            để tạo lộ trình học tập cá nhân hóa hoàn hảo!
          </p>
        </div>

        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-500">Đang chuyển đến AI Tutor...</p>
      </div>
    
              </div>
  );
}

