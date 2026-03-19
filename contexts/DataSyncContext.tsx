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
      // dataSyncPersistence handles the key prefixing and serialization efficiently
      dataSyncPersistence.persistSyncData(
        `syncData_${session.user.email}`,
        syncData,
        300000 // 5 minutes TTL
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

  // STEM projects from localStorage are already loaded in the serverSyncData effect above

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
