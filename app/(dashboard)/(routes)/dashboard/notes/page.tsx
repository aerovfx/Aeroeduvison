'use client';

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  StickyNote, 
  Search, 
  Plus,
  Pin,
  Trash2,
  Edit3,
  Tag,
  Calendar,
  BookOpen,
  Lightbulb,
  FileText,
  Heart,
  Star,
  Filter,
  Grid,
  List,
  SortAsc,
  MoreVertical,
  Save,
  X
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea as UITextarea } from "@/components/ui/textarea";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  color: string;
}

const noteCategories = [
  { id: "all", label: "Tất cả", icon: Grid },
  { id: "study", label: "Học tập", icon: BookOpen },
  { id: "idea", label: "Ý tưởng", icon: Lightbulb },
  { id: "todo", label: "Công việc", icon: FileText },
  { id: "personal", label: "Cá nhân", icon: Heart }
];

const noteColors = [
  { name: "Vàng", value: "bg-yellow-100 border-yellow-300 text-yellow-900" },
  { name: "Xanh lá", value: "bg-green-100 border-green-300 text-green-900" },
  { name: "Xanh dương", value: "bg-blue-100 border-blue-300 text-blue-900" },
  { name: "Hồng", value: "bg-pink-100 border-pink-300 text-pink-900" },
  { name: "Tím", value: "bg-purple-100 border-purple-300 text-purple-900" },
  { name: "Cam", value: "bg-orange-100 border-orange-300 text-orange-900" },
  { name: "Xám", value: "bg-gray-100 border-gray-300 text-gray-900" }
];

// Disable static generation
export const dynamic = 'force-dynamic'

