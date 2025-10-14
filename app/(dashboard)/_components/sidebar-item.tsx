"use client";

import { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

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

  // Fixed: More precise matching logic
  // Exact match OR starts with href/ (but not just href prefix)
  const isActive = pathname === href || 
    (href !== "/" && pathname?.startsWith(`${href}/`));

  const onClick = () => {
    router.push(href);
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "flex items-center gap-x-2 text-slate-500 text-sm font-[500] pl-6 transition-all hover:text-slate-600 hover:bg-slate-300/20",
        isActive && "text-sky-700 bg-sky-200/20 hover:bg-sky-200/20 hover:text-sky-700",
        isHighlighted && !isActive && "bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 font-semibold text-blue-700 hover:from-blue-100 hover:to-purple-100",
        isHighlighted && isActive && "bg-gradient-to-r from-sky-100 to-blue-100 border-l-4 border-sky-600"
      )}
    >
      <div className="flex items-center gap-x-2 py-4">
        <Icon
          size={22}
          className={cn(
            "text-slate-500",
            isActive && "text-sky-700",
            isHighlighted && !isActive && "text-blue-600",
            isHighlighted && isActive && "text-sky-700"
          )}
        />
        {label}
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