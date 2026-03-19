"use client";

import { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useTransition } from "react";

import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isHighlighted?: boolean;
  badge?: string;
  collapsed?: boolean;
}

export const SidebarItem = memo(function SidebarItem({
  icon: Icon,
  label,
  href,
  isHighlighted = false,
  badge,
  collapsed = false,
}: SidebarItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === href) return;
    startTransition(() => {
      router.push(href);
    });
  }, [pathname, href, router]);

  if (collapsed) {
    return (
      <button
        onClick={handleClick}
        type="button"
        disabled={isPending}
        title={label}
        className={cn(
          "relative flex items-center justify-center w-10 h-10 mx-auto my-0.5 rounded-xl transition-all duration-200 group",
          isActive
            ? "bg-[hsl(245,85%,65%)]/15 text-[hsl(245,85%,75%)] shadow-[0_0_12px_rgba(120,100,255,0.15)]"
            : isHighlighted
            ? "text-[hsl(245,85%,70%)] hover:bg-[hsl(245,85%,65%)]/10"
            : "text-[hsl(215,15%,45%)] hover:bg-white/[0.06] hover:text-[hsl(210,20%,80%)]",
          isPending && "opacity-50 cursor-wait"
        )}
      >
        {/* Active indicator dot */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[hsl(245,85%,65%)]" />
        )}
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        {/* Badge as dot when collapsed */}
        {badge && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[hsl(245,85%,65%)]" />
        )}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-[1.5px] border-transparent border-t-[hsl(245,85%,65%)] rounded-full animate-spin" />
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      disabled={isPending}
      className={cn(
        "nav-item w-full text-left group",
        isActive && "active",
        isHighlighted && !isActive && "highlighted",
        isPending && "opacity-50 cursor-wait"
      )}
    >
      <Icon
        className={cn(
          "nav-icon transition-all",
          isActive && "text-[hsl(245,85%,75%)]",
          isHighlighted && !isActive && "text-[hsl(245,85%,70%)]",
          !isActive && !isHighlighted && "text-[hsl(215,15%,45%)]"
        )}
      />
      <span className="truncate flex-1">{label}</span>

      {badge && (
        <span className="nav-badge">{badge}</span>
      )}

      {isPending && (
        <div className="ml-auto">
          <div className="w-3.5 h-3.5 border-[1.5px] border-white/10 border-t-[hsl(245,85%,65%)] rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
});
