"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const LoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="p-6 space-y-8">
        {/* Welcome Section Skeleton */}
        <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-64 bg-gray-300 rounded animate-pulse"></div>
                  <div className="h-6 w-24 bg-gray-300 rounded animate-pulse"></div>
                </div>
                <div className="h-6 w-96 bg-gray-300 rounded animate-pulse"></div>
                <div className="h-4 w-48 bg-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="h-10 w-32 bg-gray-300 rounded animate-pulse"></div>
                <div className="h-10 w-36 bg-gray-300 rounded animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Skeleton */}
        <div className="space-y-4">
          <div className="h-8 w-32 bg-gray-300 rounded animate-pulse"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="bg-white border-2 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-20 bg-gray-300 rounded animate-pulse"></div>
                      <div className="h-6 w-12 bg-gray-300 rounded animate-pulse"></div>
                    </div>
                    <div className="h-8 w-8 bg-gray-300 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Modules Section Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-8 w-48 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-4 w-32 bg-gray-300 rounded animate-pulse"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="bg-white border-2 border-gray-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 bg-gray-300 rounded-2xl animate-pulse"></div>
                      <div className="h-6 w-16 bg-gray-300 rounded animate-pulse"></div>
                    </div>
                    <div className="h-6 w-40 bg-gray-300 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-full bg-gray-300 rounded animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-gray-300 rounded animate-pulse"></div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-4 w-20 bg-gray-300 rounded animate-pulse"></div>
                      ))}
                    </div>
                    <div className="h-10 w-full bg-gray-300 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            {/* Recent Activity Skeleton */}
            <Card className="h-full">
              <CardHeader className="pb-4">
                <div className="h-6 w-32 bg-gray-300 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-48 bg-gray-300 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg border border-gray-100">
                    <div className="h-8 w-8 bg-gray-300 rounded-lg animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-300 rounded animate-pulse"></div>
                      <div className="h-3 w-full bg-gray-300 rounded animate-pulse"></div>
                      <div className="h-3 w-1/2 bg-gray-300 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* Quick Actions Skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-6 w-24 bg-gray-300 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-gray-300 rounded-lg animate-pulse"></div>
                      <div className="space-y-1">
                        <div className="h-4 w-24 bg-gray-300 rounded animate-pulse"></div>
                        <div className="h-3 w-32 bg-gray-300 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};










