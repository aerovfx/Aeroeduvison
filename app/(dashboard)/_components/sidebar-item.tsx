"use client";

import { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isHighlighted?: boolean;
};

export const SidebarItem = ({
  icon: Icon,
  label,
  href,
  isHighlighted = false,
}: SidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Enhanced matching logic for better active state detection
  const isActive = pathname === href || 
    (href !== "/" && pathname?.startsWith(`${href}/`));

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Don't navigate if already on the same page
    if (pathname === href) {
      return;
    }

    setIsLoading(true);

    try {
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to the route
      router.push(href);
      
      // Log navigation for debugging
      console.log(`🧭 [Sidebar] Navigating to: ${href}`);
      
    } catch (error) {
      console.error(`❌ [Sidebar] Navigation failed to ${href}:`, error);
      
      // Fallback navigation
      window.location.href = href;
    } finally {
      // Reset loading state after a delay
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  // Special handling for external links or special routes
  const handleSpecialRoutes = () => {
    // Handle teacher routes that might need special logic
    if (href.includes('/teacher/')) {
      console.log(`🎓 [Sidebar] Teacher route: ${href}`);
    }
    
    // Handle student routes
    if (href.includes('/dashboard') && !href.includes('/teacher')) {
      console.log(`👨‍🎓 [Sidebar] Student route: ${href}`);
    }
  };

  const onClick = (e: React.MouseEvent) => {
    handleSpecialRoutes();
    handleClick(e);
  };

  return (
    <button
      onClick={onClick}
      type="button"
      disabled={isLoading}
      className={cn(
        "flex items-center gap-x-2 text-slate-500 text-sm font-[500] pl-6 transition-all hover:text-slate-600 hover:bg-slate-300/20 w-full text-left",
        isActive && "text-sky-700 bg-sky-200/20 hover:bg-sky-200/20 hover:text-sky-700",
        isHighlighted && !isActive && "bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 font-semibold text-blue-700 hover:from-blue-100 hover:to-purple-100",
        isHighlighted && isActive && "bg-gradient-to-r from-sky-100 to-blue-100 border-l-4 border-sky-600",
        isLoading && "opacity-50 cursor-wait"
      )}
    >
      <div className="flex items-center gap-x-2 py-4">
        <Icon
          size={22}
          className={cn(
            "text-slate-500 transition-colors",
            isActive && "text-sky-700",
            isHighlighted && !isActive && "text-blue-600",
            isHighlighted && isActive && "text-sky-700",
            isLoading && "animate-pulse"
          )}
        />
        <span className="truncate">{label}</span>
        {isLoading && (
          <div className="ml-auto">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div
        className={cn(
          "ml-auto opacity-0 border-2 border-sky-700 h-full transition-all",
          isActive && "opacity-100"
        )}
      />
    </button>
  )
}