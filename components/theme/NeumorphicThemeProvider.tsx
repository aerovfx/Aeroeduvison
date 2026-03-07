'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import '@/styles/neumorphic-theme.css';

interface NeumorphicThemeProviderProps {
  children: ReactNode;
}

export default function NeumorphicThemeProvider({ children }: NeumorphicThemeProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('neumorphicTheme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
    setMounted(true);
  }, []);

  // Apply theme class to body
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    document.body.className = `neumorphic-theme ${theme}`;
    
    // Save to localStorage
    localStorage.setItem('neumorphicTheme', theme);
    
    return () => {
      document.body.className = '';
    };
  }, [theme, mounted]);

  const toggleMode = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Theme Toggle Button */}
      <button
        className="neu-theme-toggle"
        onClick={toggleMode}
        title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun size={24} className="neu-theme-icon" />
        ) : (
          <Moon size={24} className="neu-theme-icon" />
        )}
      </button>
      
      {children}
    </>
  );
}

