/**
 * Engagement Heatmap
 * Visual representation of student engagement over time
 * Neumorphic Gradient Minimalism Style
 */

'use client';

export default function EngagementHeatmap({ students }: any) {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const hours = ['8h', '10h', '12h', '14h', '16h', '18h', '20h'];

  // Generate mock heatmap data
  const heatmapData = hours.map(() =>
    days.map(() => Math.floor(Math.random() * 100))
  );

  const getGradient = (value: number) => {
    if (value >= 80) return 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
    if (value >= 60) return 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)';
    if (value >= 40) return 'linear-gradient(135deg, #f56565 0%, #c53030 100%)';
    return 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
  };

  const getGlowColor = (value: number) => {
    if (value >= 80) return 'rgba(72, 187, 120, 0.4)';
    if (value >= 60) return 'rgba(237, 137, 54, 0.4)';
    return 'rgba(245, 101, 101, 0.4)';
  };

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
        Heatmap Engagement
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-xs font-bold pb-3 pr-3" style={{ color: 'var(--neu-text-secondary)' }}></th>
              {days.map(day => (
                <th
                  key={day}
                  className="text-xs font-bold pb-3 px-2"
                  style={{
                    color: 'var(--neu-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row, i) => (
              <tr key={i}>
                <td
                  className="text-xs font-bold pr-3 py-2"
                  style={{ color: 'var(--neu-text-secondary)' }}
                >
                  {hours[i]}
                </td>
                {row.map((value, j) => (
                  <td key={j} className="p-1">
                    <div
                      className="w-10 h-10 rounded-lg mx-auto transition-all duration-300 hover:scale-110"
                      style={{
                        background: getGradient(value),
                        boxShadow: `
                          3px 3px 6px var(--neu-shadow-dark),
                          -3px -3px 6px var(--neu-shadow-light),
                          0 0 12px ${getGlowColor(value)}
                        `,
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                      title={`${value}% engagement`}
                    >
                      <div
                        className="w-full h-full flex items-center justify-center text-xs font-bold"
                        style={{
                          color: 'white',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div
        className="mt-6 flex flex-wrap gap-4 justify-center"
        style={{
          background: 'var(--neu-card-bg)',
          borderRadius: '14px',
          padding: '16px',
          boxShadow: 'inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)',
          border: '1px solid var(--neu-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{
              background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
              boxShadow: '2px 2px 4px rgba(0,0,0,0.2)',
            }}
          ></div>
          <span className="text-xs font-medium" style={{ color: 'var(--neu-text-secondary)' }}>Cao (80%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{
              background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
              boxShadow: '2px 2px 4px rgba(0,0,0,0.2)',
            }}
          ></div>
          <span className="text-xs font-medium" style={{ color: 'var(--neu-text-secondary)' }}>TB (60-79%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{
              background: 'linear-gradient(135deg, #f56565 0%, #c53030 100%)',
              boxShadow: '2px 2px 4px rgba(0,0,0,0.2)',
            }}
          ></div>
          <span className="text-xs font-medium" style={{ color: 'var(--neu-text-secondary)' }}>Thấp (&lt;60%)</span>
        </div>
      </div>
    </div>
  );
}

