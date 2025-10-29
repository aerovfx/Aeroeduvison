'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
export default function TestSimplePage() {
  const { t } = useLanguage();

  return (
    <div className="p-8">
        <div className="absolute top-4 right-4">
          <LanguageSwitcherCompact />
        </div>
      <h1 className="text-2xl font-bold">Simple Test Page</h1>
      <p>This page should work without any authentication or database.</p>
    </div>
  )
}
