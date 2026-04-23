/**
 * Class Overview Component
 * Charts and visualizations for class performance
 */

import { BarChart3, TrendingUp } from 'lucide-react'

interface ClassOverviewProps {
  students: any[]
  timeRange: string
}

export default function ClassOverview({ students, timeRange }: ClassOverviewProps) {
  const capabilityDistribution = {
    expert:       students.filter(s => (s.xpSignal?.capability?.overallScore || 0) >= 90).length,
    advanced:     students.filter(s => { const sc = s.xpSignal?.capability?.overallScore || 0; return sc >= 70 && sc < 90 }).length,
    intermediate: students.filter(s => { const sc = s.xpSignal?.capability?.overallScore || 0; return sc >= 50 && sc < 70 }).length,
    beginner:     students.filter(s => (s.xpSignal?.capability?.overallScore || 0) < 50).length,
  }

  const motivationDistribution = {
    high:   students.filter(s => (s.xpSignal?.motivation?.score || 0) >= 70).length,
    medium: students.filter(s => { const sc = s.xpSignal?.motivation?.score || 0; return sc >= 40 && sc < 70 }).length,
    low:    students.filter(s => (s.xpSignal?.motivation?.score || 0) < 40).length,
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
        Tổng quan lớp học
      </h3>

      <div className="grid grid-cols-2 gap-6">
        {/* Capability Distribution */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Phân bố năng lực</h4>
          <div className="space-y-3">
            {[
              { label: 'Expert (90-100%)',       count: capabilityDistribution.expert,       color: 'bg-green-500' },
              { label: 'Nâng cao (70-89%)',       count: capabilityDistribution.advanced,     color: 'bg-blue-500' },
              { label: 'Trung bình (50-69%)',     count: capabilityDistribution.intermediate, color: 'bg-yellow-500' },
              { label: 'Cơ bản (<50%)',           count: capabilityDistribution.beginner,     color: 'bg-red-500' },
            ].map((item) => {
              const percentage = students.length > 0 ? (item.count / students.length) * 100 : 0
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Motivation Distribution */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Phân bố động lực</h4>
          <div className="space-y-3">
            {[
              { label: 'Cao (≥70%)',          count: motivationDistribution.high,   color: 'bg-green-500' },
              { label: 'Trung bình (40-69%)', count: motivationDistribution.medium, color: 'bg-yellow-500' },
              { label: 'Thấp (<40%)',         count: motivationDistribution.low,    color: 'bg-red-500' },
            ].map((item) => {
              const percentage = students.length > 0 ? (item.count / students.length) * 100 : 0
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* XP Trend Chart */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
          Xu hướng XP ({timeRange})
        </h4>
        <div className="h-32 flex items-end justify-between space-x-2">
          {[65, 72, 68, 75, 78, 82, 85].map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-t-lg transition-all duration-500"
                style={{ height: `${value}%` }}
              />
              <span className="text-xs text-gray-500 mt-2">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
