"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useState, useEffect } from "react";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">EN</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={language === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt'}
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm font-medium">
        {language === 'vi' ? 'EN' : 'VI'}
      </span>
    </Button>
  );
}


