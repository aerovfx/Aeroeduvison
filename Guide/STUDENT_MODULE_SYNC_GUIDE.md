# 🔄 Student Module Data Synchronization Guide

## Overview

Hướng dẫn đồng bộ dữ liệu giữa các modules cho role STUDENT trong hệ thống AeroEdu.

---

## 📊 **Student Data Flow**

### **Core Modules:**

```
┌─────────────────────────────────────────────────────────────┐
│                     STUDENT ROLE                             │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼────┐      ┌──────▼──────┐    ┌──────▼──────┐
    │Learning│      │  AI Tutor   │    │  Analytics  │
    │ Paths  │      │             │    │             │
    └───┬────┘      └──────┬──────┘    └──────┬──────┘
        │                   │                   │
        │         localStorage: learning-path-progress
        │                   │                   │
        │         localStorage: ai-tutor-assignments
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Dashboard    │
                    │   Achievements │
                    │   Notifications│
                    └────────────────┘
```

---

## 🗄️ **Data Storage Locations**

### **1. localStorage Keys**

| Key | Data Stored | Used By |
|-----|-------------|---------|
| `learning-path-progress` | Lesson progress, scores, completion status | Learning Paths |
| `ai-tutor-assignments` | Assignments, lessons learned, recommended | AI Tutor Assignments |
| `ai-tutor-messages` | Chat history with AI | AI Tutor Chat |
| `student-analytics` | XP, skills, performance | Analytics |
| `student-achievements` | Unlocked achievements | Achievements |
| `emotion-tracking` | Daily emotion logs | Dashboard |

### **2. Database Tables (Prisma)**

| Model | Fields | Purpose |
|-------|--------|---------|
| `User` | id, email, name, role, image | User account |
| `UserProgress` | userId, chapterId, isCompleted | Course progress |
| `Purchase` | userId, courseId | Course purchases |
| `EmotionLog` | userId, emotion, date | Emotion tracking |
| `Achievement` | userId, type, unlockedAt | Achievements |

---

## 🔄 **Synchronization Flow**

### **Scenario 1: Student Completes a Lesson**

**Flow:**
```
1. Student completes lesson in /learning-paths/lesson/[id]
   ↓
2. Save to localStorage: 'learning-path-progress'
   {
     lessonId: string,
     score: number,
     completed: boolean,
     completedAt: Date,
     xpEarned: number
   }
   ↓
3. Create/Update assignment in 'ai-tutor-assignments'
   {
     id: lessonId,
     status: 'completed',
     accuracy: score,
     completedAt: Date,
     xpReward: xpEarned
   }
   ↓
4. Update analytics: 'student-analytics'
   - Total XP += xpEarned
   - Subject skills updated
   - Performance charts
   ↓
5. Check achievements
   - Unlock if conditions met
   - Create notification
   ↓
6. Update emotion (optional)
   - Positive emotion if score >= 60%
```

**Implementation:**
```typescript
// In /learning-paths/lesson/[lessonId]/page.tsx

const handleLessonComplete = async (score: number, xpEarned: number) => {
  const lessonId = params.lessonId;
  
  // 1. Save to learning-path-progress
  const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
  progress[lessonId] = {
    score,
    completed: true,
    completedAt: new Date().toISOString(),
    xpEarned
  };
  localStorage.setItem('learning-path-progress', JSON.stringify(progress));
  
  // 2. Update ai-tutor-assignments
  const assignments = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
  const assignmentIndex = assignments.findIndex((a: any) => a.id === lessonId);
  
  if (assignmentIndex >= 0) {
    assignments[assignmentIndex] = {
      ...assignments[assignmentIndex],
      status: 'completed',
      accuracy: score,
      completedAt: new Date().toISOString(),
      progress: 100
    };
  }
  localStorage.setItem('ai-tutor-assignments', JSON.stringify(assignments));
  
  // 3. Update analytics
  syncToAnalytics(lessonId, score, xpEarned);
  
  // 4. Check achievements
  checkAndUnlockAchievements(xpEarned);
};

const syncToAnalytics = (lessonId: string, score: number, xp: number) => {
  const analytics = JSON.parse(localStorage.getItem('student-analytics') || '{}');
  
  analytics.totalXP = (analytics.totalXP || 0) + xp;
  analytics.lessonsCompleted = (analytics.lessonsCompleted || 0) + 1;
  analytics.averageScore = calculateNewAverage(analytics, score);
  
  // Update subject-specific data
  const subject = getLessonSubject(lessonId);
  if (!analytics.subjects) analytics.subjects = {};
  if (!analytics.subjects[subject]) {
    analytics.subjects[subject] = { xp: 0, lessons: 0, avgScore: 0 };
  }
  
  analytics.subjects[subject].xp += xp;
  analytics.subjects[subject].lessons += 1;
  analytics.subjects[subject].avgScore = 
    (analytics.subjects[subject].avgScore * (analytics.subjects[subject].lessons - 1) + score) / 
    analytics.subjects[subject].lessons;
  
  localStorage.setItem('student-analytics', JSON.stringify(analytics));
};
```