export default function NotesModule() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "title" | "updated">("updated");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newNote, setNewNote] = useState<Partial<Note>>({
    title: "",
    content: "",
    category: "study",
    tags: [],
    isPinned: false,
    isFavorite: false,
    color: noteColors[0].value
  });

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/sign-in");
      return;
    }

    // Load notes from localStorage
    const savedNotes = localStorage.getItem(`notes_${session.user.id}`);
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }));
      setNotes(parsedNotes);
    } else {
      // Initialize with sample notes
      const sampleNotes: Note[] = [
        {
          id: "1",
          title: "Công thức toán học quan trọng",
          content: "# Công thức cần nhớ\n\n## Đạo hàm\n- (x^n)' = nx^(n-1)\n- (sin x)' = cos x\n- (cos x)' = -sin x\n\n## Tích phân\n- ∫x^n dx = x^(n+1)/(n+1) + C\n- ∫sin x dx = -cos x + C",
          category: "study",
          tags: ["toán", "công thức", "ôn tập"],
          isPinned: true,
          isFavorite: true,
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 3600000),
          color: noteColors[0].value
        },
        {
          id: "2",
          title: "Ý tưởng dự án khoa học",
          content: "Dự án: Hệ thống AI hỗ trợ học toán\n\n- Sử dụng machine learning để phân tích lỗi học sinh\n- Tạo bài tập tự động phù hợp với trình độ\n- Giao diện thân thiện với trẻ em\n\nCần nghiên cứu thêm về:\n- Computer vision cho nhận diện chữ viết tay\n- Natural language processing cho đọc đề bài",
          category: "idea",
          tags: ["AI", "dự án", "khoa học"],
          isPinned: false,
          isFavorite: true,
          createdAt: new Date(Date.now() - 172800000),
          updatedAt: new Date(Date.now() - 7200000),
          color: noteColors[2].value
        },
        {
          id: "3",
          title: "Danh sách việc cần làm tuần này",
          content: "## Tuần này\n\n### Thứ 2\n- [ ] Hoàn thành bài tập toán\n- [ ] Ôn tập lý thuyết vật lý\n\n### Thứ 3\n- [ ] Làm thí nghiệm hóa học\n- [ ] Viết báo cáo thực hành\n\n### Thứ 4\n- [ ] Chuẩn bị thuyết trình dự án\n- [ ] Luyện tập tiếng Anh\n\n### Thứ 5\n- [ ] Kiểm tra 1 tiết toán\n- [ ] Nộp bài tập về nhà\n\n### Thứ 6\n- [ ] Thuyết trình dự án\n- [ ] Nghỉ ngơi cuối tuần",
          category: "todo",
          tags: ["công việc", "lịch trình", "tuần"],
          isPinned: true,
          isFavorite: false,
          createdAt: new Date(Date.now() - 259200000),
          updatedAt: new Date(Date.now() - 10800000),
          color: noteColors[1].value
        }
      ];
      setNotes(sampleNotes);
      saveNotes(sampleNotes);
    }
  }, [session, status, router]);

  const saveNotes = (notesToSave: Note[]) => {
    if (session?.user?.id) {
      localStorage.setItem(`notes_${session.user.id}`, JSON.stringify(notesToSave));
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || note.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    // Sort pinned notes first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    // Then sort by selected criteria
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "date":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "updated":
      default:
        return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
  });

  const createNote = () => {
    if (!newNote.title?.trim() && !newNote.content?.trim()) return;
    
    const note: Note = {
      id: Date.now().toString(),
      title: newNote.title || "Ghi chú mới",
      content: newNote.content || "",
      category: newNote.category || "study",
      tags: newNote.tags || [],
      isPinned: newNote.isPinned || false,
      isFavorite: newNote.isFavorite || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      color: newNote.color || noteColors[0].value
    };
    
    const updatedNotes = [note, ...notes];
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
    
    // Reset form
    setNewNote({
      title: "",
      content: "",
      category: "study",
      tags: [],
      isPinned: false,
      isFavorite: false,
      color: noteColors[0].value
    });
    setIsCreating(false);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    const updatedNotes = notes.map(note => 
      note.id === id 
        ? { ...note, ...updates, updatedAt: new Date() }
        : note
    );
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
    
    if (selectedNote?.id === id) {
      setSelectedNote({ ...selectedNote, ...updates, updatedAt: new Date() });
    }
  };

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
    
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  const togglePin = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      updateNote(id, { isPinned: !note.isPinned });
    }
  };

  const toggleFavorite = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note) {
      updateNote(id, { isFavorite: !note.isFavorite });
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Hôm nay";
    if (days === 1) return "Hôm qua";
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (status === "loading") {
    return <div>{t('common.loading')}</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <StickyNote className="h-8 w-8 text-yellow-600" />
            Ghi chú học tập
          </h1>
          <p className="text-muted-foreground">
            Lưu trữ và quản lý ghi chú cá nhân một cách thông minh
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Ghi chú mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tạo ghi chú mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Tiêu đề</Label>
                  <Input
                    id="title"
                    placeholder="Nhập tiêu đề ghi chú..."
                    value={newNote.title || ""}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="content">Nội dung</Label>
                  <UITextarea
                    id="content"
                    placeholder="Viết nội dung ghi chú..."
                    value={newNote.content || ""}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Danh mục</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          {noteCategories.find(cat => cat.id === newNote.category)?.label}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {noteCategories.slice(1).map((category) => (
                          <DropdownMenuItem 
                            key={category.id}
                            onClick={() => setNewNote({ ...newNote, category: category.id })}
                          >
                            <category.icon className="h-4 w-4 mr-2" />
                            {category.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex-1">
                    <Label>Màu sắc</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          {noteColors.find(color => color.value === newNote.color)?.name}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {noteColors.map((color) => (
                          <DropdownMenuItem 
                            key={color.value}
                            onClick={() => setNewNote({ ...newNote, color: color.value })}
                          >
                            <div className={`w-4 h-4 rounded mr-2 ${color.value}`}></div>
                            {color.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewNote({ ...newNote, isPinned: !newNote.isPinned })}
                    className={newNote.isPinned ? "bg-yellow-100" : ""}
                  >
                    <Pin className={`h-4 w-4 mr-2 ${newNote.isPinned ? "fill-current" : ""}`} />
                    Ghim
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewNote({ ...newNote, isFavorite: !newNote.isFavorite })}
                    className={newNote.isFavorite ? "bg-red-100" : ""}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${newNote.isFavorite ? "fill-current" : ""}`} />
                    Yêu thích
                  </Button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Hủy
                  </Button>
                  <Button onClick={createNote}>
                    <Save className="h-4 w-4 mr-2" />
                    Lưu
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <StickyNote className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng ghi chú</p>
                <p className="text-2xl font-bold">{notes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Pin className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Đã ghim</p>
                <p className="text-2xl font-bold">{notes.filter(n => n.isPinned).length}</p>
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
                <p className="text-2xl font-bold">{notes.filter(n => n.isFavorite).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Học tập</p>
                <p className="text-2xl font-bold">{notes.filter(n => n.category === "study").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm ghi chú..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Danh mục
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {noteCategories.map((category) => (
                    <DropdownMenuItem 
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <category.icon className="h-4 w-4 mr-2" />
                      {category.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SortAsc className="h-4 w-4 mr-2" />
                    Sắp xếp
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("updated")}>
                    Mới cập nhật
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("date")}>
                    Ngày tạo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("title")}>
                    Tên A-Z
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Grid/List */}
      {filteredNotes.length === 0 ? (
        <Card className="p-12 text-center">
          <StickyNote className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Chưa có ghi chú nào</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Không tìm thấy ghi chú phù hợp với từ khóa của bạn" : "Bắt đầu tạo ghi chú đầu tiên của bạn"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo ghi chú đầu tiên
            </Button>
          )}
        </Card>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
          : "space-y-4"
        }>
          {filteredNotes.map((note) => (
            <Card 
              key={note.id} 
              className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${note.color} ${
                viewMode === "list" ? "flex" : ""
              }`}
              onClick={() => setSelectedNote(note)}
            >
              <CardHeader className={`${viewMode === "list" ? "flex-1" : ""} pb-3`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {note.isPinned && <Pin className="h-4 w-4 text-yellow-600 fill-current" />}
                      {note.isFavorite && <Heart className="h-4 w-4 text-red-500 fill-current" />}
                      <Badge variant="secondary" className="text-xs">
                        {noteCategories.find(cat => cat.id === note.category)?.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {formatDate(note.updatedAt)}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}>
                        <Pin className="h-4 w-4 mr-2" />
                        {note.isPinned ? "Bỏ ghim" : "Ghim"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite(note.id); }}>
                        <Heart className="h-4 w-4 mr-2" />
                        {note.isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); setSelectedNote(note); }}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className={`${viewMode === "list" ? "flex-1" : ""}`}>
                <p className="text-sm line-clamp-3">
                  {note.content.replace(/[#*]/g, '').trim()}
                </p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {note.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                    {note.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{note.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Note Detail Modal */}
      {selectedNote && (
        <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  {selectedNote.isPinned && <Pin className="h-5 w-5 text-yellow-600 fill-current" />}
                  {selectedNote.isFavorite && <Heart className="h-5 w-5 text-red-500 fill-current" />}
                  {selectedNote.title}
                </DialogTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePin(selectedNote.id)}
                  >
                    <Pin className={`h-4 w-4 ${selectedNote.isPinned ? "fill-current" : ""}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFavorite(selectedNote.id)}
                  >
                    <Heart className={`h-4 w-4 ${selectedNote.isFavorite ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Danh mục: {noteCategories.find(cat => cat.id === selectedNote.category)?.label}</span>
                <span>•</span>
                <span>Tạo: {formatDate(selectedNote.createdAt)}</span>
                <span>•</span>
                <span>Cập nhật: {formatDate(selectedNote.updatedAt)}</span>
              </div>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {selectedNote.content}
                </pre>
              </div>
              {selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedNote.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

