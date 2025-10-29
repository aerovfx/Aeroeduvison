'use client';

import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Users, 
  FileText, 
  Brain, 
  Clock, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Target,
  Loader2,
  RefreshCw,
  Zap
} from "lucide-react";
import InstantComponent from "@/components/InstantComponent";
import SlowComponent from "@/components/SlowComponent";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

/**
 * Streaming Page: /streaming
 * 
 * <Suspense> lazy-load component nặng
 * - Dashboard lazy-load charts
 * - AI recommendations streaming
 * - Real-time data updates
 * 
 * Use cases:
 * - Dashboard with heavy components
 * - AI-powered recommendations
 * - Real-time analytics
 * - Progressive data loading
 */

export default async function StreamingPage() {
  const { t } = useLanguage();
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  // Instant data - load immediately
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: true, 
      schoolId: true
    }
  });

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div className="space-y-6">
      {/* Header - Instant */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Streaming Dashboard - {user.name}
          </h1>
          <p className="text-muted-foreground">
            Real-time data with progressive loading
          </p>
        
              <LanguageSwitcherCompact /></div>
        <div className="flex items-center space-x-2">
          <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}>
            {user.role}
          </Badge>
          <Badge variant="outline">
            <Zap className="mr-1 h-3 w-3" />
            Streaming
          </Badge>
        </div>
      </div>

      {/* Instant Components - Load immediately */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InstantComponent 
          title="Quick Stats"
          description="Basic statistics"
          user={user}
        />
        <InstantComponent 
          title="Recent Activity"
          description="Latest updates"
          user={user}
        />
        <InstantComponent 
          title={t('dashboard.notifications')}
          description="System alerts"
          user={user}
        />
        <InstantComponent 
          title={t('dashboard.quick-actions')}
          description="Common tasks"
          user={user}
        />
      </div>

      {/* Slow Components - Lazy load with Suspense */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* AI Recommendations - Heavy component */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              Personalized suggestions based on your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading AI recommendations...</span>
              </div>
            }>
              <SlowComponent 
                type="ai_recommendations"
                user={user}
              />
            </Suspense>
          </CardContent>
        </Card>

        {/* Analytics Charts - Heavy component */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Analytics Dashboard
            </CardTitle>
            <CardDescription>
              Detailed performance metrics and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading analytics...</span>
              </div>
            }>
              <SlowComponent 
                type="analytics"
                user={user}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Data Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="mr-2 h-5 w-5" />
            Real-time Data Stream
          </CardTitle>
          <CardDescription>
            Live updates from your LMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Connecting to data stream...</span>
            </div>
          }>
            <SlowComponent 
              type="real_time_stream"
              user={user}
            />
          </Suspense>
        </CardContent>
      </Card>

      {/* Progressive Loading Sections */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Course Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Course Recommendations
            </CardTitle>
            <CardDescription>
              Suggested courses for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </div>
            }>
              <SlowComponent 
                type="course_recommendations"
                user={user}
              />
            </Suspense>
          </CardContent>
        </Card>

        {/* Assignment Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Assignment Progress
            </CardTitle>
            <CardDescription>
              Your current assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </div>
            }>
              <SlowComponent 
                type="assignment_progress"
                user={user}
              />
            </Suspense>
          </CardContent>
        </Card>

        {/* Quiz Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5" />
              Quiz Performance
            </CardTitle>
            <CardDescription>
              Your quiz results and trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </div>
            }>
              <SlowComponent 
                type="quiz_performance"
                user={user}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Streaming Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Streaming Controls</CardTitle>
          <CardDescription>
            Manage real-time data updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh All
            </Button>
            <Button variant="outline" size="sm">
              <Zap className="mr-2 h-4 w-4" />
              Toggle Stream
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
