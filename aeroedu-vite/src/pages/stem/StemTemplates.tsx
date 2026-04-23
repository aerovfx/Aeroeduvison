import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, Download, CheckCircle2, Clock, Zap } from 'lucide-react'

// Types
interface TemplateProject {
  id: string
  title: string
  description: string
  category: 'Science' | 'Technology' | 'Engineering' | 'Math'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: string
  tags: string[]
  features: string[]
  rating: number
  downloads: number
  author: string
}

interface STEMProject {
  id: string
  title: string
  description: string
  category: 'Science' | 'Technology' | 'Engineering' | 'Math'
  status: 'draft' | 'in-progress' | 'review' | 'completed' | 'published'
  teamMembers: Array<{ id: string; name: string; role: string }>
  instructor: { id: string; name: string }
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  progress: number
  milestones: Array<{ id: string; title: string; status: string; dueDate: string }>
  feedback: Array<{ id: string; author: string; content: string; date: string; type: string }>
  isPublic: boolean
}

// Template data
const TEMPLATES: TemplateProject[] = [
  {
    id: 't1',
    title: 'Smart Home Automation',
    description: 'Hệ thống nhà thông minh điều khiển đèn, quạt qua smartphone',
    category: 'Technology',
    difficulty: 'intermediate',
    duration: '4-6 tuần',
    tags: ['IoT', 'Arduino', 'Mobile App'],
    features: ['Điều khiển từ xa', 'Lập lịch tự động', 'Cảm biến nhiệt độ', 'Báo động an ninh'],
    rating: 4.8,
    downloads: 1250,
    author: 'Thầy Nguyễn IoT',
  },
  {
    id: 't2',
    title: 'AI Chatbot for Education',
    description: 'Chatbot AI hỗ trợ học tập và trả lời câu hỏi',
    category: 'Technology',
    difficulty: 'advanced',
    duration: '6-8 tuần',
    tags: ['AI', 'NLP', 'Python'],
    features: ['Trả lời tự nhiên', 'Gợi ý tài liệu', 'Theo dõi tiến độ'],
    rating: 4.9,
    downloads: 2100,
    author: 'Cô Trần AI',
  },
  {
    id: 't3',
    title: 'Water Quality Monitoring',
    description: 'Giám sát chất lượng nước với cảm biến IoT và dashboard',
    category: 'Science',
    difficulty: 'intermediate',
    duration: '3-5 tuần',
    tags: ['IoT', 'Environment', 'Data'],
    features: ['Đo pH và nhiệt độ', 'Cảnh báo ô nhiễm', 'Dashboard realtime'],
    rating: 4.6,
    downloads: 890,
    author: 'Thầy Lê Môi trường',
  },
  {
    id: 't4',
    title: 'Renewable Energy Calculator',
    description: 'Tính toán và tối ưu hóa hệ thống năng lượng tái tạo',
    category: 'Engineering',
    difficulty: 'beginner',
    duration: '2-3 tuần',
    tags: ['Energy', 'Math', 'Simulation'],
    features: ['Tính công suất pin mặt trời', 'Mô phỏng tiêu thụ', 'So sánh chi phí'],
    rating: 4.5,
    downloads: 650,
    author: 'Cô Phạm Năng lượng',
  },
  {
    id: 't5',
    title: 'Math Visualization Tool',
    description: 'Công cụ trực quan hóa các khái niệm toán học nâng cao',
    category: 'Math',
    difficulty: 'beginner',
    duration: '2-4 tuần',
    tags: ['Math', 'Visualization', 'Education'],
    features: ['Đồ thị hàm số', 'Hình học không gian', 'Animation'],
    rating: 4.7,
    downloads: 980,
    author: 'Thầy Hoàng Toán',
  },
  {
    id: 't6',
    title: 'Earthquake Early Warning',
    description: 'Hệ thống cảnh báo động đất dựa trên cảm biến địa chấn và AI',
    category: 'Engineering',
    difficulty: 'advanced',
    duration: '6-8 tuần',
    tags: ['IoT', 'AI', 'Safety'],
    features: ['Phát hiện rung chấn', 'Cảnh báo sớm', 'Phân tích dữ liệu'],
    rating: 4.9,
    downloads: 1560,
    author: 'Thầy Đức Địa chất',
  },
]

