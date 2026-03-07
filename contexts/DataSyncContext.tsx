"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSyncData } from '@/hooks/use-sync-data';
import { dataSyncPersistence, moduleStateManager } from '@/lib/persistence';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  stats: {
    coursesCompleted: number;
    totalStudyTime: number;
    achievements: number;
    streak: number;
    xp?: number;
    level?: number;
    gems?: number;
  };
  lastActive: Date;
  joinDate: Date;
  status: 'active' | 'inactive' | 'suspended';
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  studentsCount: number;
  progress: number;
  status: 'published' | 'draft' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

interface AssignmentData {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  dueDate: Date;
  submissionsCount: number;
  status: 'active' | 'completed' | 'overdue';
}

interface QuizData {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  questionsCount: number;
  attemptsCount: number;
  averageScore: number;
  status: 'active' | 'draft' | 'archived';
}

interface STEMProjectData {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  status: 'in-progress' | 'completed' | 'review';
  progress: number;
  milestones: number;
  completedMilestones: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CompetitionData {
  id: string;
  title: string;
  type: 'programming' | 'mathematics' | 'mixed';
  status: 'upcoming' | 'active' | 'ended' | 'cancelled';
  startDate: Date;
  endDate: Date;
  participants: number;
  maxParticipants: number;
  problems: number;
  submissions: number;
  averageScore: number;
}

interface SyncData {
  users: UserData[];
  courses: CourseData[];
  assignments: AssignmentData[];
  quizzes: QuizData[];
  stemProjects: STEMProjectData[];
  competitions: CompetitionData[];
  lastSync: Date;
}

const DataSyncContext = createContext<{
  syncData: SyncData;
  syncAllData: () => Promise<void>;
  syncUsers: () => Promise<void>;
  syncCourses: () => Promise<void>;
  syncAssignments: () => Promise<void>;
  syncQuizzes: () => Promise<void>;
  syncSTEMProjects: () => Promise<void>;
  syncCompetitions: () => Promise<void>;
  forceSync: () => Promise<void>;
  isLoading: boolean;
  // Module management
  activeModules: string[];
  setModuleActive: (module: string, active: boolean) => void;
  toggleModule: (module: string) => boolean;
  isModuleActive: (module: string) => boolean;
  clearAllModules: () => void;
} | null>(null);

export const DataSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const {
    syncData: serverSyncData,
    isLoading,
    error,
    lastSync,
    userRole,
    schoolId,
    syncDataFromServer,
    updateData,
    refreshModule,
    forceSync,
  } = useSyncData();

  // State for active modules
  const [activeModules, setActiveModules] = useState<string[]>([]);

  const [syncData, setSyncData] = useState<SyncData>({
    users: [],
    courses: [],
    assignments: [],
    quizzes: [],
    stemProjects: [],
    competitions: [],
    lastSync: new Date()
  });

  // Load active modules on mount
  useEffect(() => {
    const storedModules = moduleStateManager.getActiveModules();
    setActiveModules(storedModules);
    
    // Subscribe to module changes
    const unsubscribe = moduleStateManager.subscribe((modules) => {
      setActiveModules(modules);
    });
    
    return unsubscribe;
  }, []);

  // Persist sync data when it changes
  useEffect(() => {
    if (session?.user?.email && syncData) {
      dataSyncPersistence.persistSyncData(
        `syncData_${session.user.email}`,
        syncData,
        300000 // 5 minutes
      );
    }
  }, [syncData, session?.user?.email]);

  // Get user-specific localStorage key
  const getStorageKey = () => {
    if (session?.user?.email) {
      return `syncData_${session.user.email}`;
    }
    return 'syncData';
  };

