'use client';

import ImprovedBubbleSheet from '@/components/improved-bubble-sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

export default function AdvancedBubbleSheetPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <ImprovedBubbleSheet />
    </div>
  );
}
