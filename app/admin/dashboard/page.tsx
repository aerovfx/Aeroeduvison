'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDataSync } from "@/contexts/DataSyncContext";
import { DataSyncStatus } from "@/components/data-sync-status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import cho charts để tối ưu performance
const ChartsWrapper = dynamic(() => import('@/components/admin/charts/ChartsWrapper'), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading charts...</p>
      </div>
    </div>
  ),
  ssr: false
});
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Award, 
  Star,
  Target,
  CheckCircle,
  AlertCircle,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  Upload,
  FileText,
  Send,
  ClipboardCheck,
  FileEdit,
  HelpCircle, 
  Video, 
  Image,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Shield,
  Settings,
  Database,
  Server,
  Activity,
  Zap,
  Globe,
  Lock,
  UserCheck,
  GraduationCap,
  RefreshCw
} from "lucide-react";

// Mock data for admin dashboard
const mockAdminData = {
  overview: {
    totalUsers: 1250,
    totalCourses: 45,
    totalRevenue: 125431.89,
    systemUptime: 99.9,
    activeModules: 8,
    totalModules: 10,
    newUsers: 234,
    pendingApprovals: 45,
    systemStatus: "Healthy"
  },
  modules: [
    {
      id: "user-management",
      name: "User Management",
      description: "Quản lý người dùng, phân quyền và xác thực",
      icon: Users,
      status: "active",
      subscription: "premium",
      price: 99,
      period: "month",
      usage: 95,
      users: 1250,
      features: ["User Registration", "Role Management", "Authentication", "Profile Management"],
      lastUpdated: "2024-01-27",
      category: "Core"
    },
    {
      id: "course-management",
      name: "Course Management", 
      description: "Tạo và quản lý khóa học, nội dung học tập",
      icon: BookOpen,
      status: "active",
      subscription: "basic",
      price: 49,
      period: "month",
      usage: 78,
      users: 980,
      features: ["Course Creation", "Content Management", "Progress Tracking", "Certificates"],
      lastUpdated: "2024-01-26",
      category: "Core"
    },
    {
      id: "quiz-system",
      name: "Quiz System",
      description: "Hệ thống tạo và quản lý bài kiểm tra, đánh giá",
      icon: HelpCircle,
      status: "active",
      subscription: "basic",
      price: 39,
      period: "month", 
      usage: 60,
      users: 750,
      features: ["Quiz Creation", "Auto Grading", "Analytics", "PDF Import"],
      lastUpdated: "2024-01-25",
      category: "Assessment"
    },
    {
      id: "assignment-system",
      name: "Assignment System",
      description: "Quản lý bài tập, dự án và đánh giá học sinh",
      icon: FileEdit,
      status: "active",
      subscription: "basic",
      price: 29,
      period: "month",
      usage: 52,
      users: 650,
      features: ["Assignment Creation", "Submission Tracking", "Grading Tools", "Rubrics"],
      lastUpdated: "2024-01-24",
      category: "Assessment"
    },
    {
      id: "video-platform",
      name: "Video Platform",
      description: "Nền tảng video học tập với streaming và analytics",
      icon: Video,
      status: "active",
      subscription: "premium",
      price: 199,
      period: "month",
      usage: 46,
      users: 580,
      features: ["Video Streaming", "Analytics", "Transcriptions", "Interactive Elements"],
      lastUpdated: "2024-01-23",
      category: "Media"
    },
    {
      id: "learning-path",
      name: "Learning Path",
      description: "Tạo lộ trình học tập cá nhân hóa cho học sinh",
      icon: Target,
      status: "active",
      subscription: "premium",
      price: 149,
      period: "month",
      usage: 34,
      users: 420,
      features: ["Path Creation", "Adaptive Learning", "Progress Tracking", "AI Recommendations"],
      lastUpdated: "2024-01-22",
      category: "AI"
    },
    {
      id: "live-chat",
      name: "Live Chat",
      description: "Hệ thống chat trực tiếp và hỗ trợ học sinh",
      icon: Send,
      status: "maintenance",
      subscription: "basic",
      price: 19,
      period: "month",
      usage: 26,
      users: 320,
      features: ["Real-time Chat", "File Sharing", "Chat History", "Moderation Tools"],
      lastUpdated: "2024-01-21",
      category: "Communication"
    },
    {
      id: "competition",
      name: "Competition",
      description: "Tổ chức cuộc thi và gamification cho học sinh",
      icon: Award,
      status: "active",
      subscription: "premium",
      price: 79,
      period: "month",
      usage: 22,
      users: 280,
      features: ["Tournament Creation", "Leaderboards", "Rewards System", "Analytics"],
      lastUpdated: "2024-01-20",
      category: "Gamification"
    },
    {
      id: "stem-projects",
      name: "STEM Projects",
      description: "Quản lý dự án STEM và thí nghiệm ảo",
      icon: Zap,
      status: "inactive",
      subscription: "premium",
      price: 299,
      period: "month",
      usage: 0,
      users: 0,
      features: ["Virtual Labs", "3D Simulations", "Project Templates", "Collaboration Tools"],
      lastUpdated: "2024-01-19",
      category: "STEM"
    },
    {
      id: "calendar",
      name: "Calendar",
      description: "Quản lý lịch học và sự kiện",
      icon: Calendar,
      status: "active",
      subscription: "basic",
      price: 29,
      period: "month",
      usage: 15,
      users: 120,
      features: ["Event Scheduling", "Class Timetables", "Notifications", "Integration"],
      lastUpdated: "2024-01-18",
      category: "Management"
    }
  ],
  subscriptions: {
    basic: {
      name: "Basic Plan",
      price: 29,
      period: "month",
      features: ["Course Management", "Quiz System", "Assignment System", "Live Chat", "Calendar"],
      maxUsers: 100,
      maxStorage: "10GB"
    },
    premium: {
      name: "Premium Plan", 
      price: 99,
      period: "month",
      features: ["All Basic Features", "User Management", "Video Platform", "Learning Path", "Competition"],
      maxUsers: 500,
      maxStorage: "50GB"
    },
    enterprise: {
      name: "Enterprise Plan",
      price: 299,
      period: "month", 
      features: ["All Premium Features", "STEM Projects", "Custom Integrations", "24/7 Support", "Advanced Analytics"],
      maxUsers: "Unlimited",
      maxStorage: "500GB"
    }
  },
  recentActivity: [
    {
      id: 1,
      type: "Module Toggle",
      module: "Live Chat",
      user: "Admin User",
      action: "Disabled for maintenance",
      timestamp: "2024-01-27 14:30",
      status: "Completed"
    },
    {
      id: 2,
      type: "Subscription Update",
      module: "User Management",
      user: "Admin User", 
      action: "Upgraded to Premium",
      timestamp: "2024-01-27 13:45",
      status: "Completed"
    },
    {
      id: 3,
      type: "System Update",
      module: "Quiz System",
      user: "System Admin",
      action: "Updated to v2.1.0",
      timestamp: "2024-01-27 12:20",
      status: "Completed"
    },
    {
      id: 4,
      type: "New Subscription",
      module: "STEM Projects",
      user: "Admin User",
      action: "Enterprise plan activated",
      timestamp: "2024-01-27 11:15",
      status: "Pending"
    }
  ]
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const { 
    syncData, 
    syncAllData, 
    isLoading, 
    activeModules, 
    setModuleActive, 
    toggleModule, 
    isModuleActive 
  } = useDataSync();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("modules");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stats, setStats] = useState({
    users: {
      total: 0,
      active: 0,
      teachers: 0,
      admins: 0
    },
    courses: {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
      totalStudents: 0,
      totalRevenue: 0,
      averageRating: 0,
      totalPurchases: 0
    },
    modules: {
      quizzes: 0,
      assignments: 0,
      videos: 0,
      attachments: 0,
      learningPaths: 0,
      liveChats: 0,
      competitions: 0,
      stemProjects: 0,
      calendar: 0
    }
  });
  const [modules, setModules] = useState(mockAdminData.modules);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/sign-in");
      return;
    }

    if (session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    // Sync data when component mounts
    syncAllData();
  }, [session, status, router]);

  // Fetch real statistics from database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  // Update stats when syncData changes
  useEffect(() => {
    if (syncData && Object.keys(syncData).length > 0) {
      setStats(prevStats => ({
        ...prevStats,
        users: {
          ...prevStats.users,
          total: syncData.users?.length || 0,
          active: syncData.users?.filter(u => u.role === 'STUDENT').length || 0,
          teachers: syncData.users?.filter(u => u.role === 'TEACHER').length || 0,
          admins: syncData.users?.filter(u => u.role === 'ADMIN').length || 0
        },
        courses: {
          ...prevStats.courses,
          total: syncData.courses?.length || 0,
          published: syncData.courses?.filter(c => c.status === 'published').length || 0,
          draft: syncData.courses?.filter(c => c.status === 'draft').length || 0
        },
        modules: {
          ...prevStats.modules,
          quizzes: syncData.quizzes?.length || 0,
          assignments: syncData.assignments?.length || 0,
          stemProjects: syncData.stemProjects?.length || 0,
          competitions: syncData.competitions?.length || 0
        }
      }));
    }
  }, [syncData]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  const { subscriptions, recentActivity } = mockAdminData;
  
  // Calculate dynamic overview based on module states and real database data
  const activeModulesCount = modules.filter(m => m.status === "active").length;
  const overview = {
    ...mockAdminData.overview,
    activeModules: activeModulesCount,
    totalModules: modules.length,
    systemStatus: activeModulesCount > 5 ? "Healthy" : t('common.warning'),
    systemUptime: activeModulesCount > 7 ? 99.9 : activeModulesCount > 5 ? 98.5 : 95.2,
    totalUsers: stats.users.total || 0,
    totalCourses: stats.courses.total || 0,
    totalRevenue: stats.courses.totalRevenue || 0,
    newUsers: Math.floor(stats.users.total * 0.1) || 0, // 10% of total as new users
    pendingApprovals: Math.floor(stats.courses.draft * 0.3) || 0 // 30% of drafts as pending
  };

  const toggleModuleStatus = (moduleId: string) => {
    // Use module management system
    const isActive = isModuleActive(moduleId);
    setModuleActive(moduleId, !isActive);
    
    // Update local state for immediate UI feedback
    setModules(prev => prev.map(module => 
      module.id === moduleId 
        ? { 
            ...module, 
            status: isActive ? "inactive" : "active"
          }
        : module
    ));
    
    // Show notification
    const selectedModule = modules.find(m => m.id === moduleId);
    if (selectedModule) {
      const action = isActive ? "disabled" : "enabled";
      alert(`Module "${selectedModule.name}" has been ${action}. System statistics updated.`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-600 bg-green-100";
      case "inactive": return "text-gray-600 bg-gray-100";
      case "maintenance": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getModuleStats = (moduleId: string) => {
    switch (moduleId) {
      case "user-management":
        return { count: stats.users.total, label: "users" };
      case "course-management":
        return { count: stats.courses.total, label: "courses" };
      case "quiz-system":
        return { count: stats.modules.quizzes, label: "quizzes" };
      case "assignment-system":
        return { count: stats.modules.assignments, label: "assignments" };
      case "video-platform":
        return { count: stats.modules.videos, label: "videos" };
      case "learning-path":
        return { count: stats.modules.learningPaths, label: "paths" };
      case "live-chat":
        return { count: stats.modules.liveChats, label: "chats" };
      case "competition":
        return { count: stats.modules.competitions, label: "competitions" };
      case "stem":
        return { count: stats.modules.stemProjects, label: "projects" };
      case "calendar":
        return { count: stats.modules.calendar, label: "events" };
      default:
        return { count: 0, label: "items" };
    }
  };

  const getSubscriptionColor = (subscription: string) => {
    switch (subscription) {
      case "basic": return "text-blue-600 bg-blue-100";
      case "premium": return "text-purple-600 bg-purple-100";
      case "enterprise": return "text-orange-600 bg-orange-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const categories = ["all", ...Array.from(new Set(modules.map(m => m.category)))];
  
  const filteredModules = modules.filter(module => {
    const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || module.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncAllData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync Data'}
          </Button>
          <Badge variant="outline" className="text-xs">
            Last sync: {syncData.lastSync ? new Date(syncData.lastSync).toLocaleTimeString() : 'Never'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm" onClick={() => router.push("/admin/users")}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.total-users')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncData.users.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {syncData.users.filter(u => u.role === 'STUDENT').length} {t('common.students')} • {syncData.users.filter(u => u.role === 'TEACHER').length} {t('common.teachers')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.total-courses')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncData.courses.length}</div>
            <p className="text-xs text-muted-foreground">
              {syncData.courses.filter(c => c.status === 'published').length} {t('admin.published')} • {syncData.courses.filter(c => c.status === 'draft').length} {t('admin.draft')}
            </p>
          </CardContent>
        </Card>

          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.revenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalRevenue.toLocaleString()} VND</div>
            <p className="text-xs text-muted-foreground">
              {stats.courses.totalPurchases} {t('admin.courses-sold')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.active-modules')}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeModules}/{overview.totalModules}</div>
            <p className={`text-xs ${
              overview.systemStatus === "Healthy" 
                ? "text-green-600" 
                : overview.systemStatus === t('common.warning')
                ? "text-yellow-600"
                : "text-red-600"
            }`}>
              {overview.systemStatus === "Healthy" ? t('admin.system-healthy') : 
               overview.systemStatus === t('common.warning') ? t('admin.system-warning') : 
               t('admin.system-critical')}
            </p>
            </CardContent>
          </Card>

          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trạng thái hệ thống</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview.systemStatus}</div>
            <p className="text-xs text-muted-foreground">
              {overview.systemUptime}% uptime
            </p>
          </CardContent>
        </Card>
                </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-3">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">{t('settings.title')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Data Sync Status */}
          <DataSyncStatus />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.quick-actions')}</CardTitle>
                <CardDescription>Common admin tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start"
                  onClick={() => setSelectedTab("modules")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Modules
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setSelectedTab("subscriptions")}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Subscription Plans
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push("/admin/users")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setSelectedTab("activity")}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  View Activity
                </Button>
            </CardContent>
          </Card>

          <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system activities and events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {activity.type === "Module Toggle" ? "⚙️" : 
                           activity.type === "Subscription Update" ? "💰" :
                           activity.type === "System Update" ? "🔄" : "📦"}
                        </span>
                      </div>
                <div>
                        <p className="font-medium">{activity.type}</p>
                        <p className="text-sm text-muted-foreground">{activity.module}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={activity.status === "Completed" ? "default" : "secondary"}>
                        {activity.status}
                      </Badge>
                </div>
              </div>
                ))}
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Module Management</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search modules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </option>
                ))}
              </select>
            </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((module) => {
              const IconComponent = module.icon;
              return (
                <Card key={module.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{module.name}</CardTitle>
                          <Badge className={`mt-1 ${getStatusColor(module.status)}`}>
                            {module.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant={isModuleActive(module.id) ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleModuleStatus(module.id)}
                      >
                        {isModuleActive(module.id) ? "Disable" : "Enable"}
                      </Button>
                    </div>
                    <CardDescription className="text-sm">
                      {module.description}
                      <br />
                      <span className="text-blue-600 font-medium">
                        Hiện có: {getModuleStats(module.id).count} {getModuleStats(module.id).label}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Subscription:</span>
                      <Badge className={getSubscriptionColor(module.subscription)}>
                        {module.subscription}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <span className="font-semibold">
                        ${module.price}/{module.period}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Số lượng:</span>
                      <span className="font-semibold">{getModuleStats(module.id).count.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Loại:</span>
                      <span className="font-semibold capitalize">{getModuleStats(module.id).label}</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {module.features.slice(0, 2).map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {module.features.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{module.features.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Last updated: {module.lastUpdated}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Subscription Plans</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(subscriptions).map(([key, plan]) => (
              <Card key={key} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <Badge className={getSubscriptionColor(key)}>
                      {key.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold">
                    ${plan.price}
                    <span className="text-lg font-normal text-muted-foreground">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Features:</p>
                    <ul className="space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    </div>
                  
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Max Users:</span>
                      <span className="font-medium">{plan.maxUsers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Storage:</span>
                      <span className="font-medium">{plan.maxStorage}</span>
                    </div>
                  </div>

                  <Button className="w-full">
                    Choose {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">System Activity</h2>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
        </div>

          <Card>
                <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Detailed system activity and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Activity className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{activity.type}</h3>
                          <Badge variant={activity.status === "Completed" ? "default" : "secondary"}>
                            {activity.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.module}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.timestamp} • {activity.user}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">System Settings</h2>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system-name">System Name</Label>
                  <Input id="system-name" defaultValue="inPhysic LMS" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select id="timezone" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="UTC+7">UTC+7 (Vietnam)</option>
                    <option value="UTC+0">UTC+0 (GMT)</option>
                    <option value="UTC-5">UTC-5 (EST)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language</Label>
                  <select id="language" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Authentication and security configuration</CardDescription>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                    </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                    </div>
                  <select className="px-3 py-2 border border-gray-300 rounded-md">
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                  </select>
                    </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>API Rate Limiting</Label>
                    <p className="text-sm text-muted-foreground">Limit API requests per minute</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                </CardContent>
              </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">System Activity</h2>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Detailed system activity and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Activity className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{activity.type}</h3>
                          <Badge variant={activity.status === "Completed" ? "default" : "secondary"}>
                            {activity.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.user}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.timestamp}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
        </div>
      </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}