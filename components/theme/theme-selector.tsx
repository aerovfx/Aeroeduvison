"use client";

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette } from 'lucide-react';
import { useTheme, ColorScheme } from '@/contexts/ThemeContext';

interface ThemeSelectorProps {
  className?: string;
}

const colorSchemes: { value: ColorScheme; label: string; color: string }[] = [
  { value: 'blue', label: 'Xanh dương', color: '#1976d2' },
  { value: 'green', label: 'Xanh lá', color: '#2e7d32' },
  { value: 'purple', label: 'Tím', color: '#7b1fa2' },
  { value: 'orange', label: 'Cam', color: '#f57c00' },
  { value: 'red', label: 'Đỏ', color: '#d32f2f' },
  { value: 'pink', label: 'Hồng', color: '#c2185b' },
  { value: 'indigo', label: 'Chàm', color: '#303f9f' },
  { value: 'teal', label: 'Xanh ngọc', color: '#00796b' }
];

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const theme = useTheme();
  
  // Fallback if theme context is not available
  if (!theme) {
    return (
      <Select>
        <SelectTrigger className={className}>
          <Palette className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Chọn màu sắc" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="blue">Xanh dương</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  
  const { settings, updateSettings } = theme;

  const currentScheme = colorSchemes.find(scheme => scheme.value === settings.colorScheme);

  return (
    <Select
      value={settings.colorScheme}
      onValueChange={(value: ColorScheme) => updateSettings({ colorScheme: value })}
    >
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full border border-gray-300"
              style={{ backgroundColor: currentScheme?.color }}
            />
            <SelectValue placeholder="Chọn màu" />
          </div>
        </div>
      </SelectTrigger>
      <SelectContent>
        {colorSchemes.map((scheme) => (
          <SelectItem key={scheme.value} value={scheme.value}>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: scheme.color }}
              />
              <span>{scheme.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

