"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { settings, toggleMode } = useTheme();

  const getIcon = () => {
    switch (settings.mode) {
      case 'light':
        return <Moon className="w-4 h-4" />;
      case 'dark':
        return <Monitor className="w-4 h-4" />;
      case 'system':
        return <Sun className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (settings.mode) {
      case 'light':
        return 'Chuyển sang tối';
      case 'dark':
        return 'Chuyển sang hệ thống';
      case 'system':
        return 'Chuyển sang sáng';
      default:
        return 'Chuyển chế độ';
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleMode}
      className={className}
      title={getLabel()}
    >
      {getIcon()}
      {showLabel && (
        <span className="ml-2 hidden sm:inline">
          {getLabel()}
        </span>
      )}
    </Button>
  );
}

