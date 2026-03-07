/**
 * Student Data Synchronization Library
 * 
 * Ensures data consistency across all student modules:
 * - Learning Paths
 * - AI Tutor Assignments
 * - Analytics
 * - Achievements
 * - Notifications
 * - Emotion Tracking
 */

export interface LessonProgress {
  lessonId: string;
  score: number;
  completed: boolean;
  completedAt: string;
  xpEarned: number;
  timeSpent: number;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  type: 'lesson' | 'quiz' | 'project' | 'ai-generated';
  status: 'completed' | 'in-progress' | 'pending' | 'recommended';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  xpReward: number;
  accuracy?: number;
  completedAt?: string;
  assignedAt: string;
  description: string;
  tags: string[];
  aiGenerated?: boolean;
  progress?: number;
}

export interface Analytics {
  totalXP: number;
  lessonsCompleted: number;
  averageScore: number;
  subjects: {
    [key: string]: {
      xp: number;
      lessons: number;
      avgScore: number;
    }
  };
  weeklyActivity: Array<{ date: string; xp: number; lessons: number }>;
  lastUpdated: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlockedAt: string;
  icon?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'achievement' | 'lesson' | 'reminder' | 'system';
  xp?: number;
  read: boolean;
  createdAt: string;
}

/**
 * Sync lesson start across modules
 */
export const syncLessonStart = (
  lessonId: string,
  lessonTitle: string,
  subject: string,
  difficulty: string,
  duration: number,
  xpReward: number
) => {
  if (typeof window === 'undefined') return;

  const assignments: Assignment[] = JSON.parse(
    localStorage.getItem('ai-tutor-assignments') || '[]'
  );
  
  const existingIndex = assignments.findIndex(a => a.id === lessonId);
  
  const assignment: Assignment = {
    id: lessonId,
    title: lessonTitle,
    subject,
    type: 'lesson',
    status: 'in-progress',
    difficulty: difficulty as any,
    duration,
    xpReward,
    assignedAt: new Date().toISOString(),
    description: `AI-generated lesson on ${lessonTitle}`,
    tags: [subject, difficulty],
    aiGenerated: true,
    progress: 0
  };
  
  if (existingIndex >= 0) {
    assignments[existingIndex] = {
      ...assignments[existingIndex],
      ...assignment,
      assignedAt: assignments[existingIndex].assignedAt // Keep original assigned date
    };
  } else {
    assignments.unshift(assignment);
  }
  
  localStorage.setItem('ai-tutor-assignments', JSON.stringify(assignments));
  
  console.log('✅ [SYNC] Lesson start synced', { lessonId, status: 'in-progress' });
};

/**
 * Update lesson progress
 */
export const syncLessonProgress = (lessonId: string, progress: number) => {
  if (typeof window === 'undefined') return;

  const assignments: Assignment[] = JSON.parse(
    localStorage.getItem('ai-tutor-assignments') || '[]'
  );
  
  const index = assignments.findIndex(a => a.id === lessonId);
  
  if (index >= 0) {
    assignments[index].progress = progress;
    assignments[index].status = progress === 100 ? 'completed' : 'in-progress';
    localStorage.setItem('ai-tutor-assignments', JSON.stringify(assignments));
    
    console.log('✅ [SYNC] Lesson progress updated', { lessonId, progress });
  }
};

/**
 * Sync lesson completion across all modules
 */
