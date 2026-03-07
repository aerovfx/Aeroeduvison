'use client';

import React, { useState } from 'react';
import { 
  Sparkles, FileText, Search, BookOpen, Brain, 
  ChevronRight, ArrowRight, Loader2, Save, Send,
  HelpCircle, Target, Layers, Globe
} from 'lucide-react';
import { OpenFangClient } from '@/lib/openfang';

export default function AiGeneratorPage() {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'topic' | 'url' | 'file'>('topic');
  const [contentType, setContentType] = useState<'quiz' | 'summary' | 'outline'>('quiz');

  const client = new OpenFangClient();

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setResult(null);

    try {
      const prompt = contentType === 'quiz' 
        ? `Tạo bộ 5 câu hỏi trắc nghiệm kèm đáp án về chủ đề: ${topic}. Trả về định dạng Markdown rõ ràng.`
        : contentType === 'summary'
        ? `Tổng hợp kiến thức trọng tâm về chủ đề: ${topic}. Cung cấp các ý chính súc tích.`
        : `Lập kế hoạch nội dung chi tiết cho bài giảng về: ${topic}.`;

      const response = await client.chat(prompt, 'researcher');
      setResult(response.response);
    } catch (error) {
      console.error('Generation error:', error);
      setResult("### ❌ Lỗi\n\nKhông thể kết nối với hệ thống Open Fang Researcher. Vui lòng thử lại sau.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 pt-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-bold tracking-wider uppercase">Open Fang Integration</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              AI Content <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Generator</span>
            </h1>
            <p className="text-gray-500 mt-2 max-w-xl">
              Sử dụng sức mạnh của Open Fang Researcher Hand để tạo đề thi, tóm tắt bài học và lập kế hoạch giảng dạy tự động từ dữ liệu web.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
              <BookOpen className="w-4 h-4" />
              Library
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25">
              <Save className="w-4 h-4" />
              Cloud Save
            </button>
          </div>
        </div>

        {/* Interaction Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Input Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Brain className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight">Cấu hình thông minh</h2>
              </div>

              {/* Source Tabs */}
              <div className="flex p-1 bg-gray-50 rounded-2xl mb-6">
                <button 
                  onClick={() => setActiveTab('topic')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'topic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Topic
                </button>
                <button 
                  onClick={() => setActiveTab('url')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  URL
                </button>
                <button 
                  onClick={() => setActiveTab('file')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  File
                </button>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Nhập chủ đề nghiên cứu</label>
                  <div className="mt-1.5 relative">
                    <input 
                      type="text" 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={activeTab === 'topic' ? "Vd: Định luật Hooke, Sóng hấp dẫn..." : activeTab === 'url' ? "https://example.com/article" : "Upload file tài liệu..."}
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Loại nội dung</label>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {[
                      { id: 'quiz', label: 'Create Quiz', icon: HelpCircle, color: 'indigo' },
                      { id: 'summary', label: 'Lesson Summary', icon: Target, color: 'blue' },
                      { id: 'outline', label: 'Course Pipeline', icon: Layers, color: 'purple' },
                    ].map((type) => (
                      <button 
                        key={type.id}
                        onClick={() => setContentType(type.id as any)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all group ${contentType === type.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-50 bg-white hover:border-gray-200'}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${contentType === type.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                          <type.icon className="w-5 h-5" />
                        </div>
                        <span className={`text-sm font-bold ${contentType === type.id ? 'text-indigo-900' : 'text-gray-600'}`}>{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                disabled={isGenerating || !topic.trim()}
                onClick={handleGenerate}
                className={`mt-8 w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${isGenerating ? 'bg-gray-100 text-gray-500' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98]'}`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang phân tích dữ liệu...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Kích hoạt Open Fang Generator
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Results Display */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden min-h-[600px] flex flex-col`}>
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-50 bg-gray-50/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                  <span className="ml-4 text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase">Open Fang Console — {contentType.toUpperCase()}</span>
                </div>
                {result && (
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-indigo-600 transition-all shadow-sm border border-transparent hover:border-gray-100">
                      <Save className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-indigo-600 transition-all shadow-sm border border-transparent hover:border-gray-100">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Content area */}
              <div className="flex-1 p-8 overflow-y-auto">
                {!result && !isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-200 border border-indigo-100">
                      <Globe className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Sẵn sàng nghiên cứu</h3>
                      <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">
                        Nhập chủ đề bên trái và hệ thống Open Fang Researcher sẽ tổng hợp dữ liệu thời gian thực cho bạn.
                      </p>
                    </div>
                    <div className="pt-4 grid grid-cols-2 gap-3 w-full max-w-sm">
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-left">
                            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                <Search className="w-3 h-3" />
                                Deep Search
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-1">Truy vấn đa nguồn từ Internet.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-left">
                            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                <FileText className="w-3 h-3" />
                                Smart Parse
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-1">Chuyển đổi dữ liệu sang học liệu.</p>
                        </div>
                    </div>
                  </div>
                ) : isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-4 border-indigo-50 border-t-indigo-600 animate-spin"></div>
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="mt-8 text-center animate-bounce">
                      <p className="font-bold text-indigo-900">Open Fang đang "đào bới" tri thức...</p>
                      <p className="text-sm text-gray-400 mt-1 italic italic">Đang phân tích các nguồn tài liệu tin cậy</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-indigo max-w-none animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed text-sm">
                      {result}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 tracking-widest uppercase py-4 border-t border-gray-100">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Search className="w-3 h-3" /> Researcher API: Connected</span>
            <span className="flex items-center gap-1.5"><Brain className="w-3 h-3" /> Kernel: Active</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Open Fang Agent OS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
