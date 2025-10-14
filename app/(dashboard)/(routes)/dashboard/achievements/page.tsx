"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Award, Target, Clock, BookOpen, Zap, Brain, Users, TrendingUp } from "lucide-react";

// Mock data - replace with real API calls
const mockAchievements = [
  {
    id: 1,
    name: "First Steps",
    description: "Complete your first course",
    icon: "🎓",
    category: "Learning",
    points: 100,
    earned: true,
    date: "2024-01-15",
    progress: 100,
    requirement: "Complete 1 course",
    current: 1,
    total: 1,
  },
  {
    id: 2,
    name: "Perfect Score",
    description: "Get 100% on any quiz",
    icon: "⭐",
    category: "Excellence",
    points: 150,
    earned: true,
    date: "2024-01-20",
    progress: 100,
    requirement: "Score 100% on any quiz",
    current: 1,
    total: 1,
  },
  {
    id: 3,
    name: "Week Warrior",
    description: "Study for 7 consecutive days",
    icon: "🔥",
    category: "Consistency",
    points: 200,
    earned: true,
    date: "2024-01-25",
    progress: 100,
    requirement: "Study 7 days in a row",
    current: 7,
    total: 7,
  },
  {
    id: 4,
    name: "LabTwin Master",
    description: "Complete 10 math courses",
    icon: "🧮",
    category: "Expertise",
    points: 500,
    earned: false,
    date: null,
    progress: 30,
    requirement: "Complete 10 math courses",
    current: 3,
    total: 10,
  },
  {
    id: 5,
    name: "Speed Learner",
    description: "Complete a course in under 3 days",
    icon: "⚡",
    category: "Speed",
    points: 300,
    earned: false,
    date: null,
    progress: 0,
    requirement: "Complete any course in 3 days",
    current: 0,
    total: 1,
  },
  {
    id: 6,
    name: "Quiz Champion",
    description: "Complete 50 quizzes",
    icon: "🏆",
    category: "Practice",
    points: 400,
    earned: false,
    date: null,
    progress: 24,
    requirement: "Complete 50 quizzes",
    current: 12,
    total: 50,
  },
  {
    id: 7,
    name: "Early Bird",
    description: "Study before 8 AM for 5 days",
    icon: "🌅",
    category: "Habits",
    points: 250,
    earned: false,
    date: null,
    progress: 60,
    requirement: "Study before 8 AM for 5 days",
    current: 3,
    total: 5,
  },
  {
    id: 8,
    name: "Social Learner",
    description: "Help 10 other students",
    icon: "🤝",
    category: "Community",
    points: 350,
    earned: false,
    date: null,
    progress: 20,
    requirement: "Help 10 other students",
    current: 2,
    total: 10,
  },
];

const categoryIcons = {
  Learning: BookOpen,
  Excellence: Star,
  Consistency: Clock,
  Expertise: Brain,
  Speed: Zap,
  Practice: Target,
  Habits: TrendingUp,
  Community: Users,
};

const categoryColors = {
  Learning: "bg-blue-100 text-blue-800 border-blue-200",
  Excellence: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Consistency: "bg-green-100 text-green-800 border-green-200",
  Expertise: "bg-purple-100 text-purple-800 border-purple-200",
  Speed: "bg-orange-100 text-orange-800 border-orange-200",
  Practice: "bg-red-100 text-red-800 border-red-200",
  Habits: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Community: "bg-pink-100 text-pink-800 border-pink-200",
};

export default function AchievementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/sign-in");
      return;
    }

    if (session.user.role !== "STUDENT") {
      router.push("/teacher/courses");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session || session.user.role !== "STUDENT") {
    return null;
  }

  const earnedAchievements = mockAchievements.filter(a => a.earned);
  const totalPoints = earnedAchievements.reduce((sum, a) => sum + a.points, 0);
  const earnedCount = earnedAchievements.length;
  const totalCount = mockAchievements.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-muted-foreground">Track your learning milestones</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalPoints}</div>
            <div className="text-sm text-muted-foreground">Total Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{earnedCount}/{totalCount}</div>
            <div className="text-sm text-muted-foreground">Achievements</div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Achievement Progress</CardTitle>
          <CardDescription>Your overall achievement completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Overall Progress</span>
              <span className="font-medium">{Math.round((earnedCount / totalCount) * 100)}%</span>
            </div>
            <Progress value={(earnedCount / totalCount) * 100} className="h-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{earnedCount}</div>
                <div className="text-sm text-muted-foreground">Earned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{totalCount - earnedCount}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalPoints}</div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{Math.round((earnedCount / totalCount) * 100)}%</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAchievements.map((achievement) => {
          const CategoryIcon = categoryIcons[achievement.category as keyof typeof categoryIcons];
          const categoryColorClass = categoryColors[achievement.category as keyof typeof categoryColors];
          
          return (
            <Card 
              key={achievement.id} 
              className={`transition-all duration-200 hover:shadow-lg ${
                achievement.earned 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl ${achievement.earned ? '' : 'grayscale opacity-60'}`}>
                      {achievement.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{achievement.name}</CardTitle>
                      <Badge className={`mt-1 ${categoryColorClass}`}>
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {achievement.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-yellow-600">{achievement.points}</div>
                    <div className="text-xs text-muted-foreground">points</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                
                {achievement.earned ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <Star className="h-4 w-4" />
                      <span className="text-sm font-medium">Earned on {achievement.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Completed!</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{achievement.current}/{achievement.total}</span>
                    </div>
                    <Progress value={achievement.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{achievement.requirement}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Achievements */}
      {earnedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
            <CardDescription>Your latest accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {earnedAchievements
                .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
                .slice(0, 3)
                .map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <p className="font-medium">{achievement.name}</p>
                      <p className="text-sm text-muted-foreground">Earned on {achievement.date}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-yellow-600">+{achievement.points}</div>
                      <div className="text-xs text-muted-foreground">points</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