---

### **Scenario 2: AI Tutor Recommends a Lesson**

**Flow:**
```
1. AI Tutor analyzes student progress
   ↓
2. Recommends new lesson based on:
   - Weak subjects (from analytics)
   - Next in learning path
   - Difficulty level
   ↓
3. Add to 'ai-tutor-assignments' with status 'recommended'
   ↓
4. Student sees in /ai-tutor/assignments
   ↓
5. Click "Start" → Navigate to /learning-paths/lesson/[id]
   ↓
6. Update status to 'in-progress'
```

---

### **Scenario 3: Dashboard Displays Student Data**

**Data Sources:**
```typescript
// Dashboard aggregates data from:

1. learning-path-progress
   → Weekly activity chart
   → Subject progress bars
   → Recent lessons

2. ai-tutor-assignments
   → Assignment count (pending, completed)
   → Recent activity

3. student-analytics
   → Total XP
   → Skills radar chart
   → Performance trends

4. emotion-tracking
   → Mood calendar
   → Emotion vs performance correlation

5. achievements (localStorage)
   → Unlocked badges
   → Progress toward next achievement
```

---

## 🔧 **Implementation: Sync Helper Functions**

### **Create Centralized Sync Module**

**File:** `/Users/vietchung/lmsmath/lib/student-data-sync.ts`

