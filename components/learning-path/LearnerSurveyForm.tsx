'use client'

import React, { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  User,
  Brain,
  BarChart3,
  Target,
  Clock,
  Zap,
} from 'lucide-react'
import { StudentProfileSurvey, SURVEY_SECTIONS, DOMAIN_DISPLAY, AcademicLevel, GoalType, LearningStyle } from '@/lib/learning-path/assessment-types'
import { SubjectDomain } from '@/lib/learning-path/types'

interface LearnerSurveyFormProps {
  onComplete: (data: StudentProfileSurvey) => void
  onCancel: () => void
  initialData?: Partial<StudentProfileSurvey>
}

const SECTION_ICONS: Record<number, React.ReactNode> = {
  1: <User className="w-6 h-6" />,
  2: <Brain className="w-6 h-6" />,
  3: <BarChart3 className="w-6 h-6" />,
  4: <Target className="w-6 h-6" />,
  5: <Clock className="w-6 h-6" />,
  6: <Zap className="w-6 h-6" />,
}

const ACADEMIC_LEVELS: { value: AcademicLevel; label: string }[] = [
  { value: 'thpt_10', label: 'THPT Lớp 10' },
  { value: 'thpt_11', label: 'THPT Lớp 11' },
  { value: 'thpt_12', label: 'THPT Lớp 12' },
  { value: 'university_1', label: 'Đại học năm 1' },
  { value: 'university_2', label: 'Đại học năm 2' },
  { value: 'university_3', label: 'Đại học năm 3' },
  { value: 'university_4', label: 'Đại học năm 4' },
  { value: 'postgrad', label: 'Sau đại học' },
]

const LEARNING_STYLES: { value: LearningStyle; label: string; description: string }[] = [
  { value: 'visual', label: 'Thị giác', description: 'Tôi học tốt từ hình ảnh, biểu đồ, video' },
  { value: 'auditory', label: 'Thính giác', description: 'Tôi học tốt từ lời nói, thảo luận, âm thanh' },
  { value: 'kinesthetic', label: 'Vận động', description: 'Tôi học tốt từ thực hành, làm dự án' },
  { value: 'reading_writing', label: 'Đọc/Viết', description: 'Tôi học tốt từ văn bản, ghi chú' },
]

const CONTENT_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'text', label: 'Văn bản' },
  { value: 'interactive', label: 'Tương tác' },
  { value: 'quiz', label: 'Bài tập' },
  { value: 'project', label: 'Dự án' },
]

const STUDY_DURATIONS = [
  { value: '15min', label: '15 phút' },
  { value: '30min', label: '30 phút' },
  { value: '45min', label: '45 phút' },
  { value: '60min', label: '1 giờ' },
  { value: '90min', label: '1.5 giờ' },
]

const STUDY_TIMES = [
  { value: 'morning', label: 'Sáng', icon: '🌅' },
  { value: 'afternoon', label: 'Chiều', icon: '☀️' },
  { value: 'evening', label: 'Tối', icon: '🌆' },
  { value: 'night', label: 'Đêm', icon: '🌙' },
]

const GOAL_TYPES: { value: GoalType; label: string; icon: string }[] = [
  { value: 'exam_prep', label: 'Chuẩn bị kỳ thi', icon: '📚' },
  { value: 'skill_building', label: 'Phát triển kỹ năng', icon: '🔨' },
  { value: 'career_oriented', label: 'Định hướng sự nghiệp', icon: '💼' },
  { value: 'passion_project', label: 'Thực hiện đam mê', icon: '❤️' },
  { value: 'research', label: 'Nghiên cứu', icon: '🔬' },
  { value: 'certification', label: 'Lấy chứng chỉ', icon: '🏆' },
]

const TIMELINES = [
  { value: '1month', label: '1 tháng' },
  { value: '3months', label: '3 tháng' },
  { value: '6months', label: '6 tháng' },
  { value: '1year', label: '1 năm' },
]

