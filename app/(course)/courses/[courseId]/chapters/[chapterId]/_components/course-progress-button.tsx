"use client";

import axios from "axios";
import { CheckCircle, XCircle, ArrowRight, Trophy, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { LessonCompletionModal } from "./lesson-completion-modal";
import { useXP } from "@/contexts/XPContext";

interface CourseProgressButtonProps {
  chapterId: string;
  courseId: string;
  isCompleted?: boolean;
  nextChapterId?: string;
  nextChapterTitle?: string;
  currentChapterTitle: string;
};

export const CourseProgressButton = ({
  chapterId,
  courseId,
  isCompleted,
  nextChapterId,
  nextChapterTitle,
  currentChapterTitle
}: CourseProgressButtonProps) => {
  const router = useRouter();
  const confetti = useConfettiStore();
  const { completeLesson, updateStreak } = useXP();
  const [isLoading, setIsLoading] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  const onClick = async () => {
    try {
      setIsLoading(true);

      await axios.put(`/api/courses/${courseId}/chapters/${chapterId}/progress`, {
        isCompleted: !isCompleted
      });

      if (!isCompleted) {
        // Completing the lesson - Award XP
        const xpReward = 20; // Base XP for completing a lesson
        setEarnedXP(xpReward);
        
        // Add XP and update streak
        completeLesson(chapterId, xpReward);
        updateStreak();
        
        if (!nextChapterId) {
          // This is the last chapter
          confetti.onOpen();
        }
        
        // Show completion modal for both cases
        setShowCompletionModal(true);
      } else {
        // Unmarking as completed
        toast.success("Đã bỏ đánh dấu hoàn thành");
      }

      router.refresh();
    } catch {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  }

  const Icon = isCompleted ? XCircle : CheckCircle;

  return (
    <>
      <div className="flex flex-col gap-2 w-full md:w-auto">
        <Button
          onClick={onClick}
          disabled={isLoading}
          type="button"
          variant={isCompleted ? "outline" : "success"}
          className="w-full md:w-auto relative"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Đang xử lý...
            </>
          ) : (
            <>
              {isCompleted ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Bỏ đánh dấu hoàn thành
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Hoàn thành bài học
                </>
              )}
            </>
          )}
        </Button>
        
        {!isCompleted && nextChapterId && (
          <div className="text-xs text-gray-500 text-center md:text-left">
            <Unlock className="h-3 w-3 inline mr-1" />
            Sẽ mở khóa: {nextChapterTitle || "Bài học tiếp theo"}
          </div>
        )}
      </div>

      <LessonCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        nextChapterId={nextChapterId}
        nextChapterTitle={nextChapterTitle}
        courseId={courseId}
        currentChapterTitle={currentChapterTitle}
        earnedXP={earnedXP}
      />
    </>
  )
}