```typescript
// lib/student-data-sync.ts

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
  status: 'completed' | 'in-progress' | 'pending' | 'recommended';
  difficulty: string;
  duration: number;
  xpReward: number;
  accuracy?: number;
  completedAt?: string;
  assignedAt: string;
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
  weeklyActivity: Array<{ date: string; xp: number }>;
}

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
  
  // 2. Update ai-tutor-assignments
  const assignments: Assignment[] = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
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
  }
  
  // 3. Update analytics
  updateAnalytics(subject, score, xpEarned);
  
  // 4. Check achievements
  checkAchievements(xpEarned, score);
  
  // 5. Log emotion (if score is good, positive emotion)
  if (score >= 60) {
    logEmotion('happy', `Completed ${lessonTitle} with ${score}%`);
  }
  
  console.log('✅ [SYNC] Lesson completion synced across all modules', {
    lessonId,
    score,
    xpEarned
  });
};

/**
 * Update analytics data
 */
export const updateAnalytics = (subject: string, score: number, xpEarned: number) => {
  const analytics: Analytics = JSON.parse(
    localStorage.getItem('student-analytics') || 
    '{"totalXP":0,"lessonsCompleted":0,"averageScore":0,"subjects":{},"weeklyActivity":[]}'
  );
  
  // Update totals
  analytics.totalXP += xpEarned;
  analytics.lessonsCompleted += 1;
  analytics.averageScore = 
    (analytics.averageScore * (analytics.lessonsCompleted - 1) + score) / 
    analytics.lessonsCompleted;
  
  // Update subject-specific
  if (!analytics.subjects[subject]) {
    analytics.subjects[subject] = { xp: 0, lessons: 0, avgScore: 0 };
  }
  
  const subj = analytics.subjects[subject];
  subj.xp += xpEarned;
  subj.lessons += 1;
  subj.avgScore = (subj.avgScore * (subj.lessons - 1) + score) / subj.lessons;
  
  // Update weekly activity
  const today = new Date().toISOString().split('T')[0];
  const todayIndex = analytics.weeklyActivity.findIndex(a => a.date === today);
  
  if (todayIndex >= 0) {
    analytics.weeklyActivity[todayIndex].xp += xpEarned;
  } else {
    analytics.weeklyActivity.push({ date: today, xp: xpEarned });
  }
  
  // Keep only last 7 days
  analytics.weeklyActivity = analytics.weeklyActivity.slice(-7);
  
  localStorage.setItem('student-analytics', JSON.stringify(analytics));
  
  console.log('✅ [SYNC] Analytics updated', {
    totalXP: analytics.totalXP,
    avgScore: analytics.averageScore
  });
};

/**
 * Create or update assignment when lesson starts
 */
export const syncLessonStart = (
  lessonId: string,
  lessonTitle: string,
  subject: string,
  difficulty: string,
  duration: number,
  xpReward: number
) => {
  const assignments: Assignment[] = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
  const existingIndex = assignments.findIndex(a => a.id === lessonId);
  
  const assignment: Assignment = {
    id: lessonId,
    title: lessonTitle,
    subject,
    status: 'in-progress',
    difficulty,
    duration,
    xpReward,
    assignedAt: new Date().toISOString(),
    progress: 0
  };
  
  if (existingIndex >= 0) {
    assignments[existingIndex] = {
      ...assignments[existingIndex],
      ...assignment
    };
  } else {
    assignments.unshift(assignment); // Add to beginning
  }
  
  localStorage.setItem('ai-tutor-assignments', JSON.stringify(assignments));
  
  console.log('✅ [SYNC] Lesson start synced to assignments', { lessonId, status: 'in-progress' });
};

/**
 * Update assignment progress
 */
export const syncLessonProgress = (lessonId: string, progress: number) => {
  const assignments: Assignment[] = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
  const index = assignments.findIndex(a => a.id === lessonId);
  
  if (index >= 0) {
    assignments[index].progress = progress;
    localStorage.setItem('ai-tutor-assignments', JSON.stringify(assignments));
    
    console.log('✅ [SYNC] Lesson progress updated', { lessonId, progress });
  }
};

/**
 * Check and unlock achievements
 */
export const checkAchievements = (xpEarned: number, score: number) => {
  const analytics: Analytics = JSON.parse(localStorage.getItem('student-analytics') || '{}');
  const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
  
  // Achievement rules
  const achievementRules = [
    {
      id: 'first-lesson',
      condition: () => analytics.lessonsCompleted === 1,
      title: 'First Steps',
      description: 'Complete your first lesson',
      xp: 50
    },
    {
      id: 'perfect-score',
      condition: () => score === 100,
      title: 'Perfect!',
      description: 'Score 100% on a lesson',
      xp: 100
    },
    {
      id: 'xp-1000',
      condition: () => analytics.totalXP >= 1000,
      title: 'XP Master',
      description: 'Earn 1000 total XP',
      xp: 200
    },
    {
      id: 'streak-7',
      condition: () => analytics.weeklyActivity?.length === 7,
      title: '7-Day Streak',
      description: 'Study 7 days in a row',
      xp: 150
    }
  ];
  
  achievementRules.forEach(rule => {
    const alreadyUnlocked = achievements.find((a: any) => a.id === rule.id);
    
    if (!alreadyUnlocked && rule.condition()) {
      achievements.push({
        ...rule,
        unlockedAt: new Date().toISOString()
      });
      
      // Create notification
      createNotification({
        title: `🏆 Achievement Unlocked: ${rule.title}`,
        message: rule.description,
        type: 'achievement',
        xp: rule.xp
      });
      
      console.log('🏆 [SYNC] Achievement unlocked:', rule.title);
    }
  });
  
  localStorage.setItem('achievements', JSON.stringify(achievements));
};

/**
 * Log emotion
 */
export const logEmotion = (emotion: string, context: string) => {
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
  
  console.log('😊 [SYNC] Emotion logged:', emotion);
};

/**
 * Create notification
 */
export const createNotification = (notification: {
  title: string;
  message: string;
  type: string;
  xp?: number;
}) => {
  const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  
  notifications.unshift({
    id: `notif-${Date.now()}`,
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
  const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
  const assignments = JSON.parse(localStorage.getItem('ai-tutor-assignments') || '[]');
  const analytics = JSON.parse(localStorage.getItem('student-analytics') || '{}');
  const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
  
  const completedLessons = Object.values(progress).filter((p: any) => p.completed).length;
  const completedAssignments = assignments.filter((a: any) => a.status === 'completed').length;
  const pendingAssignments = assignments.filter((a: any) => 
    a.status === 'pending' || a.status === 'in-progress'
  ).length;
  
  return {
    totalXP: analytics.totalXP || 0,
    lessonsCompleted: completedLessons,
    assignmentsCompleted: completedAssignments,
    assignmentsPending: pendingAssignments,
    averageScore: analytics.averageScore || 0,
    achievementsUnlocked: achievements.length,
    subjects: analytics.subjects || {}
  };
};

/**
 * Clear all student data (for logout or reset)
 */
export const clearStudentData = () => {
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
```

