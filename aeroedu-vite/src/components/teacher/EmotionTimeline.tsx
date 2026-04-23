/**
 * Emotion Timeline
 * Track class emotional states over time
 */

export default function EmotionTimeline({ students }: any) {
  const totalStudents = students?.length || 1

  const emotions = [
    { emoji: '😄', label: 'Excited',    count: 12, color: '#48bb78' },
    { emoji: '🎯', label: 'Focused',    count: 18, color: '#4299e1' },
    { emoji: '😐', label: 'Neutral',    count: 8,  color: '#a0aec0' },
    { emoji: '😕', label: 'Confused',   count: 5,  color: '#ed8936' },
    { emoji: '😤', label: 'Frustrated', count: 3,  color: '#f56565' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Cảm xúc lớp học</h3>

      <div className="space-y-5">
        {emotions.map((emotion) => {
          const percentage = (emotion.count / totalStudents) * 100
          return (
            <div key={emotion.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{emotion.emoji}</span>
                  <span className="text-sm font-medium text-gray-600">{emotion.label}</span>
                </div>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-lg text-white"
                  style={{ backgroundColor: emotion.color }}
                >
                  {emotion.count}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: emotion.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
