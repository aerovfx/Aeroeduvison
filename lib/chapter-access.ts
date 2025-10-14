import { Chapter, UserProgress } from "@prisma/client";

interface ChapterWithProgress extends Chapter {
  userProgress: UserProgress[] | null;
}

export const getChapterAccess = (
  chapters: ChapterWithProgress[],
  targetChapterId: string,
  hasPurchase: boolean
): { isLocked: boolean; reason?: string } => {
  // Find the target chapter
  const targetChapter = chapters.find(chapter => chapter.id === targetChapterId);
  
  if (!targetChapter) {
    return { isLocked: true, reason: "Chapter not found" };
  }

  // If chapter is free, it's always accessible
  if (targetChapter.isFree) {
    return { isLocked: false };
  }

  // If user hasn't purchased the course, all paid chapters are locked
  if (!hasPurchase) {
    return { isLocked: true, reason: "Course not purchased" };
  }

  // Sort chapters by position to check sequential access
  const sortedChapters = chapters
    .filter(chapter => chapter.isPublished)
    .sort((a, b) => a.position - b.position);

  // Find the index of the target chapter
  const targetIndex = sortedChapters.findIndex(chapter => chapter.id === targetChapterId);
  
  if (targetIndex === -1) {
    return { isLocked: true, reason: "Chapter not found in published chapters" };
  }

  // First chapter is always unlocked (if purchased or free)
  if (targetIndex === 0) {
    return { isLocked: false };
  }

  // Check if all previous chapters are completed
  for (let i = 0; i < targetIndex; i++) {
    const previousChapter = sortedChapters[i];
    const isCompleted = previousChapter.userProgress?.[0]?.isCompleted || false;
    
    if (!isCompleted) {
      return { 
        isLocked: true, 
        reason: `Previous chapter "${previousChapter.title}" must be completed first` 
      };
    }
  }

  // All previous chapters are completed, unlock this chapter
  return { isLocked: false };
};

export const getUnlockedChapters = (
  chapters: ChapterWithProgress[],
  hasPurchase: boolean
): string[] => {
  const unlockedChapterIds: string[] = [];
  
  const sortedChapters = chapters
    .filter(chapter => chapter.isPublished)
    .sort((a, b) => a.position - b.position);

  for (const chapter of sortedChapters) {
    const access = getChapterAccess(chapters, chapter.id, hasPurchase);
    if (!access.isLocked) {
      unlockedChapterIds.push(chapter.id);
    }
  }

  return unlockedChapterIds;
};








