"use client";

import axios from "axios";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { GCSVideoPlayer } from "@/components/ui/gcs-video-player";
import { LessonCompletionModal } from "./lesson-completion-modal";
import { useXP } from "@/contexts/XPContext";

interface VideoPlayerProps {
  playbackId: string;
  courseId: string;
  chapterId: string;
  nextChapterId?: string;
  nextChapterTitle?: string;
  isLocked: boolean;
  completeOnEnd: boolean;
  title: string;
  videoUrl?: string; // Add videoUrl prop for GCS
};

export const VideoPlayer = ({
  playbackId,
  courseId,
  chapterId,
  nextChapterId,
  nextChapterTitle,
  isLocked,
  completeOnEnd,
  title,
  videoUrl,
}: VideoPlayerProps) => {
  const [isReady, setIsReady] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const router = useRouter();
  const confetti = useConfettiStore();
  const { completeLesson, updateStreak } = useXP();

  const onEnd = async () => {
    try {
      if (completeOnEnd) {
        await axios.put(`/api/courses/${courseId}/chapters/${chapterId}/progress`, {
          isCompleted: true,
        });

        // Award XP for video completion
        const xpReward = 25; // Slightly more XP for watching full video
        setEarnedXP(xpReward);
        
        // Add XP and update streak
        completeLesson(chapterId, xpReward);
        updateStreak();

        if (!nextChapterId) {
          confetti.onOpen();
        }

        // Show completion modal instead of immediate redirect
        setShowCompletionModal(true);
        router.refresh();
      }
    } catch {
      toast.error("Có lỗi xảy ra khi cập nhật tiến độ");
    }
  }

  return (
    <div className="relative aspect-video">
      {!isReady && !isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      )}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 flex-col gap-y-2 text-secondary">
          <Lock className="h-8 w-8" />
          <p className="text-sm">
            This chapter is locked
          </p>
        </div>
      )}
      {!isLocked && videoUrl && (
        <GCSVideoPlayer
          videoUrl={videoUrl}
          className={cn(
            !isReady && "hidden"
          )}
          autoPlay
          onEnded={onEnd}
        />
      )}

      <LessonCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        nextChapterId={nextChapterId}
        nextChapterTitle={nextChapterTitle}
        courseId={courseId}
        currentChapterTitle={title}
        earnedXP={earnedXP}
      />
    </div>
  )
}