export const syncLessonCompletion = (
  lessonId: string,
  lessonTitle: string,
  subject: string,
  score: number,
  xpEarned: number,
  timeSpent: number
) => {
  if (typeof window === 'undefined') return;

  console.log('🔄 [SYNC] Starting lesson completion sync...', {
    lessonId,
    score,
    xpEarned
  });

  // 1. Update learning-path-progress
  const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
  progress[lessonId] = {
    lessonId,
    score,
    completed: true,
    completedAt: new Date().toISOString(),
    xpEarned,
    timeSpent
  };
  localStorage.setItem('learning-path-progress', JSON.stringify(progress));
  console.log('  ✅ Updated learning-path-progress');
  
  // 2. Update ai-tutor-assignments
  const assignments: Assignment[] = JSON.parse(
    localStorage.getItem('ai-tutor-assignments') || '[]'
  );
  const assignmentIndex = assignments.findIndex(a => a.id === lessonId);
  
  if (assignmentIndex >= 0) {
    assignments[assignmentIndex] = {
      ...assignments[assignmentIndex],
      status: 'completed',
      accuracy: score,
      completedAt: new Date().toISOString(),
      progress: 100
    };
    localStorage.setItem('ai-tutor-assignments', JSON.stringify(assignments));
    console.log('  ✅ Updated ai-tutor-assignments');
  }
  
  // 3. Update analytics
  updateAnalytics(subject, score, xpEarned);
  console.log('  ✅ Updated analytics');
  
  // 4. Check achievements
  checkAchievements(xpEarned, score);
  console.log('  ✅ Checked achievements');
  
  // 5. Log emotion
  if (score >= 60) {
    logEmotion('happy', `Completed ${lessonTitle} with ${score}%`);
    console.log('  ✅ Logged positive emotion');
  } else {
    logEmotion('neutral', `Completed ${lessonTitle} with ${score}%`);
    console.log('  ✅ Logged neutral emotion');
  }
  
  console.log('✅ [SYNC] Lesson completion synced across all modules');
  
  // 6. Sync to teacher view
  syncStudentDataToTeacher();
};

/**
 * Update analytics data
 */
export const updateAnalytics = (subject: string, score: number, xpEarned: number) => {
  if (typeof window === 'undefined') return;

  const analytics: Analytics = JSON.parse(
    localStorage.getItem('student-analytics') || 
    JSON.stringify({
      totalXP: 0,
      lessonsCompleted: 0,
      averageScore: 0,
      subjects: {},
      weeklyActivity: [],
      lastUpdated: new Date().toISOString()
    })
  );
  
  // Update totals
  const previousTotal = analytics.totalXP || 0;
  analytics.totalXP = previousTotal + xpEarned;
  analytics.lessonsCompleted = (analytics.lessonsCompleted || 0) + 1;
  
  // Calculate new average score
  const previousAvg = analytics.averageScore || 0;
  const previousCount = analytics.lessonsCompleted - 1;
  analytics.averageScore = previousCount === 0 
    ? score 
    : (previousAvg * previousCount + score) / analytics.lessonsCompleted;
  
  // Update subject-specific
  if (!analytics.subjects[subject]) {
    analytics.subjects[subject] = { xp: 0, lessons: 0, avgScore: 0 };
  }
  
  const subj = analytics.subjects[subject];
  const subjPrevCount = subj.lessons;
  subj.xp += xpEarned;
  subj.lessons += 1;
  subj.avgScore = subjPrevCount === 0
    ? score
    : (subj.avgScore * subjPrevCount + score) / subj.lessons;
  
  // Update weekly activity
  const today = new Date().toISOString().split('T')[0];
  const todayIndex = analytics.weeklyActivity.findIndex(a => a.date === today);
  
  if (todayIndex >= 0) {
    analytics.weeklyActivity[todayIndex].xp += xpEarned;
    analytics.weeklyActivity[todayIndex].lessons += 1;
  } else {
    analytics.weeklyActivity.push({ date: today, xp: xpEarned, lessons: 1 });
  }
  
  // Keep only last 30 days
  analytics.weeklyActivity = analytics.weeklyActivity.slice(-30);
  
  analytics.lastUpdated = new Date().toISOString();
  
  localStorage.setItem('student-analytics', JSON.stringify(analytics));
};

/**
 * Check and unlock achievements
 */
