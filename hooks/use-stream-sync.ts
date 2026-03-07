import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface StreamSyncData {
  users: any[];
  courses: any[];
  assignments: any[];
  quizzes: any[];
  stemProjects: any[];
  competitions: any[];
}

interface UseStreamSyncReturn {
  syncData: StreamSyncData;
  isLoading: boolean;
  error: string | null;
  lastSync: string | null;
  userRole: string | null;
  schoolId: string | null;
  progress: {
    users: boolean;
    courses: boolean;
    assignments: boolean;
    quizzes: boolean;
    stemProjects: boolean;
    competitions: boolean;
  };
  streamSync: () => Promise<void>;
}

export const useStreamSync = (): UseStreamSyncReturn => {
  const { data: session } = useSession();
  const [syncData, setSyncData] = useState<StreamSyncData>({
    users: [],
    courses: [],
    assignments: [],
    quizzes: [],
    stemProjects: [],
    competitions: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    users: false,
    courses: false,
    assignments: false,
    quizzes: false,
    stemProjects: false,
    competitions: false
  });

  const streamSync = useCallback(async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    setError(null);
    setProgress({
      users: false,
      courses: false,
      assignments: false,
      quizzes: false,
      stemProjects: false,
      competitions: false
    });

    try {
      const response = await fetch('/api/sync/stream', {
        method: 'GET',
        headers: {
          'Content-Type': 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentSyncData: StreamSyncData = {
        users: [],
        courses: [],
        assignments: [],
        quizzes: [],
        stemProjects: [],
        competitions: []
      };
      let currentUserRole: string | null = null;
      let currentSchoolId: string | null = null;
      let currentLastSync: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'start':
                  currentUserRole = data.userRole;
                  currentSchoolId = data.schoolId;
                  currentLastSync = data.timestamp;
                  setUserRole(data.userRole);
                  setSchoolId(data.schoolId);
                  setLastSync(data.timestamp);
                  break;
                
                case 'users':
                  currentSyncData.users = data.data;
                  setSyncData(prev => ({ ...prev, users: data.data }));
                  setProgress(prev => ({ ...prev, users: true }));
                  break;
                
                case 'courses':
                  currentSyncData.courses = data.data;
                  setSyncData(prev => ({ ...prev, courses: data.data }));
                  setProgress(prev => ({ ...prev, courses: true }));
                  break;
                
                case 'assignments':
                  currentSyncData.assignments = data.data;
                  setSyncData(prev => ({ ...prev, assignments: data.data }));
                  setProgress(prev => ({ ...prev, assignments: true }));
                  break;
                
                case 'quizzes':
                  currentSyncData.quizzes = data.data;
                  setSyncData(prev => ({ ...prev, quizzes: data.data }));
                  setProgress(prev => ({ ...prev, quizzes: true }));
                  break;
                
                case 'stemProjects':
                  currentSyncData.stemProjects = data.data;
                  setSyncData(prev => ({ ...prev, stemProjects: data.data }));
                  setProgress(prev => ({ ...prev, stemProjects: true }));
                  break;
                
                case 'competitions':
                  currentSyncData.competitions = data.data;
                  setSyncData(prev => ({ ...prev, competitions: data.data }));
                  setProgress(prev => ({ ...prev, competitions: true }));
                  break;
                
                case 'complete':
                  currentLastSync = data.timestamp;
                  setLastSync(data.timestamp);
                  break;
                
                case 'error':
                  throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing stream data:', parseError);
            }
          }
        }
      }

      // Save to localStorage for offline access
      const storageKey = `syncData_${session.user.email}`;
      localStorage.setItem(storageKey, JSON.stringify({
        ...currentSyncData,
        lastSync: currentLastSync,
        userRole: currentUserRole,
        schoolId: currentSchoolId
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error streaming sync data:', err);

      // Try to load from localStorage as fallback
      try {
        const storageKey = `syncData_${session.user.email}`;
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setSyncData(parsed);
          setLastSync(parsed.lastSync);
          setUserRole(parsed.userRole);
          setSchoolId(parsed.schoolId);
        }
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email]); // Removed problematic dependencies

  // Load data on mount and when session changes
  useEffect(() => {
    if (session?.user?.email) {
      // Try to load from localStorage first for faster initial load
      try {
        const storageKey = `syncData_${session.user.email}`;
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setSyncData(parsed);
          setLastSync(parsed.lastSync);
          setUserRole(parsed.userRole);
          setSchoolId(parsed.schoolId);
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }

      // Then stream from server
      streamSync();
    }
  }, [session?.user?.email]); // Removed streamSync from dependencies

  return {
    syncData,
    isLoading,
    error,
    lastSync,
    userRole,
    schoolId,
    progress,
    streamSync
  };
};
