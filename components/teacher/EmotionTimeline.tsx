/**
 * Emotion Timeline
 * Track class emotional states over time
 */

'use client';

export default function EmotionTimeline({ students }: any) {
  const emotions = [
    { emoji: '😄', label: 'Excited', count: 12, color: 'bg-green-500' },
    { emoji: '🎯', label: 'Focused', count: 18, color: 'bg-blue-500' },
    { emoji: '😐', label: 'Neutral', count: 8, color: 'bg-gray-500' },
    { emoji: '😕', label: 'Confused', count: 5, color: 'bg-yellow-500' },
    { emoji: '😤', label: 'Frustrated', count: 3, color: 'bg-red-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Cảm xúc lớp học</h3>
      <div className="space-y-4">
        {emotions.map((emotion) => {
          const percentage = (emotion.count / students.length) * 100;
          return (
            <div key={emotion.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{emotion.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{emotion.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{emotion.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${emotion.color} h-3 rounded-full transition-all`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