const TIME_COMMITMENTS = [
  { value: 'light', label: 'Nhẹ nhàng', description: '5-7 giờ/tuần' },
  { value: 'moderate', label: 'Vừa phải', description: '10-15 giờ/tuần' },
  { value: 'intensive', label: 'Tập trung', description: '20-30 giờ/tuần' },
  { value: 'fulltime', label: 'Toàn thời gian', description: '40+ giờ/tuần' },
]

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'T2' },
  { value: 'tue', label: 'T3' },
  { value: 'wed', label: 'T4' },
  { value: 'thu', label: 'T5' },
  { value: 'fri', label: 'T6' },
  { value: 'sat', label: 'T7' },
  { value: 'sun', label: 'CN' },
]

const INTERNET_ACCESS = [
  { value: 'always', label: 'Luôn luôn' },
  { value: 'mostly', label: 'Hầu hết' },
  { value: 'limited', label: 'Hạn chế' },
]

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'Tiếng Anh' },
  { value: 'both', label: 'Cả hai' },
]

const MOTIVATION_DRIVERS = [
  { value: 'grades', label: 'Điểm số' },
  { value: 'curiosity', label: 'Tò mò' },
  { value: 'career', label: 'Sự nghiệp' },
  { value: 'competition', label: 'Cạnh tranh' },
  { value: 'social', label: 'Xã hội' },
  { value: 'self_improvement', label: 'Hoàn thiện bản thân' },
]

const DIFFICULTIES = [
  { value: 'easy_start', label: 'Bắt đầu dễ', description: 'Nắm vững nền tảng trước' },
  { value: 'balanced', label: 'Cân bằng', description: 'Kết hợp dễ và khó' },
  { value: 'challenging', label: 'Thách thức', description: 'Học hỏi từ những thử thách' },
]

const ALL_DOMAINS = Object.values(SubjectDomain)

const DOMAIN_GRID = [
  SubjectDomain.MATH,
  SubjectDomain.PHYSICS,
  SubjectDomain.CHEMISTRY,
  SubjectDomain.BIOLOGY,
  SubjectDomain.COMPUTER_SCIENCE,
  SubjectDomain.MUSIC,
  SubjectDomain.ART,
  SubjectDomain.LANGUAGE,
  SubjectDomain.HISTORY,
  SubjectDomain.GEOGRAPHY,
  SubjectDomain.ECONOMICS,
  SubjectDomain.PHILOSOPHY,
]

