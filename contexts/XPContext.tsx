"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt?: string;
  category: 'learning' | 'streak' | 'xp' | 'special';
}

interface XPData {
  totalXP: number;
  level: number;
  gems: number;
  streak: number;
  achievements: Achievement[];
  completedLessons: string[];
}

const XPContext = createContext<{
  xpData: XPData;
  addXP: (amount: number, source: string) => void;
  completeLesson: (lessonId: string, xpReward: number) => void;
  updateStreak: () => void;
  checkAchievements: () => void;
  newAchievements: Achievement[];
  clearNewAchievements: () => void;
  isLoading: boolean;
} | null>(null);

const initialAchievements: Achievement[] = [
  {
    id: 'first_lesson',
    name: 'Bước đầu học tập',
    description: 'Hoàn thành bài học đầu tiên',
    icon: '🎓',
    xpReward: 50,
    category: 'learning'
  },
  {
    id: 'xp_100',
    name: 'Người học tích cực',
    description: 'Đạt được 100 XP',
    icon: '⭐',
    xpReward: 0,
    category: 'xp'
  },
  {
    id: 'xp_500',
    name: 'Học sinh giỏi',
    description: 'Đạt được 500 XP',
    icon: '🏆',
    xpReward: 0,
    category: 'xp'
  },
  {
    id: 'xp_1000',
    name: 'Học sinh xuất sắc',
    description: 'Đạt được 1000 XP',
    icon: '👑',
    xpReward: 0,
    category: 'xp'
  },
  {
    id: 'streak_3',
    name: 'Kiên trì',
    description: 'Học liên tục 3 ngày',
    icon: '🔥',
    xpReward: 100,
    category: 'streak'
  },
  {
    id: 'streak_7',
    name: 'Quyết tâm',
    description: 'Học liên tục 7 ngày',
    icon: '💪',
    xpReward: 300,
    category: 'streak'
  },
  {
    id: 'streak_30',
    name: 'Bất khuất',
    description: 'Học liên tục 30 ngày',
    icon: '🏅',
    xpReward: 1000,
    category: 'streak'
  },
  {
    id: 'level_5',
    name: 'Thăng cấp',
    description: 'Đạt cấp độ 5',
    icon: '📈',
    xpReward: 0,
    category: 'special'
  },
  {
    id: 'level_10',
    name: 'Chuyên gia',
    description: 'Đạt cấp độ 10',
    icon: '🎯',
    xpReward: 0,
    category: 'special'
  }
];

