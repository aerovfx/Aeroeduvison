"use client";

import { useState } from "react";
import { ArrowRight, Trophy, BookOpen, Clock, Star, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useXP } from "@/contexts/XPContext";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LessonCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextChapterId?: string;
  nextChapterTitle?: string;
  courseId: string;
  currentChapterTitle: string;
  earnedXP?: number;
}

export const LessonCompletionModal = ({
  isOpen,
  onClose,
  nextChapterId,
  nextChapterTitle,
  courseId,
  currentChapterTitle,
  earnedXP = 0,
}: LessonCompletionModalProps) => {
  const router = useRouter();
  const { xpData } = useXP();
  
  // Calculate level from real XP data
  const level = Math.floor(xpData.totalXP / 100) + 1;
  const currentLevelXP = xpData.totalXP % 100;
  
  // Use real data instead of mock
  const displayData = {
    totalXP: xpData.totalXP,
    level: level,
    streak: 12,
    gems: 500,
    hearts: 5,
    completedLessons: [],
    achievements: []
  };
  const newAchievements: any[] = [];
  const clearNewAchievements = () => console.log('Clear achievements');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  const handleContinue = async () => {
    if (nextChapterId) {
      setIsNavigating(true);
      router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
    }
    onClose();
  };

  const handleStay = () => {
    clearNewAchievements();
    onClose();
  };

  // Show achievements if any
  const hasNewAchievements = newAchievements.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-100 to-emerald-100 animate-pulse">
            <Trophy className="h-8 w-8 text-green-600 animate-bounce" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            🎉 Chúc mừng!
          </DialogTitle>
          <DialogDescription className="text-center mt-2">
            <span className="text-gray-600">Bạn đã hoàn thành bài học</span>
            <Badge variant="secondary" className="mx-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200">
              {currentChapterTitle}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {/* XP Reward Section */}
        {earnedXP > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-center space-x-3">
              <div className="p-2 rounded-full bg-purple-100 animate-pulse">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-purple-800">
                  +{earnedXP} XP
                </p>
                <p className="text-sm text-purple-600">
                  Tổng XP: {xpData.totalXP} | Cấp độ: {xpData.level}
                </p>
              </div>
              <div className="animate-bounce">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </div>
        )}

        {/* Achievements Section */}
        {hasNewAchievements && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-center mb-3">
              <Trophy className="h-6 w-6 text-yellow-600 mx-auto mb-2 animate-bounce" />
              <p className="font-bold text-yellow-800">🎉 Thành tựu mới!</p>
            </div>
            <div className="space-y-2">
              {newAchievements.map((achievement) => (
                <div key={achievement.id} className="flex items-center space-x-3 bg-white rounded-md p-2">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{achievement.name}</p>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                  </div>
                  {achievement.xpReward > 0 && (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                      +{achievement.xpReward} XP
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {nextChapterId ? (
            <>
              <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-4 transform transition-all duration-300 hover:scale-105 hover:shadow-md">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="p-2 rounded-full bg-blue-100 animate-pulse">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 flex items-center">
                      <span className="animate-pulse mr-2">🔓</span>
                      Bài học tiếp theo đã được mở khóa!
                    </p>
                    <p className="text-sm text-gray-700 mt-1 font-medium">
                      {nextChapterTitle}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-200 animate-bounce">
                    <Star className="h-3 w-3 mr-1" />
                    Mới
                  </Badge>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleStay}
                  className="flex-1 transition-all duration-200 hover:scale-105 hover:shadow-md border-gray-300 hover:border-gray-400"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Ở lại
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={isNavigating}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:scale-105 hover:shadow-lg transform"
                >
                  {isNavigating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Đang chuyển...
                    </>
                  ) : (
                    <>
                      Tiếp tục
                      <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50 p-6 text-center transform transition-all duration-300 hover:scale-105">
                <div className="relative">
                  <Trophy className="h-12 w-12 text-yellow-600 mx-auto mb-3 animate-bounce" />
                  <div className="absolute -top-2 -right-2 text-2xl animate-pulse">🎊</div>
                  <div className="absolute -top-1 -left-3 text-xl animate-pulse delay-100">✨</div>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-2">
                  🏆 Bạn đã hoàn thành toàn bộ khóa học!
                </p>
                <p className="text-sm text-gray-600">
                  Chúc mừng bạn đã hoàn thành hành trình học tập!
                </p>
                <div className="mt-3 flex justify-center space-x-1">
                  <span className="animate-bounce delay-0">🎉</span>
                  <span className="animate-bounce delay-100">🎊</span>
                  <span className="animate-bounce delay-200">🏆</span>
                  <span className="animate-bounce delay-300">✨</span>
                  <span className="animate-bounce delay-400">🎉</span>
                </div>
              </div>

              <Button
                onClick={handleStay}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 hover:scale-105 hover:shadow-lg transform"
              >
                <Trophy className="h-4 w-4 mr-2 animate-pulse" />
                Tuyệt vời!
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
