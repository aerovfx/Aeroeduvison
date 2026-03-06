'use client';

import React, { useState } from 'react';
import { Search, Compass, Book, ArrowRight, Brain, Filter, Sparkles, Database } from 'lucide-react';
import { OpenFangClient } from '@/lib/openfang';

export default function SemanticLibrary() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'concepts' | 'logic'>('content');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    
    try {
      const client = new OpenFangClient();
      const prompt = `Tìm hiểu kiến thức liên quan đến: "${query}". Sử dụng trí tuệ của Open Fang để liệt kê nội dung, định nghĩa và logic kiến thức liên quan.`;
      const response = await client.chat(prompt, 'researcher');
      
      // We'll simulate search results based on the response content
      // Realistically we'd call a semantic search API, but here we use the agent as a search engine
      const searchData = [
          {
              title: `Kết quả từ Open Fang Knowledge Graph for: ${query}`,
              content: response.response,
              type: 'semantic',
              score: 0.98
          }
      ];
      setResults(searchData);
    } catch (error) {
      console.error('Semantic search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 bg-[#F8FAFC]">
      {/* Search Header */}
      <div className="mb-12 relative overflow-hidden rounded-[2.5rem] bg-[#0F172A] p-12 text-white shadow-2xl">
         {/* Background pattern */}
         <div className="absolute inset-0 opacity-10 flex flex-wrap gap-4 overflow-hidden -rotate-12 scale-150">
            {Array.from({length: 200}).map((_, i) => (
                <Database key={i} className="w-8 h-8"/>
            ))}
         </div>

         <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-4">
                 <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                    <Sparkles className="w-7 h-7" />
                 </div>
                 <h1 className="text-4xl font-black tracking-tight uppercase italic">Semantic Library</h1>
            </div>
            <p className="text-indigo-200/80 mb-8 max-w-xl font-medium">Tìm kiếm tri thức thông minh qua hệ thống Open Fang Agent OS. Không chỉ từ khóa, chúng tôi hiểu được logic kiến thức.</p>
            
            <div className="w-full max-w-2xl group flex items-center bg-white rounded-2xl p-2 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.3)] transition-all focus-within:ring-4 focus-within:ring-indigo-500/30">
                <Search className="w-6 h-6 text-gray-400 ml-4 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Những kiến thức nào là tiền đề cho Logarit?..." 
                    className="flex-1 px-4 py-3 bg-transparent border-none text-gray-800 placeholder:text-gray-400 focus:ring-0 text-lg font-medium"
                />
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-40"
                >
                    {loading ? 'Đang phân tích...' : 'Tìm kiếm Sâu'}
                </button>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
         {/* Sidebar Navigation */}
         <div className="col-span-12 lg:col-span-3 space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-4">Lọc bởi Open Fang</h3>
            <div className="bg-white rounded-3xl p-3 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col gap-1">
                <button 
                    onClick={() => setActiveTab('content')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${activeTab === 'content' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Book className="w-5 h-5" /> 
                    Nội dung bài học
                </button>
                <button 
                    onClick={() => setActiveTab('concepts')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${activeTab === 'concepts' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Brain className="w-5 h-5" /> 
                    Định nghĩa Concepts
                </button>
                <button 
                    onClick={() => setActiveTab('logic')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${activeTab === 'logic' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Compass className="w-5 h-5" /> 
                    Logic & Tiền đề
                </button>
            </div>
         </div>

         {/* Results Area */}
         <div className="col-span-12 lg:col-span-9">
            {results.length > 0 ? (
                <div className="space-y-6">
                    {results.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/40 border border-gray-100 group hover:border-indigo-500/30 transition-all">
                             <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase tracking-tighter bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">
                                    Semantic Score {Math.round(item.score * 100)}%
                                </span>
                                <div className="flex gap-2">
                                     <div className="px-3 py-1 rounded-lg bg-gray-50 text-[10px] font-bold text-gray-400 border border-gray-100 italic">Open Fang Knowledge Graph</div>
                                </div>
                             </div>
                             <h2 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors uppercase italic">{item.title}</h2>
                             <div className="text-gray-600 text-sm leading-relaxed mb-6 font-medium bg-[#F9FAFB] p-6 rounded-2xl prose prose-indigo max-w-none">
                                <pre className="whitespace-pre-wrap font-sans text-gray-700">{item.content}</pre>
                             </div>
                             <button className="flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-tight group/btn">
                                Xem chi tiết tài liệu học tập <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                             </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-50 text-center">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Search className="w-10 h-10 text-gray-200" />
                    </div>
                    <h3 className="text-xl font-black text-gray-400 italic italic">Tìm kiếm sâu mọi kiến thức...</h3>
                    <p className="text-gray-400 text-sm font-medium mt-2">Dùng trí tuệ nhân tạo của Open Fang để tìm kiếm thông minh hơn.</p>
                </div>
            )}
         </div>
      </div>
    </div>
  );
}
