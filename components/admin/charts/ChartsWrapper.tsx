"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Dynamic import với loading fallback
const AdminCharts = dynamic(() => import('./AdminCharts'), {
  loading: () => (
    <Card className="p-6">
      <CardContent className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading charts...</p>
        </div>
      </CardContent>
    </Card>
  ),
  ssr: false // Disable SSR cho charts để tránh hydration issues
});

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface ChartsWrapperProps {
  userStats: ChartData[];
  courseStats: ChartData[];
  revenueData: ChartData[];
  moduleStats: ChartData[];
}

export default function ChartsWrapper(props: ChartsWrapperProps) {
  return (
    <Suspense fallback={
      <Card className="p-6">
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading charts...</p>
          </div>
        </CardContent>
      </Card>
    }>
      <AdminCharts {...props} />
    </Suspense>
  );
}
