"use client";

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
  Bell,
  Settings,
  Plus,
  Eye
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  schoolId: string;
}

interface InstantComponentProps {
  title: string;
  description: string;
  user: User;
}

/**
 * InstantComponent: Component render ngay, lightweight
 * 
 * - Render immediately without waiting
 * - Lightweight data
 * - No heavy computations
 * - Fast UI updates
 * 
 * Use cases:
 * - Quick stats
 * - Recent activity
 * - Notifications
 * - Quick actions
 */

export default function InstantComponent({ title, description, user }: InstantComponentProps) {
  // Mock instant data - would come from props or context
  const getInstantData = () => {
    switch (title) {
      case "Quick Stats":
        return {
          icon: TrendingUp,
          stats: [
            { label: "Active Courses", value: "12", color: "text-green-600" },
            { label: "Pending Tasks", value: "3", color: "text-yellow-600" },
            { label: "Messages", value: "7", color: "text-blue-600" },
            { label: "Notifications", value: "2", color: "text-red-600" }
          ]
        };
      
      case "Recent Activity":
        return {
          icon: Clock,
          activities: [
            { action: "Completed Quiz", course: "Math 101", time: "2 min ago" },
            { action: "Submitted Assignment", course: "Science", time: "1 hour ago" },
            { action: "Joined Course", course: "History", time: "3 hours ago" }
          ]
        };
      
      case "Notifications":
        return {
          icon: Bell,
          notifications: [
            { message: "New assignment posted", type: "info", time: "5 min ago" },
            { message: "Quiz deadline approaching", type: "warning", time: "1 hour ago" },
            { message: "Course material updated", type: "success", time: "2 hours ago" }
          ]
        };
      
      case "Quick Actions":
        return {
          icon: Settings,
          actions: [
            { label: "Create Course", icon: Plus, color: "bg-blue-500" },
            { label: "View Reports", icon: Eye, color: "bg-green-500" },
            { label: "Manage Users", icon: Users, color: "bg-purple-500" },
            { label: "Settings", icon: Settings, color: "bg-gray-500" }
          ]
        };
      
      default:
        return {
          icon: BookOpen,
          stats: [
            { label: "Default", value: "0", color: "text-gray-600" }
          ]
        };
    }
  };

  const data = getInstantData();
  const Icon = data.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Icon className="mr-2 h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {title === "Quick Stats" && (
          <div className="space-y-3">
            {data.stats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{stat.label}</span>
                <span className={`text-sm font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {title === "Recent Activity" && (
          <div className="space-y-3">
            {data.activities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.course}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {title === "Notifications" && (
          <div className="space-y-3">
            {data.notifications.map((notification, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`h-2 w-2 rounded-full mt-2 ${
                  notification.type === 'info' ? 'bg-blue-500' :
                  notification.type === 'warning' ? 'bg-yellow-500' :
                  notification.type === 'success' ? 'bg-green-500' : 'bg-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {title === "Quick Actions" && (
          <div className="grid grid-cols-2 gap-2">
            {data.actions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-auto p-3 flex flex-col items-center space-y-1"
              >
                <action.icon className="h-4 w-4" />
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
          </div>
        )}

        {/* User info for all components */}
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {user.role}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              Instant
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
