'use client';

import BubbleSheetSimple from '@/components/bubble-sheet-simple';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

export default function BubbleSheetSimplePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <BubbleSheetSimple />
    </div>
  );
}