---

## 📁 **Module Integration Checklist**

### **✅ Learning Paths Module**
- [x] Save progress to `learning-path-progress`
- [x] Update `ai-tutor-assignments` on completion
- [x] Sync to analytics
- [x] Check achievements
- [x] Create notifications

**Files:**
- `app/(dashboard)/(routes)/learning-paths/lesson/[lessonId]/page.tsx`

**Integration:**
```typescript
import { syncLessonCompletion, syncLessonStart, syncLessonProgress } from '@/lib/student-data-sync';

// On lesson start
useEffect(() => {
  syncLessonStart(lessonId, lessonData.title, lessonData.subject, ...);
}, []);

// On progress update
const updateProgress = (progress: number) => {
  syncLessonProgress(lessonId, progress);
};

// On lesson complete
const handleComplete = (score: number, xp: number) => {
  syncLessonCompletion(lessonId, lessonData.title, lessonData.subject, score, xp, timeSpent);
};
```

---

### **✅ AI Tutor Assignments**
- [x] Read from `ai-tutor-assignments`
- [x] Navigate to learning path on "Start"
- [x] Display progress
- [x] Filter by status

**Files:**
- `app/(dashboard)/(routes)/ai-tutor/assignments/page.tsx`

**Current Implementation:**
```typescript
// Already integrated! ✅
const startAssignment = (assignment: Assignment) => {
  router.push(`/learning-paths/lesson/${assignment.id}`);
};
```

---

### **✅ Analytics Module**
- [ ] Read from `student-analytics`
- [ ] Display XP, skills, performance
- [ ] Chart weekly activity
- [ ] Show subject breakdown

**Files:**
- `app/(dashboard)/(routes)/dashboard/analytics/page.tsx`

**TODO Integration:**
```typescript
import { getStudentSummary } from '@/lib/student-data-sync';

const summary = getStudentSummary();
// Display: totalXP, lessonsCompleted, averageScore, subjects
```

---

### **✅ Dashboard Module**
- [ ] Aggregate data from all sources
- [ ] Display recent activity
- [ ] Show quick stats
- [ ] Emotion tracking

**Files:**
- `app/(dashboard)/(routes)/dashboard/page.tsx`

**TODO Integration:**
```typescript
import { getStudentSummary } from '@/lib/student-data-sync';

const Dashboard = () => {
  const summary = getStudentSummary();
  
  return (
    <>
      <QuickStats totalXP={summary.totalXP} lessons={summary.lessonsCompleted} />
      <RecentActivity assignments={getRecentAssignments()} />
      <SubjectProgress subjects={summary.subjects} />
    </>
  );
};
```

---

### **✅ Achievements Module**
- [ ] Read from `achievements`
- [ ] Display unlocked badges
- [ ] Show progress to next
- [ ] Create notifications

**Files:**
- `app/(dashboard)/(routes)/dashboard/achievements/page.tsx`

---

### **✅ AI Tutor Chat**
- [x] Access `learning-path-progress` for context
- [ ] Provide personalized help based on weak subjects
- [ ] Recommend next lessons

**Files:**
- `app/(dashboard)/(routes)/ai-tutor/page.tsx`

