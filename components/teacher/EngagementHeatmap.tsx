/**
 * Engagement Heatmap
 * Visual representation of student engagement over time
 */

'use client';

export default function EngagementHeatmap({ students }: any) {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const hours = ['8h', '10h', '12h', '14h', '16h', '18h', '20h'];
  
  // Generate mock heatmap data
  const heatmapData = hours.map(() => 
    days.map(() => Math.floor(Math.random() * 100))
  );

  const getColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    if (value >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Heatmap Engagement</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-xs text-gray-500 font-medium pb-2"></th>
              {days.map(day => (
                <th key={day} className="text-xs text-gray-500 font-medium pb-2 px-1">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row, i) => (
              <tr key={i}>
                <td className="text-xs text-gray-500 font-medium pr-2">{hours[i]}</td>
                {row.map((value, j) => (
                  <td key={j} className="p-1">
                    <div className={`w-8 h-8 rounded ${getColor(value)} opacity-${Math.floor(value/20)*20}`}></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

