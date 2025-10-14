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
  Kanban,
  Plus,
  Users,
  Calendar,
  Flag,
  Clock,
  MessageCircle,
  Paperclip,
  Eye,
  Edit3,
  Trash2,
  MoreVertical,
  CheckCircle2,
  Circle,
  AlertCircle,
  X,
  Save,
  User,
  Search,
  Filter,
  SortAsc,
  ChevronDown,
  MoreHorizontal
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  dueDate?: Date;
  tags: string[];
  comments: number;
  attachments: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Column {
  id: string;
  title: string;
  status: Task["status"];
  color: string;
  tasks: Task[];
}

const columns: Column[] = [
  {
    id: "todo",
    title: "To Do",
    status: "todo",
    color: "bg-gray-50 border-gray-200",
    tasks: []
  },
  {
    id: "in-progress",
    title: "In Progress",
    status: "in-progress", 
    color: "bg-blue-50 border-blue-200",
    tasks: []
  },
  {
    id: "done",
    title: "Done",
    status: "done",
    color: "bg-green-50 border-green-200",
    tasks: []
  }
];

const priorities = [
  { value: "low", label: "Thấp", color: "bg-gray-500", icon: Circle },
  { value: "medium", label: "Trung bình", color: "bg-blue-500", icon: Circle },
  { value: "high", label: "Cao", color: "bg-orange-500", icon: AlertCircle },
  { value: "urgent", label: "Khẩn cấp", color: "bg-red-500", icon: Flag }
];

const mockUsers = [
  { id: "1", name: "Nguyễn Văn An", avatar: "" },
  { id: "2", name: "Trần Thị Bình", avatar: "" },
  { id: "3", name: "Lê Văn Cường", avatar: "" },
  { id: "4", name: "Phạm Thị Dung", avatar: "" }
];

// Disable static generation
export const dynamic = 'force-dynamic'