const CAT_COLOR: Record<string, string> = {
  Science: 'text-blue-400 bg-blue-600/10',
  Technology: 'text-emerald-400 bg-emerald-600/10',
  Engineering: 'text-orange-400 bg-orange-600/10',
  Math: 'text-purple-400 bg-purple-600/10',
}

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
  intermediate: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
  advanced: 'bg-red-600/20 text-red-300 border-red-500/30',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
}

export default function StemTemplates() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateProject | null>(null)

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((template) => {
      const matchSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchCategory = categoryFilter === 'All' || template.category === categoryFilter

      return matchSearch && matchCategory
    })
  }, [searchTerm, categoryFilter])

  const handleUseTemplate = (template: TemplateProject) => {
    const templateData = {
      title: template.title,
      description: template.description,
      category: template.category,
      difficulty: template.difficulty,
      tags: template.tags,
    }
    navigate(
      `/dashboard/stem/create?template=${encodeURIComponent(JSON.stringify(templateData))}`
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white/85">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 pt-8 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/dashboard/stem"
            className="p-2 hover:bg-white/[0.08] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Mẫu dự án STEM</h1>
            <p className="text-white/50 text-sm mt-1">Chọn mẫu để bắt đầu nhanh hơn</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="border-b border-white/[0.06] px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm mẫu..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
          />

          <div className="flex gap-2 flex-wrap">
            {['All', 'Science', 'Technology', 'Engineering', 'Math'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                {cat === 'All' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates grid */}
      <div className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {filteredTemplates.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-white/50">Không tìm thấy mẫu nào phù hợp</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] p-5 cursor-pointer transition-all hover:bg-white/[0.04] group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        CAT_COLOR[template.category] || CAT_COLOR.Science
                      }`}
                    >
                      {template.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-400">{template.rating}</span>
                    </div>
                  </div>

                  {/* Title & description */}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {template.title}
                  </h3>
                  <p className="text-xs text-white/40 line-clamp-2 mb-3">{template.description}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-white/50 mb-3 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {template.duration}
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-lg border ${DIFFICULTY_COLOR[template.difficulty] || DIFFICULTY_COLOR.beginner}`}
                    >
                      {DIFFICULTY_LABEL[template.difficulty] || 'Cơ bản'}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Features */}
                  <div className="space-y-1.5 mb-4">
                    {template.features.slice(0, 3).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Author & downloads */}
                  <div className="flex items-center justify-between text-xs text-white/25 mb-4 pb-4 border-b border-white/[0.06]">
                    <span>{template.author}</span>
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {template.downloads}
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUseTemplate(template)
                    }}
                    className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
                  >
                    Dùng mẫu này
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template detail modal */}
      {selectedTemplate && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            className="bg-[hsl(260,30%,10%)] border border-white/[0.08] rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      CAT_COLOR[selectedTemplate.category] || CAT_COLOR.Science
                    }`}
                  >
                    {selectedTemplate.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-400">
                      {selectedTemplate.rating}
                    </span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedTemplate.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-white/40 hover:text-white/70 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Description */}
            <p className="text-white/70 text-sm mb-6">{selectedTemplate.description}</p>

            {/* Key info */}
            <div className="space-y-3 mb-6 pb-6 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Thời lượng</span>
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="w-4 h-4" />
                  {selectedTemplate.duration}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Độ khó</span>
                <span
                  className={`inline-block px-3 py-1 rounded-lg text-xs font-medium border ${
                    DIFFICULTY_COLOR[selectedTemplate.difficulty] ||
                    DIFFICULTY_COLOR.beginner
                  }`}
                >
                  {DIFFICULTY_LABEL[selectedTemplate.difficulty] || 'Cơ bản'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Tác giả</span>
                <span className="text-white/80 text-sm">{selectedTemplate.author}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <h4 className="text-white/60 text-xs font-semibold uppercase mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <h4 className="text-white/60 text-xs font-semibold uppercase mb-3">Tính năng</h4>
              <div className="space-y-2">
                {selectedTemplate.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-sm text-white/70">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Downloads */}
            <div className="flex items-center justify-between text-white/50 text-xs mb-6 pb-6 border-b border-white/[0.06]">
              <div className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>{selectedTemplate.downloads} downloads</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                <span>Phổ biến</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm font-medium text-white/80 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  handleUseTemplate(selectedTemplate)
                  setSelectedTemplate(null)
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
              >
                Dùng mẫu này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
