"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Settings,
  Palette,
  Type,
  Layout,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  Check
} from 'lucide-react';
import { useTheme, ThemeMode, ColorScheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeCustomizerProps {
  className?: string;
}

export function ThemeCustomizer({ className }: ThemeCustomizerProps) {
  const theme = useTheme();
  
  // Fallback if theme context is not available
  if (!theme) {
    return (
      <Button variant="outline" size="sm" className={className}>
        <Settings className="mr-2 h-4 w-4" />
        Theme
      </Button>
    );
  }
  
  const { settings, updateSettings, toggleMode, resetToDefault } = theme;
  const [isOpen, setIsOpen] = useState(false);

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

  const modeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Sáng', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Tối', icon: <Moon className="w-4 h-4" /> },
    { value: 'auto', label: 'Tự động', icon: <Monitor className="w-4 h-4" /> }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Nhỏ' },
    { value: 'medium', label: 'Vừa' },
    { value: 'large', label: 'Lớn' }
  ];

  const borderRadiusOptions = [
    { value: 'none', label: 'Không' },
    { value: 'small', label: 'Nhỏ' },
    { value: 'medium', label: 'Vừa' },
    { value: 'large', label: 'Lớn' }
  ];

  const densityOptions = [
    { value: 'comfortable', label: 'Thoải mái' },
    { value: 'compact', label: 'Gọn gàng' },
    { value: 'spacious', label: 'Rộng rãi' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Settings className="w-4 h-4 mr-2" />
          Tùy chỉnh giao diện
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tùy chỉnh giao diện
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Chế độ hiển thị
              </CardTitle>
              <CardDescription>
                Chọn chế độ sáng, tối hoặc tự động theo hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {modeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={settings.mode === option.value ? "default" : "outline"}
                    onClick={() => updateSettings({ mode: option.value })}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    {option.icon}
                    <span className="text-sm">{option.label}</span>
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="mode-toggle" className="text-sm">
                  Chuyển đổi nhanh
                </Label>
                <Button variant="outline" size="sm" onClick={toggleMode}>
                  {settings.mode === 'light' ? <Moon className="w-4 h-4" /> : 
                   settings.mode === 'dark' ? <Monitor className="w-4 h-4" /> : 
                   <Sun className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Color Scheme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Bảng màu
              </CardTitle>
              <CardDescription>
                Chọn màu chủ đạo cho giao diện
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {colorSchemes.map((scheme) => (
                  <Button
                    key={scheme.value}
                    variant={settings.colorScheme === scheme.value ? "default" : "outline"}
                    onClick={() => updateSettings({ colorScheme: scheme.value })}
                    className="flex flex-col items-center gap-2 h-auto py-4 relative"
                  >
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: scheme.color }}
                    />
                    <span className="text-xs">{scheme.label}</span>
                    {settings.colorScheme === scheme.value && (
                      <Check className="w-3 h-3 absolute top-1 right-1 text-white" />
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Font Size */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Kích thước chữ
              </CardTitle>
              <CardDescription>
                Điều chỉnh kích thước chữ cho dễ đọc
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.fontSize}
                onValueChange={(value: 'small' | 'medium' | 'large') => 
                  updateSettings({ fontSize: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontSizeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Border Radius */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Độ bo góc
              </CardTitle>
              <CardDescription>
                Tùy chỉnh độ bo góc của các thành phần
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.borderRadius}
                onValueChange={(value: 'none' | 'small' | 'medium' | 'large') => 
                  updateSettings({ borderRadius: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {borderRadiusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Density */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Mật độ hiển thị
              </CardTitle>
              <CardDescription>
                Điều chỉnh khoảng cách và kích thước các thành phần
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {densityOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={settings.density === option.value ? "default" : "outline"}
                    onClick={() => updateSettings({ density: option.value as "comfortable" | "compact" | "spacious" })}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded border-2",
                      option.value === 'compact' && "bg-blue-100 border-blue-300",
                      option.value === 'comfortable' && "bg-green-100 border-green-300",
                      option.value === 'spacious' && "bg-purple-100 border-purple-300"
                    )} />
                    <span className="text-sm">{option.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Xem trước</CardTitle>
            <CardDescription>
              Xem trước giao diện với các thiết lập hiện tại
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button size="sm">Nút nhỏ</Button>
                <Button size="default">Nút vừa</Button>
                <Button size="lg">Nút lớn</Button>
              </div>
              
              <div className="flex gap-2">
                <Badge variant="default">Mặc định</Badge>
                <Badge variant="secondary">Phụ</Badge>
                <Badge variant="outline">Viền</Badge>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Thẻ mẫu</h4>
                <p className="text-sm text-muted-foreground">
                  Đây là một thẻ mẫu để xem trước giao diện với các thiết lập hiện tại.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefault}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Đặt lại mặc định
          </Button>
          
          <Button onClick={() => setIsOpen(false)}>
            <Check className="w-4 h-4 mr-2" />
            Áp dụng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
