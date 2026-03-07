'use client';

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Users, 
  Search, 
  Filter, 
  MessageCircle, 
  Phone, 
  Mail, 
  UserPlus,
  GraduationCap,
  Clock,
  Star,
  MoreVertical,
  BookOpen,
  Heart
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Mock data for teachers
const mockTeachers = [
  {
    id: "1",
    name: "Nguyễn Văn An",
    email: "nguyen.an@aeroschool.edu.vn",
    phone: "+84 123 456 789",
    subjects: ["Toán học", "Vật lý"],
    experience: "5 năm",
    rating: 4.8,
    avatar: "/avatars/teacher1.jpg",
    status: "online",
    lastActive: "2 phút trước",
    department: "Khoa Toán-Lý",
    office: "Phòng 201A"
  },
  {
    id: "2", 
    name: "Trần Thị Bình",
    email: "tran.binh@aeroschool.edu.vn",
    phone: "+84 987 654 321",
    subjects: ["Hóa học", "Sinh học"],
    experience: "7 năm",
    rating: 4.9,
    avatar: "/avatars/teacher2.jpg",
    status: "away",
    lastActive: "15 phút trước",
    department: "Khoa Hóa-Sinh",
    office: "Phòng 302B"
  },
  {
    id: "3",
    name: "Lê Văn Cường",
    email: "le.cuong@aeroschool.edu.vn", 
    phone: "+84 555 123 456",
    subjects: ["Tiếng Anh", "Lịch sử"],
    experience: "3 năm",
    rating: 4.7,
    avatar: "/avatars/teacher3.jpg",
    status: "offline",
    lastActive: "1 giờ trước",
    department: "Khoa Ngoại ngữ",
    office: "Phòng 105C"
  },
  {
    id: "4",
    name: "Phạm Thị Dung",
    email: "pham.dung@aeroschool.edu.vn",
    phone: "+84 777 888 999",
    subjects: ["Địa lý", "Văn học"],
    experience: "6 năm", 
    rating: 4.9,
    avatar: "/avatars/teacher4.jpg",
    status: "online",
    lastActive: "5 phút trước",
    department: "Khoa Xã hội",
    office: "Phòng 208D"
  },
  {
    id: "5",
    name: "Hoàng Văn Em",
    email: "hoang.em@aeroschool.edu.vn",
    phone: "+84 333 444 555",
    subjects: ["Tin học", "Công nghệ"],
    experience: "4 năm",
    rating: 4.6,
    avatar: "/avatars/teacher5.jpg", 
    status: "busy",
    lastActive: "30 phút trước",
    department: "Khoa Công nghệ",
    office: "Phòng 401E"
  }
];

// Mock data for students
const mockStudents = [
  {
    id: "1",
    name: "Nguyễn Thị Lan",
    email: "nguyen.lan@student.aeroschool.edu.vn",
    phone: "+84 111 222 333",
    grade: "Lớp 10A1",
    subjects: ["Toán học", "Vật lý", "Hóa học"],
    parentName: "Nguyễn Văn Minh",
    parentPhone: "+84 444 555 666",
    avatar: "/avatars/student1.jpg",
    status: "online",
    lastActive: "1 phút trước",
    studentId: "HS001",
    address: "123 Đường ABC, Quận 1, TP.HCM"
  },
  {
    id: "2",
    name: "Trần Văn Nam", 
    email: "tran.nam@student.aeroschool.edu.vn",
    phone: "+84 777 888 999",
    grade: "Lớp 11B2",
    subjects: ["Tiếng Anh", "Lịch sử", "Địa lý"],
    parentName: "Trần Thị Hoa",
    parentPhone: "+84 222 333 444",
    avatar: "/avatars/student2.jpg",
    status: "away",
    lastActive: "10 phút trước",
    studentId: "HS002",
    address: "456 Đường XYZ, Quận 2, TP.HCM"
  },
  {
    id: "3",
    name: "Lê Thị Mai",
    email: "le.mai@student.aeroschool.edu.vn",
    phone: "+84 555 666 777",
    grade: "Lớp 12C3", 
    subjects: ["Văn học", "Toán học", "Sinh học"],
    parentName: "Lê Văn Đức",
    parentPhone: "+84 888 999 000",
    avatar: "/avatars/student3.jpg",
    status: "offline",
    lastActive: "2 giờ trước",
    studentId: "HS003",
    address: "789 Đường DEF, Quận 3, TP.HCM"
  },
  {
    id: "4",
    name: "Phạm Văn Hoàng",
    email: "pham.hoang@student.aeroschool.edu.vn",
    phone: "+84 999 888 777",
    grade: "Lớp 9D4",
    subjects: ["Toán học", "Vật lý", "Hóa học", "Sinh học"],
    parentName: "Phạm Thị Lan",
    parentPhone: "+84 111 222 333",
    avatar: "/avatars/student4.jpg",
    status: "online",
    lastActive: "3 phút trước",
    studentId: "HS004",
    address: "321 Đường GHI, Quận 4, TP.HCM"
  }
];

