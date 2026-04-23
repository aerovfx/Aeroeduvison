/**
 * Student List Component
 * Detailed list of students with XP analytics
 */

import { Eye, MessageSquare, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface StudentListProps {
  students: any[]
}

export default function StudentList({ students }: StudentListProps) {
  const navigate = useNavigate()

  const getEmotionEmoji = (emotion: string) => {
    const map: Record<string, string> = {
      excited: '😄', focused: '🎯', satisfied: '😊', neutral: '😐',
      confused: '😕', frustrated: '😤', tired: '😴', bored: '🥱',
    }
    return map[emotion] || '😐'
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-500" />
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Danh sách học sinh</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Học sinh</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Level</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Năng lực</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Động lực</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cảm xúc</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Xu hướng</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                      {student.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">Streak: {student.streak} ngày 🔥</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Lv {student.level}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-sm font-semibold text-gray-900">
                    {Math.round(student.xpSignal?.capability?.overallScore || 0)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {(student.xpSignal?.capability?.overallScore || 0) >= 80 ? 'Xuất sắc'
                      : (student.xpSignal?.capability?.overallScore || 0) >= 60 ? 'Tốt'
                      : 'Cần cải thiện'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${
                          (student.xpSignal?.motivation?.score || 0) >= 70 ? 'bg-green-500'
                          : (student.xpSignal?.motivation?.score || 0) >= 40 ? 'bg-yellow-500'
                          : 'bg-red-500'
                        }`}
                        style={{ width: `${student.xpSignal?.motivation?.score || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {Math.round(student.xpSignal?.motivation?.score || 0)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-2xl">{getEmotionEmoji(student.currentEmotion)}</div>
                  <div className="text-xs text-gray-500 capitalize">{student.currentEmotion}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center">
                    {getTrendIcon(student.xpSignal?.trends?.overall)}
                    {student.xpSignal?.trends?.atRisk && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                        At Risk
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => navigate(`/teacher/student/${student.id}`)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Xem
                  </button>
                  <button
                    onClick={() => navigate('/chat')}
                    className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Chat
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
