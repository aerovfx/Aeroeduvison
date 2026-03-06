"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Award,
  TrendingUp,
  Calendar,
  ArrowRight,
  Play,
  FileText,
  Target
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "course_completed" | "course_started" | "chapter_completed" | "achievement" | "goal_set";
  title: string;
  description: string;
  timestamp: string;
  courseTitle?: string;
  chapterTitle?: string;
  xp?: number;
  icon: any;
  color: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  maxItems?: number;
}

export const RecentActivity = ({ activities, maxItems = 5 }: RecentActivityProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "course_completed":
        return { icon: Award, color: "text-green-600", bgColor: "bg-green-100" };
      case "course_started":
        return { icon: Play, color: "text-blue-600", bgColor: "bg-blue-100" };
      case "chapter_completed":
        return { icon: CheckCircle, color: "text-purple-600", bgColor: "bg-purple-100" };
      case "achievement":
        return { icon: Award, color: "text-yellow-600", bgColor: "bg-yellow-100" };
      case "goal_set":
        return { icon: Target, color: "text-orange-600", bgColor: "bg-orange-100" };
      default:
        return { icon: FileText, color: "text-gray-600", bgColor: "bg-gray-100" };
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case "course_completed":
        return { text: "Hoàn thành", color: "bg-green-100 text-green-800" };
      case "course_started":
        return { text: "Bắt đầu", color: "bg-blue-100 text-blue-800" };
      case "chapter_completed":
        return { text: "Chương", color: "bg-purple-100 text-purple-800" };
      case "achievement":
        return { text: "Thành tích", color: "bg-yellow-100 text-yellow-800" };
      case "goal_set":
        return { text: "Mục tiêu", color: "bg-orange-100 text-orange-800" };
      default:
        return { text: "Hoạt động", color: "bg-gray-100 text-gray-800" };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Vừa xong";
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`;
    return `${Math.floor(diffInMinutes / 1440)} ngày trước`;
  };

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Hoạt động gần đây
            </CardTitle>
            <CardDescription>
              Theo dõi tiến độ học tập của bạn
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Xem tất cả
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {displayedActivities.length > 0 ? (
          displayedActivities.map((activity) => {
            const iconInfo = getActivityIcon(activity.type);
            const badgeInfo = getActivityBadge(activity.type);
            const Icon = iconInfo.icon;

            return (
              <div 
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 group"
              >
                <div className={`p-2 rounded-lg ${iconInfo.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`h-4 w-4 ${iconInfo.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      {activity.courseTitle && (
                        <p className="text-xs text-gray-500 mt-1">
                          Khóa học: {activity.courseTitle}
                        </p>
                      )}
                      {activity.chapterTitle && (
                        <p className="text-xs text-gray-500 mt-1">
                          Chương: {activity.chapterTitle}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`text-xs ${badgeInfo.color}`}>
                        {badgeInfo.text}
                      </Badge>
                      {activity.xp && (
                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                          <Award className="h-3 w-3" />
                          <span>+{activity.xp} XP</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Chưa có hoạt động nào</h3>
            <p className="text-sm text-gray-600 mb-4">
              Bắt đầu học để xem hoạt động của bạn ở đây
            </p>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <BookOpen className="h-4 w-4 mr-2" />
              Khám phá khóa học
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
