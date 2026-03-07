'use client';

import { SignUpForm } from "@/components/auth/signup-form";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

const SignUpPage = () => {
  const { t } = useLanguage();
  return <SignUpForm />;
}

export default SignUpPage;