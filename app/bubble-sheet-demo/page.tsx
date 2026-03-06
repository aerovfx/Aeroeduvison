'use client';

import BubbleSheet from '@/components/bubble-sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

export default function BubbleSheetDemoPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <BubbleSheet />
    </div>
  );
}
