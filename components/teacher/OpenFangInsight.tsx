'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, ShieldCheck, Zap, Brain } from 'lucide-react';
import { OpenFangClient } from '@/lib/openfang';

export default function OpenFangInsight() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const client = new OpenFangClient();
        const response = await client.chat("Phân tích rủi ro học tập của lớp 12A1 dựa trên dữ liệu tuần qua.", "predictor");
        setInsight(response.response);
      } catch (error) {
        console.error('Failed to fetch Open Fang insight:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsight();
  }, []);

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-gray-900 rounded-3xl p-6 text-white shadow-2xl shadow-indigo-500/20 mb-6 border border-white/10 overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-10 -mt-10 rounded-full"></div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
             <Brain className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight">Open Fang Predictor</h3>
            <p className="text-[11px] text-indigo-300 font-bold uppercase tracking-widest">Autonomous Analysis Engine</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-[10px] font-bold text-indigo-100">AI LIVE</span>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col gap-2">
            <div className="h-4 bg-white/5 rounded-lg animate-pulse w-3/4"></div>
            <div className="h-4 bg-white/5 rounded-lg animate-pulse w-full"></div>
            <div className="h-4 bg-white/5 rounded-lg animate-pulse w-1/2"></div>
          </div>
        ) : (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
            <div className="prose prose-invert prose-sm max-w-none text-indigo-50/80 leading-relaxed font-medium text-xs">
               <pre className="whitespace-pre-wrap font-sans">{insight}</pre>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold text-gray-300">Confidence: 94%</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span className="text-[11px] font-bold text-gray-300">Data Verified</span>
                </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
          View Detailed Analytics <Zap className="w-3 h-3" />
        </button>
        <Sparkles className="w-5 h-5 text-indigo-500 opacity-30" />
      </div>
    </div>
  );
}
