"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Users, Calendar, Clock, Search, Filter } from "lucide-react";

export default function CompetitionPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const competitions = [
    {
      id: "1",
      title: "Cuộc thi Lập trình Python",
      description: "Thử thách lập trình Python cho học sinh",
      status: "active",
      type: "programming",
      startDate: "2024-01-15",
      duration: 120,
      currentParticipants: 45,
      maxParticipants: 100,
      problems: [
        { id: "1", title: "Bài toán 1" },
        { id: "2", title: "Bài toán 2" },
        { id: "3", title: "Bài toán 3" }
      ],
      prizes: [
        { position: 1, value: "1,000,000 VNĐ" }
      ]
    },
    {
      id: "2", 
      title: "Cuộc thi Toán học",
      description: "Giải các bài toán khó",
      status: "upcoming",
      type: "mathematics",
      startDate: "2024-01-20",
      duration: 90,
      currentParticipants: 23,
      maxParticipants: 50,
      problems: [
        { id: "1", title: "Bài toán 1" },
        { id: "2", title: "Bài toán 2" }
      ],
      prizes: [
        { position: 1, value: "500,000 VNĐ" }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "ended":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "upcoming":
        return "Sắp diễn ra";
      case "active":
        return "Đang diễn ra";
      case "ended":
        return "Đã kết thúc";
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "programming":
        return "💻";
      case "mathematics":
        return "🧮";
      default:
        return "🏆";
    }
  };

  const handleJoinCompetition = async (competitionId: string) => {
    setLoading(competitionId);
    setSelectedCompetition(competitionId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const competition = competitions.find(c => c.id === competitionId);
    
    if (competition?.status === "upcoming") {
      alert(`✅ Đã đăng ký thành công cuộc thi: ${competition.title}\n📅 Ngày bắt đầu: ${new Date(competition.startDate).toLocaleDateString('vi-VN')}\n⏰ Thời gian: ${competition.duration} phút`);
    } else if (competition?.status === "active") {
      alert(`🚀 Bắt đầu tham gia cuộc thi: ${competition.title}\n⏰ Thời gian còn lại: ${competition.duration} phút\n📝 Số bài: ${competition.problems.length} bài`);
    }
    
    setLoading(null);
  };

  const handleViewDetails = (competitionId: string) => {
    const competition = competitions.find(c => c.id === competitionId);
    setSelectedCompetition(competitionId);
    
    if (competition) {
      alert(`📋 Chi tiết cuộc thi: ${competition.title}\n\n📝 Mô tả: ${competition.description}\n📅 Ngày: ${new Date(competition.startDate).toLocaleDateString('vi-VN')}\n⏰ Thời gian: ${competition.duration} phút\n👥 Thí sinh: ${competition.currentParticipants}/${competition.maxParticipants}\n🏆 Giải thưởng: ${competition.prizes[0]?.value || "Không có"}\n📊 Số bài: ${competition.problems.length} bài`);
    }
  };

  const handleShowLeaderboard = () => {
    setShowLeaderboard(true);
    alert(`🏆 BẢNG XẾP HẠNG\n\n🥇 1. Nguyễn Văn A - 950 điểm\n🥈 2. Trần Thị B - 890 điểm\n🥉 3. Lê Văn C - 850 điểm\n\n📊 Bạn đang xếp hạng #12 với 245 điểm\n🎯 Cần thêm 605 điểm để vào top 3!`);
  };

  const handleShowAchievements = () => {
    setShowAchievements(true);
    alert(`🏅 THÀNH TÍCH CỦA BẠN\n\n✅ Đã tham gia 3 cuộc thi\n🎯 Tổng điểm: 245 điểm\n📈 Xếp hạng: #12\n🔥 Streak: 7 ngày liên tiếp\n\n🏆 Thành tích gần đây:\n• Hoàn thành cuộc thi Python (120 điểm)\n• Top 10 cuộc thi Toán học (85 điểm)\n• Tham gia cuộc thi Lập trình (40 điểm)`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cuộc thi</h1>
            <p className="text-muted-foreground">
              Tham gia các cuộc thi lập trình và toán học
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShowLeaderboard}>
              <Trophy className="h-4 w-4 mr-2" />
              Bảng xếp hạng
            </Button>
            <Button variant="outline" size="sm" onClick={handleShowAchievements}>
              <Award className="h-4 w-4 mr-2" />
              Thành tích
            </Button>
          </div>
        </div>

        {/* My Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cuộc thi đã tham gia</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                +1 từ tháng trước
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng điểm</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">245</div>
              <p className="text-xs text-muted-foreground">
                +50 tuần này
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Xếp hạng</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#12</div>
              <p className="text-xs text-muted-foreground">
                +3 từ tuần trước
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">
                ngày liên tiếp
              </p>
            </CardContent>
          </Card>
        </div>

         {/* Competitions List */}
         <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
           {competitions.map((competition) => (
             <Card 
               key={competition.id} 
               className={`hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${
                 selectedCompetition === competition.id ? 'ring-2 ring-blue-500' : ''
               }`}
             >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getTypeIcon(competition.type)}</span>
                    <div>
                      <CardTitle className="text-lg">{competition.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {competition.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(competition.status)}>
                    {getStatusText(competition.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(competition.startDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{competition.duration} phút</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{competition.currentParticipants}/{competition.maxParticipants}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span>{competition.problems.length} bài</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Giải thưởng:</span>
                    <span className="font-medium text-yellow-600">
                      {competition.prizes[0]?.value || "Không có"}
                    </span>
                  </div>
                </div>

                 <div className="flex gap-2">
                   <Button 
                     className="flex-1"
                     onClick={() => handleJoinCompetition(competition.id)}
                     disabled={loading === competition.id}
                   >
                     {loading === competition.id ? (
                       <div className="flex items-center gap-2">
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                         Đang xử lý...
                       </div>
                     ) : (
                       competition.status === "upcoming" ? "Đăng ký" : "Tham gia"
                     )}
                   </Button>
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={() => handleViewDetails(competition.id)}
                     disabled={loading === competition.id}
                   >
                     Xem chi tiết
                   </Button>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
