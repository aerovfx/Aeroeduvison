"use client";

import { useEffect, useState } from "react";
import { Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: 'learning' | 'streak' | 'xp' | 'special';
}

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

export const AchievementNotification = ({ 
  achievement, 
  onClose 
}: AchievementNotificationProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!show) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'learning':
        return 'from-blue-500 to-cyan-500';
      case 'streak':
        return 'from-orange-500 to-red-500';
      case 'xp':
        return 'from-purple-500 to-pink-500';
      case 'special':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`bg-gradient-to-r ${getCategoryColor(achievement.category)} p-1 rounded-lg shadow-2xl animate-slide-in-right`}>
        <div className="bg-white rounded-md p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                  <span className="text-2xl">{achievement.icon}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm font-bold text-gray-900">
                    Thành tựu mới!
                  </p>
                </div>
                <p className="text-lg font-semibold text-gray-800 mb-1">
                  {achievement.name}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  {achievement.description}
                </p>
                {achievement.xpReward > 0 && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    +{achievement.xpReward} XP
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShow(false);
                onClose();
              }}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AchievementManagerProps {
  achievements: Achievement[];
  onAchievementShown: (achievementId: string) => void;
}

export const AchievementManager = ({ 
  achievements, 
  onAchievementShown 
}: AchievementManagerProps) => {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);

  useEffect(() => {
    if (achievements.length > 0 && !currentAchievement) {
      setCurrentAchievement(achievements[0]);
      setQueue(achievements.slice(1));
    }
  }, [achievements, currentAchievement]);

  const handleClose = () => {
    if (currentAchievement) {
      onAchievementShown(currentAchievement.id);
    }
    
    if (queue.length > 0) {
      setCurrentAchievement(queue[0]);
      setQueue(queue.slice(1));
    } else {
      setCurrentAchievement(null);
    }
  };

  if (!currentAchievement) return null;

  return (
    <AchievementNotification
      achievement={currentAchievement}
      onClose={handleClose}
    />
  );
};