  const getSTEMProjectsFromLocalStorage = () => {
    try {
      const stemProjectsData = localStorage.getItem('stem-projects');
      if (stemProjectsData) {
        const stemProjects = JSON.parse(stemProjectsData);
        console.log('Loading STEM projects from localStorage:', stemProjects.length);
        // Convert STEMContext format to DataSyncContext format
        return stemProjects.map((project: any, index: number) => ({
          id: project.id,
          title: project.title,
          studentId: `student_${index + 1}`,
          studentName: project.teamMembers?.[0]?.name || `Student ${index + 1}`,
          status: project.status === 'completed' ? 'completed' : 
                  project.status === 'in-progress' ? 'in-progress' : 'review',
          progress: project.progress || 0,
          milestones: project.milestones?.length || 6,
          completedMilestones: project.milestones?.filter((m: any) => m.status === 'completed')?.length || 0,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt)
        }));
      }
    } catch (error) {
      console.error('Error loading STEM projects from localStorage:', error);
    }
    return [];
  };

  // Update local state when server data changes
  useEffect(() => {
    if (serverSyncData && Object.keys(serverSyncData).length > 0) {
      // Get STEM projects from localStorage first (from STEMContext)
      const stemProjectsFromLocalStorage = getSTEMProjectsFromLocalStorage();
      
      setSyncData({
        users: serverSyncData.users || [],
        courses: serverSyncData.courses || [],
        assignments: serverSyncData.assignments || [],
        quizzes: serverSyncData.quizzes || [],
        stemProjects: stemProjectsFromLocalStorage.length > 0 ? stemProjectsFromLocalStorage : (serverSyncData.stemProjects || []),
        competitions: serverSyncData.competitions || [],
        lastSync: lastSync ? new Date(lastSync) : new Date()
      });
    }
  }, [serverSyncData, lastSync]);

  // Load STEM projects from localStorage on component mount
  useEffect(() => {
    const stemProjectsFromLocalStorage = getSTEMProjectsFromLocalStorage();
    if (stemProjectsFromLocalStorage.length > 0) {
      setSyncData(prev => ({
        ...prev,
        stemProjects: stemProjectsFromLocalStorage
      }));
    }
  }, []);

  // Save sync data to localStorage
  useEffect(() => {
    if (!session?.user?.email) return;
    
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(syncData));
    } catch (error) {
      console.error('Error saving sync data:', error);
    }
  }, [syncData, session?.user?.email]);

  // Mock data generation functions
  const generateMockUsers = (): UserData[] => {
    return [
      // Admin users
      {
        id: "admin_1",
        name: "Nguyễn Văn An",
        email: "admin@aeroschool.edu.vn",
        role: "ADMIN",
        stats: { coursesCompleted: 0, totalStudyTime: 0, achievements: 0, streak: 0 },
        lastActive: new Date(Date.now() - 3600000),
        joinDate: new Date(Date.now() - 86400000 * 30),
        status: 'active'
      },
      {
        id: "admin_2",
        name: "Trần Thị Minh",
        email: "admin.minh@aeroschool.edu.vn",
        role: "ADMIN",
        stats: { coursesCompleted: 0, totalStudyTime: 0, achievements: 0, streak: 0 },
        lastActive: new Date(Date.now() - 1800000),
        joinDate: new Date(Date.now() - 86400000 * 15),
        status: 'active'
      },
      // Teacher users
      {
        id: "teacher_1",
        name: "Lê Thị Bình",
        email: "teacher.binh@aeroschool.edu.vn",
        role: "TEACHER",
        stats: { coursesCompleted: 0, totalStudyTime: 0, achievements: 0, streak: 0 },
        lastActive: new Date(Date.now() - 7200000),
        joinDate: new Date(Date.now() - 86400000 * 45),
        status: 'active'
      },
      {
        id: "teacher_2",
        name: "Phạm Văn Cường",
        email: "teacher.cuong@aeroschool.edu.vn",
        role: "TEACHER",
        stats: { coursesCompleted: 0, totalStudyTime: 0, achievements: 0, streak: 0 },
        lastActive: new Date(Date.now() - 10800000),
        joinDate: new Date(Date.now() - 86400000 * 60),
        status: 'active'
      },
      // Student users
      {
        id: "student_1",
        name: "Nguyễn Thị Lan",
        email: "student.lan@aeroschool.edu.vn",
        role: "STUDENT",
        stats: { coursesCompleted: 3, totalStudyTime: 120, achievements: 5, streak: 7, xp: 1250, level: 8, gems: 500 },
        lastActive: new Date(Date.now() - 1800000),
        joinDate: new Date(Date.now() - 86400000 * 90),
        status: 'active'
      },
      {
        id: "student_2",
        name: "Trần Văn Hùng",
        email: "student.hung@aeroschool.edu.vn",
        role: "STUDENT",
        stats: { coursesCompleted: 2, totalStudyTime: 80, achievements: 3, streak: 5, xp: 980, level: 6, gems: 350 },
        lastActive: new Date(Date.now() - 3600000),
        joinDate: new Date(Date.now() - 86400000 * 75),
        status: 'active'
      },
      {
        id: "student_3",
        name: "Lê Thị Mai",
        email: "student.mai@aeroschool.edu.vn",
        role: "STUDENT",
        stats: { coursesCompleted: 4, totalStudyTime: 200, achievements: 8, streak: 12, xp: 2100, level: 12, gems: 800 },
        lastActive: new Date(Date.now() - 900000),
        joinDate: new Date(Date.now() - 86400000 * 120),
        status: 'active'
      },
      {
        id: "student_4",
        name: "Phạm Văn Đức",
        email: "student.duc@aeroschool.edu.vn",
        role: "STUDENT",
        stats: { coursesCompleted: 1, totalStudyTime: 40, achievements: 2, streak: 3, xp: 450, level: 3, gems: 150 },
        lastActive: new Date(Date.now() - 7200000),
        joinDate: new Date(Date.now() - 86400000 * 30),
        status: 'active'
      },
      {
        id: "student_5",
        name: "Hoàng Thị Linh",
        email: "student.linh@aeroschool.edu.vn",
        role: "STUDENT",
        stats: { coursesCompleted: 5, totalStudyTime: 300, achievements: 12, streak: 20, xp: 3500, level: 18, gems: 1200 },
        lastActive: new Date(Date.now() - 300000),
        joinDate: new Date(Date.now() - 86400000 * 150),
        status: 'active'
      }
    ];
  };

  const generateMockCourses = (): CourseData[] => {
    return [
      {
        id: "course_1",
        title: "Toán học cơ bản",
        description: "Khóa học toán học cơ bản cho học sinh",
        teacherId: "teacher_1",
        teacherName: "Lê Thị Bình",
        studentsCount: 25,
        progress: 85,
        status: 'published',
        createdAt: new Date(Date.now() - 86400000 * 30),
        updatedAt: new Date(Date.now() - 86400000 * 5)
      },
      {
        id: "course_2",
        title: "Vật lý nâng cao",
        description: "Khóa học vật lý nâng cao",
        teacherId: "teacher_2",
        teacherName: "Phạm Văn Cường",
        studentsCount: 18,
        progress: 60,
        status: 'published',
        createdAt: new Date(Date.now() - 86400000 * 45),
        updatedAt: new Date(Date.now() - 86400000 * 2)
      },
      {
        id: "course_3",
        title: "Hóa học hữu cơ",
        description: "Khóa học hóa học hữu cơ",
        teacherId: "teacher_1",
        teacherName: "Lê Thị Bình",
        studentsCount: 12,
        progress: 30,
        status: 'draft',
        createdAt: new Date(Date.now() - 86400000 * 15),
        updatedAt: new Date(Date.now() - 86400000 * 1)
      }
    ];
  };

  const generateMockAssignments = (): AssignmentData[] => {
    return [
      {
        id: "assignment_1",
        title: "Bài tập phương trình bậc nhất",
        courseId: "course_1",
        courseName: "Toán học cơ bản",
        teacherId: "teacher_1",
        teacherName: "Lê Thị Bình",
        dueDate: new Date(Date.now() + 86400000 * 3),
        submissionsCount: 20,
        status: 'active'
      },
      {
        id: "assignment_2",
        title: "Thí nghiệm vật lý",
        courseId: "course_2",
        courseName: "Vật lý nâng cao",
        teacherId: "teacher_2",
        teacherName: "Phạm Văn Cường",
        dueDate: new Date(Date.now() + 86400000 * 7),
        submissionsCount: 15,
        status: 'active'
      },
      {
        id: "assignment_3",
        title: "Báo cáo hóa học",
        courseId: "course_3",
        courseName: "Hóa học hữu cơ",
        teacherId: "teacher_1",
        teacherName: "Lê Thị Bình",
        dueDate: new Date(Date.now() - 86400000 * 2),
        submissionsCount: 8,
        status: 'overdue'
      }
    ];
  };

  const generateMockQuizzes = (): QuizData[] => {
    return [
      {
        id: "quiz_1",
        title: "Kiểm tra toán học chương 1",
        courseId: "course_1",
        courseName: "Toán học cơ bản",
        teacherId: "teacher_1",
        teacherName: "Lê Thị Bình",
        questionsCount: 20,
        attemptsCount: 45,
        averageScore: 85.5,
        status: 'active'
      },
      {
        id: "quiz_2",
        title: "Quiz vật lý cơ bản",
        courseId: "course_2",
        courseName: "Vật lý nâng cao",
        teacherId: "teacher_2",
        teacherName: "Phạm Văn Cường",
        questionsCount: 15,
        attemptsCount: 32,
        averageScore: 78.2,
        status: 'active'
      }
    ];
  };

  const generateMockSTEMProjects = (): STEMProjectData[] => {
    // Try to get data from STEMContext localStorage first
    try {
      const stemProjectsData = localStorage.getItem('stem-projects');
      if (stemProjectsData) {
        const stemProjects = JSON.parse(stemProjectsData);
        console.log('Loading STEM projects from STEMContext:', stemProjects.length);
        // Convert STEMContext format to DataSyncContext format
        return stemProjects.map((project: any, index: number) => ({
          id: project.id,
          title: project.title,
          studentId: `student_${index + 1}`,
          studentName: project.teamMembers?.[0]?.name || `Student ${index + 1}`,
          status: project.status === 'completed' ? 'completed' : 
                  project.status === 'in-progress' ? 'in-progress' : 'review',
          progress: project.progress || 0,
          milestones: project.milestones?.length || 6,
          completedMilestones: project.milestones?.filter((m: any) => m.status === 'completed')?.length || 0,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt)
        }));
      }
    } catch (error) {
      console.error('Error loading STEM projects from localStorage:', error);
    }

    // Fallback to default mock data if STEMContext data not available
    return [
      {
        id: "stem_1",
        title: "Hệ thống AI hỗ trợ học toán",
        studentId: "student_1",
        studentName: "Nguyễn Thị Lan",
        status: 'in-progress',
        progress: 65,
        milestones: 6,
        completedMilestones: 4,
        createdAt: new Date(Date.now() - 86400000 * 20),
        updatedAt: new Date(Date.now() - 86400000 * 2)
      },
      {
        id: "stem_2",
        title: "Robot tự động dọn dẹp",
        studentId: "student_3",
        studentName: "Lê Thị Mai",
        status: 'completed',
        progress: 100,
        milestones: 6,
        completedMilestones: 6,
        createdAt: new Date(Date.now() - 86400000 * 45),
        updatedAt: new Date(Date.now() - 86400000 * 5)
      },
      {
        id: "stem_3",
        title: "Ứng dụng học tiếng Anh",
        studentId: "student_5",
        studentName: "Hoàng Thị Linh",
        status: 'review',
        progress: 90,
        milestones: 6,
        completedMilestones: 5,
        createdAt: new Date(Date.now() - 86400000 * 30),
        updatedAt: new Date(Date.now() - 86400000 * 1)
      }
    ];
  };

  const generateMockCompetitions = (): CompetitionData[] => {
    // Try to get data from CompetitionContext localStorage first
    try {
      const competitionsData = localStorage.getItem('competitions');
      if (competitionsData) {
        const competitions = JSON.parse(competitionsData);
        console.log('Loading competitions from CompetitionContext:', competitions.length);
        // Convert CompetitionContext format to DataSyncContext format
        return competitions.map((comp: any) => ({
          id: comp.id,
          title: comp.title,
          type: comp.type,
          status: comp.status,
          startDate: new Date(comp.startDate),
          endDate: new Date(comp.endDate),
          participants: comp.currentParticipants,
          maxParticipants: comp.maxParticipants,
          problems: comp.problems?.length || 0,
          submissions: comp.submissions?.length || 0,
          averageScore: comp.leaderboard?.length > 0 
            ? Math.round(comp.leaderboard.reduce((sum: number, user: any) => sum + user.totalScore, 0) / comp.leaderboard.length * 100) / 100
            : 0
        }));
      }
    } catch (error) {
      console.error('Error loading competitions from localStorage:', error);
    }

    // Fallback to default mock data if CompetitionContext data not available
    return [
      {
        id: "comp_1",
        title: "Cuộc thi Lập trình Python cơ bản",
        type: "programming",
        status: "active",
        startDate: new Date("2024-01-15T09:00:00Z"),
        endDate: new Date("2024-01-15T12:00:00Z"),
        participants: 45,
        maxParticipants: 100,
        problems: 2,
        submissions: 12,
        averageScore: 15.5
      },
      {
        id: "comp_2",
        title: "Olympic Toán học THPT",
        type: "mathematics",
        status: "upcoming",
        startDate: new Date("2024-02-01T08:00:00Z"),
        endDate: new Date("2024-02-01T11:00:00Z"),
        participants: 120,
        maxParticipants: 200,
        problems: 2,
        submissions: 0,
        averageScore: 0
      },
      {
        id: "comp_3",
        title: "Hackathon AI & Machine Learning",
        type: "mixed",
        status: "ended",
        startDate: new Date("2024-01-01T09:00:00Z"),
        endDate: new Date("2024-01-01T18:00:00Z"),
        participants: 35,
        maxParticipants: 50,
        problems: 1,
        submissions: 8,
        averageScore: 42.5
      }
    ];
  };

  const syncUsers = async () => {
    await refreshModule('users');
  };

  const syncCourses = async () => {
    await refreshModule('courses');
  };

  const syncAssignments = async () => {
    await refreshModule('assignments');
  };

  const syncQuizzes = async () => {
    await refreshModule('quizzes');
  };

  const syncSTEMProjects = async () => {
    try {
      // First try to get from localStorage (STEMContext data)
      const stemProjectsData = localStorage.getItem('stem-projects');
      if (stemProjectsData) {
        const stemProjects = JSON.parse(stemProjectsData);
        
        // Send to API to sync with database
        const response = await fetch('/api/admin/stem/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ stemProjects }),
        });

        if (response.ok) {
          console.log('STEM projects synced to database successfully');
        }
      }
      
      // Then refresh from server
      await refreshModule('stemProjects');
    } catch (error) {
      console.error('Error syncing STEM projects:', error);
      // Fallback to regular refresh
      await refreshModule('stemProjects');
    }
  };

  const syncCompetitions = async () => {
    await refreshModule('competitions');
  };

  const syncAllData = async () => {
    await syncDataFromServer();
  };

  // Module management functions
  const setModuleActive = (module: string, active: boolean) => {
    moduleStateManager.setActiveModule(module, active);
  };

  const toggleModule = (module: string) => {
    return moduleStateManager.toggleModule(module);
  };

  const isModuleActive = (module: string) => {
    return moduleStateManager.isModuleActive(module);
  };

  const clearAllModules = () => {
    moduleStateManager.clearAllModules();
  };

  return (
    <DataSyncContext.Provider value={{
      syncData,
      syncAllData,
      syncUsers,
      syncCourses,
      syncAssignments,
      syncQuizzes,
      syncSTEMProjects,
      syncCompetitions,
      forceSync,
      isLoading,
      // Module management
      activeModules,
      setModuleActive,
      toggleModule,
      isModuleActive,
      clearAllModules
    }}>
      {children}
    </DataSyncContext.Provider>
  );
};

export const useDataSync = () => {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within a DataSyncProvider');
  }
  return context;
};
