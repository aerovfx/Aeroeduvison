/**
 * Emotion Timeline
 * Track class emotional states over time
 * Neumorphic Gradient Minimalism Style
 */

'use client';

export default function EmotionTimeline({ students }: any) {
  const emotions = [
    { emoji: '😄', label: 'Excited', count: 12, gradient: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' },
    { emoji: '🎯', label: 'Focused', count: 18, gradient: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)' },
    { emoji: '😐', label: 'Neutral', count: 8, gradient: 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)' },
    { emoji: '😕', label: 'Confused', count: 5, gradient: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)' },
    { emoji: '😤', label: 'Frustrated', count: 3, gradient: 'linear-gradient(135deg, #f56565 0%, #c53030 100%)' },
  ];

  const totalStudents = students?.length || 50;

  return (
    <div
      className="neu-card"
      style={{
        background: 'var(--neu-card-bg)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: `
          10px 10px 20px var(--neu-shadow-dark),
          -10px -10px 20px var(--neu-shadow-light),
          inset 1px 1px 2px var(--neu-shadow-inset-dark)
        `,
        border: '1px solid var(--neu-border)',
        transition: 'all 0.3s ease',
      }}
    >
      <h3
        className="text-lg font-bold mb-6"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Cảm xúc lớp học
      </h3>
      <div className="space-y-5">
        {emotions.map((emotion) => {
          const percentage = (emotion.count / totalStudents) * 100;
          return (
            <div key={emotion.label}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="text-2xl"
                    style={{
                      background: emotion.gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {emotion.emoji}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--neu-text-secondary)' }}>
                    {emotion.label}
                  </span>
                </div>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-lg"
                  style={{
                    background: 'var(--neu-card-bg)',
                    color: emotion.gradient.includes('#48bb78') ? 'var(--neu-accent-success)' :
                           emotion.gradient.includes('#4299e1') ? 'var(--neu-accent-info)' :
                           emotion.gradient.includes('#a0aec0') ? 'var(--neu-text-secondary)' :
                           emotion.gradient.includes('#ed8936') ? 'var(--neu-accent-warning)' :
                           'var(--neu-accent-danger)',
                    boxShadow: 'inset 2px 2px 4px var(--neu-shadow-inset-dark), inset -2px -2px 4px var(--neu-shadow-inset-light)',
                  }}
                >
                  {emotion.count}
                </span>
              </div>
              <div
                className="w-full rounded-full h-3"
                style={{
                  background: 'transparent',
                  boxShadow: 'inset 3px 3px 6px var(--neu-shadow-inset-dark), inset -3px -3px 6px var(--neu-shadow-inset-light)',
                }}
              >
                <div
                  className="h-3 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${percentage}%`,
                    background: emotion.gradient,
                    boxShadow: '2px 2px 4px rgba(0,0,0,0.2), -1px -1px 2px rgba(255,255,255,0.8)',
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

