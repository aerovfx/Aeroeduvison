'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

// This module has been integrated into AI Tutor
export default function QuizzesPageRedirect() {
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
                <p className="text-gray-600">Redirecting to AI Tutor...</p>
      </div>
    </div>
  );
}
