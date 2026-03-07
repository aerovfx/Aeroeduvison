import { LucideIcon } from "lucide-react";
import Link from "next/link";

import { IconBadge } from "@/components/icon-badge"

interface InfoCardProps {
  numberOfItems: number;
  variant?: "default" | "success" | "ai";
  label: string;
  icon: LucideIcon;
  href?: string;
}

export const InfoCard = ({
  variant,
  icon: Icon,
  numberOfItems,
  label,
  href,
}: InfoCardProps) => {
  const content = (
    <div className={`border rounded-md flex items-center gap-x-2 p-3 ${href ? 'hover:shadow-lg transition-all cursor-pointer hover:border-purple-400' : ''} ${variant === 'ai' ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200' : ''}`}>
      <IconBadge
        variant={variant}
        icon={Icon}
      />
      <div>
        <p className="font-medium">
          {label}
        </p>
        <p className="text-gray-500 text-sm">
          {variant === 'ai' ? 'Generate with AI ✨' : `${numberOfItems} ${numberOfItems === 1 ? "Course" : "Courses"}`}
        </p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}