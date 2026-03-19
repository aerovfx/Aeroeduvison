'use client';

import { useState } from 'react';
import {
  Plus, Brain, BookOpen, FileQuestion, FolderKanban, Save, Eye,
  Settings, Zap, Target, Clock, Award, ChevronRight, Trash2,
  GripVertical, Play, Sparkles, Users, TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Module {
  id: string;
  type: 'lesson' | 'quiz' | 'project' | 'assignment';
  title: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  xpTarget: number;
  prerequisites?: string[];
}

// AI Native Glass Card
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  );
}

// AI Native Badge
function AIBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const variants = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200',
    success: 'bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-yellow-200',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-red-600 border-red-200',
    info: 'bg-[hsl(var(--info)/0.15)] text-blue-600 border-[hsl(var(--info)/0.3)]',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${variants[variant as keyof typeof variants]}`}>
      {children}
    </span>
  );
}

export default function LearningPathBuilder() {
  const router = useRouter();
  const [pathName, setPathName] = useState('');
  const [pathDescription, setPathDescription] = useState('');
  const [selectedModules, setSelectedModules] = useState<Module[]>([]);
  const [availableModules] = useState<Module[]>([
    { id: 'math-derivatives-1', type: 'lesson', title: 'Giới thiệu Đạo hàm', subject: 'mathematics', difficulty: 'easy', duration: 30, xpTarget: 80 },
    { id: 'math-derivatives-2', type: 'lesson', title: 'Quy tắc tính đạo hàm', subject: 'mathematics', difficulty: 'medium', duration: 45, xpTarget: 120 },
    { id: 'math-quiz-1', type: 'quiz', title: 'Kiểm tra Đạo hàm', subject: 'mathematics', difficulty: 'medium', duration: 20, xpTarget: 100 },
    { id: 'math-integrals-1', type: 'lesson', title: 'Tích phân cơ bản', subject: 'mathematics', difficulty: 'hard', duration: 60, xpTarget: 150, prerequisites: ['math-derivatives-2'] },
    { id: 'math-project-1', type: 'project', title: 'Dự án: Ứng dụng Giải tích', subject: 'mathematics', difficulty: 'hard', duration: 90, xpTarget: 200 }
  ]);

  const [aiSuggestions] = useState([
    { module: 'Bài tập Logic nâng cao', reason: 'Học sinh mạnh về logic (90%), nên thử thách hơn', priority: 'high' },
    { module: 'Drill: Tính toán nhanh', reason: '2 học sinh yếu về tính toán, cần luyện tập', priority: 'medium' },
    { module: 'Video: Hình học không gian', reason: 'Lớp có xu hướng học tốt qua visual content', priority: 'high' }
  ]);

  const addModule = (module: Module) => setSelectedModules([...selectedModules, module]);
  const removeModule = (moduleId: string) => setSelectedModules(selectedModules.filter(m => m.id !== moduleId));
  const moveModule = (index: number, direction: 'up' | 'down') => {
    const newModules = [...selectedModules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newModules.length) {
      [newModules[index], newModules[targetIndex]] = [newModules[targetIndex], newModules[index]];
      setSelectedModules(newModules);
    }
  };

  const getTotalStats = () => {
    const totalDuration = selectedModules.reduce((sum, m) => sum + m.duration, 0);
    const totalXP = selectedModules.reduce((sum, m) => sum + m.xpTarget, 0);
    return { totalDuration, totalXP, estimatedDays: Math.ceil(totalDuration / 60) };
  };

  const savePath = () => {
    const pathData = { id: `path-${Date.now()}`, name: pathName, description: pathDescription, modules: selectedModules, createdAt: new Date().toISOString() };
    const savedPaths = JSON.parse(localStorage.getItem('teacher-learning-paths') || '[]');
    savedPaths.push(pathData);
    localStorage.setItem('teacher-learning-paths', JSON.stringify(savedPaths));
    router.push('/teacher/dashboard');
  };

  const stats = getTotalStats();
  const difficultyColors = { easy: 'success', medium: 'warning', hard: 'danger' };
  const moduleIcons: any = { lesson: '📖', quiz: '📝', project: '🎯', assignment: '📋' };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <GlassCard className="relative overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-sm">
                 <BookOpen className="w-8 h-8" />
               </div>
               <div>
                  <h1 className="text-3xl font-bold text-purple-600 mb-2">🎓 Learning Path Builder</h1>
                  <p className="text-sm text-gray-600">Tạo lộ trình học tập cá nhân hóa với AI</p>
               </div>
            </div>
            <button 
              className={`ai-button-primary text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${selectedModules.length === 0 || !pathName ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={savePath} disabled={selectedModules.length === 0 || !pathName}
            >
              <Save className="h-4 w-4 mr-2" />
              Lưu Path
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Tên Learning Path</label>
                <input
                  className="ai-input w-full px-4 py-2.5 rounded-xl"
                  placeholder="Ví dụ: Giải tích cơ bản - 2 tuần"
                  value={pathName}
                  onChange={(e: any) => setPathName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Mô tả</label>
                <input
                  className="ai-input w-full px-4 py-2.5 rounded-xl"
                  placeholder="Mô tả ngắn gọn về lộ trình"
                  value={pathDescription}
                  onChange={(e: any) => setPathDescription(e.target.value)}
                />
              </div>
            </div>
        </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Available Modules */}
        <div className="lg:col-span-1">
          <GlassCard className="h-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
               <BookOpen className="w-5 h-5 text-purple-600" /> Modules có sẵn
            </h3>
            <div className="space-y-3">
              {availableModules.map((module) => (
                <div
                  key={module.id}
                  onClick={() => addModule(module)}
                  className="cursor-pointer p-4 rounded-xl glass-panel border border-gray-200 hover:border-purple-200 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{moduleIcons[module.type]}</span>
                    <AIBadge variant={difficultyColors[module.difficulty] as any}>{module.difficulty}</AIBadge>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-2">{module.title}</p>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center"><Clock className="h-3 w-3 mr-1" />{module.duration}m</span>
                    <span className="flex items-center"><Zap className="h-3 w-3 mr-1" />{module.xpTarget} XP</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="ai-button w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gray-900 border border-gray-200">
              <Plus className="h-4 w-4" />
              Tạo Module Mới
            </button>
          </GlassCard>
        </div>

        {/* Center - Path Canvas */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                 <FolderKanban className="w-5 h-5 text-purple-600" /> Lộ trình học tập
              </h3>
              <button 
                 onClick={() => setSelectedModules([])}
                 className="text-xs font-semibold text-red-600 hover:bg-[hsl(var(--destructive)/0.1)] px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-200"
               >
                 Xóa tất cả
               </button>
            </div>

            {selectedModules.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-12 text-center bg-[hsl(var(--card)/0.3)]">
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-gray-600 font-medium">Click vào modules bên trái để thêm vào lộ trình</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedModules.map((module, index) => (
                  <div key={`${module.id}-${index}`} className="relative">
                    <div className="glass-panel border border-gray-200 rounded-xl p-4 transition-all">
                      <div className="flex items-start space-x-4">
                        <div className="flex flex-col space-y-2 items-center justify-center py-2">
                          <button onClick={() => moveModule(index, 'up')} disabled={index === 0} className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30">
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-black text-purple-600">#{index + 1}</span>
                          <button onClick={() => moveModule(index, 'down')} disabled={index === selectedModules.length - 1} className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30">
                            <GripVertical className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3 border-b border-gray-200 pb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{moduleIcons[module.type]}</span>
                              <div>
                                <p className="font-bold text-gray-900">{module.title}</p>
                                <p className="text-xs text-gray-600 uppercase font-semibold">{module.type}</p>
                              </div>
                            </div>
                            <button onClick={() => removeModule(module.id)} className="p-2 text-red-600 hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[hsl(var(--muted-foreground)/0.05)] rounded-lg p-2.5 text-center">
                              <p className="text-[10px] uppercase font-bold text-gray-600">Thời gian</p>
                              <p className="font-semibold text-gray-900 mt-0.5">{module.duration} phút</p>
                            </div>
                            <div className="bg-[hsl(var(--primary)/0.05)] rounded-lg p-2.5 text-center">
                              <p className="text-[10px] uppercase font-bold text-gray-600">Mục tiêu XP</p>
                              <p className="font-black text-purple-600 mt-0.5">{module.xpTarget}</p>
                            </div>
                            <div className="bg-[hsl(var(--muted-foreground)/0.05)] rounded-lg p-2.5 text-center flex flex-col items-center justify-center">
                              <p className="text-[10px] uppercase font-bold text-gray-600 mb-1">Độ khó</p>
                              <AIBadge variant={difficultyColors[module.difficulty] as any}>{module.difficulty}</AIBadge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < selectedModules.length - 1 && (
                      <div className="flex justify-center -mb-2 mt-2">
                        <ChevronRight className="h-6 w-6 text-purple-600 transform rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Sidebar - Settings & Preview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Path Summary */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-green-600" /> Tóm tắt
            </h3>
            <div className="space-y-4 text-sm font-medium">
              <div className="flex items-center justify-between p-2 rounded bg-[hsl(var(--muted-foreground)/0.05)]">
                <span className="text-gray-600">Tổng số Modules</span>
                <span className="font-bold text-gray-900">{selectedModules.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[hsl(var(--muted-foreground)/0.05)]">
                <span className="text-gray-600">Thời lượng dự kiến</span>
                <span className="font-bold text-gray-900">{stats.totalDuration} phút</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)]">
                <span className="text-gray-600">Tổng cung cấp XP</span>
                <span className="font-black text-purple-600">{stats.totalXP}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[hsl(var(--warning)/0.05)] border border-[hsl(var(--warning)/0.2)]">
                <span className="text-gray-600">Ước tính (Ngày)</span>
                <span className="font-bold text-yellow-600">{stats.estimatedDays} ngày</span>
              </div>
            </div>
          </GlassCard>

          {/* AI Suggestions */}
          <GlassCard className="border border-purple-200 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.2)] flex items-center justify-center mr-2">
                 <Brain className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Gợi ý AI</h3>
            </div>
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, idx) => (
                <div key={idx} className="bg-[hsl(var(--muted-foreground)/0.05)] border border-gray-200 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs font-bold text-gray-900 max-w-[70%]">{suggestion.module}</p>
                    <AIBadge variant={suggestion.priority === 'high' ? 'danger' : 'warning'}>
                      {suggestion.priority}
                    </AIBadge>
                  </div>
                  <p className="text-[10px] text-gray-600 mb-3">{suggestion.reason}</p>
                  <button className="ai-button w-full py-1.5 text-xs text-gray-900 border border-gray-200 rounded-lg hover:border-purple-200 transition-all">
                    Thêm vào Lộ trình
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Quick Settings */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-600" /> Cài đặt
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Mục tiêu XP / Ngày</label>
                <input className="ai-input w-full px-3 py-2 rounded-lg text-sm" defaultValue="150" type="number" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Độ khó linh hoạt</label>
                <select className="ai-input w-full px-3 py-2 rounded-lg text-sm">
                  <option>Tự động (Theo AI)</option>
                  <option>Cố định - Dễ</option>
                  <option>Cố định - Vừa</option>
                  <option>Cố định - Khó</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-4">
                 <input type="checkbox" className="rounded bg-[hsl(var(--background))] border-gray-200" defaultChecked id="auto-adjust" />
                 <label htmlFor="auto-adjust" className="text-xs font-medium text-gray-900">Tự động điều chỉnh theo tiến trình</label>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
     </div>
    </div>
  );
}
