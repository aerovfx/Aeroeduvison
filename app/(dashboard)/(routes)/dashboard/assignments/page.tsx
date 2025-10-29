'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

// This module has been integrated into AI Tutor Assignments
export default function AssignmentsPageRedirect() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user?.role === 'STUDENT') {
      // Redirect students to AI Tutor Assignments
      router.replace('/ai-tutor/assignments');
    } else if (session?.user?.role === 'TEACHER') {
      // Teachers can access teacher assignments
      router.replace('/teacher/assignments');
    }
  }, [session, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        {mounted && (
          <p className="text-gray-600">
            Redirecting...
          </p>
        )}
      </div>
    
              </div>
  );
}
