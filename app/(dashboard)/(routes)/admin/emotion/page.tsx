'use client';

import { Heart, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminEmotionPage() {
  const { t } = useLanguage();
  
  const heatmapData = Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 8 }, (_, hour) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day],
      hour: `${8 + hour}:00`,
      engagement: Math.random() * 100
    }))
  ).flat();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Emotion & Engagement Monitor
        </h1>
        <p className="text-gray-600">Real-time emotional state tracking</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-600" />
          Engagement Heatmap
        </h2>
        <div className="grid grid-cols-8 gap-2">
          {heatmapData.map((cell, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium"
              style={{
                backgroundColor: `rgba(59, 130, 246, ${cell.engagement / 100})`,
                color: cell.engagement > 50 ? 'white' : '#1f2937'
              }}
              title={`${cell.day} ${cell.hour}: ${Math.round(cell.engagement)}%`}
            >
              {Math.round(cell.engagement)}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {['Excited', t('emotion.focused'), 'Confused', 'Frustrated', 'Bored', 'Anxious'].map((emotion, idx) => {
          const value = Math.random() * 40;
          return (
            <div key={idx} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{emotion}</span>
                <span className="text-sm text-gray-600">{Math.round(value)}%</span>
              
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

