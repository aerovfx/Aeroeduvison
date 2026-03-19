"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Menu } from "lucide-react";

interface NavbarProps {
  onMenuClick?: () => void;
}

export const Navbar = ({ onMenuClick }: NavbarProps) => {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-4 border-b h-full flex items-center justify-between bg-white dark:bg-[hsl(225_15%_8%)] border-gray-200 dark:border-white/[0.06] shadow-sm">
        <div className="flex items-center">
          <div className="md:hidden pr-4">
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Loading...
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 dark:bg-white/[0.06] rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b h-full flex items-center justify-between 
      bg-white dark:bg-[hsl(225_15%_8%)] 
      border-gray-200 dark:border-white/[0.06] 
      shadow-sm transition-colors duration-300">
      
      <div className="flex items-center">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden pr-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <div className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Dashboard
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />

        {session ? (
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-white/[0.06]">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm shadow-md">
              {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm px-3 py-1.5 rounded-lg 
                bg-gray-50 dark:bg-white/[0.02] 
                border border-gray-200 dark:border-white/[0.06] 
                hover:bg-gray-100 dark:hover:bg-white/[0.04]
                text-gray-700 dark:text-gray-300 
                transition-all duration-200"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link href="/auth/login">
            <button className="text-sm px-3 py-1.5 rounded-lg 
              bg-gray-50 dark:bg-white/[0.02] 
              border border-gray-200 dark:border-white/[0.06] 
              hover:bg-gray-100 dark:hover:bg-white/[0.04]
              text-gray-700 dark:text-gray-300 
              transition-all duration-200">
              Sign In
            </button>
          </Link>
        )}
      </div>
    </div>
  );
};
