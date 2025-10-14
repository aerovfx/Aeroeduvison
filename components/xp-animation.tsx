"use client";

import { useEffect, useState } from "react";
import { Zap, TrendingUp, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface XPAnimationProps {
  xpGained: number;
  levelUp?: boolean;
  newLevel?: number;
  className?: string;
}

export const XPAnimation = ({ 
  xpGained, 
  levelUp = false, 
  newLevel, 
  className 
}: XPAnimationProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className={cn(
      "fixed top-20 right-4 z-50 space-y-2",
      className
    )}>
      {/* XP Gained Animation */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg animate-bounce">
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4" />
          <span className="font-bold">+{xpGained} XP</span>
        </div>
      </div>

      {/* Level Up Animation */}
      {levelUp && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <Crown className="h-4 w-4" />
            <span className="font-bold">Level {newLevel}!</span>
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  );
};

interface FloatingXPProps {
  xp: number;
  onComplete?: () => void;
}

export const FloatingXP = ({ xp, onComplete }: FloatingXPProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-bounce">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full shadow-2xl transform scale-110">
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 animate-pulse" />
            <span className="text-xl font-bold">+{xp} XP</span>
            <Zap className="h-6 w-6 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};








