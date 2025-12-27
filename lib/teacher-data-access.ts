/**
 * Teacher Data Access Library
 * 
 * Provides read-only access to student data for teachers
 * Respects data privacy and only exposes necessary information
 */

import { getStudentSummary, getStudentDataForTeacherView, type Analytics, type Assignment } from './student-data-sync';

export interface TeacherStudentView {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  totalXP: number;
  progress: number;
  averageScore: number;
  lessonsCompleted: number;
  lastActive: string;
  emotion: 'happy' | 'neutral' | 'sad';
  atRisk: boolean;
  engagement: number;
  streak: number;
  recentLessons: Assignment[];
  emotionHistory: Array<{
    date: string;
    emotion: 'happy' | 'neutral' | 'sad';
    reason?: string;
  }>;
}

/**
 * Get data for a specific student
 * @param studentId - The student's ID (e.g., 'student-1')
 * @returns Student data formatted for teacher view
 */
export function getStudentDataForTeacher(studentId: string): TeacherStudentView | null {
  // For demo, we'll map student email to data
  const studentEmailMap: { [key: string]: string } = {
    'student-1': 'student@example.com',
    'student-2': 'student2@example.com',
    'student-3': 'student3@example.com',
    'student-4': 'student4@example.com',
  };

  const email = studentEmailMap[studentId];
  if (!email) return null;

  // Try to get student data from teacher view first (synced data)
  const teacherViewData = getStudentDataForTeacherView(email);
  
  let assignments: Assignment[] = [];
  let emotionTracking: any[] = [];
  let analytics: any = {
    totalXP: 0,
    lessonsCompleted: 0,
    averageScore: 0,
    subjects: {},
    studyStreak: 0,
    lastStudyDate: new Date().toISOString(),
    streak: 0
  };

  if (teacherViewData) {
    // Use synced data from teacher view
    assignments = teacherViewData.assignments || [];
    emotionTracking = teacherViewData.emotions || [];
    analytics = teacherViewData.analytics || analytics;
    console.log('📊 [TEACHER] Using synced student data from teacher view');
  } else {
    // Fallback: try to get from current localStorage (for demo/testing)
    const summary = getStudentSummary();
    analytics = summary.analytics || analytics;
    
    const assignmentsRaw = localStorage.getItem('ai-tutor-assignments');
    assignments = assignmentsRaw ? JSON.parse(assignmentsRaw) : [];
    
    const emotionRaw = localStorage.getItem('emotion-tracking');
    emotionTracking = emotionRaw ? JSON.parse(emotionRaw) : [];
    
    console.log('⚠️  [TEACHER] Using fallback data (student needs to sync)');
  }
  
  // Calculate engagement based on recent activity
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentAssignments = assignments.filter(a => {
    const assignedDate = new Date(a.assignedAt);
    return assignedDate > oneDayAgo;
  });
  
  // Calculate last active
  const lastActivity = assignments
    .filter(a => a.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
  
  const lastActiveDate = lastActivity ? new Date(lastActivity.completedAt!) : new Date();
  const hoursSinceActive = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60));
  
  let lastActive = '';
  if (hoursSinceActive < 1) lastActive = 'Just now';
  else if (hoursSinceActive < 24) lastActive = `${hoursSinceActive} hours ago`;
  else lastActive = `${Math.floor(hoursSinceActive / 24)} days ago`;
  
  // Get most recent emotion
  const recentEmotion = emotionTracking.length > 0 
    ? emotionTracking[emotionTracking.length - 1] 
    : { feeling: 'neutral' };
  
  // Map emotion
  const emotionMap: { [key: string]: 'happy' | 'neutral' | 'sad' } = {
    'excited': 'happy',
    'confident': 'happy',
    'happy': 'happy',
    'motivated': 'happy',
    'neutral': 'neutral',
    'confused': 'sad',
    'frustrated': 'sad',
    'tired': 'sad',
    'stressed': 'sad',
  };
  const emotion = emotionMap[recentEmotion.feeling] || 'neutral';
  
  // Calculate engagement (0-100)
  const completedCount = assignments.filter(a => a.status === 'completed').length;
  const totalCount = assignments.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const recencyBonus = hoursSinceActive < 24 ? 20 : hoursSinceActive < 72 ? 10 : 0;
  const engagement = Math.min(100, Math.round(completionRate * 0.7 + recencyBonus + (emotion === 'happy' ? 10 : 0)));
  
  // Determine if at risk
  const atRisk = engagement < 50 || hoursSinceActive > 120 || emotion === 'sad';
  
  // Calculate streak
  const streak = analytics.streak || analytics.studyStreak || 0;
  
  // Format emotion history
  const emotionHistory = emotionTracking.slice(-7).map((e: any) => ({
    date: e.timestamp || new Date().toISOString(),
    emotion: emotionMap[e.feeling] || 'neutral',
    reason: e.reason
  }));
  
  // Get recent lessons
  const recentLessons = assignments
    .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
    .slice(0, 5);
  
  // Calculate overall progress (% of all lessons completed)
  const progress = Math.round((analytics.lessonsCompleted / 20) * 100); // Assuming 20 total lessons
  
  return {
    id: studentId,
    name: studentId === 'student-1' ? 'Nguyễn Văn A' : 
          studentId === 'student-2' ? 'Trần Thị B' :
          studentId === 'student-3' ? 'Lê Văn C' :
          'Phạm Thị D',
    email: email,
    avatar: studentId === 'student-1' || studentId === 'student-3' ? '👨‍🎓' : '👩‍🎓',
    totalXP: analytics.totalXP,
    progress: progress,
    averageScore: Math.round(analytics.averageScore),
    lessonsCompleted: analytics.lessonsCompleted,
    lastActive: lastActive,
    emotion: emotion,
    atRisk: atRisk,
    engagement: engagement,
    streak: streak,
    recentLessons: recentLessons,
    emotionHistory: emotionHistory
  };
}

