'use client';

import { RegisterForm } from '@/components/auth/register-form';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RegisterPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <RegisterForm />
    </div>
  );
}

