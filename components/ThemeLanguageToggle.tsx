"use client";

import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Separator } from "@/components/ui/separator";

export function ThemeLanguageToggle() {
  return (
    <div className="flex items-center gap-2">
      <LanguageToggle />
      <Separator orientation="vertical" className="h-6" />
      <ThemeToggle showLabel={false} />
    </div>
  );
}