export const XPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const [xpData, setXpData] = useState<XPData>({
    totalXP: 0,
    level: 1,
    gems: 0,
    streak: 0,
    achievements: [],
    completedLessons: []
  });
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  // Get user-specific localStorage key
  const getStorageKey = useCallback(() => {
    if (session?.user?.email) {
      return `xpData_${session.user.email}`;
    }
    return 'xpData_guest';
  }, [session?.user?.email]);

  // Validate XP data structure
  const validateXPData = (data: any): XPData | null => {
    if (!data || typeof data !== 'object') return null;
    
    const requiredFields = ['totalXP', 'level', 'gems', 'streak', 'achievements', 'completedLessons'];
    const hasAllFields = requiredFields.every(field => field in data);
    
    if (!hasAllFields) return null;
    
    // Ensure numeric fields are numbers
    if (typeof data.totalXP !== 'number' || 
        typeof data.level !== 'number' || 
        typeof data.gems !== 'number' || 
        typeof data.streak !== 'number') {
      return null;
    }
    
    // Ensure arrays are arrays
    if (!Array.isArray(data.achievements) || !Array.isArray(data.completedLessons)) {
      return null;
    }
    
    return {
      totalXP: Math.max(0, data.totalXP),
      level: Math.max(1, data.level),
      gems: Math.max(0, data.gems),
      streak: Math.max(0, data.streak),
      achievements: data.achievements || [],
      completedLessons: data.completedLessons || []
    };
  };

  // Load XP data from localStorage
  useEffect(() => {
    if (status === 'loading' || typeof window === 'undefined') return;
    
    try {
      const storageKey = getStorageKey();
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const validatedData = validateXPData(parsed);
        
        if (validatedData) {
          setXpData(validatedData);
        } else {
          console.warn('Invalid XP data found, using defaults');
          setXpData({
            totalXP: 0,
            level: 1,
            gems: 0,
            streak: 0,
            achievements: [],
            completedLessons: []
          });
        }
      } else {
        // Initialize with default data
        setXpData({
          totalXP: 0,
          level: 1,
          gems: 0,
          streak: 0,
          achievements: [],
          completedLessons: []
        });
      }
    } catch (error) {
      console.error('Error loading XP data:', error);
      setXpData({
        totalXP: 0,
        level: 1,
        gems: 0,
        streak: 0,
        achievements: [],
        completedLessons: []
      });
    } finally {
      setIsLoading(false);
      isInitialized.current = true;
    }
  }, [status, getStorageKey]);

  // Save XP data to localStorage
  useEffect(() => {
    if (!isInitialized.current || typeof window === 'undefined') return;
    
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(xpData));
    } catch (error) {
      console.error('Error saving XP data:', error);
    }
  }, [xpData, getStorageKey]);

  const calculateLevel = (xp: number) => {
    return Math.floor(xp / 100) + 1;
  };

  // Check achievements with new data (to avoid async state issues)
  const checkAchievementsWithData = useCallback((data: XPData) => {
    const newAchievements: Achievement[] = [...data.achievements];
    const newlyUnlocked: Achievement[] = [];
    
    initialAchievements.forEach(achievement => {
      if (!newAchievements.find(a => a.id === achievement.id)) {
        let shouldUnlock = false;
        
        switch (achievement.id) {
          case 'first_lesson':
            shouldUnlock = data.completedLessons.length >= 1;
            break;
          case 'xp_100':
            shouldUnlock = data.totalXP >= 100;
            break;
          case 'xp_500':
            shouldUnlock = data.totalXP >= 500;
            break;
          case 'xp_1000':
            shouldUnlock = data.totalXP >= 1000;
            break;
          case 'streak_3':
            shouldUnlock = data.streak >= 3;
            break;
          case 'streak_7':
            shouldUnlock = data.streak >= 7;
            break;
          case 'streak_30':
            shouldUnlock = data.streak >= 30;
            break;
          case 'level_5':
            shouldUnlock = data.level >= 5;
            break;
          case 'level_10':
            shouldUnlock = data.level >= 10;
            break;
        }
        
        if (shouldUnlock) {
          const unlockedAchievement = {
            ...achievement,
            unlockedAt: new Date().toISOString()
          };
          newAchievements.push(unlockedAchievement);
          newlyUnlocked.push(unlockedAchievement);
        }
      }
    });
    
    // Add XP rewards from newly unlocked achievements
    let totalRewardXP = 0;
    newlyUnlocked.forEach(achievement => {
      totalRewardXP += achievement.xpReward;
    });
    
    return {
      achievements: newAchievements,
      rewardXP: totalRewardXP,
      newlyUnlocked
    };
  }, []);

  const addXP = useCallback((amount: number, source: string) => {
    setXpData(prev => {
      const newXP = prev.totalXP + amount;
      const newLevel = calculateLevel(newXP);
      const levelUp = newLevel > prev.level;
      
      const newData = {
        ...prev,
        totalXP: newXP,
        level: newLevel,
        gems: prev.gems + (levelUp ? newLevel * 10 : 0) + Math.floor(amount / 10)
      };
      
      // Check achievements with new data
      const achievementResult = checkAchievementsWithData(newData);
      
      // Apply XP rewards from achievements
      const finalXP = newData.totalXP + achievementResult.rewardXP;
      const finalLevel = calculateLevel(finalXP);
      const finalLevelUp = finalLevel > newData.level;
      
      const finalData = {
        ...newData,
        totalXP: finalXP,
        level: finalLevel,
        gems: newData.gems + (finalLevelUp ? finalLevel * 10 : 0),
        achievements: achievementResult.achievements
      };
      
      // Update new achievements for notifications
      if (achievementResult.newlyUnlocked.length > 0) {
        setNewAchievements(prev => [...prev, ...achievementResult.newlyUnlocked]);
      }
      
      return finalData;
    });
  }, [checkAchievementsWithData]);

  const completeLesson = useCallback((lessonId: string, xpReward: number) => {
    setXpData(prev => {
      if (prev.completedLessons.includes(lessonId)) {
        return prev; // Already completed
      }
      
      const newXP = prev.totalXP + xpReward;
      const newLevel = calculateLevel(newXP);
      const levelUp = newLevel > prev.level;
      
      const newData = {
        ...prev,
        totalXP: newXP,
        level: newLevel,
        gems: prev.gems + (levelUp ? newLevel * 10 : 0) + Math.floor(xpReward / 10),
        completedLessons: [...prev.completedLessons, lessonId]
      };
      
      // Check achievements with new data
      const achievementResult = checkAchievementsWithData(newData);
      
      // Apply XP rewards from achievements
      const finalXP = newData.totalXP + achievementResult.rewardXP;
      const finalLevel = calculateLevel(finalXP);
      const finalLevelUp = finalLevel > newData.level;
      
      const finalData = {
        ...newData,
        totalXP: finalXP,
        level: finalLevel,
        gems: newData.gems + (finalLevelUp ? finalLevel * 10 : 0),
        achievements: achievementResult.achievements
      };
      
      // Update new achievements for notifications
      if (achievementResult.newlyUnlocked.length > 0) {
        setNewAchievements(prev => [...prev, ...achievementResult.newlyUnlocked]);
      }
      
      return finalData;
    });
  }, [checkAchievementsWithData]);

  const updateStreak = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const today = new Date().toDateString();
    const storageKey = getStorageKey();
    const lastStreakDate = localStorage.getItem(`lastStreakDate_${storageKey}`);
    
    if (lastStreakDate !== today) {
      setXpData(prev => {
        const newStreak = lastStreakDate === new Date(Date.now() - 86400000).toDateString() 
          ? prev.streak + 1 
          : 1;
        
        localStorage.setItem(`lastStreakDate_${storageKey}`, today);
        
        const newData = {
          ...prev,
          streak: newStreak
        };
        
        // Check achievements with new data
        const achievementResult = checkAchievementsWithData(newData);
        
        // Apply XP rewards from achievements
        const finalXP = newData.totalXP + achievementResult.rewardXP;
        const finalLevel = calculateLevel(finalXP);
        const finalLevelUp = finalLevel > newData.level;
        
        const finalData = {
          ...newData,
          totalXP: finalXP,
          level: finalLevel,
          gems: newData.gems + (finalLevelUp ? finalLevel * 10 : 0),
          achievements: achievementResult.achievements
        };
        
        // Update new achievements for notifications
        if (achievementResult.newlyUnlocked.length > 0) {
          setNewAchievements(prev => [...prev, ...achievementResult.newlyUnlocked]);
        }
        
        return finalData;
      });
    }
  }, [getStorageKey, checkAchievementsWithData]);

  const checkAchievements = useCallback(() => {
    setXpData(prev => {
      const achievementResult = checkAchievementsWithData(prev);
      
      // Apply XP rewards from achievements
      const finalXP = prev.totalXP + achievementResult.rewardXP;
      const finalLevel = calculateLevel(finalXP);
      const finalLevelUp = finalLevel > prev.level;
      
      const finalData = {
        ...prev,
        totalXP: finalXP,
        level: finalLevel,
        gems: prev.gems + (finalLevelUp ? finalLevel * 10 : 0),
        achievements: achievementResult.achievements
      };
      
      // Update new achievements for notifications
      if (achievementResult.newlyUnlocked.length > 0) {
        setNewAchievements(prev => [...prev, ...achievementResult.newlyUnlocked]);
      }
      
      return finalData;
    });
  }, [checkAchievementsWithData]);

  const clearNewAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  return (
    <XPContext.Provider value={{
      xpData,
      addXP,
      completeLesson,
      updateStreak,
      checkAchievements,
      newAchievements,
      clearNewAchievements,
      isLoading
    }}>
      {children}
    </XPContext.Provider>
  );
};

export const useXP = () => {
  const context = useContext(XPContext);
  if (!context) {
    throw new Error('useXP must be used within an XPProvider');
  }
  return context;
};