export const checkAchievements = (xpEarned: number, score: number) => {
  if (typeof window === 'undefined') return;

  const analytics: Analytics = JSON.parse(
    localStorage.getItem('student-analytics') || '{}'
  );
  const achievements: Achievement[] = JSON.parse(
    localStorage.getItem('achievements') || '[]'
  );
  
  const achievementRules = [
    {
      id: 'first-lesson',
      condition: () => analytics.lessonsCompleted === 1,
      title: 'Bước đầu tiên',
      description: 'Hoàn thành bài học đầu tiên',
      xp: 50,
      icon: '🎯'
    },
    {
      id: 'perfect-score',
      condition: () => score === 100,
      title: 'Hoàn hảo!',
      description: 'Đạt 100% trong một bài học',
      xp: 100,
      icon: '💯'
    },
    {
      id: 'xp-100',
      condition: () => analytics.totalXP >= 100,
      title: 'Người mới',
      description: 'Đạt 100 XP',
      xp: 50,
      icon: '⭐'
    },
    {
      id: 'xp-500',
      condition: () => analytics.totalXP >= 500,
      title: 'Học giả',
      description: 'Đạt 500 XP',
      xp: 100,
      icon: '🌟'
    },
    {
      id: 'xp-1000',
      condition: () => analytics.totalXP >= 1000,
      title: 'Bậc thầy XP',
      description: 'Đạt 1000 XP',
      xp: 200,
      icon: '✨'
    },
    {
      id: 'lessons-10',
      condition: () => analytics.lessonsCompleted >= 10,
      title: 'Học tập chăm chỉ',
      description: 'Hoàn thành 10 bài học',
      xp: 150,
      icon: '📚'
    },
    {
      id: 'streak-7',
      condition: () => {
        const activity = analytics.weeklyActivity || [];
        if (activity.length < 7) return false;
        
        // Check if last 7 days all have activity
        const last7Days = activity.slice(-7);
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          if (!last7Days.find(a => a.date === dateStr)) {
            return false;
          }
        }
        
        return true;
      },
      title: 'Streak 7 ngày',
      description: 'Học liên tục 7 ngày',
      xp: 300,
      icon: '🔥'
    },
    {
      id: 'high-achiever',
      condition: () => analytics.averageScore >= 90,
      title: 'Thành tích cao',
      description: 'Duy trì điểm trung bình trên 90%',
      xp: 250,
      icon: '🏆'
    }
  ];
  
  achievementRules.forEach(rule => {
    const alreadyUnlocked = achievements.find(a => a.id === rule.id);
    
    if (!alreadyUnlocked && rule.condition()) {
      const newAchievement: Achievement = {
        id: rule.id,
        title: rule.title,
        description: rule.description,
        xp: rule.xp,
        unlockedAt: new Date().toISOString(),
        icon: rule.icon
      };
      
      achievements.push(newAchievement);
      
      // Create notification
      createNotification({
        title: `🏆 Thành tựu mở khóa: ${rule.title}`,
        message: rule.description,
        type: 'achievement',
        xp: rule.xp
      });
      
      // Update analytics with bonus XP
      const currentAnalytics = JSON.parse(localStorage.getItem('student-analytics') || '{}');
      currentAnalytics.totalXP = (currentAnalytics.totalXP || 0) + rule.xp;
      localStorage.setItem('student-analytics', JSON.stringify(currentAnalytics));
      
      console.log('🏆 [SYNC] Achievement unlocked:', rule.title, `+${rule.xp} XP`);
    }
  });
  
  localStorage.setItem('achievements', JSON.stringify(achievements));
};

/**
 * Log emotion with context
 */
export const logEmotion = (emotion: string, context: string) => {
  if (typeof window === 'undefined') return;

  const emotions = JSON.parse(localStorage.getItem('emotion-tracking') || '[]');
  
  emotions.push({
    emotion,
    context,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  });
  
  // Keep only last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const filtered = emotions.filter((e: any) => 
    new Date(e.timestamp) > thirtyDaysAgo
  );
  
  localStorage.setItem('emotion-tracking', JSON.stringify(filtered));
};

