'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

// This module has been replaced by AI Tutor
export default function LearningPageRedirect() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.role === 'STUDENT') {
      // Redirect students to AI Tutor
      router.replace('/ai-tutor');
    } else {
      // Teachers and others can still access
      router.replace('/teacher/learning-analytics');
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
