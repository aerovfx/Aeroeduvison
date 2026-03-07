'use client';

import { BookOpen, TrendingDown, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminContentPage() {
  const { t } = useLanguage();
  
  const contents = [
    { title: 'Linear Equations Module', completion: 0.92, masteryGain: 0.15, dropOff: 0.05, quality: 9.2, needsReview: false },
    { title: 'Trigonometry Basics', completion: 0.65, masteryGain: 0.08, dropOff: 0.32, quality: 6.5, needsReview: true },
    { title: 'Quadratic Functions', completion: 0.88, masteryGain: 0.12, dropOff: 0.08, quality: 8.5, needsReview: false },
    { title: 'Calculus Introduction', completion: 0.55, masteryGain: 0.05, dropOff: 0.45, quality: 5.8, needsReview: true }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
        Content & Curriculum Monitor
      </h1>

      <div className="space-y-4">
        {contents.map((content, idx) => (
          <div key={idx} className={`bg-white rounded-xl shadow-sm border p-6 ${content.needsReview ? 'border-orange-300' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{content.title}</h3>
                  {content.needsReview && (
                    <span className="inline-flex items-center gap-1 text-sm text-orange-600 mt-1">
                      <AlertTriangle className="w-4 h-4" />
                      Needs Review
                    </span>
                  )}
                
              </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{content.quality}</p>
                <p className="text-xs text-gray-500">Quality Score</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(content.completion * 100)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Mastery Gain</p>
                <p className="text-2xl font-bold text-green-600">+{Math.round(content.masteryGain * 100)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Drop-off Rate</p>
                <p className="text-2xl font-bold text-red-600">{Math.round(content.dropOff * 100)}%</p>
              </div>
            </div>

            {content.needsReview && (
              <div className="mt-4 pt-4 border-t bg-orange-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                <p className="text-sm text-orange-800">
                  <strong>AI Suggestion:</strong> This content has high drop-off rate. Consider simplifying explanations or adding more visual aids.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