export default function LearnerSurveyForm({ onComplete, onCancel, initialData }: LearnerSurveyFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<StudentProfileSurvey>>({
    fullName: '',
    academicLevel: 'thpt_12',
    currentGPA: 7,
    schoolOrUniversity: '',
    learningStyle: 'visual',
    preferredContentType: ['video'],
    studySessionDuration: '45min',
    bestStudyTime: 'afternoon',
    strongSubjects: [],
    weakSubjects: [],
    selfRatedConfidence: {},
    previousAchievements: [],
    primaryGoal: 'skill_building',
    specificGoalDescription: '',
    targetTimeline: '3months',
    desiredOutcome: '',
    weeklyHours: 'moderate',
    availableDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    hasInternetAccess: 'always',
    preferredLanguage: 'vi',
    interestedDomains: [],
    motivationDrivers: [],
    preferredDifficulty: 'balanced',
    ...initialData,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set())

  // Validation functions
  const validateSection = (section: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (section) {
      case 1:
        if (!formData.fullName?.trim()) newErrors.fullName = 'Vui lòng nhập họ tên'
        if (!formData.academicLevel) newErrors.academicLevel = 'Vui lòng chọn cấp học'
        if (formData.schoolOrUniversity && formData.schoolOrUniversity.trim().length < 2)
          newErrors.schoolOrUniversity = 'Tên trường phải có ít nhất 2 ký tự'
        break

      case 2:
        if (!formData.learningStyle) newErrors.learningStyle = 'Vui lòng chọn phong cách học'
        if (!formData.preferredContentType || formData.preferredContentType.length === 0)
          newErrors.preferredContentType = 'Vui lòng chọn ít nhất một loại nội dung'
        if (!formData.studySessionDuration) newErrors.studySessionDuration = 'Vui lòng chọn thời lượng'
        if (!formData.bestStudyTime) newErrors.bestStudyTime = 'Vui lòng chọn thời gian học tốt nhất'
        break

      case 3:
        if (formData.strongSubjects && formData.weakSubjects) {
          const allSelected = new Set([...formData.strongSubjects, ...formData.weakSubjects])
          if (allSelected.size === 0)
            newErrors.subjects = 'Vui lòng chọn ít nhất một môn mạnh hoặc yếu'
        }
        break

      case 4:
        if (!formData.primaryGoal) newErrors.primaryGoal = 'Vui lòng chọn mục tiêu chính'
        if (!formData.specificGoalDescription?.trim())
          newErrors.specificGoalDescription = 'Vui lòng mô tả mục tiêu cụ thể'
        if (!formData.targetTimeline) newErrors.targetTimeline = 'Vui lòng chọn thời gian'
        if (!formData.desiredOutcome?.trim())
          newErrors.desiredOutcome = 'Vui lòng mô tả kết quả mong muốn'
        break

      case 5:
        if (!formData.weeklyHours) newErrors.weeklyHours = 'Vui lòng chọn thời gian cam kết'
        if (!formData.availableDays || formData.availableDays.length === 0)
          newErrors.availableDays = 'Vui lòng chọn ít nhất một ngày'
        if (!formData.hasInternetAccess) newErrors.hasInternetAccess = 'Vui lòng chọn mục này'
        if (!formData.preferredLanguage) newErrors.preferredLanguage = 'Vui lòng chọn ngôn ngữ'
        break

      case 6:
        if (!formData.interestedDomains || formData.interestedDomains.length === 0)
          newErrors.interestedDomains = 'Vui lòng chọn ít nhất một lĩnh vực'
        if (!formData.motivationDrivers || formData.motivationDrivers.length === 0)
          newErrors.motivationDrivers = 'Vui lòng chọn ít nhất một động lực'
        if (!formData.preferredDifficulty) newErrors.preferredDifficulty = 'Vui lòng chọn mức độ'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateSection(currentStep)) {
      setCompletedSections(new Set([...completedSections, currentStep]))
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    if (validateSection(6)) {
      setCompletedSections(new Set([...completedSections, 6]))
      onComplete(formData as StudentProfileSurvey)
    }
  }

  const updateFormData = (key: keyof StudentProfileSurvey, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    // Clear error for this field
    const newErrors = { ...errors }
    delete newErrors[key]
    setErrors(newErrors)
  }

  const selectedDomainsForConfidence = useMemo(() => {
    return new Set([...(formData.strongSubjects || []), ...(formData.weakSubjects || [])])
  }, [formData.strongSubjects, formData.weakSubjects])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Khảo sát hồ sơ học tập</h1>
          <p className="text-white/60">Giúp chúng tôi tạo lộ trình học tập tối ưu cho bạn</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {SURVEY_SECTIONS.map((section, idx) => (
              <div key={section.id} className="flex-1">
                <button
                  onClick={() => {
                    if (completedSections.has(section.id) || section.id === currentStep) {
                      setCurrentStep(section.id)
                    }
                  }}
                  className={`w-full h-12 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                    section.id === currentStep
                      ? 'bg-white/[0.1] border border-white/[0.2] text-white'
                      : completedSections.has(section.id)
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-white/[0.02] border border-white/[0.06] text-white/50'
                  }`}
                >
                  {completedSections.has(section.id) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{section.id}</span>
                  )}
                </button>
                <div className="text-center mt-2 text-xs text-white/60">
                  {section.title}
                </div>
              </div>
            ))}
          </div>
          <div className="w-full bg-white/[0.05] rounded-full h-1">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Section Content */}
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300">
              {SECTION_ICONS[currentStep]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{SURVEY_SECTIONS[currentStep - 1]?.title}</h2>
              <p className="text-white/60">{SURVEY_SECTIONS[currentStep - 1]?.description}</p>
            </div>
          </div>

          {/* Section 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Họ và tên</label>
                <input
                  type="text"
                  value={formData.fullName || ''}
                  onChange={e => updateFormData('fullName', e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08] transition-all"
                  placeholder="Nhập họ và tên"
                />
                {errors.fullName && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Cấp học</label>
                <select
                  value={formData.academicLevel || 'thpt_12'}
                  onChange={e => updateFormData('academicLevel', e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08] transition-all"
                >
                  {ACADEMIC_LEVELS.map(level => (
                    <option key={level.value} value={level.value} className="bg-slate-950">
                      {level.label}
                    </option>
                  ))}
                </select>
                {errors.academicLevel && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.academicLevel}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  GPA hiện tại: {formData.currentGPA?.toFixed(1)}/10
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={formData.currentGPA || 7}
                  onChange={e => updateFormData('currentGPA', parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Trường/Đại học</label>
                <input
                  type="text"
                  value={formData.schoolOrUniversity || ''}
                  onChange={e => updateFormData('schoolOrUniversity', e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08] transition-all"
                  placeholder="Nhập tên trường hoặc đại học (không bắt buộc)"
                />
                {errors.schoolOrUniversity && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.schoolOrUniversity}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Learning Style */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-3">Phong cách học tập</label>
                <div className="grid grid-cols-2 gap-3">
                  {LEARNING_STYLES.map(style => (
                    <button
                      key={style.value}
                      onClick={() => updateFormData('learningStyle', style.value)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.learningStyle === style.value
                          ? 'bg-blue-500/20 border-blue-500 text-white'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      <div className="font-medium">{style.label}</div>
                      <div className="text-xs text-white/60 mt-1">{style.description}</div>
                    </button>
                  ))}
                </div>
                {errors.learningStyle && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.learningStyle}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Loại nội dung ưa thích</label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => {
                        const current = formData.preferredContentType || []
                        const updated = current.includes(type.value as any)
                          ? current.filter(t => t !== type.value)
                          : [...current, type.value as any]
                        updateFormData('preferredContentType', updated)
                      }}
                      className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                        formData.preferredContentType?.includes(type.value as any)
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                {errors.preferredContentType && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.preferredContentType}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Thời lượng phiên học tối ưu</label>
                <div className="grid grid-cols-3 gap-2">
                  {STUDY_DURATIONS.map(duration => (
                    <button
                      key={duration.value}
                      onClick={() => updateFormData('studySessionDuration', duration.value as any)}
                      className={`p-3 rounded-lg border transition-all text-sm font-medium ${
                        formData.studySessionDuration === duration.value
                          ? 'bg-green-500/20 border-green-500 text-green-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
                {errors.studySessionDuration && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.studySessionDuration}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Thời gian học tốt nhất</label>
                <div className="grid grid-cols-4 gap-3">
                  {STUDY_TIMES.map(time => (
                    <button
                      key={time.value}
                      onClick={() => updateFormData('bestStudyTime', time.value as any)}
                      className={`p-4 rounded-lg border transition-all text-center ${
                        formData.bestStudyTime === time.value
                          ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      <div className="text-2xl mb-1">{time.icon}</div>
                      <div className="text-xs font-medium">{time.label}</div>
                    </button>
                  ))}
                </div>
                {errors.bestStudyTime && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.bestStudyTime}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Strengths & Weaknesses */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-3">Môn học mạnh</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOMAIN_GRID.map(domain => (
                    <button
                      key={domain}
                      onClick={() => {
                        const current = formData.strongSubjects || []
                        const updated = current.includes(domain)
                          ? current.filter(d => d !== domain)
                          : [...current, domain]
                        updateFormData('strongSubjects', updated)
                      }}
                      className={`p-3 rounded-lg border transition-all text-sm font-medium text-center ${
                        formData.strongSubjects?.includes(domain)
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      <div>{DOMAIN_DISPLAY[domain]?.icon}</div>
                      <div className="text-xs mt-1">{DOMAIN_DISPLAY[domain]?.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Môn học yếu</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOMAIN_GRID.map(domain => (
                    <button
                      key={domain}
                      onClick={() => {
                        const current = formData.weakSubjects || []
                        const updated = current.includes(domain)
                          ? current.filter(d => d !== domain)
                          : [...current, domain]
                        updateFormData('weakSubjects', updated)
                      }}
                      className={`p-3 rounded-lg border transition-all text-sm font-medium text-center ${
                        formData.weakSubjects?.includes(domain)
                          ? 'bg-red-500/20 border-red-500 text-red-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      <div>{DOMAIN_DISPLAY[domain]?.icon}</div>
                      <div className="text-xs mt-1">{DOMAIN_DISPLAY[domain]?.name}</div>
                    </button>
                  ))}
                </div>
                {errors.subjects && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.subjects}
                  </p>
                )}
              </div>

              {selectedDomainsForConfidence.size > 0 && (
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Mức độ tự tin tại các môn học
                  </label>
                  <div className="space-y-3">
                    {Array.from(selectedDomainsForConfidence).map(domain => (
                      <div key={domain}>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm text-white/80">
                            {DOMAIN_DISPLAY[domain]?.name}
                          </label>
                          <span className="text-xs text-white/60">
                            {formData.selfRatedConfidence?.[domain] || 3}/5
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(rating => (
                            <button
                              key={rating}
                              onClick={() => {
                                const updated = { ...formData.selfRatedConfidence, [domain]: rating }
                                updateFormData('selfRatedConfidence', updated)
                              }}
                              className={`flex-1 h-8 rounded border transition-all ${
                                (formData.selfRatedConfidence?.[domain] || 0) >= rating
                                  ? 'bg-yellow-500/30 border-yellow-500 text-yellow-300'
                                  : 'bg-white/[0.02] border-white/[0.1] text-white/40'
                              }`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Thành tích/Giải thưởng trước đây (có thể nhập nhiều, cách nhau bằng dấu phẩy)
                </label>
                <textarea
                  value={formData.previousAchievements?.join(', ') || ''}
                  onChange={e => {
                    const achievements = e.target.value
                      .split(',')
                      .map(a => a.trim())
                      .filter(a => a.length > 0)
                    updateFormData('previousAchievements', achievements)
                  }}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08] transition-all resize-none"
                  rows={4}
                  placeholder="VD: Huy chương vàng Toán quốc tế, Chứng chỉ Cambridge..."
                />
              </div>
            </div>
          )}

          {/* Section 4: Learning Goals */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-3">Mục tiêu chính</label>
                <div className="grid grid-cols-2 gap-3">
                  {GOAL_TYPES.map(goal => (
                    <button
                      key={goal.value}
                      onClick={() => updateFormData('primaryGoal', goal.value)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.primaryGoal === goal.value
                          ? 'bg-cyan-500/20 border-cyan-500 text-white'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      <div className="text-xl mb-1">{goal.icon}</div>
                      <div className="font-medium">{goal.label}</div>
                    </button>
                  ))}
                </div>
                {errors.primaryGoal && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.primaryGoal}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Mô tả mục tiêu cụ thể</label>
                <textarea
                  value={formData.specificGoalDescription || ''}
                  onChange={e => updateFormData('specificGoalDescription', e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08] transition-all resize-none"
                  rows={4}
                  placeholder="Mô tả chi tiết mục tiêu học tập của bạn..."
                />
                {errors.specificGoalDescription && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.specificGoalDescription}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Thời gian mục tiêu</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIMELINES.map(timeline => (
                    <button
                      key={timeline.value}
                      onClick={() => updateFormData('targetTimeline', timeline.value as any)}
                      className={`p-3 rounded-lg border transition-all text-sm font-medium text-center ${
                        formData.targetTimeline === timeline.value
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      {timeline.label}
                    </button>
                  ))}
                </div>
                {errors.targetTimeline && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.targetTimeline}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Kết quả mong muốn</label>
                <textarea
                  value={formData.desiredOutcome || ''}
                  onChange={e => updateFormData('desiredOutcome', e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/[0.3] focus:bg-white/[0.08] transition-all resize-none"
                  rows={4}
                  placeholder="Bạn muốn đạt được những kết quả gì cụ thể?"
                />
                {errors.desiredOutcome && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.desiredOutcome}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Commitment & Resources */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Khả năng cam kết hàng tuần
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TIME_COMMITMENTS.map(commitment => (
                    <button
                      key={commitment.value}
                      onClick={() => updateFormData('weeklyHours', commitment.value as any)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.weeklyHours === commitment.value
                          ? 'bg-fuchsia-500/20 border-fuchsia-500 text-white'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      <div className="font-medium">{commitment.label}</div>
                      <div className="text-xs text-white/60 mt-1">{commitment.description}</div>
                    </button>
                  ))}
                </div>
                {errors.weeklyHours && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.weeklyHours}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Ngày trong tuần có thể học</label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.value}
                      onClick={() => {
                        const current = formData.availableDays || []
                        const updated = current.includes(day.value as any)
                          ? current.filter(d => d !== day.value)
                          : [...current, day.value as any]
                        updateFormData('availableDays', updated)
                      }}
                      className={`p-2 rounded-lg border transition-all text-sm font-medium text-center ${
                        formData.availableDays?.includes(day.value as any)
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {errors.availableDays && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.availableDays}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Kết nối Internet</label>
                <div className="grid grid-cols-3 gap-3">
                  {INTERNET_ACCESS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateFormData('hasInternetAccess', option.value as any)}
                      className={`p-3 rounded-lg border transition-all text-sm font-medium text-center ${
                        formData.hasInternetAccess === option.value
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {errors.hasInternetAccess && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.hasInternetAccess}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Ngôn ngữ ưa thích</label>
                <div className="grid grid-cols-3 gap-3">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.value}
                      onClick={() => updateFormData('preferredLanguage', lang.value as any)}
                      className={`p-3 rounded-lg border transition-all text-sm font-medium text-center ${
                        formData.preferredLanguage === lang.value
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                {errors.preferredLanguage && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.preferredLanguage}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 6: Interests & Motivation */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-3">Lĩnh vực quan tâm</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOMAIN_GRID.map(domain => (
                    <button
                      key={domain}
                      onClick={() => {
                        const current = formData.interestedDomains || []
                        const updated = current.includes(domain)
                          ? current.filter(d => d !== domain)
                          : [...current, domain]
                        updateFormData('interestedDomains', updated)
                      }}
                      className={`p-3 rounded-lg border transition-all text-sm font-medium text-center ${
                        formData.interestedDomains?.includes(domain)
                          ? 'bg-lime-500/20 border-lime-500 text-lime-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      <div>{DOMAIN_DISPLAY[domain]?.icon}</div>
                      <div className="text-xs mt-1">{DOMAIN_DISPLAY[domain]?.name}</div>
                    </button>
                  ))}
                </div>
                {errors.interestedDomains && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.interestedDomains}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Động lực chính</label>
                <div className="flex flex-wrap gap-2">
                  {MOTIVATION_DRIVERS.map(driver => (
                    <button
                      key={driver.value}
                      onClick={() => {
                        const current = formData.motivationDrivers || []
                        const updated = current.includes(driver.value as any)
                          ? current.filter(d => d !== driver.value)
                          : [...current, driver.value as any]
                        updateFormData('motivationDrivers', updated)
                      }}
                      className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                        formData.motivationDrivers?.includes(driver.value as any)
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      {driver.label}
                    </button>
                  ))}
                </div>
                {errors.motivationDrivers && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.motivationDrivers}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">Mức độ khó ưa thích</label>
                <div className="grid grid-cols-3 gap-3">
                  {DIFFICULTIES.map(diff => (
                    <button
                      key={diff.value}
                      onClick={() => updateFormData('preferredDifficulty', diff.value as any)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.preferredDifficulty === diff.value
                          ? 'bg-violet-500/20 border-violet-500 text-white'
                          : 'bg-white/[0.02] border-white/[0.1] text-white/80 hover:border-white/[0.2]'
                      }`}
                    >
                      <div className="font-medium">{diff.label}</div>
                      <div className="text-xs text-white/60 mt-1">{diff.description}</div>
                    </button>
                  ))}
                </div>
                {errors.preferredDifficulty && (
                  <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.preferredDifficulty}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-lg border border-white/[0.1] text-white/80 hover:text-white hover:border-white/[0.2] transition-all font-medium"
          >
            Hủy bỏ
          </button>

          <div className="flex gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/[0.1] text-white/80 hover:text-white hover:border-white/[0.2] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Quay lại
            </button>

            {currentStep < 6 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
              >
                Tiếp theo
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 transition-all font-medium"
              >
                <Check className="w-4 h-4" />
                Hoàn thành khảo sát
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
