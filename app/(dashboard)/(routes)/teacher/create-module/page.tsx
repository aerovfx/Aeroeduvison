'use client';

import { useState } from 'react';
import { Brain, Sparkles, FileText, Video, BookOpen, Zap } from 'lucide-react';
import { updateButtonHandlers } from '../update-event-handlers';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreateModulePage() {
  const { t } = useLanguage();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');

  const moduleTypes = [
    {
      id: 'lesson',
      title: '📚 Bài học',
      description: 'Tạo bài học với nội dung chi tiết',
      icon: BookOpen,
      color: 'bg-blue-500'
    },
    {
      id: 'quiz',
      title: '🧩 Quiz',
      description: 'Tạo câu hỏi trắc nghiệm',
      icon: FileText,
      color: 'bg-green-500'
    },
    {
      id: 'video',
      title: '🎥 Video',
      description: 'Tạo nội dung video học tập',
      icon: Video,
      color: 'bg-purple-500'
    },
    {
      id: 'assignment',
      title: '📝 Bài tập',
      description: 'Tạo bài tập thực hành',
      icon: Zap,
      color: 'bg-orange-500'
    }
  ];

  const handleGenerate = async (type: string) => {
    setIsGenerating(true);
    setSelectedType(type);

    try {
      // Use centralized event handler
      updateButtonHandlers.handleGenerateContent(type);
      
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success notification
      alert(`✅ Đã tạo ${moduleTypes.find(m => m.id === type)?.title} thành công!`);
      
    } catch (error) {
      console.error(`❌ [AI Content Gen] Error generating ${type}:`, error);
      alert(`❌ Lỗi khi tạo nội dung. Vui lòng thử lại.`);
    } finally {
      setIsGenerating(false);
      setSelectedType('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Sparkles className="w-8 h-8" />
            
              </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">✨ AI Content Generator</h1>
              <p className="text-purple-100">Tạo nội dung học tập thông minh với AI</p>
            </div>
          </div>
        </div>

        {/* Module Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {moduleTypes.map((module) => (
            <div
              key={module.id}
              className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 ${
                selectedType === module.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
              }`}
              onClick={() => handleGenerate(module.id)}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`p-4 rounded-xl ${module.color} mb-4`}>
                  <module.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {module.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {module.description}
                </p>
                <button
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                    isGenerating && selectedType === module.id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white'
                  }`}
                  disabled={isGenerating}
                >
                  {isGenerating && selectedType === module.id ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang tạo...</span>
                    </div>
                  ) : (
                    'Tạo với AI'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* AI Features */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Brain className="w-6 h-6 mr-3 text-purple-600" />
            Tính năng AI
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Cá nhân hóa</h3>
              <p className="text-gray-600 text-sm">Nội dung phù hợp với trình độ học sinh</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Tốc độ cao</h3>
              <p className="text-gray-600 text-sm">Tạo nội dung trong vài giây</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Thông minh</h3>
              <p className="text-gray-600 text-sm">AI hiểu ngữ cảnh và tạo nội dung chất lượng</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
