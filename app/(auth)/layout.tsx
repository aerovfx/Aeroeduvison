'use client';

import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const AuthLayout = ({
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <div className="h-full">
      {/* Auth Header */}
      <div className="h-16 bg-white dark:bg-[hsl(225_15%_8%)] border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">AeroEdu</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcherCompact />
        </div>
      </div>

      {/* Auth Content */}
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-gray-50 dark:bg-[hsl(225_15%_6%)]">
        {children}
      </div>
    </div>
   );
}

export default AuthLayout;