/**
 * Get data for all students in the class
 * @returns Array of student data
 */
export function getAllStudentsDataForTeacher(): TeacherStudentView[] {
  const studentIds = ['student-1', 'student-2', 'student-3', 'student-4'];
  
  // For now, only student-1 has real data, others are mock
  const students: TeacherStudentView[] = [];
  
  studentIds.forEach(id => {
    if (id === 'student-1') {
      const realData = getStudentDataForTeacher(id);
      if (realData) students.push(realData);
    } else {
      // Mock data for other students
      students.push({
        id: id,
        name: id === 'student-2' ? 'Trần Thị B' : id === 'student-3' ? 'Lê Văn C' : 'Phạm Thị D',
        email: `${id}@example.com`,
        avatar: id === 'student-3' ? '👨‍🎓' : '👩‍🎓',
        totalXP: id === 'student-2' ? 890 : id === 'student-3' ? 450 : 1100,
        progress: id === 'student-2' ? 60 : id === 'student-3' ? 35 : 80,
        averageScore: id === 'student-2' ? 78 : id === 'student-3' ? 62 : 88,
        lessonsCompleted: id === 'student-2' ? 8 : id === 'student-3' ? 4 : 14,
        lastActive: id === 'student-2' ? '1 day ago' : id === 'student-3' ? '5 days ago' : '3 hours ago',
        emotion: id === 'student-2' ? 'neutral' : id === 'student-3' ? 'sad' : 'happy',
        atRisk: id === 'student-3',
        engagement: id === 'student-2' ? 75 : id === 'student-3' ? 42 : 95,
        streak: id === 'student-2' ? 3 : id === 'student-3' ? 0 : 10,
        recentLessons: [],
        emotionHistory: []
      });
    }
  });
  
  return students;
}

/**
 * Calculate class-wide statistics
 * @returns Class statistics
 */
export function getClassStatistics() {
  const students = getAllStudentsDataForTeacher();
  
  const totalStudents = students.length;
  const averageXP = Math.round(students.reduce((sum, s) => sum + s.totalXP, 0) / totalStudents);
  const averageProgress = Math.round(students.reduce((sum, s) => sum + s.progress, 0) / totalStudents);
  const averageScore = Math.round(students.reduce((sum, s) => sum + s.averageScore, 0) / totalStudents);
  const totalLessonsCompleted = students.reduce((sum, s) => sum + s.lessonsCompleted, 0);
  const averageEngagement = Math.round(students.reduce((sum, s) => sum + s.engagement, 0) / totalStudents);
  const atRiskCount = students.filter(s => s.atRisk).length;
  
  return {
    totalStudents,
    averageXP,
    averageProgress,
    averageScore,
    totalLessonsCompleted,
    averageEngagement,
    atRiskCount
  };
}

/**
 * Send notification to student
 * @param studentId - Student ID
 * @param message - Message content
 * @param type - Notification type
 */
export function sendNotificationToStudent(
  studentId: string,
  message: string,
  type: 'encouragement' | 'reminder' | 'congratulation' | 'warning' | 'info'
) {
  const notifications = JSON.parse(localStorage.getItem('student-notifications') || '[]');
  
  notifications.push({
    id: `notif-${Date.now()}`,
    studentId: studentId,
    message: message,
    type: type,
    timestamp: new Date().toISOString(),
    read: false,
    from: 'teacher'
  });
  
  localStorage.setItem('student-notifications', JSON.stringify(notifications));
  
  console.log(`📬 Notification sent to ${studentId}:`, message);
}

/**
 * Assign material/resource to student
 * @param studentId - Student ID
 * @param material - Material details
 */
export function assignMaterialToStudent(
  studentId: string,
  material: {
    type: 'video' | 'pdf' | 'quiz' | 'exercise';
    title: string;
    url?: string;
    description?: string;
  }
) {
  const materials = JSON.parse(localStorage.getItem('assigned-materials') || '[]');
  
  materials.push({
    id: `material-${Date.now()}`,
    studentId: studentId,
    ...material,
    assignedAt: new Date().toISOString(),
    completed: false
  });
  
  localStorage.setItem('assigned-materials', JSON.stringify(materials));
  
  // Also send notification
  sendNotificationToStudent(
    studentId,
    `📚 Giáo viên vừa gửi cho em: ${material.title}`,
    'info'
  );
  
  console.log(`📚 Material assigned to ${studentId}:`, material.title);
}

