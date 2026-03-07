'use client';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
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
  Target
} from "lucide-react";

/**
 * Blocking Page: /blocking
 * 
 * await data xong mới render
 * - Dashboard cần full data
 * - Course page cần complete information
 * - Admin panel cần all statistics
 * 
 * Use cases:
 * - Main dashboard
 * - Course detail pages
 * - Admin statistics
 * - User profile pages
 */

export default async function BlockingPage() {
  const { t } = useLanguage();
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  // Blocking operation: Fetch user data
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: true, 
      schoolId: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // Blocking operation: Fetch all dashboard data
  const [
    courses,
    assignments,
    quizzes,
    students,
    stats
  ] = await Promise.all([
    // Fetch courses
    db.course.findMany({
      where: { schoolId: user.schoolId },
      include: {
        teacher: { select: { name: true, email: true } },
        _count: { select: { students: true, assignments: true, quizzes: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    
    // Fetch assignments
    db.assignment.findMany({
      where: { course: { schoolId: user.schoolId } },
      include: {
        course: { select: { title: true } },
        _count: { select: { submissions: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    }),
    
    // Fetch quizzes
    db.quiz.findMany({
      where: { course: { schoolId: user.schoolId } },
      include: {
        course: { select: { title: true } },
        _count: { select: { attempts: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    
    // Fetch students
    db.user.findMany({
      where: { 
        schoolId: user.schoolId,
        role: 'STUDENT'
      },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    
    // Calculate statistics
    db.$transaction([
      db.course.count({ where: { schoolId: user.schoolId } }),
      db.assignment.count({ where: { course: { schoolId: user.schoolId } } }),
      db.quiz.count({ where: { course: { schoolId: user.schoolId } } }),
      db.user.count({ where: { schoolId: user.schoolId, role: 'STUDENT' } }),
      db.user.count({ where: { schoolId: user.schoolId, role: 'TEACHER' } })
    ])
  ]);

  // Blocking operation: Process and transform data
  const [totalCourses, totalAssignments, totalQuizzes, totalStudents, totalTeachers] = stats;
  
  const dashboardStats = {
    totalCourses,
    totalAssignments,
    totalQuizzes,
    totalStudents,
    totalTeachers,
    completionRate: totalStudents > 0 ? Math.round((totalAssignments / (totalStudents * totalCourses)) * 100) : 0,
    averageScore: 85, // Mock data - would be calculated from actual submissions
    activeUsers: Math.round(totalStudents * 0.7) // Mock data - would be calculated from recent activity
  };

  const recentActivity = [
    ...courses.slice(0, 3).map(course => ({
      type: 'course' as const,
      title: course.title,
      description: `New course created by ${course.teacher.name}`,
      timestamp: course.createdAt,
      icon: BookOpen
    })),
    ...assignments.slice(0, 3).map(assignment => ({
      type: 'assignment' as const,
      title: assignment.title,
      description: `Assignment in ${assignment.course.title}`,
      timestamp: assignment.createdAt,
      icon: FileText
    })),
    ...quizzes.slice(0, 3).map(quiz => ({
      type: 'quiz' as const,
      title: quiz.title,
      description: `Quiz in ${quiz.course.title}`,
      timestamp: quiz.createdAt,
      icon: Brain
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 6);

  // Blocking operation: Calculate performance metrics
  const performanceMetrics = {
    coursesCompleted: Math.round(totalCourses * 0.8),
    assignmentsSubmitted: Math.round(totalAssignments * 0.75),
    quizzesTaken: Math.round(totalQuizzes * 0.9),
    averageCompletionTime: '2.5 hours',
    successRate: 92
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard - {user.name}
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening in your LMS.
          </p>
        
              <LanguageSwitcherCompact /></div>
        <div className="flex items-center space-x-2">
          <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}>
            {user.role}
          </Badge>
          <Badge variant="outline">
            {user.schoolId}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              +{courses.filter(c => c.status === 'published').length} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboardStats.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground">
              {performanceMetrics.successRate}% success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Courses Completed</span>
              <span className="text-sm text-muted-foreground">
                {performanceMetrics.coursesCompleted}/{dashboardStats.totalCourses}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Assignments Submitted</span>
              <span className="text-sm text-muted-foreground">
                {performanceMetrics.assignmentsSubmitted}/{dashboardStats.totalAssignments}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quizzes Taken</span>
              <span className="text-sm text-muted-foreground">
                {performanceMetrics.quizzesTaken}/{dashboardStats.totalQuizzes}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Completion Time</span>
              <span className="text-sm text-muted-foreground">
                {performanceMetrics.averageCompletionTime}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Teachers</span>
              <span className="text-sm text-muted-foreground">
                {dashboardStats.totalTeachers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Users</span>
              <span className="text-sm text-muted-foreground">
                {dashboardStats.activeUsers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completion Rate</span>
              <span className="text-sm text-muted-foreground">
                {dashboardStats.completionRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Success Rate</span>
              <span className="text-sm text-muted-foreground">
                {performanceMetrics.successRate}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.slice(0, 4).map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <activity.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    {activity.timestamp.toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Courses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Courses</CardTitle>
          <CardDescription>
            Latest courses in your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courses.slice(0, 5).map((course) => (
              <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">{course.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      by {course.teacher.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {course._count.students} students
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {course._count.assignments} assignments
                    </div>
                  </div>
                  <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                    {course.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Students */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Students</CardTitle>
          <CardDescription>
            Newly registered students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.slice(0, 5).map((student) => (
              <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {student.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {student.email}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Joined {student.createdAt.toLocaleDateString()}
                  </div>
                  <Badge variant="outline">STUDENT</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
