import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface SyncData {
  users: any[];
  courses: any[];
  assignments: any[];
  quizzes: any[];
  stemProjects: any[];
  competitions: any[];
}

interface UseSyncDataReturn {
  syncData: SyncData;
  isLoading: boolean;
  error: string | null;
  lastSync: string | null;
  userRole: string | null;
  schoolId: string | null;
  syncDataFromServer: () => Promise<void>;
  updateData: (module: string, data: any) => Promise<boolean>;
  refreshModule: (module: string) => Promise<void>;
  forceSync: () => Promise<void>; // Force sync without throttling
}

export const useSyncData = (): UseSyncDataReturn => {
  const { data: session } = useSession();
  const [syncData, setSyncData] = useState<SyncData>({
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
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  const syncDataFromServer = useCallback(async () => {
    if (!session?.user?.email) return;

    // Throttle sync requests - only allow sync every 30 seconds
    const now = Date.now();
    if (now - lastSyncTime < 30000) {
      console.log('Sync throttled - too frequent requests');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastSyncTime(now);

    try {
      const response = await fetch('/api/sync/data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSyncData(result.data);
        setLastSync(result.lastSync);
        setUserRole(result.userRole);
        setSchoolId(result.schoolId);

        // Also update localStorage for offline access
        const storageKey = `syncData_${session.user.email}`;
        localStorage.setItem(storageKey, JSON.stringify({
          ...result.data,
          lastSync: result.lastSync,
          userRole: result.userRole,
          schoolId: result.schoolId
        }));
      } else {
        throw new Error(result.error || 'Failed to sync data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error syncing data:', err);

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
  }, [session?.user?.email, lastSyncTime]);

  const updateData = useCallback(async (module: string, data: any): Promise<boolean> => {
    if (!session?.user?.email) return false;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sync/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ module, data }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Refresh data after successful update
        await syncDataFromServer();
        return true;
      } else {
        throw new Error(result.error || 'Failed to update data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error updating data:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email, syncDataFromServer]);

  const refreshModule = useCallback(async (module: string) => {
    // Force refresh specific module data with throttling
    const now = Date.now();
    if (now - lastSyncTime < 10000) { // 10 seconds for module refresh
      console.log('Module refresh throttled - too frequent requests');
      return;
    }
    await syncDataFromServer();
  }, [syncDataFromServer, lastSyncTime]);

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

      // Then sync from server
      syncDataFromServer();
    }
  }, [session?.user?.email]); // Remove syncDataFromServer from dependencies

  // Force sync without throttling (for critical operations)
  const forceSync = useCallback(async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sync/data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSyncData(result.data);
        setLastSync(result.lastSync);
        setUserRole(result.userRole);
        setSchoolId(result.schoolId);
        setLastSyncTime(Date.now());

        // Also update localStorage for offline access
        const storageKey = `syncData_${session.user.email}`;
        localStorage.setItem(storageKey, JSON.stringify({
          ...result.data,
          lastSync: result.lastSync,
          userRole: result.userRole,
          schoolId: result.schoolId
        }));
      } else {
        throw new Error(result.error || 'Failed to sync data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error force syncing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email]);


  return {
    syncData,
    isLoading,
    error,
    lastSync,
    userRole,
    schoolId,
    syncDataFromServer,
    updateData,
    refreshModule,
    forceSync,
  };
};