export default function ScrumboardModule() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [boardData, setBoardData] = useState<Column[]>(columns);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    tags: [],
    comments: 0,
    attachments: 0
  });
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/sign-in");
      return;
    }

    // Load board data from localStorage
    const savedBoard = localStorage.getItem(`scrumboard_${session.user.id}`);
    if (savedBoard) {
      const parsedBoard = JSON.parse(savedBoard).map((col: any) => ({
        ...col,
        tasks: col.tasks.map((task: any) => ({
          ...task,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt)
        }))
      }));
      setBoardData(parsedBoard);
    } else {
      // Initialize with sample tasks
      const sampleTasks: Task[] = [
        {
          id: "1",
          title: "Fix authentication bug",
          description: "Investigate JWT token validation",
          status: "todo",
          priority: "high",
          assignee: mockUsers[0],
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          tags: ["Bug", "Frontend"],
          comments: 2,
          attachments: 1,
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 3600000)
        },
        {
          id: "2",
          title: "Implement user profile page",
          description: "Create user profile page with edit functionality",
          status: "todo",
          priority: "medium",
          assignee: mockUsers[1],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          tags: ["Feature", "Backend"],
          comments: 1,
          attachments: 0,
          createdAt: new Date(Date.now() - 172800000),
          updatedAt: new Date(Date.now() - 7200000)
        },
        {
          id: "3",
          title: "Refactor database schema",
          description: "Optimize database structure for better performance",
          status: "todo",
          priority: "high",
          assignee: mockUsers[2],
          dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
          tags: ["Refactor", "Backend"],
          comments: 0,
          attachments: 0,
          createdAt: new Date(Date.now() - 259200000),
          updatedAt: new Date(Date.now() - 10800000)
        },
        {
          id: "4",
          title: "Develop real-time chat",
          description: "Implement WebSocket-based chat functionality",
          status: "in-progress",
          priority: "high",
          assignee: mockUsers[0],
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          tags: ["Feature", "Frontend"],
          comments: 3,
          attachments: 0,
          createdAt: new Date(Date.now() - 345600000),
          updatedAt: new Date(Date.now() - 14400000)
        },
        {
          id: "5",
          title: "Design new dashboard layout",
          description: "Create modern dashboard with improved UX",
          status: "in-progress",
          priority: "medium",
          assignee: mockUsers[1],
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          tags: ["Design", "UI/UX"],
          comments: 0,
          attachments: 0,
          createdAt: new Date(Date.now() - 432000000),
          updatedAt: new Date(Date.now() - 18000000)
        },
        {
          id: "6",
          title: "Setup project environment",
          description: "Configure development and production environments",
          status: "done",
          priority: "low",
          assignee: mockUsers[3],
          tags: ["Setup", "DevOps"],
          comments: 5,
          attachments: 2,
          createdAt: new Date(Date.now() - 518400000),
          updatedAt: new Date(Date.now() - 21600000)
        }
      ];

      const initialBoard = columns.map(col => ({
        ...col,
        tasks: sampleTasks.filter(task => task.status === col.status)
      }));
      
      setBoardData(initialBoard);
      saveBoardData(initialBoard);
    }
  }, [session, status, router]);

  const saveBoardData = (boardToSave: Column[]) => {
    if (session?.user?.id) {
      localStorage.setItem(`scrumboard_${session.user.id}`, JSON.stringify(boardToSave));
    }
  };

  const createTask = () => {
    if (!newTask.title?.trim()) return;
    
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description || "",
      status: newTask.status || "todo",
      priority: newTask.priority || "medium",
      assignee: newTask.assignee,
      dueDate: newTask.dueDate,
      tags: newTask.tags || [],
      comments: 0,
      attachments: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const updatedBoard = boardData.map(col => {
      if (col.status === task.status) {
        return { ...col, tasks: [...col.tasks, task] };
      }
      return col;
    });
    
    setBoardData(updatedBoard);
    saveBoardData(updatedBoard);
    
    // Reset form
    setNewTask({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      tags: [],
      comments: 0,
      attachments: 0
    });
    setIsCreating(false);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedBoard = boardData.map(col => ({
      ...col,
      tasks: col.tasks.map(task => 
        task.id === taskId 
          ? { ...task, ...updates, updatedAt: new Date() }
          : task
      )
    }));
    
    setBoardData(updatedBoard);
    saveBoardData(updatedBoard);
    
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, ...updates, updatedAt: new Date() });
    }
  };

  const deleteTask = (taskId: string) => {
    const updatedBoard = boardData.map(col => ({
      ...col,
      tasks: col.tasks.filter(task => task.id !== taskId)
    }));
    
    setBoardData(updatedBoard);
    saveBoardData(updatedBoard);
    
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const moveTask = (taskId: string, newStatus: Task["status"]) => {
    const taskToMove = boardData
      .flatMap(col => col.tasks)
      .find(task => task.id === taskId);
    
    if (!taskToMove) return;
    
    const updatedBoard = boardData.map(col => {
      if (col.status === newStatus) {
        return {
          ...col,
          tasks: [...col.tasks, { ...taskToMove, status: newStatus, updatedAt: new Date() }]
        };
      } else {
        return {
          ...col,
          tasks: col.tasks.filter(task => task.id !== taskId)
        };
      }
    });
    
    setBoardData(updatedBoard);
    saveBoardData(updatedBoard);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Task["status"]) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== targetStatus) {
      moveTask(draggedTask.id, targetStatus);
    }
    setDraggedTask(null);
  };

  const getPriorityInfo = (priority: Task["priority"]) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN');
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredBoard = boardData.map(col => ({
    ...col,
    tasks: col.tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }));

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Scrum Board
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                View
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Board View</DropdownMenuItem>
              <DropdownMenuItem>List View</DropdownMenuItem>
              <DropdownMenuItem>Calendar View</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2">
            <SortAsc className="h-4 w-4" />
            Sort
          </Button>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tạo task mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Tiêu đề</Label>
                  <Input
                    id="title"
                    placeholder="Nhập tiêu đề task..."
                    value={newTask.title || ""}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Mô tả</Label>
                  <UITextarea
                    id="description"
                    placeholder="Mô tả chi tiết task..."
                    value={newTask.description || ""}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Trạng thái</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          {columns.find(col => col.status === newTask.status)?.title}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {columns.map((column) => (
                          <DropdownMenuItem 
                            key={column.status}
                            onClick={() => setNewTask({ ...newTask, status: column.status })}
                          >
                            {column.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <Label>Độ ưu tiên</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          {getPriorityInfo(newTask.priority || "medium").label}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {priorities.map((priority) => (
                          <DropdownMenuItem 
                            key={priority.value}
                            onClick={() => setNewTask({ ...newTask, priority: priority.value as Task["priority"] })}
                          >
                            <priority.icon className={`h-4 w-4 mr-2 ${priority.color}`} />
                            {priority.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Người thực hiện</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          {newTask.assignee ? newTask.assignee.name : "Chọn người thực hiện"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setNewTask({ ...newTask, assignee: undefined })}>
                          Không gán
                        </DropdownMenuItem>
                        {mockUsers.map((user) => (
                          <DropdownMenuItem 
                            key={user.id}
                            onClick={() => setNewTask({ ...newTask, assignee: user })}
                          >
                            <User className="h-4 w-4 mr-2" />
                            {user.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <Label>Hạn chót</Label>
                    <Input
                      type="date"
                      value={newTask.dueDate ? newTask.dueDate.toISOString().split('T')[0] : ""}
                      onChange={(e) => setNewTask({ 
                        ...newTask, 
                        dueDate: e.target.value ? new Date(e.target.value) : undefined 
                      })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Hủy
                  </Button>
                  <Button onClick={createTask}>
                    <Save className="h-4 w-4 mr-2" />
                    Tạo task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export Board</DropdownMenuItem>
              <DropdownMenuItem>Import Tasks</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Board Settings</DropdownMenuItem>
              <DropdownMenuItem>Archive Completed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>


      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredBoard.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{column.title}</h3>
                <Badge variant="secondary" className="text-xs px-2 py-1">{column.tasks.length}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Rename Column</DropdownMenuItem>
                    <DropdownMenuItem>Delete Column</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div 
              className={`min-h-[500px] p-3 rounded-lg ${column.color} transition-colors`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              {column.tasks.map((task) => (
                <Card 
                  key={task.id}
                  className="mb-3 cursor-pointer hover:shadow-md transition-shadow bg-white border border-gray-200"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => setSelectedTask(task)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium line-clamp-2">{task.title}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); setSelectedTask(task); }}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map((tag, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className={`text-xs px-2 py-1 ${
                                tag === 'Bug' ? 'bg-red-100 text-red-700 border-red-200' :
                                tag === 'Feature' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                tag === 'Frontend' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                                tag === 'Backend' ? 'bg-green-100 text-green-700 border-green-200' :
                                tag === 'Refactor' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                tag === 'Design' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                tag === 'UI/UX' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                tag === 'Setup' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                tag === 'DevOps' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {task.assignee && (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {task.assignee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className={getDaysUntilDue(task.dueDate) < 0 ? "text-red-600" : "text-muted-foreground"}>
                                {getDaysUntilDue(task.dueDate) < 0 
                                  ? `Overdue ${Math.abs(getDaysUntilDue(task.dueDate))}d`
                                  : `Due ${getDaysUntilDue(task.dueDate)}d`
                                }
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Flag className={`h-3 w-3 ${
                              task.priority === 'urgent' ? 'text-red-500' :
                              task.priority === 'high' ? 'text-orange-500' :
                              task.priority === 'medium' ? 'text-yellow-500' :
                              'text-green-500'
                            }`} />
                            <span className="text-xs capitalize">{task.priority}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {task.comments > 0 && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            <span>{task.comments}</span>
                          </div>
                        )}
                        {task.attachments > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            <span>{task.attachments}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const priorityInfo = getPriorityInfo(selectedTask.priority);
                  const IconComponent = priorityInfo.icon;
                  return IconComponent ? (
                    <IconComponent className={`h-5 w-5 ${priorityInfo.color}`} />
                  ) : null;
                })()}
                {selectedTask.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Trạng thái: {columns.find(col => col.status === selectedTask.status)?.title}</span>
                <span>•</span>
                <span>Độ ưu tiên: {getPriorityInfo(selectedTask.priority).label}</span>
                <span>•</span>
                <span>Tạo: {formatDate(selectedTask.createdAt)}</span>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Mô tả</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{selectedTask.description}</p>
              </div>
              
              {selectedTask.assignee && (
                <div>
                  <Label className="text-sm font-medium">Người thực hiện</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">
                        {selectedTask.assignee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{selectedTask.assignee.name}</span>
                  </div>
                </div>
              )}
              
              {selectedTask.dueDate && (
                <div>
                  <Label className="text-sm font-medium">Hạn chót</Label>
                  <p className={`text-sm mt-1 ${getDaysUntilDue(selectedTask.dueDate) < 0 ? "text-red-600" : ""}`}>
                    {formatDate(selectedTask.dueDate)} 
                    {getDaysUntilDue(selectedTask.dueDate) < 0 
                      ? ` (Quá hạn ${Math.abs(getDaysUntilDue(selectedTask.dueDate))} ngày)`
                      : ` (Còn ${getDaysUntilDue(selectedTask.dueDate)} ngày)`
                    }
                  </p>
                </div>
              )}
              
              {selectedTask.tags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedTask.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