/**
 * Create notification
 */
export const createNotification = (notification: {
  title: string;
  message: string;
  type: 'achievement' | 'lesson' | 'reminder' | 'system';
  xp?: number;
}) => {
  if (typeof window === 'undefined') return;

  const notifications: Notification[] = JSON.parse(
    localStorage.getItem('notifications') || '[]'
  );
  
  notifications.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...notification,
    read: false,
    createdAt: new Date().toISOString()
  });
  
  // Keep only last 50
  const trimmed = notifications.slice(0, 50);
  
  localStorage.setItem('notifications', JSON.stringify(trimmed));
  
  console.log('🔔 [SYNC] Notification created:', notification.title);
};

/**
 * Get student summary across all modules
 */
export const getStudentSummary = () => {
  if (typeof window === 'undefined') {
    return {
      totalXP: 0,
      lessonsCompleted: 0,
      assignmentsCompleted: 0,
      assignmentsPending: 0,
      averageScore: 0,
      achievementsUnlocked: 0,
      subjects: {}
    };
  }

  const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
  const assignments: Assignment[] = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
  const analytics: Analytics = JSON.parse(localStorage.getItem('student-analytics') || '{}');
  const achievements: Achievement[] = JSON.parse(localStorage.getItem('achievements') || '[]');
  
  const completedLessons = Object.values(progress).filter((p: any) => p.completed).length;
  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const pendingAssignments = assignments.filter(a => 
    a.status === 'pending' || a.status === 'in-progress'
  ).length;
  
  return {
    totalXP: analytics.totalXP || 0,
    lessonsCompleted: completedLessons,
    assignmentsCompleted: completedAssignments,
    assignmentsPending: pendingAssignments,
    averageScore: analytics.averageScore || 0,
    achievementsUnlocked: achievements.length,
    subjects: analytics.subjects || {},
    weeklyActivity: analytics.weeklyActivity || [],
    achievements: achievements
  };
};

/**
 * Get recent activity across all modules
 */
export const getRecentActivity = (limit: number = 10) => {
  if (typeof window === 'undefined') return [];

  const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
  const assignments: Assignment[] = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
  
  // Combine and sort by date
  const activities: any[] = [];
  
  // From progress
  Object.entries(progress).forEach(([lessonId, data]: [string, any]) => {
    if (data.completed) {
      activities.push({
        id: lessonId,
        type: 'lesson-completed',
        title: `Completed lesson`,
        date: new Date(data.completedAt),
        xp: data.xpEarned,
        score: data.score
      });
    }
  });
  
  // From assignments
  assignments.forEach(assignment => {
    if (assignment.completedAt) {
      activities.push({
        id: assignment.id,
        type: 'assignment-completed',
        title: assignment.title,
        date: new Date(assignment.completedAt),
        xp: assignment.xpReward,
        score: assignment.accuracy
      });
    }
  });
  
  // Sort by date (newest first)
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  return activities.slice(0, limit);
};

/**
 * Clear all student data (use on logout)
 */
export const clearStudentData = () => {
  if (typeof window === 'undefined') return;

  const keys = [
    'learning-path-progress',
    'ai-tutor-assignments',
    'ai-tutor-messages',
    'student-analytics',
    'achievements',
    'emotion-tracking',
    'notifications'
  ];
  
  keys.forEach(key => localStorage.removeItem(key));
  
  console.log('🗑️ [SYNC] All student data cleared');
};

/**
 * Verify data consistency across modules
 */