export default function ContactsModule() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("teachers");
  const [filterStatus, setFilterStatus] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/sign-in");
      return;
    }

    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('contact-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div>{t('common.loading')}</div>;
  }

  if (!session) {
    return null;
  }

  const toggleFavorite = (id: string) => {
    const newFavorites = favorites.includes(id) 
      ? favorites.filter(fav => fav !== id)
      : [...favorites, id];
    
    setFavorites(newFavorites);
    localStorage.setItem('contact-favorites', JSON.stringify(newFavorites));
  };

  const filteredTeachers = mockTeachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.subjects.some(subject => subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         teacher.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || teacher.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.subjects.some(subject => subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || student.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500"; 
      case "busy": return "bg-red-500";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online": return "Đang hoạt động";
      case "away": return "Tạm vắng";
      case "busy": return "Bận";
      case "offline": return "Không hoạt động";
      default: return "Không xác định";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            Danh bạ inPhysic
          </h1>
          <p className="text-muted-foreground">
            Kết nối và liên lạc với giáo viên, học sinh trong hệ thống
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Thêm liên hệ
          </Button>
          <Button className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Tin nhắn nhóm
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GraduationCap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Giáo viên</p>
                <p className="text-2xl font-bold">{mockTeachers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Học sinh</p>
                <p className="text-2xl font-bold">{mockStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="h-5 w-5 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Đang online</p>
                <p className="text-2xl font-bold">
                  {mockTeachers.filter(t => t.status === 'online').length + 
                   mockStudents.filter(s => s.status === 'online').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Yêu thích</p>
                <p className="text-2xl font-bold">{favorites.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Tìm kiếm liên hệ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Tìm theo tên, email, môn học, mã số..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Trạng thái
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                  Tất cả
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("online")}>
                  Đang hoạt động
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("away")}>
                  Tạm vắng
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("busy")}>
                  Bận
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus("offline")}>
                  Không hoạt động
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Giáo viên ({filteredTeachers.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Học sinh ({filteredStudents.length})
          </TabsTrigger>
        </TabsList>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => (
              <Card key={teacher.id} className={`hover:shadow-lg transition-all duration-200 ${favorites.includes(teacher.id) ? 'ring-2 ring-red-200' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {teacher.name.split(' ').pop()?.[0]}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(teacher.status)}`}></div>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{teacher.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {teacher.department}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(teacher.id)}
                        className={`p-1 ${favorites.includes(teacher.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                      >
                        <Heart className={`h-4 w-4 ${favorites.includes(teacher.id) ? 'fill-current' : ''}`} />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Nhắn tin
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Phone className="h-4 w-4 mr-2" />
                            Gọi điện
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Gửi email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{teacher.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{teacher.experience}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{teacher.rating}/5.0</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Văn phòng:</strong> {teacher.office}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects.map((subject, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getStatusText(teacher.status)} • {teacher.lastActive}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className={`hover:shadow-lg transition-all duration-200 ${favorites.includes(student.id) ? 'ring-2 ring-red-200' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {student.name.split(' ').pop()?.[0]}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(student.status)}`}></div>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{student.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {student.grade} • {student.studentId}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(student.id)}
                        className={`p-1 ${favorites.includes(student.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                      >
                        <Heart className={`h-4 w-4 ${favorites.includes(student.id) ? 'fill-current' : ''}`} />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Nhắn tin
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Phone className="h-4 w-4 mr-2" />
                            Gọi điện
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Gửi email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{student.phone}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Phụ huynh:</strong> {student.parentName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>PH: {student.parentPhone}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Địa chỉ:</strong> {student.address}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {student.subjects.map((subject, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getStatusText(student.status)} • {student.lastActive}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

