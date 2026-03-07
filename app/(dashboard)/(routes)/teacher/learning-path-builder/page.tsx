'use client';

import { useState } from 'react';
import { 
  Plus, Brain, BookOpen, FileQuestion, FolderKanban, Save, Eye,
  Settings, Zap, Target, Clock, Award, ChevronRight, Trash2,
  GripVertical, Play, Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
  
  const router = useRouter();
  const [pathName, setPathName] = useState('');
  const [pathDescription, setPathDescription] = useState('');
  const [selectedModules, setSelectedModules] = useState<Module[]>([]);
  const [availableModules] = useState<Module[]>([
    {
      id: 'math-derivatives-1',
      type: 'lesson',
      title: 'Giới thiệu Đạo hàm',
      subject: 'mathematics',
      difficulty: 'easy',
      duration: 30,
      xpTarget: 80
    },
    {
      id: 'math-derivatives-2',
      type: 'lesson',
      title: 'Quy tắc tính đạo hàm',
      subject: 'mathematics',
      difficulty: 'medium',
      duration: 45,
      xpTarget: 120
    },
    {
      id: 'math-quiz-1',
      type: 'quiz',
      title: 'Kiểm tra Đạo hàm',
      subject: 'mathematics',
      difficulty: 'medium',
      duration: 20,
      xpTarget: 100
    },
    {
      id: 'math-integrals-1',
      type: 'lesson',
      title: 'Tích phân cơ bản',
      subject: 'mathematics',
      difficulty: 'hard',
      duration: 60,
      xpTarget: 150,
      prerequisites: ['math-derivatives-2']
    },
    {
      id: 'math-project-1',
      type: 'project',
      title: 'Dự án: Ứng dụng Giải tích',
      subject: 'mathematics',
      difficulty: 'hard',
      duration: 90,
      xpTarget: 200
    }
  ]);

  const [aiSuggestions] = useState([
    {
      module: 'Bài tập Logic nâng cao',
      reason: 'Học sinh mạnh về logic (90%), nên thử thách hơn',
      priority: 'high'
    },
    {
      module: 'Drill: Tính toán nhanh',
      reason: '2 học sinh yếu về tính toán, cần luyện tập',
      priority: 'medium'
    },
    {
      module: 'Video: Hình học không gian',
      reason: 'Lớp có xu hướng học tốt qua visual content',
      priority: 'high'
    }
  ]);

  const addModule = (module: Module) => {
    setSelectedModules([...selectedModules, module]);
  };

  const removeModule = (moduleId: string) => {
    setSelectedModules(selectedModules.filter(m => m.id !== moduleId));
  };

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
    const estimatedDays = Math.ceil(totalDuration / 60); // 1 hour per day
    
    return { totalDuration, totalXP, estimatedDays };
  };

  const savePath = () => {
    const pathData = {
      id: `path-${Date.now()}`,
      name: pathName,
      description: pathDescription,
      modules: selectedModules,
      createdAt: new Date().toISOString(),
      createdBy: 'teacher@example.com'
    };
    
    // Save to localStorage (in production, save to DB)
    const savedPaths = JSON.parse(localStorage.getItem('teacher-learning-paths') || '[]');
    savedPaths.push(pathData);
    localStorage.setItem('teacher-learning-paths', JSON.stringify(savedPaths));
    
    alert('Learning Path saved successfully!');
    router.push('/teacher/dashboard');
  };

  const stats = getTotalStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎓 Learning Path Builder
          </h1>
          <p className="text-gray-600">
            Tạo lộ trình học tập cá nhân hóa với sự hỗ trợ của AI
          </p>
        </div>

        {/* Path Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên Learning Path
              </label>
              <input
                type="text"
                value={pathName}
                onChange={(e) => setPathName(e.target.value)}
                placeholder="Ví dụ: Giải tích cơ bản - 2 tuần"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <input
                type="text"
                value={pathDescription}
                onChange={(e) => setPathDescription(e.target.value)}
                placeholder="Mô tả ngắn gọn về lộ trình"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Available Modules */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📦 Available Modules
            </h3>
            
            <div className="space-y-3">
              {availableModules.map((module) => (
                <div
                  key={module.id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-purple-400 transition-colors cursor-pointer"
                  onClick={() => addModule(module)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">
                      {module.type === 'lesson' && '📖'}
                      {module.type === 'quiz' && '📝'}
                      {module.type === 'project' && '🎯'}
                      {module.type === 'assignment' && '📋'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      module.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                      module.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {module.difficulty}
                    </span>
                  
              </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{module.title}</p>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {module.duration}m
                    </span>
                    <span className="flex items-center">
                      <Zap className="h-3 w-3 mr-1" />
                      {module.xpTarget} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Module
            </button>
          </div>

          {/* Center - Path Canvas */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                🗺️ Learning Path Canvas
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedModules([])}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Clear All
                </button>
                <button
                  onClick={savePath}
                  disabled={selectedModules.length === 0 || !pathName}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Path
                </button>
              </div>
            </div>

            {selectedModules.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Drag modules from the left sidebar or click to add them to your learning path
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedModules.map((module, index) => (
                  <div key={`${module.id}-${index}`} className="relative">
                    <div className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => moveModule(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                          <button
                            onClick={() => moveModule(index, 'down')}
                            disabled={index === selectedModules.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">
                                {module.type === 'lesson' && '📖'}
                                {module.type === 'quiz' && '📝'}
                                {module.type === 'project' && '🎯'}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-900">{module.title}</p>
                                <p className="text-sm text-gray-600 capitalize">{module.type}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeModule(module.id)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mt-3">
                            <div className="bg-white rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-600">Duration</p>
                              <p className="font-semibold text-gray-900">{module.duration}m</p>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-600">XP Target</p>
                              <p className="font-semibold text-purple-600">{module.xpTarget}</p>
                            </div>
                            <div className="bg-white rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-600">Difficulty</p>
                              <p className={`text-xs font-semibold ${
                                module.difficulty === 'easy' ? 'text-green-600' :
                                module.difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {module.difficulty}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Arrow to next module */}
                    {index < selectedModules.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ChevronRight className="h-6 w-6 text-purple-400 transform rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar - Settings & Preview */}
          <div className="space-y-6">
            {/* Path Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Path Summary
              </h3>
              
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

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Average Difficulty:</p>
                <div className="flex space-x-1">
                  <div className="flex-1 bg-green-200 h-2 rounded-l-full"></div>
                  <div className="flex-1 bg-yellow-200 h-2"></div>
                  <div className="flex-1 bg-red-200 h-2 rounded-r-full"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Easy</span>
                  <span>Medium</span>
                  <span>Hard</span>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center mb-4">
                <Brain className="h-5 w-5 mr-2" />
                <h3 className="font-semibold">AI Suggestions</h3>
              </div>
              
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium">{suggestion.module}</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        suggestion.priority === 'high' ? 'bg-red-500/20 text-red-100' :
                        'bg-yellow-500/20 text-yellow-100'
                      }`}>
                        {suggestion.priority}
                      </span>
                    </div>
                    <p className="text-xs opacity-90 mb-2">{suggestion.reason}</p>
                    <button className="text-xs bg-white text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors">
                      Add to Path
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Settings */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target XP per day
                  </label>
                  <input
                    type="number"
                    defaultValue="150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Adjustment
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
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
            </div>
          </div>
        </div>

        {/* Preview */}
        {selectedModules.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Preview: Student View
            </h3>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6">
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
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedModules.length}</p>
                  <p className="text-xs text-gray-600">Modules</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{Math.round(stats.totalDuration / 60)}h</p>
                  <p className="text-xs text-gray-600">Duration</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.estimatedDays}</p>
                  <p className="text-xs text-gray-600">Days</p>
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center justify-center">
                <Play className="h-5 w-5 mr-2" />
                Start Learning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