---

## 🔄 **Data Sync Events**

### **Event: Lesson Started**
```typescript
Event: 'lesson-started'
Trigger: User clicks "Bắt đầu học"
Actions:
  1. Create assignment with status 'in-progress'
  2. Log start time
  3. Update progress to 0%
```

### **Event: Lesson Progress**
```typescript
Event: 'lesson-progress-updated'
Trigger: User completes theory or exercises
Actions:
  1. Update assignment progress
  2. Save intermediate state
```

### **Event: Lesson Completed**
```typescript
Event: 'lesson-completed'
Trigger: User finishes all exercises and gets graded
Actions:
  1. Update learning-path-progress
  2. Update assignment status to 'completed'
  3. Update analytics (XP, score, subjects)
  4. Check and unlock achievements
  5. Create notifications
  6. Log positive emotion (if score >= 60%)
  7. Unlock next lesson (if score >= 60%)
```

### **Event: Achievement Unlocked**
```typescript
Event: 'achievement-unlocked'
Trigger: Conditions met after lesson completion
Actions:
  1. Add to achievements list
  2. Create notification
  3. Award bonus XP
  4. Show toast/confetti
```

---

## 🧪 **Testing Synchronization**

### **Test Case 1: Complete a Lesson**
```
1. Go to /learning-paths
2. Click "Bắt đầu học" on a lesson
3. Complete theory
4. Complete all exercises
5. Get graded (score >= 60%)
6. Verify:
   ✅ learning-path-progress updated
   ✅ ai-tutor-assignments status = 'completed'
   ✅ student-analytics XP increased
   ✅ Achievement unlocked (if applicable)
   ✅ Notification created
   ✅ Next lesson unlocked
```

### **Test Case 2: Check Dashboard**
```
1. Complete multiple lessons
2. Go to /dashboard
3. Verify:
   ✅ Total XP matches sum of all lessons
   ✅ Weekly activity shows correct data
   ✅ Subject skills accurate
   ✅ Recent activity lists completed lessons
```

### **Test Case 3: Check Assignments**
```
1. Go to /ai-tutor/assignments
2. Verify:
   ✅ All completed lessons appear
   ✅ Status matches learning-path-progress
   ✅ Progress bars accurate
   ✅ Click "Start" navigates to correct lesson
```

---

## 🎯 **Implementation Priority**

### **Phase 1: Core Sync (DONE)**
- [x] Learning Paths → Assignments sync
- [x] Lesson completion → XP tracking
- [x] Assignment status updates

### **Phase 2: Analytics Integration (TODO)**
- [ ] Create `lib/student-data-sync.ts`
- [ ] Implement sync helper functions
- [ ] Update Learning Paths to use helpers
- [ ] Update Analytics to read from sync

### **Phase 3: Achievements & Notifications (TODO)**
- [ ] Achievement detection logic
- [ ] Notification system
- [ ] Toast/confetti on unlock
- [ ] Achievement page integration

### **Phase 4: AI Tutor Context (TODO)**
- [ ] AI reads learning-path-progress
- [ ] Personalized recommendations
- [ ] Weak subject identification

---

## 📝 **Next Steps**

1. **Create sync library:**
   ```bash
   touch lib/student-data-sync.ts
   # Copy implementation from above
   ```

2. **Update Learning Paths:**
   - Import sync functions
   - Call syncLessonStart on mount
   - Call syncLessonProgress on update
   - Call syncLessonCompletion on finish

3. **Update Analytics:**
   - Import getStudentSummary
   - Display aggregated data
   - Auto-update on changes

4. **Test thoroughly:**
   - Complete a lesson
   - Check all modules
   - Verify data consistency

---

## ✅ **Success Criteria**

- [ ] Lesson completion updates all modules
- [ ] Analytics reflects total progress
- [ ] Assignments sync with learning paths
- [ ] Achievements unlock automatically
- [ ] Notifications appear on events
- [ ] Dashboard shows aggregated data
- [ ] No data inconsistencies
- [ ] AI Tutor has context awareness

---

**Status:** 🚧 IN PROGRESS  
**Next Action:** Create `lib/student-data-sync.ts` and integrate

