"use client";

import React, { useState } from 'react';
import { useSyncData } from '@/hooks/use-sync-data';
// import { useStreamSync } from '@/hooks/use-stream-sync'; // Temporarily disabled
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Users, BookOpen, FileText, Brain, Trophy, Settings, Eye, EyeOff } from 'lucide-react';
// import { formatDistanceToNow } from 'date-fns';

export const DataSyncStatus: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  const {
    syncData: regularSyncData,
    isLoading: regularLoading,
    error: regularError,
    lastSync: regularLastSync,
    userRole: regularUserRole,
    schoolId: regularSchoolId,
    syncDataFromServer
  } = useSyncData();

  // Temporarily disable streaming sync to avoid infinite loop
  // const {
  //   syncData: streamSyncData,
  //   isLoading: streamLoading,
  //   error: streamError,
  //   lastSync: streamLastSync,
  //   userRole: streamUserRole,
  //   schoolId: streamSchoolId,
  //   progress,
  //   streamSync
  // } = useStreamSync();

  // Use regular sync data only
  const syncData = regularSyncData;
  const isLoading = regularLoading;
  const error = regularError;
  const lastSync = regularLastSync;
  const userRole = regularUserRole;
  const schoolId = regularSchoolId;
  
  // Mock progress for now
  const progress = {
    users: true,
    courses: true,
    assignments: true,
    quizzes: true,
    stemProjects: true,
    competitions: true
  };

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (error) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Đang đồng bộ...';
    if (error) return 'Lỗi đồng bộ';
    return 'Đã đồng bộ';
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-yellow-100 text-yellow-800';
    if (error) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const dataStats = [
    {
      icon: Users,
      label: 'Người dùng',
      count: syncData.users?.length || 0,
      color: 'text-blue-600'
    },
    {
      icon: BookOpen,
      label: 'Khóa học',
      count: syncData.courses?.length || 0,
      color: 'text-green-600'
    },
    {
      icon: FileText,
      label: 'Bài tập',
      count: syncData.assignments?.length || 0,
      color: 'text-purple-600'
    },
    {
      icon: Brain,
      label: 'Dự án STEM',
      count: syncData.stemProjects?.length || 0,
      color: 'text-orange-600'
    },
    {
      icon: Trophy,
      label: 'Cuộc thi',
      count: syncData.competitions?.length || 0,
      color: 'text-red-600'
    }
  ];

  return (
    <div className="w-full">
      {/* Hidden Toggle Button */}
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="bg-gray-100 hover:bg-gray-200 text-gray-600"
        >
          {isVisible ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {isVisible ? 'Ẩn' : 'Hiện'} Trạng thái đồng bộ dữ liệu
        </Button>
      </div>

      {/* Data Sync Status Card - Only show when visible */}
      {isVisible && (
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon()}
                  Trạng thái đồng bộ dữ liệu
                </CardTitle>
                <CardDescription>
                  Thông tin đồng bộ dữ liệu giữa các module
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor()}>
                  {getStatusText()}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncDataFromServer}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Đồng bộ
                </Button>
              </div>
            </div>
          </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Vai trò:</span>
            <Badge variant="outline" className="ml-2">
              {userRole || 'N/A'}
            </Badge>
          </div>
          <div>
            <span className="font-medium">Trường:</span>
            <span className="ml-2 text-muted-foreground">
              {schoolId || 'N/A'}
            </span>
          </div>
        </div>

        {/* Last Sync */}
        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Đồng bộ lần cuối: {new Date(lastSync).toLocaleString()}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Lỗi:</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Progress Indicator for Streaming */}
        {isLoading && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Tiến trình đồng bộ:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`flex items-center gap-2 p-2 rounded ${progress.users ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                <Users className="h-4 w-4" />
                <span>Người dùng {progress.users ? '✓' : '...'}</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded ${progress.courses ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                <BookOpen className="h-4 w-4" />
                <span>Khóa học {progress.courses ? '✓' : '...'}</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded ${progress.assignments ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                <FileText className="h-4 w-4" />
                <span>Bài tập {progress.assignments ? '✓' : '...'}</span>
              </div>
              <div className={`flex items-center gap-2 p-2 rounded ${progress.stemProjects ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                <Brain className="h-4 w-4" />
                <span>STEM {progress.stemProjects ? '✓' : '...'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Data Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {dataStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <Icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold">{stat.count}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Data Details */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Chi tiết dữ liệu:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Người dùng:</span>
              <div className="text-muted-foreground">
                {syncData.users?.filter(u => u.role === 'ADMIN').length || 0} Admin, {' '}
                {syncData.users?.filter(u => u.role === 'TEACHER').length || 0} Giáo viên, {' '}
                {syncData.users?.filter(u => u.role === 'STUDENT').length || 0} Học sinh
              </div>
            </div>
            <div>
              <span className="font-medium">Khóa học:</span>
              <div className="text-muted-foreground">
                {syncData.courses?.filter(c => c.status === 'published').length || 0} Đã xuất bản, {' '}
                {syncData.courses?.filter(c => c.status === 'draft').length || 0} Bản nháp
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
      )}
    </div>
  );
};
