'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

// This module has been replaced by AI Tutor + Learning Paths
export default function CoursesPageRedirect() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.role === 'STUDENT') {
      // Redirect students to Learning Paths
      router.replace('/learning-paths-demo');
    } else {
      // Teachers can access teacher courses
      router.replace('/teacher/courses');
    }
  }, [session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
                <p className="text-gray-600">Redirecting to Learning Paths...</p>
      </div>
    </div>
  );
}
