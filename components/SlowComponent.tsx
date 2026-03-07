"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Zap,
  Download,
  Upload,
  Eye,
  Star
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  schoolId: string;
}

interface SlowComponentProps {
  type: 'ai_recommendations' | 'analytics' | 'real_time_stream' | 'course_recommendations' | 'assignment_progress' | 'quiz_performance';
  user: User;
}

/**
 * SlowComponent: Component nặng, fetch nhiều data → Suspense
 * 
 * - Heavy data processing
 * - Complex computations
 * - Real-time updates
 * - AI-powered features
 * 
 * Use cases:
 * - AI recommendations
 * - Analytics charts
 * - Real-time data streams
 * - Complex reports
 */

export default function SlowComponent({ type, user }: SlowComponentProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [streamData, setStreamData] = useState<any[]>([]);

  useEffect(() => {
    // Simulate heavy data loading
    const loadData = async () => {
      setLoading(true);
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // Generate mock data based on type
      const mockData = generateMockData(type, user);
      setData(mockData);
      setProgress(100);
      setLoading(false);
    };

    loadData();
  }, [type, user]);

  // Real-time stream simulation
  useEffect(() => {
    if (type === 'real_time_stream') {
      const interval = setInterval(() => {
        const newData = {
          id: Date.now(),
          type: ['course', 'assignment', 'quiz', 'user'][Math.floor(Math.random() * 4)],
          message: `New ${['course', 'assignment', 'quiz', 'user'][Math.floor(Math.random() * 4)]} activity`,
          timestamp: new Date().toISOString(),
          value: Math.floor(Math.random() * 100)
        };
        
        setStreamData(prev => [newData, ...prev.slice(0, 9)]);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [type]);

  const generateMockData = (type: string, user: User) => {
    switch (type) {
      case 'ai_recommendations':
        return {
          recommendations: [
            {
              id: 1,
              title: "Advanced Mathematics",
              description: "Based on your performance in basic math",
              confidence: 95,
              reason: "High performance in related subjects",
              action: "Enroll Now"
            },
            {
              id: 2,
              title: "Data Science Fundamentals",
              description: "Perfect for your analytical skills",
              confidence: 87,
              reason: "Strong performance in statistics",
              action: "Learn More"
            },
            {
              id: 3,
              title: "Machine Learning Basics",
              description: "Next step in your learning journey",
              confidence: 82,
              reason: "Completed data science prerequisites",
              action: "View Details"
            }
          ]
        };

      case 'analytics':
        return {
          charts: [
            { name: "Course Completion", value: 85, color: "bg-blue-500" },
            { name: "Assignment Scores", value: 92, color: "bg-green-500" },
            { name: "Quiz Performance", value: 78, color: "bg-yellow-500" },
            { name: "Time Spent", value: 67, color: "bg-purple-500" }
          ],
          trends: [
            { month: "Jan", value: 65 },
            { month: "Feb", value: 72 },
            { month: "Mar", value: 78 },
            { month: "Apr", value: 85 },
            { month: "May", value: 92 },
            { month: "Jun", value: 88 }
          ]
        };

      case 'course_recommendations':
        return {
          courses: [
            {
              id: 1,
              title: "Advanced Calculus",
              instructor: "Dr. Smith",
              rating: 4.8,
              students: 1250,
              duration: "12 weeks",
              difficulty: "Advanced"
            },
            {
              id: 2,
              title: "Python Programming",
              instructor: "Prof. Johnson",
              rating: 4.6,
              students: 2100,
              duration: "8 weeks",
              difficulty: "Intermediate"
            },
            {
              id: 3,
              title: "Web Development",
              instructor: "Ms. Davis",
              rating: 4.9,
              students: 1800,
              duration: "10 weeks",
              difficulty: "Beginner"
            }
          ]
        };

      case 'assignment_progress':
        return {
          assignments: [
            {
              id: 1,
              title: "Math Problem Set 5",
              course: "Calculus I",
              dueDate: "2024-01-15",
              progress: 75,
              status: "In Progress"
            },
            {
              id: 2,
              title: "Research Paper",
              course: "English Literature",
              dueDate: "2024-01-20",
              progress: 45,
              status: "In Progress"
            },
            {
              id: 3,
              title: "Lab Report",
              course: "Chemistry",
              dueDate: "2024-01-18",
              progress: 100,
              status: "Completed"
            }
          ]
        };

      case 'quiz_performance':
        return {
          quizzes: [
            {
              id: 1,
              title: "Algebra Quiz 3",
              score: 85,
              maxScore: 100,
              attempts: 2,
              averageScore: 78,
              timeSpent: "25 minutes"
            },
            {
              id: 2,
              title: "History Midterm",
              score: 92,
              maxScore: 100,
              attempts: 1,
              averageScore: 88,
              timeSpent: "45 minutes"
            },
            {
              id: 3,
              title: "Science Quiz 1",
              score: 78,
              maxScore: 100,
              attempts: 3,
              averageScore: 82,
              timeSpent: "30 minutes"
            }
          ]
        };

      default:
        return { message: "No data available" };
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Loading {type.replace('_', ' ')}...</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="w-full" />
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {type === 'ai_recommendations' && (
        <div className="space-y-4">
          {data.recommendations.map((rec: any) => (
            <div key={rec.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{rec.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{rec.reason}</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge variant="outline">{rec.confidence}% match</Badge>
                  <Button size="sm" variant="outline">
                    {rec.action}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {data.charts.map((chart: any, index: number) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold">{chart.value}%</div>
                <div className="text-sm text-muted-foreground">{chart.name}</div>
                <div className={`h-2 rounded-full mt-2 ${chart.color}`} 
                     style={{ width: `${chart.value}%` }} />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Performance Trend</h4>
            <div className="flex items-end space-x-2 h-20">
              {data.trends.map((trend: any, index: number) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="bg-blue-500 rounded-t w-full"
                    style={{ height: `${trend.value}%` }}
                  />
                  <span className="text-xs mt-1">{trend.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {type === 'real_time_stream' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Live Updates</span>
            <Badge variant="outline" className="text-green-600">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse" />
              Live
            </Badge>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {streamData.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-2 border rounded">
                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <Badge variant="outline">{item.value}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'course_recommendations' && (
        <div className="space-y-3">
          {data.courses.map((course: any) => (
            <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold">{course.title}</h3>
                <p className="text-sm text-muted-foreground">by {course.instructor}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-500 mr-1" />
                    <span className="text-xs">{course.rating}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{course.students} students</span>
                  <span className="text-xs text-muted-foreground">{course.duration}</span>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Badge variant="outline">{course.difficulty}</Badge>
                <Button size="sm" variant="outline">
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'assignment_progress' && (
        <div className="space-y-3">
          {data.assignments.map((assignment: any) => (
            <div key={assignment.id} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{assignment.title}</h3>
                <Badge variant={assignment.status === 'Completed' ? 'default' : 'secondary'}>
                  {assignment.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{assignment.course}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>{assignment.progress}%</span>
                </div>
                <Progress value={assignment.progress} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'quiz_performance' && (
        <div className="space-y-3">
          {data.quizzes.map((quiz: any) => (
            <div key={quiz.id} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{quiz.title}</h3>
                <div className="text-right">
                  <div className="text-lg font-bold">{quiz.score}/{quiz.maxScore}</div>
                  <div className="text-xs text-muted-foreground">{quiz.attempts} attempts</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Average Score:</span>
                  <span className="ml-1 font-medium">{quiz.averageScore}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Time Spent:</span>
                  <span className="ml-1 font-medium">{quiz.timeSpent}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Component info */}
      <div className="pt-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {type.replace('_', ' ')} component
          </span>
          <Badge variant="outline" className="text-xs">
            <Zap className="mr-1 h-3 w-3" />
            Heavy
          </Badge>
        </div>
      </div>
    </div>
  );
}
