"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DataSyncStatus } from "@/components/data-sync-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  Users, 
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  Star,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Plus,
  Award,
  FileText,
  Play,
  GraduationCap,
  Zap,
  Kanban,
  StickyNote,
  Heart,
  Smile,
  ThumbsUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [showDataSync, setShowDataSync] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  // Mock data for metrics
  const metrics = [
    {
      title: "Today",
      value: 25,
      label: "Due Tasks",
      subtitle: "Completed: 7",
      icon: Clock,
      color: "text-blue-600"
    },
    {
      title: "Overdue",
      value: 4,
      label: "Tasks",
      subtitle: "Yesterday's overdue: 2",
      icon: AlertCircle,
      color: "text-red-600"
    },
    {
      title: "Issues",
      value: 32,
      label: "Open",
      subtitle: "Closed today: 0",
      icon: AlertCircle,
      color: "text-orange-600"
    },
    {
      title: "Features",
      value: 42,
      label: "Proposals",
      subtitle: "Implemented: 8",
      icon: Lightbulb,
      color: "text-green-600"
    }
  ];

  // Mock data for overview
  const overviewData = [
    { label: "New Issues", value: 214, trend: "+12%" },
    { label: "Closed", value: 75, trend: "-5%" }
  ];

  // Mock data for user list with full names for kids
  const users = [
    { id: 1, name: "Minh", avatar: null, messages: 2, online: true, fullName: "Minh Anh" },
    { id: 2, name: "Duy", avatar: null, messages: 1, online: true, fullName: "Duy Khang" },
    { id: 3, name: "Mai", avatar: null, messages: 0, online: false, fullName: "Mai Linh" },
    { id: 4, name: "Tuấn", avatar: null, messages: 0, online: true, fullName: "Tuấn Anh" },
    { id: 5, name: "An", avatar: null, messages: 3, online: true, fullName: "An Nhiên" },
    { id: 6, name: "Sơn", avatar: null, messages: 0, online: false, fullName: "Sơn Tùng" },
    { id: 7, name: "Jin", avatar: null, messages: 1, online: true, fullName: "Jin Woo" },
    { id: 8, name: "Kai", avatar: null, messages: 0, online: true, fullName: "Kai Chen" }
  ];

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setIsChatOpen(true);
    toast.success(`Bắt đầu chat với ${user.fullName}! 💬`);
  };

  const handleSendMessage = () => {
    if (chatMessage.trim() && selectedUser) {
      toast.success(`Đã gửi tin nhắn cho ${selectedUser.fullName}: "${chatMessage}"`);
      setChatMessage("");
      setIsChatOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar - Simplified for Kids */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">🎓</span>
              </div>
              <span className="font-bold text-lg">Học Tập Vui Vẻ</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <Bell className="h-4 w-4" />
              <Badge className="ml-1 h-5 w-5 text-xs bg-red-500">2</Badge>
            </Button>
            <Avatar className="h-8 w-8 border-2 border-white">
              <AvatarImage src="/avatars/user.jpg" />
              <AvatarFallback className="bg-white text-blue-600">U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <nav className="text-sm text-gray-500">
              Home &gt; Dashboards &gt; Project
            </nav>
          </div>

          {/* Welcome Header - Kid Friendly */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Chào mừng trở lại, {session.user.name}! 🌟
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Bạn có 2 tin nhắn mới và 15 nhiệm vụ cần làm
                  </p>
                </div>
                <Avatar className="h-16 w-16 border-4 border-blue-200">
                  <AvatarImage src="/avatars/student.jpg" />
                  <AvatarFallback className="text-lg bg-blue-100 text-blue-600">
                    {session.user.name?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex items-center space-x-3">
                <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 flex items-center space-x-2">
                  <Heart className="h-4 w-4" />
                  <span>Yêu thích</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2 border-blue-200 text-blue-600 hover:bg-blue-50">
                  <Settings className="h-4 w-4" />
                  <span>Cài đặt</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs Navigation - Kid Friendly */}
          <div className="mb-8">
            <Tabs defaultValue="home" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-blue-50">
                <TabsTrigger value="home" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">🏠 Trang chủ</TabsTrigger>
                <TabsTrigger value="learning" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">📚 Học tập</TabsTrigger>
                <TabsTrigger value="friends" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">👥 Bạn bè</TabsTrigger>
              </TabsList>
              
              <TabsContent value="home" className="mt-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {metrics.map((metric, index) => (
                    <Card key={index} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-gray-600">
                            {metric.title}
                          </CardTitle>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <metric.icon className={`h-5 w-5 ${metric.color}`} />
                            <span className="text-3xl font-bold">{metric.value}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{metric.label}</p>
                            <p className="text-xs text-gray-500">{metric.subtitle}</p>
                          </div>
                        </div>
                        {index === 3 && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 rounded-r-lg"></div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Charts and Overview Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* GitHub Issues Summary */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Github Issues Summary</CardTitle>
                            <p className="text-sm text-gray-600">New vs. Closed</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">This Week</Button>
                            <Button variant="ghost" size="sm">Last Week</Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-gray-400 mb-2">42</div>
                            <div className="text-sm text-gray-500">Issues Chart</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Overview */}
                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle>Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {overviewData.map((item, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.label}</span>
                              <span className={`text-sm flex items-center ${
                                item.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {item.trend.startsWith('+') ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {item.trend}
                              </span>
                            </div>
                            <div className="text-2xl font-bold">{item.value}</div>
                            <Progress value={index === 0 ? 75 : 45} className="h-2" />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Learning Progress Section - Kid Friendly */}
                <div className="mt-8">
                  <Card className="border-2 border-blue-200">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <CardTitle className="text-xl text-blue-800">🎯 Hoạt động học tập</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link href="/dashboard/learning" className="block">
                          <div className="flex items-center gap-3 p-4 border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group">
                            <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                              <GraduationCap className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-bold text-blue-800">📚 Học tập</p>
                              <p className="text-sm text-blue-600">Lộ trình học tập</p>
                            </div>
                          </div>
                        </Link>
                        
                        <Link href="/dashboard/quizzes" className="block">
                          <div className="flex items-center gap-3 p-4 border-2 border-orange-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer group">
                            <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                              <FileText className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-bold text-orange-800">🧩 Làm bài kiểm tra</p>
                              <p className="text-sm text-orange-600">Bắt đầu quiz</p>
                            </div>
                          </div>
                        </Link>
                        
                        <Link href="/dashboard/courses" className="block">
                          <div className="flex items-center gap-3 p-4 border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-300 hover:shadow-lg transition-all cursor-pointer group">
                            <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                              <BookOpen className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <p className="font-bold text-green-800">📖 Khóa học</p>
                              <p className="text-sm text-green-600">Xem tất cả khóa học</p>
                            </div>
                          </div>
                        </Link>
                        
                        <Link href="/dashboard/assignments" className="block">
                          <div className="flex items-center gap-3 p-4 border-2 border-purple-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer group">
                            <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                              <Award className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-bold text-purple-800">🏆 Bài tập</p>
                              <p className="text-sm text-purple-600">Xem bài tập</p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="learning" className="mt-6">
                <Card className="border-2 border-green-200">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                    <CardTitle className="text-xl text-green-800">📚 Trung tâm học tập</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🎓</div>
                      <h3 className="text-2xl font-bold text-green-800 mb-2">Chào mừng đến với trung tâm học tập!</h3>
                      <p className="text-green-600">Hãy chọn hoạt động học tập yêu thích của bạn</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="friends" className="mt-6">
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardTitle className="text-xl text-purple-800">👥 Bạn bè và cộng đồng</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🤝</div>
                      <h3 className="text-2xl font-bold text-purple-800 mb-2">Kết nối với bạn bè!</h3>
                      <p className="text-purple-600">Xem danh sách bạn bè bên phải để bắt đầu chat</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Interactive User List */}
        <div className="w-20 bg-gradient-to-b from-blue-50 to-purple-50 border-l border-blue-200 flex flex-col items-center py-4 space-y-3">
          <div className="flex flex-col items-center space-y-2 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="hover:bg-blue-100"
              onClick={() => setShowDataSync(!showDataSync)}
            >
              <Settings className="h-4 w-4 text-blue-600" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-purple-100">
              <Users className="h-4 w-4 text-purple-600" />
            </Button>
          </div>
          
          <div className="flex-1 flex flex-col items-center space-y-3">
            <div className="text-xs text-gray-500 font-medium mb-2">👥 Bạn bè</div>
            {users.map((user) => (
              <div key={user.id} className="relative group">
                <button
                  onClick={() => handleUserClick(user)}
                  className="relative transition-transform hover:scale-110 active:scale-95"
                >
                    <Avatar className="h-12 w-12 border-2 border-white shadow-md hover:shadow-lg transition-shadow">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="text-sm bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 font-bold">
                        {user.name}
                      </AvatarFallback>
                    </Avatar>
                  {user.messages > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-500 animate-pulse">
                      {user.messages}
                    </Badge>
                  )}
                  {user.online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                  )}
                </button>
                {/* Tooltip */}
                <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {user.fullName}
                  {user.online ? " (Đang online)" : " (Offline)"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Chat với {selectedUser?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {selectedUser?.name}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedUser?.fullName}</p>
                <p className="text-sm text-gray-500">
                  {selectedUser?.online ? "🟢 Đang online" : "🔴 Offline"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Nhập tin nhắn của bạn..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button onClick={handleSendMessage} className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Gửi tin nhắn
                </Button>
                <Button variant="outline" onClick={() => setIsChatOpen(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Data Sync Status - Hidden by default, can be toggled */}
      {showDataSync && (
        <div className="fixed top-20 right-4 w-80 z-50">
          <DataSyncStatus />
        </div>
      )}

      {/* Bottom Action Bar - Kid Friendly */}
      <div className="fixed bottom-6 left-6 right-6 flex justify-between items-center">
        <div className="flex space-x-3">
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white">
            <Heart className="h-4 w-4 mr-2" />
            Yêu thích
          </Button>
          <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
            <BookOpen className="h-4 w-4 mr-2" />
            Hướng dẫn
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-8 h-8 bg-blue-500 rounded-full text-white text-sm flex items-center justify-center font-bold">🎓</div>
            <div className="w-8 h-8 bg-green-500 rounded-full text-white text-sm flex items-center justify-center font-bold">📚</div>
            <div className="w-8 h-8 bg-purple-500 rounded-full text-white text-sm flex items-center justify-center font-bold">🏆</div>
            <div className="w-8 h-8 bg-orange-500 rounded-full text-white text-sm flex items-center justify-center font-bold">⭐</div>
          </div>
          <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">19</Badge>
        </div>
      </div>
    </div>
  );
}