'use client';

import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

const AuthLayout = ({
  children
}: {
  children: React.ReactNode
}) => {
  return ( 
    <div className="h-full">
      {/* Auth Header */}
      <div className="h-16 bg-white border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          </div>
          <h1 className="text-xl font-bold text-gray-800">AeroEdu</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcherCompact />
        </div>
      </div>
      
      {/* Auth Content */}
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
   );
}
 
export default AuthLayout;