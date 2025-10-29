'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

// This module has been integrated into AI Tutor
export default function QuizPageRedirect() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.role === 'STUDENT') {
      // Redirect students to AI Tutor
      router.replace('/ai-tutor');
    } else {
      // Teachers can access teacher quizzes
      router.replace('/teacher/quizzes');
    }
  }, [session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Quiz đã được tích hợp! 🎯
        </h1>
        
        <p className="text-gray-600 mb-6">
          Quiz và bài tập giờ đã được tích hợp vào <strong>AI Tutor</strong>.
          AI sẽ tự động tạo quiz phù hợp với năng lực và tiến độ học tập của bạn!
        </p>
        
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 mb-6">
          <p className="text-sm text-purple-900">
            <strong>💡 Mẹo:</strong> AI Tutor phân tích năng lực của bạn và tạo quiz 
            với độ khó phù hợp, giúp bạn học hiệu quả hơn!
          </p>
        </div>

        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-500">Đang chuyển đến AI Tutor...</p>
      </div>
    
              </div>
  );
}