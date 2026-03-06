"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeSettings {
  mode: ThemeMode;
}

interface ThemeContextType {
  theme: string;
  settings: ThemeSettings;
  updateSettings: (newSettings: Partial<ThemeSettings>) => void;
  toggleMode: () => void;
  resetToDefault: () => void;
}

const defaultSettings: ThemeSettings = {
  mode: 'system'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('themeSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse theme settings:', error);
      }
    }
    setMounted(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('themeSettings', JSON.stringify(settings));
    }
  }, [settings, mounted]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Determine actual theme
    let actualTheme = settings.mode;
    if (settings.mode === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Apply theme class
    root.classList.add(actualTheme);
  }, [settings.mode, mounted]);

  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleMode = () => {
    setSettings(prev => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : prev.mode === 'dark' ? 'system' : 'light'
    }));
  };

  const resetToDefault = () => {
    setSettings(defaultSettings);
  };

  const value: ThemeContextType = {
    theme: settings.mode === 'system' 
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.mode,
    settings,
    updateSettings,
    toggleMode,
    resetToDefault
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