export const verifyDataConsistency = () => {
  if (typeof window === 'undefined') return { consistent: true, issues: [] };

  const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
  const assignments: Assignment[] = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
  const analytics: Analytics = JSON.parse(localStorage.getItem('student-analytics') || '{}');
  
  const issues: string[] = [];
  
  // Check 1: Completed lessons should exist in assignments
  const completedLessons = Object.keys(progress).filter(
    lessonId => progress[lessonId].completed
  );
  
  completedLessons.forEach(lessonId => {
    const assignment = assignments.find(a => a.id === lessonId);
    if (!assignment || assignment.status !== 'completed') {
      issues.push(`Lesson ${lessonId} completed in progress but not in assignments`);
    }
  });
  
  // Check 2: Total XP should match sum of all earned XP
  const totalXPFromProgress = Object.values(progress).reduce(
    (sum: number, p: any) => sum + (p.xpEarned || 0),
    0
  );
  
  if (Math.abs((analytics.totalXP || 0) - totalXPFromProgress) > 10) {
    issues.push(`Analytics XP (${analytics.totalXP}) doesn't match progress sum (${totalXPFromProgress})`);
  }
  
  // Check 3: Lessons count consistency
  const completedCount = completedLessons.length;
  if (completedCount !== (analytics.lessonsCompleted || 0)) {
    issues.push(`Completed lessons count mismatch: progress=${completedCount}, analytics=${analytics.lessonsCompleted}`);
  }
  
  return {
    consistent: issues.length === 0,
    issues,
    summary: {
      completedLessons: completedCount,
      totalXP: analytics.totalXP || 0,
      assignmentsInStorage: assignments.length
    }
  };
};

/**
 * Export all student data (for backup or transfer)
 */
export const exportStudentData = () => {
  if (typeof window === 'undefined') return null;

  return {
    learningPathProgress: JSON.parse(localStorage.getItem('learning-path-progress') || '{}'),
    assignments: JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]'),
    analytics: JSON.parse(localStorage.getItem('student-analytics') || '{}'),
    achievements: JSON.parse(localStorage.getItem('achievements') || '[]'),
    emotions: JSON.parse(localStorage.getItem('emotion-tracking') || '[]'),
    notifications: JSON.parse(localStorage.getItem('notifications') || '[]'),
    exportedAt: new Date().toISOString()
  };
};

/**
 * Import student data (for restore)
 */
export const importStudentData = (data: any) => {
  if (typeof window === 'undefined') return;

  if (data.learningPathProgress) {
    localStorage.setItem('learning-path-progress', JSON.stringify(data.learningPathProgress));
  }
  if (data.assignments) {
    localStorage.setItem('ai-tutor-assignments', JSON.stringify(data.assignments));
  }
  if (data.analytics) {
    localStorage.setItem('student-analytics', JSON.stringify(data.analytics));
  }
  if (data.achievements) {
    localStorage.setItem('achievements', JSON.stringify(data.achievements));
  }
  if (data.emotions) {
    localStorage.setItem('emotion-tracking', JSON.stringify(data.emotions));
  }
  if (data.notifications) {
    localStorage.setItem('notifications', JSON.stringify(data.notifications));
  }
  
  console.log('✅ [SYNC] Student data imported successfully');
};

/**
 * Sync student data to teacher view
 * This makes student data accessible to teacher dashboard
 */
export const syncStudentDataToTeacher = (studentEmail: string = 'student@example.com') => {
  if (typeof window === 'undefined') return;

  // Export current student data
  const studentData = exportStudentData();
  
  if (!studentData) return;

  // Store under a teacher-accessible key
  const teacherKey = `teacher-view-${studentEmail}`;
  localStorage.setItem(teacherKey, JSON.stringify(studentData));
  
  console.log(`✅ [SYNC] Student data synced to teacher view: ${teacherKey}`);
  
  return studentData;
};

/**
 * Get student data from teacher view
 */
export const getStudentDataForTeacherView = (studentEmail: string = 'student@example.com') => {
  if (typeof window === 'undefined') return null;

  const teacherKey = `teacher-view-${studentEmail}`;
  const data = localStorage.getItem(teacherKey);
  
  if (!data) return null;
  
  return JSON.parse(data);
};

