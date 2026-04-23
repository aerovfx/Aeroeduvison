import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Brain, Target, TrendingUp, TrendingDown, Award,
  BookOpen, Clock, Star, Zap, MessageSquare, Edit, Save,
  BarChart3, Activity, Heart, AlertCircle, CheckCircle, Calendar,
} from 'lucide-react'

const TABS = ['overview', 'strengths', 'velocity', 'ai-feedback', 'notes'] as const
type Tab = typeof TABS[number]

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Tổng quan',
  strengths: 'Điểm mạnh',
  velocity: 'Tốc độ học',
  'ai-feedback': 'AI Phân tích',
  notes: 'Ghi chú',
}

export default function StudentInsightPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [student, setStudent] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    fetch(`/api/teacher/students/${studentId}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Học sinh không tồn tại' : 'Không thể tải dữ liệu')
        return r.json()
      })
      .then(d => setStudent(d.student))
      .catch(err => {
        // Demo fallback
        setStudent({
          id: studentId,
          name: 'Nguyễn Văn A',
          email: 'student@school.edu.vn',
          avatar: '👨‍🎓',
          streak: 7,
          engagement: 85,
          xp: 1250,
          level: 8,
          lastActive: '2 giờ trước',
          joinedAt: '2024-09-01',
          capability: 82,
          motivation: 78,
          emotion: '😊',
          completionRate: 88,
          avgScore: 8.2,
        })
      })
      .finally(() => setLoading(false))
  }, [studentId])

  const strengths = [
    { skill: 'Đại số', score: 92, trend: 'up' },
    { skill: 'Hình học', score: 88, trend: 'up' },
    { skill: 'Giải tích', score: 85, trend: 'stable' },
    { skill: 'Xác suất', score: 78, trend: 'down' },
    { skill: 'Logic toán học', score: 90, trend: 'up' },
  ]

  const weaknesses = [
    { topic: 'Phương trình vi phân', avgScore: 58, recommendation: 'Thêm bài tập cơ bản' },
    { topic: 'Tích phân', avgScore: 62, recommendation: 'Cần giảng giải chi tiết hơn' },
  ]

  const aiFeedback = [
    { category: 'Phong cách học', insight: 'Học sinh có xu hướng học tốt qua video và hình ảnh trực quan.', recommendation: 'Thêm visual modules và animation vào learning path.', confidence: 92 },
    { category: 'Mẫu tương tác', insight: 'Engagement cao nhất vào buổi sáng (8-10AM) và tối (7-9PM).', recommendation: 'Lên lịch bài tập quan trọng vào 2 khung giờ peak.', confidence: 88 },
    { category: 'Khoảng cách kỹ năng', insight: 'Học sinh mạnh về tư duy logic nhưng yếu về tính toán.', recommendation: 'Thêm drill exercises cho kỹ năng tính toán nhanh.', confidence: 85 },
    { category: 'Động lực', insight: 'Học sinh phản ứng tích cực với hệ thống XP và achievements.', recommendation: 'Tiếp tục khuyến khích qua gamification.', confidence: 95 },
  ]

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
        <p className="text-gray-600">Đang tải dữ liệu học sinh...</p>
      </div>
    </div>
  )

  if (!student) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-5 w-5 mr-2" /> Quay lại
        </button>
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy học sinh</h2>
          <button onClick={() => navigate('/teacher/dashboard')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Về Dashboard
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-4 text-sm">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Quay lại Dashboard
        </button>

        {/* Student Header Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{student.avatar || '👨‍🎓'}</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{student.name}</h1>
                <p className="text-gray-500 text-sm mb-2">{student.email}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {student.lastActive}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(student.joinedAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-500">🔥 {student.streak}</div>
                <div className="text-xs text-gray-500">ngày streak</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{student.xp}</div>
                <div className="text-xs text-gray-500">XP</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Lv.{student.level}</div>
                <div className="text-xs text-gray-500">Cấp độ</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Năng lực', value: `${student.capability}%`, color: 'text-purple-600', bg: 'bg-purple-50', icon: Brain },
            { label: 'Động lực', value: `${student.motivation}%`, color: 'text-green-600', bg: 'bg-green-50', icon: Zap },
            { label: 'Hoàn thành', value: `${student.completionRate}%`, color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle },
            { label: 'Điểm TB', value: student.avgScore, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Star },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> Điểm mạnh</h3>
              <div className="space-y-3">
                {strengths.slice(0, 3).map(s => (
                  <div key={s.skill}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{s.skill}</span>
                      <span className="font-semibold text-gray-900">{s.score}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-yellow-500" /> Cần cải thiện</h3>
              <div className="space-y-3">
                {weaknesses.map(w => (
                  <div key={w.topic} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">{w.topic}</span>
                      <span className="text-yellow-600">{w.avgScore}%</span>
                    </div>
                    <p className="text-xs text-gray-500">{w.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'strengths' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-6">Chi tiết kỹ năng</h3>
            <div className="space-y-4">
              {strengths.map(s => (
                <div key={s.skill}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{s.skill}</span>
                    <div className="flex items-center gap-2">
                      {s.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                      {s.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                      <span className="text-sm font-bold text-gray-900">{s.score}%</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full">
                    <div
                      className={`h-full rounded-full ${s.score >= 85 ? 'bg-green-500' : s.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'velocity' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-purple-600" /> Tốc độ học tập</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Bài/tuần', value: '1.8', sub: 'Trung bình lớp: 1.5' },
                { label: 'Nhất quán', value: '85%', sub: 'Streak 7 ngày' },
                { label: 'Xu hướng', value: 'Nhanh hơn', sub: 'So sánh tuần trước' },
                { label: 'Tổng bài học', value: '42', sub: 'Đã hoàn thành' },
              ].map(s => (
                <div key={s.label} className="p-4 bg-purple-50 rounded-xl text-center">
                  <div className="text-xl font-bold text-purple-700">{s.value}</div>
                  <div className="text-sm font-medium text-gray-900 mt-1">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai-feedback' && (
          <div className="space-y-4">
            {aiFeedback.map(f => (
              <div key={f.category} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h4 className="font-bold text-gray-900">{f.category}</h4>
                  </div>
                  <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-lg font-medium">
                    {f.confidence}% tin cậy
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{f.insight}</p>
                <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-800">{f.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Ghi chú giáo viên</h3>
              <button
                onClick={() => setEditingNotes(v => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg"
              >
                {editingNotes ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                {editingNotes ? 'Lưu' : 'Chỉnh sửa'}
              </button>
            </div>
            {editingNotes ? (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={6}
                placeholder="Nhập ghi chú về học sinh..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              />
            ) : notes ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{notes}</p>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có ghi chú. Nhấn &quot;Chỉnh sửa&quot; để thêm ghi chú.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
