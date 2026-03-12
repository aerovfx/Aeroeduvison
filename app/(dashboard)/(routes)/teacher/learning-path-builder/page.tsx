'use client';

import { useState } from 'react';
import {
  Plus, Brain, BookOpen, FileQuestion, FolderKanban, Save, Eye,
  Settings, Zap, Target, Clock, Award, ChevronRight, Trash2,
  GripVertical, Play, Sparkles, Users, TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NeumorphicCard } from '@/components/ui/neumorphic-card';
import { NeumorphicButton } from '@/components/ui/neumorphic-button';
import { NeumorphicInput } from '@/components/ui/neumorphic-input';
import { Badge } from '@/components/ui/badge';

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
  const difficultyColors = { easy: 'text-green-600 bg-green-100', medium: 'text-yellow-600 bg-yellow-100', hard: 'text-red-600 bg-red-100' };
  const moduleIcons: any = { lesson: '📖', quiz: '📝', project: '🎯', assignment: '📋' };

  return (
    <div className="flex flex-col h-full neu-container">
      {/* Header with Gradient Text */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">🎓 Learning Path Builder</h1>
              <p className="text-gray-600">Tạo lộ trình học tập cá nhân hóa với AI</p>
            </div>
            <NeumorphicButton variant="primary" size="lg" onClick={savePath} disabled={selectedModules.length === 0 || !pathName}>
              <Save className="h-4 w-4 mr-2" />
              Lưu Path
            </NeumorphicButton>
          </div>

          {/* Path Info */}
          <NeumorphicCard variant="default" size="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên Learning Path</label>
                <NeumorphicInput
                  placeholder="Ví dụ: Giải tích cơ bản - 2 tuần"
                  value={pathName}
                  onChange={(e: any) => setPathName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <NeumorphicInput
                  placeholder="Mô tả ngắn gọn về lộ trình"
                  value={pathDescription}
                  onChange={(e: any) => setPathDescription(e.target.value)}
                />
              </div>
            </div>
          </NeumorphicCard>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Available Modules */}
            <div className="lg:col-span-1">
              <NeumorphicCard variant="gradient" size="lg" className="h-full">
                <h3 className="text-lg font-semibold gradient-text mb-4">📦 Available Modules</h3>
                <div className="space-y-3">
                  {availableModules.map((module) => (
                    <NeumorphicCard
                      key={module.id}
                      variant="default"
                      hover
                      onClick={() => addModule(module)}
                      className="cursor-pointer p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl">{moduleIcons[module.type]}</span>
                        <Badge className={difficultyColors[module.difficulty]}>{module.difficulty}</Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">{module.title}</p>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="flex items-center"><Clock className="h-3 w-3 mr-1" />{module.duration}m</span>
                        <span className="flex items-center"><Zap className="h-3 w-3 mr-1" />{module.xpTarget} XP</span>
                      </div>
                    </NeumorphicCard>
                  ))}
                </div>
                <NeumorphicButton variant="outline" className="w-full mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Module
                </NeumorphicButton>
              </NeumorphicCard>
            </div>

            {/* Center - Path Canvas */}
            <div className="lg:col-span-2">
              <NeumorphicCard variant="gradient" size="lg" className="h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold gradient-text">🗺️ Learning Path Canvas</h3>
                  <div className="flex items-center space-x-2">
                    <NeumorphicButton variant="outline" size="sm" onClick={() => setSelectedModules([])}>Clear All</NeumorphicButton>
                  </div>
                </div>

                {selectedModules.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center neu-shadow-inner">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Click vào modules bên trái để thêm vào learning path</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedModules.map((module, index) => (
                      <div key={`${module.id}-${index}`} className="relative">
                        <NeumorphicCard variant="default" className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex flex-col space-y-2">
                              <button onClick={() => moveModule(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                                <GripVertical className="h-4 w-4" />
                              </button>
                              <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                              <button onClick={() => moveModule(index, 'down')} disabled={index === selectedModules.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                                <GripVertical className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-2xl">{moduleIcons[module.type]}</span>
                                  <div>
                                    <p className="font-semibold text-gray-900">{module.title}</p>
                                    <p className="text-sm text-gray-600 capitalize">{module.type}</p>
                                  </div>
                                </div>
                                <button onClick={() => removeModule(module.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-4 mt-3">
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2 text-center neu-shadow-inner">
                                  <p className="text-xs text-gray-600">Duration</p>
                                  <p className="font-semibold text-gray-900">{module.duration}m</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 text-center neu-shadow-inner">
                                  <p className="text-xs text-gray-600">XP Target</p>
                                  <p className="font-semibold text-purple-600">{module.xpTarget}</p>
                                </div>
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2 text-center neu-shadow-inner">
                                  <p className="text-xs text-gray-600">Difficulty</p>
                                  <p className={`text-xs font-semibold ${difficultyColors[module.difficulty].split(' ')[0]}`}>{module.difficulty}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </NeumorphicCard>
                        {index < selectedModules.length - 1 && (
                          <div className="flex justify-center py-2">
                            <ChevronRight className="h-6 w-6 text-purple-400 transform rotate-90" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </NeumorphicCard>
            </div>

            {/* Right Sidebar - Settings & Preview */}
            <div className="lg:col-span-1 space-y-6">
              {/* Path Summary */}
              <NeumorphicCard variant="gradient" size="lg">
                <h3 className="text-lg font-semibold gradient-text mb-4">📊 Path Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Modules</span>
                    <span className="font-bold text-purple-600">{selectedModules.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Duration</span>
                    <span className="font-bold text-blue-600">{stats.totalDuration} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total XP</span>
                    <span className="font-bold text-green-600">{stats.totalXP}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Est. Completion</span>
                    <span className="font-bold text-orange-600">{stats.estimatedDays} days</span>
                  </div>
                </div>
              </NeumorphicCard>

              {/* AI Suggestions */}
              <NeumorphicCard variant="gradient" size="lg" className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <div className="flex items-center mb-4">
                  <Brain className="h-5 w-5 mr-2" />
                  <h3 className="font-semibold">AI Suggestions</h3>
                </div>
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 neu-shadow-inner">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium">{suggestion.module}</p>
                        <Badge className={suggestion.priority === 'high' ? 'bg-red-500/20 text-red-100' : 'bg-yellow-500/20 text-yellow-100'}>
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-90 mb-2">{suggestion.reason}</p>
                      <NeumorphicButton variant="outline" size="sm" className="text-white border-white hover:bg-white/20">
                        Add to Path
                      </NeumorphicButton>
                    </div>
                  ))}
                </div>
              </NeumorphicCard>

              {/* Quick Settings */}
              <NeumorphicCard variant="default" size="lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target XP per day</label>
                    <NeumorphicInput defaultValue="150" type="number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Adjustment</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm neu-shadow-sm">
                      <option>Auto (AI-driven)</option>
                      <option>Fixed - Easy</option>
                      <option>Fixed - Medium</option>
                      <option>Fixed - Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm text-gray-700">Auto-adjust based on performance</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm text-gray-700">Enable AI recommendations</span>
                    </label>
                  </div>
                </div>
              </NeumorphicCard>
            </div>
          </div>

          {/* Preview */}
          {selectedModules.length > 0 && (
            <NeumorphicCard variant="gradient" size="lg" className="mt-6">
              <h3 className="text-lg font-semibold gradient-text mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Preview: Student View
              </h3>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 neu-shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-1">{pathName || 'Untitled Path'}</h4>
                    <p className="text-gray-600">{pathDescription}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total XP</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalXP}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <NeumorphicCard variant="default" className="text-center p-3">
                    <p className="text-2xl font-bold text-gray-900">{selectedModules.length}</p>
                    <p className="text-xs text-gray-600">Modules</p>
                  </NeumorphicCard>
                  <NeumorphicCard variant="default" className="text-center p-3">
                    <p className="text-2xl font-bold text-gray-900">{Math.round(stats.totalDuration / 60)}h</p>
                    <p className="text-xs text-gray-600">Duration</p>
                  </NeumorphicCard>
                  <NeumorphicCard variant="default" className="text-center p-3">
                    <p className="text-2xl font-bold text-gray-900">{stats.estimatedDays}</p>
                    <p className="text-xs text-gray-600">Days</p>
                  </NeumorphicCard>
                </div>
                <NeumorphicButton variant="primary" className="w-full">
                  <Play className="h-5 w-5 mr-2" />
                  Start Learning
                </NeumorphicButton>
              </div>
            </NeumorphicCard>
          )}
        </div>
      </div>
    </div>
  );
}
