'use client';

import { Globe, Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'minimal';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export function LanguageSwitcher({ 
  variant = 'default', 
  showIcon = true, 
  showText = true,
  className = ''
}: LanguageSwitcherProps) {
  const { language, toggleLanguage, t } = useLanguage();

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return 'px-3 py-1.5 text-sm';
      case 'minimal':
        return 'p-1.5';
      default:
        return 'px-4 py-2';
    }
  };

  const getIconSize = () => {
    switch (variant) {
      case 'compact':
        return 'w-4 h-4';
      case 'minimal':
        return 'w-4 h-4';
      default:
        return 'w-5 h-5';
    }
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`
        flex items-center gap-2 
        ${getVariantStyles()}
        rounded-lg bg-muted font-medium text-foreground
        transition-all backdrop-blur-sm hover:bg-muted/80
        dark:border dark:border-border dark:bg-secondary/50 dark:hover:bg-secondary
        ${className}
      `}
      title={t('emotion.language-toggle')}
    >
      {showIcon && (
        <Globe className={getIconSize()} />
      )}
      {showText && (
        <span className="font-medium">{language.toUpperCase()}</span>
      )}
      {!showText && !showIcon && (
        <span className="font-medium">{language.toUpperCase()}</span>
      )}
    </button>
  );
}

// Compact version for headers
export function LanguageSwitcherCompact({ className = '' }: { className?: string }) {
  return (
    <LanguageSwitcher 
      variant="compact" 
      showIcon={true} 
      showText={true}
      className={className}
    />
  );
}

// Minimal version for small spaces
export function LanguageSwitcherMinimal({ className = '' }: { className?: string }) {
  return (
    <LanguageSwitcher 
      variant="minimal" 
      showIcon={true} 
      showText={false}
      className={className}
    />
  );
}
