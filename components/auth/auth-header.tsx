import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthHeaderProps {
  label: string;
  showIcon?: boolean;
}

export const AuthHeader = ({
  label,
  showIcon = true
}: AuthHeaderProps) => {
  return (
    <div className="w-full flex flex-col gap-y-4 items-center justify-center">
      {showIcon && (
        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center mb-2">
          <Lock className="h-6 w-6 text-white" />
        </div>
      )}
      <h1 className={cn(
        "text-2xl font-bold text-gray-900"
      )}>
        Auth
      </h1>
      <p className="text-gray-600 text-sm">
        {label}
      </p>
    </div>
  );
};
