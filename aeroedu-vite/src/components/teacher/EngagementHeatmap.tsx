/**
 * Engagement Heatmap
 * Visual representation of student engagement over time
 */

export default function EngagementHeatmap({ students }: any) {
  const days  = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  const hours = ['8h', '10h', '12h', '14h', '16h', '18h', '20h']

  // Generate mock heatmap data (seeded so it doesn't regenerate on re-render)
  const heatmapData = hours.map((_, hi) =>
    days.map((_, di) => Math.round(40 + ((hi * 7 + di * 13) % 60)))
  )

  const getColor = (value: number) => {
    if (value >= 80) return '#48bb78'
    if (value >= 60) return '#ed8936'
    return '#f56565'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Heatmap Engagement</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="pb-3 pr-3" />
              {days.map(day => (
                <th key={day} className="pb-3 px-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row, i) => (
              <tr key={i}>
                <td className="text-xs font-bold pr-3 py-2 text-gray-500">{hours[i]}</td>
                {row.map((value, j) => (
                  <td key={j} className="p-1">
                    <div
                      className="w-10 h-10 rounded-lg mx-auto flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: getColor(value) }}
                      title={`${value}% engagement`}
                    >
                      <span className="text-xs font-bold text-white drop-shadow">{value}</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-4 justify-center">
        {[
          { color: '#48bb78', label: 'Cao (80%+)' },
          { color: '#ed8936', label: 'TB (60-79%)' },
          { color: '#f56565', label: 'Thấp (<60%)' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
            <span className="text-xs font-medium text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
