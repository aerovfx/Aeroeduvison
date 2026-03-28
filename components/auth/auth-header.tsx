import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthHeaderProps {
  label: string;
  showIcon?: boolean;
}

export const AuthHeader = ({ label, showIcon = true }: AuthHeaderProps) => {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-y-3">
      {showIcon && (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
          <Brain className="h-6 w-6 text-white" />
        </div>
      )}
      <h1 className={cn("text-center text-2xl font-bold text-foreground")}>{label}</h1>
    </div>
  );
};
