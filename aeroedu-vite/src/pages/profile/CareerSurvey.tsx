/**
 * CareerSurvey — Khảo sát nghề nghiệp bắt buộc với TEACHER/PARENT/ADMIN
 *
 * 4 bước:
 *   1. Thông tin nghề nghiệp (khác nhau GV vs PH)
 *   2. Năng lực hiện tại (self-rating 1-5 cho mỗi skill)
 *   3. Mục tiêu phát triển (chọn ≤5 skill + motivation + thời gian)
 *   4. Xác nhận → POST → confetti → redirect KG
 *
 * Persist draft vào localStorage `career-survey-draft` để user không mất data
 * khi F5 hoặc đóng tab giữa chừng.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Briefcase, Star, Target, CheckCircle2, ArrowLeft, ArrowRight,
  Loader2, BookOpen, GraduationCap, Cpu, TrendingUp, Sparkles, Heart,
  Search, X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { useAccountType } from '@/hooks/useAccountType'
import { getAllCareers, getCareerCategories, getCareerLabel } from '@/lib/career-kg'

// ── Types ─────────────────────────────────────────────────────────────────────

type EducationLevel = 'primary' | 'middle' | 'high' | 'university' | 'center'
type Motivation = 'work' | 'passion' | 'support-children' | 'career-growth' | 'ai-trend'
type WeeklyTime = '<1' | '1-3' | '3-5' | '5-10' | '>10'
type AccountTypeSurvey = 'TEACHER' | 'PARENT' | 'ADMIN'

interface SurveyData {
  accountType: AccountTypeSurvey
  profession: {
    primarySubject?: string
    /** @deprecated dùng `educationLevels` array. Giữ field này để load survey cũ. */
    educationLevel?: EducationLevel
    /** Cấp học có thể dạy — multi-select (GV thường dạy nhiều cấp THCS+THPT...) */
    educationLevels?: EducationLevel[]
    yearsExperience?: number
    school?: string
    job?: string
    industry?: string
    childrenCount?: number
    childrenGrades?: number[]
    /** Mảng career IDs (max 5). Một người có thể chọn nhiều nghề. */
    selectedCareers?: string[]
  }
  currentSkills: Record<string, number>
  developmentGoals: string[]
  motivation: Motivation | ''
  weeklyTimeCommitment: WeeklyTime | ''
}

const MAX_CAREERS = 5
/** Pre-select cho TEACHER: nghề "giao-vien". */
const TEACHER_DEFAULT_CAREERS = ['giao-vien']
/** Suggestion cho PARENT: nhà tâm lý (định hướng cho con). */
const PARENT_DEFAULT_CAREERS = ['nha-tam-ly']

interface SkillItem {
  id: string
  label: string
  description: string
  category: string
  catColor: string
  icon: React.ComponentType<{ className?: string }>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBJECTS = [
  'Toán', 'Vật lý', 'Hóa học', 'Sinh học', 'Văn', 'Sử', 'Địa', 'Anh',
  'GDCD', 'Tin học', 'Công nghệ', 'Mỹ thuật', 'Âm nhạc', 'Thể dục', 'GDQP', 'Khác',
] as const

const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
  { value: 'primary',    label: 'Tiểu học' },
  { value: 'middle',     label: 'THCS' },
  { value: 'high',       label: 'THPT' },
  { value: 'university', label: 'Đại học' },
  { value: 'center',     label: 'Trung tâm' },
]

const INDUSTRIES = [
  'CNTT', 'Y tế', 'Tài chính ngân hàng', 'Giáo dục', 'Xây dựng',
  'Công nghiệp', 'Dịch vụ', 'Khác',
] as const

const JOB_SUGGESTIONS = [
  'Kỹ sư phần mềm', 'Bác sĩ', 'Giáo viên', 'Kế toán', 'Kiến trúc sư',
  'Nhân viên kinh doanh', 'Kỹ sư cơ khí', 'Y tá', 'Dược sĩ', 'Luật sư',
  'Designer', 'Marketing', 'Kỹ sư xây dựng', 'Công an', 'Bộ đội',
  'Nội trợ', 'Tự kinh doanh',
]

// Teacher 24 skills (4 category x 6) — đồng bộ với ProfessionalKG.tsx
const TEACHER_SKILLS: SkillItem[] = [
  // CM - Kiến thức Chuyên môn (purple)
  { id: 'tce-curriculum2018', label: 'Chương trình GDPT 2018',       description: 'Nắm vững cấu trúc, mục tiêu CT mới',         category: 'Kiến thức Chuyên môn', catColor: 'purple', icon: BookOpen },
  { id: 'tce-content-depth',  label: 'Kiến thức chuyên sâu bộ môn',   description: 'Hiểu nguyên lý, giải thích nhiều cách',      category: 'Kiến thức Chuyên môn', catColor: 'purple', icon: BookOpen },
  { id: 'tce-cross-subject',  label: 'Tích hợp liên môn',             description: 'Kết nối kiến thức giữa các môn',            category: 'Kiến thức Chuyên môn', catColor: 'purple', icon: BookOpen },
  { id: 'tce-tt58',           label: 'Quy định đánh giá TT22/TT58',    description: 'Thông hiểu chuẩn đánh giá, ĐTBm',           category: 'Kiến thức Chuyên môn', catColor: 'purple', icon: BookOpen },
  { id: 'tce-research',       label: 'Nghiên cứu khoa học giáo dục',   description: 'Đọc hiểu nghiên cứu giáo dục',              category: 'Kiến thức Chuyên môn', catColor: 'purple', icon: BookOpen },
  { id: 'tce-update',         label: 'Cập nhật kiến thức liên tục',    description: 'Theo dõi xu hướng mới',                     category: 'Kiến thức Chuyên môn', catColor: 'purple', icon: BookOpen },
  // SP - Năng lực Sư phạm (blue)
  { id: 'tp-lesson-design',   label: 'Thiết kế bài dạy theo năng lực', description: '5 hoạt động, mục tiêu NL',                  category: 'Năng lực Sư phạm', catColor: 'blue', icon: GraduationCap },
  { id: 'tp-active-learning', label: 'Dạy học tích cực',                description: 'Flip classroom, PBL, game-based',           category: 'Năng lực Sư phạm', catColor: 'blue', icon: GraduationCap },
  { id: 'tp-differentiation', label: 'Dạy học phân hóa',               description: 'Bài tập theo cấp độ HS',                    category: 'Năng lực Sư phạm', catColor: 'blue', icon: GraduationCap },
  { id: 'tp-formative',       label: 'Đánh giá quá trình',              description: 'Exit ticket, rubric, portfolio',            category: 'Năng lực Sư phạm', catColor: 'blue', icon: GraduationCap },
  { id: 'tp-stem',            label: 'Tích hợp STEM/STEAM',             description: 'Dự án STEM liên môn',                       category: 'Năng lực Sư phạm', catColor: 'blue', icon: GraduationCap },
  { id: 'tp-classroom-mgmt',  label: 'Quản lý lớp học hiệu quả',       description: 'Bầu không khí học tích cực',                category: 'Năng lực Sư phạm', catColor: 'blue', icon: GraduationCap },
  // KS - Kỹ năng Số (emerald)
  { id: 'tds-lms',             label: 'Sử dụng LMS (inphysic.com)',     description: 'Tạo bài giảng, quản lý lớp online',         category: 'Kỹ năng Số', catColor: 'emerald', icon: Cpu },
  { id: 'tds-ai-tools',        label: 'Công cụ AI hỗ trợ giảng dạy',  description: 'Claude AI Tutor, AI tạo đề',                category: 'Kỹ năng Số', catColor: 'emerald', icon: Cpu },
  { id: 'tds-content-creation',label: 'Tạo nội dung số',                description: 'Video bài giảng, slides tương tác',         category: 'Kỹ năng Số', catColor: 'emerald', icon: Cpu },
  { id: 'tds-data-analytics',  label: 'Phân tích dữ liệu học tập',     description: 'Đọc dashboard, phát hiện HS at-risk',        category: 'Kỹ năng Số', catColor: 'emerald', icon: Cpu },
  { id: 'tds-online-teaching', label: 'Dạy học trực tuyến',             description: 'Zoom/Meet, giữ tương tác',                  category: 'Kỹ năng Số', catColor: 'emerald', icon: Cpu },
  { id: 'tds-security',        label: 'An toàn thông tin cơ bản',       description: 'Bảo vệ dữ liệu HS, phishing',               category: 'Kỹ năng Số', catColor: 'emerald', icon: Cpu },
  // PN - Phát triển Nghề nghiệp (amber)
  { id: 'tpd-communication',  label: 'Giao tiếp với phụ huynh & HS',  description: 'Phản hồi tích cực, họp phụ huynh',          category: 'Phát triển Nghề nghiệp', catColor: 'amber', icon: TrendingUp },
  { id: 'tpd-mentoring',      label: 'Hỗ trợ & Mentoring đồng nghiệp', description: 'Chia sẻ kinh nghiệm, dự giờ',               category: 'Phát triển Nghề nghiệp', catColor: 'amber', icon: TrendingUp },
  { id: 'tpd-reflection',     label: 'Tự đánh giá & cải tiến bài giảng', description: 'Soi lại tiết dạy, ghi nhật ký, rút bài học cải tiến', category: 'Phát triển Nghề nghiệp', catColor: 'amber', icon: TrendingUp },
  { id: 'tpd-wellbeing',      label: 'Chăm sóc sức khỏe tâm lý',       description: 'Quản lý stress, phòng burnout',             category: 'Phát triển Nghề nghiệp', catColor: 'amber', icon: TrendingUp },
  { id: 'tpd-leadership',     label: 'Lãnh đạo nhóm & Tổ bộ môn',     description: 'Điều phối họp, mentoring GV mới',           category: 'Phát triển Nghề nghiệp', catColor: 'amber', icon: TrendingUp },
  { id: 'tpd-cpd-plan',       label: 'Lập kế hoạch phát triển cá nhân', description: 'IDP hàng năm, SMART goals',                category: 'Phát triển Nghề nghiệp', catColor: 'amber', icon: TrendingUp },
  // V2 (2026-05-22): KỸ NĂNG MỀM — 6 skills (rose) — yếu tố then chốt
  // ảnh hưởng tới hiệu quả truyền đạt + quan hệ với HS/phụ huynh/đồng nghiệp
  { id: 'tss-active-listen',  label: 'Lắng nghe chủ động',              description: 'Không cắt lời, tóm tắt lại ý HS, hỏi đào sâu',   category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
  { id: 'tss-empathy',        label: 'Đồng cảm với học sinh',           description: 'Hiểu hoàn cảnh, cảm xúc, không phán xét',       category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
  { id: 'tss-public-speak',   label: 'Thuyết trình & truyền cảm hứng',  description: 'Giọng nói, body language, kể chuyện dạy học',   category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
  { id: 'tss-conflict',       label: 'Giải quyết xung đột',             description: 'Xung đột HS-HS, HS-GV, GV-PH một cách win-win', category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
  { id: 'tss-emotion-mgmt',   label: 'Quản lý cảm xúc cá nhân',         description: 'Giữ bình tĩnh khi áp lực, không trút lên HS',   category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
  { id: 'tss-creative',       label: 'Tư duy sáng tạo & linh hoạt',     description: 'Đổi cách dạy khi HS không hiểu, thử nghiệm mới', category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
]

// Parent 8 tracking skills
const PARENT_SKILLS: SkillItem[] = [
  { id: 'parent-track-results',   label: 'Theo dõi kết quả học tập',        description: 'Đọc điểm, hiểu báo cáo của con',          category: 'Theo dõi học tập', catColor: 'pink', icon: Heart },
  { id: 'parent-comm-teacher',    label: 'Giao tiếp với GV chủ nhiệm',      description: 'Trao đổi hiệu quả với giáo viên',          category: 'Theo dõi học tập', catColor: 'pink', icon: Heart },
  { id: 'parent-gdpt2018',        label: 'Hiểu chương trình GDPT 2018',     description: 'Nắm cấu trúc CT mới Bộ GD&ĐT',             category: 'Hỗ trợ học tập', catColor: 'purple', icon: BookOpen },
  { id: 'parent-home-support',    label: 'Hỗ trợ con học tại nhà',          description: 'Hướng dẫn bài tập, tạo môi trường học',    category: 'Hỗ trợ học tập', catColor: 'purple', icon: BookOpen },
  { id: 'parent-psychology',      label: 'Hiểu tâm lý lứa tuổi',           description: 'Tâm lý tuổi thiếu niên / dậy thì',         category: 'Tâm lý & định hướng', catColor: 'blue', icon: Sparkles },
  { id: 'parent-time-mgmt',       label: 'Quản lý thời gian con',           description: 'Cân bằng học - chơi - nghỉ',                category: 'Tâm lý & định hướng', catColor: 'blue', icon: Sparkles },
  { id: 'parent-career',          label: 'Hỗ trợ chọn nghề định hướng',     description: 'Khám phá sở thích, ngành nghề tương lai',   category: 'Tâm lý & định hướng', catColor: 'blue', icon: Sparkles },
  { id: 'parent-edtech',          label: 'Dùng công nghệ giáo dục',         description: 'LMS, app học, AI Tutor',                    category: 'Công nghệ', catColor: 'emerald', icon: Cpu },
  // V2 (2026-05-22): KỸ NĂNG MỀM phụ huynh — 4 skills (rose) — quan trọng
  // để xây dựng quan hệ tin tưởng, nuôi dạy con tự lập + có động lực
  { id: 'parent-soft-listen',     label: 'Lắng nghe con không phán xét',    description: 'Để con kể về ngày học không bị quát/sửa ngay',  category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
  { id: 'parent-soft-encourage',  label: 'Khích lệ & động viên',            description: 'Khen nỗ lực thay vì kết quả, công nhận tiến bộ', category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
  { id: 'parent-soft-patience',   label: 'Kiên nhẫn khi con sai',           description: 'Coi lỗi là cơ hội học, không nổi nóng',         category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
  { id: 'parent-soft-rolemodel',  label: 'Làm tấm gương cho con',           description: 'Đọc sách trước mặt con, kiểm soát điện thoại',  category: 'Kỹ năng mềm', catColor: 'rose', icon: Heart },
]

const MOTIVATION_OPTIONS: { value: Motivation; label: string }[] = [
  { value: 'work',              label: 'Yêu cầu công việc' },
  { value: 'passion',           label: 'Đam mê cá nhân' },
  { value: 'support-children',  label: 'Để hỗ trợ con/học sinh tốt hơn' },
  { value: 'career-growth',     label: 'Để thăng tiến sự nghiệp' },
  { value: 'ai-trend',          label: 'Cập nhật xu hướng AI' },
]

const TIME_OPTIONS: { value: WeeklyTime; label: string }[] = [
  { value: '<1',    label: '< 1 giờ' },
  { value: '1-3',   label: '1 – 3 giờ' },
  { value: '3-5',   label: '3 – 5 giờ' },
  { value: '5-10',  label: '5 – 10 giờ' },
  { value: '>10',   label: '> 10 giờ' },
]

const DRAFT_KEY = 'career-survey-draft'

// ── Color helpers ─────────────────────────────────────────────────────────────

const CAT_COLOR_CLASSES: Record<string, { ring: string; bg: string; text: string; border: string; fill: string }> = {
  purple:  { ring: 'ring-purple-500/40',  bg: 'bg-purple-500/10',  text: 'text-purple-300',  border: 'border-purple-500/30',  fill: 'bg-purple-500'  },
  blue:    { ring: 'ring-blue-500/40',    bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-500/30',    fill: 'bg-blue-500'    },
  emerald: { ring: 'ring-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', fill: 'bg-emerald-500' },
  amber:   { ring: 'ring-amber-500/40',   bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/30',   fill: 'bg-amber-500'   },
  pink:    { ring: 'ring-pink-500/40',    bg: 'bg-pink-500/10',    text: 'text-pink-300',    border: 'border-pink-500/30',    fill: 'bg-pink-500'    },
  rose:    { ring: 'ring-rose-500/40',    bg: 'bg-rose-500/10',    text: 'text-rose-300',    border: 'border-rose-500/30',    fill: 'bg-rose-500'    },
}

const RATING_LABELS = ['Chưa biết', 'Mới bắt đầu', 'Đang học', 'Thành thạo', 'Chuyên gia']

// ── Component ─────────────────────────────────────────────────────────────────

export default function CareerSurvey() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const accountType = useAccountType()

  // Account type for survey form (TEACHER / PARENT / ADMIN)
  const surveyAccountType: AccountTypeSurvey = useMemo(() => {
    if (accountType === 'PARENT') return 'PARENT'
    if (accountType === 'ADMIN') return 'ADMIN'
    return 'TEACHER'
  }, [accountType])

  const isParent = surveyAccountType === 'PARENT'
  const skillList = isParent ? PARENT_SKILLS : TEACHER_SKILLS

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<SurveyData>(() => ({
    accountType: surveyAccountType,
    profession: {},
    currentSkills: {},
    developmentGoals: [],
    motivation: '',
    weeklyTimeCommitment: '',
  }))
  // Retake mode: user đã hoàn thành 1 lần và muốn làm lại (chọn nghề khác,
  // cập nhật rating, đổi mục tiêu...). Khác onboarding vì có pre-fill data cũ.
  const isRetake = searchParams.get('retake') === '1'
  const [retakeLoaded, setRetakeLoaded] = useState(false)

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as Partial<SurveyData>
        setData(prev => ({ ...prev, ...draft, accountType: surveyAccountType }))
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync accountType nếu user thay đổi sub-type + seed default selectedCareers
  useEffect(() => {
    setData(prev => {
      const cur = prev.profession.selectedCareers
      if (cur && cur.length > 0) {
        // Đã có lựa chọn từ trước (draft / quay lại sửa) → giữ nguyên
        return { ...prev, accountType: surveyAccountType }
      }
      const defaults = surveyAccountType === 'PARENT' ? PARENT_DEFAULT_CAREERS : TEACHER_DEFAULT_CAREERS
      return {
        ...prev,
        accountType: surveyAccountType,
        profession: { ...prev.profession, selectedCareers: defaults.slice() },
      }
    })
  }, [surveyAccountType])

  // Auto-save draft mỗi khi data đổi
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)) } catch { /* ignore */ }
  }, [data])

  // Already completed → load existing data (retake mode) HOẶC redirect (default).
  // - ?retake=1   → pre-fill data cũ, cho user sửa rồi submit lại
  // - ?onboarding → cho qua dù chưa hoàn thành (luồng từ Register)
  // - mặc định    → đã hoàn thành rồi sẽ redirect khỏi survey
  useEffect(() => {
    if (!user) return
    api.get<{ completed: boolean; data?: SurveyData }>('/users/me/career-survey')
      .then(r => {
        const completed = r.data?.completed
        if (completed && isRetake && r.data?.data) {
          // Retake: pre-fill toàn bộ data cũ vào form
          const old = r.data.data
          setData({
            accountType: surveyAccountType,
            profession: old.profession || {},
            currentSkills: old.currentSkills || {},
            developmentGoals: old.developmentGoals || [],
            motivation: old.motivation || '',
            weeklyTimeCommitment: old.weeklyTimeCommitment || '',
          })
          setRetakeLoaded(true)
          toast.success('Đã tải lại khảo sát trước đó — bạn có thể chỉnh sửa.')
        } else if (completed && !searchParams.get('onboarding') && !isRetake) {
          const returnUrl = searchParams.get('return') || (accountType === 'ADMIN' ? '/admin/knowledge-graph' : '/teacher/knowledge-graph')
          navigate(returnUrl, { replace: true })
        }
      })
      .catch(() => { /* ignore */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isRetake])

  // ── Validation ───────────────────────────────────────────────
  const canProceed = useMemo(() => {
    if (step === 0) {
      const p = data.profession
      // BẮT BUỘC: ≥1 nghề được chọn (multi-career picker)
      const hasCareer = (p.selectedCareers?.length ?? 0) >= 1
      if (!hasCareer) return false
      if (isParent) {
        return !!(p.job && p.industry && typeof p.childrenCount === 'number')
      }
      // V2 (2026-05-22): GV có thể dạy nhiều cấp → check educationLevels[] (mảng).
      // Backward-compat: vẫn chấp nhận educationLevel cũ (string) nếu chưa migrate.
      const hasLevel = (p.educationLevels && p.educationLevels.length > 0) || !!p.educationLevel
      return !!(p.primarySubject && hasLevel && typeof p.yearsExperience === 'number')
    }
    if (step === 1) {
      // Yêu cầu rate ít nhất 50% skill list (để tránh skip toàn bộ)
      const needed = Math.ceil(skillList.length / 2)
      return Object.keys(data.currentSkills).length >= needed
    }
    if (step === 2) {
      return data.developmentGoals.length > 0 && !!data.motivation && !!data.weeklyTimeCommitment
    }
    return true
  }, [step, data, isParent, skillList.length])

  // V2 (2026-05-22): Bỏ qua survey — lưu minimal payload với skipped flag
  const handleSkip = async () => {
    const ok = window.confirm(
      'Bỏ qua khảo sát?\n\n' +
      'Bộ não tri thức (KG) của bạn sẽ ÍT dữ liệu ban đầu — sẽ TỰ phát triển ' +
      'dần qua các hoạt động học tập, tạo bài, làm bài,...\n\n' +
      'Bạn có thể quay lại làm khảo sát bất cứ lúc nào ở mục Hồ sơ.'
    )
    if (!ok) return
    setSubmitting(true)
    try {
      const payload = {
        accountType: surveyAccountType,
        skipped: true,
        profession: { selectedCareers: [] },
        currentSkills: {},
        developmentGoals: [],
        motivation: '',
        weeklyTimeCommitment: '',
      }
      await api.post('/users/me/career-survey', payload)
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      toast.success('Đã bỏ qua khảo sát · KG sẽ phát triển qua hoạt động của bạn')
      const returnUrl = searchParams.get('return')
      if (returnUrl) {
        navigate(returnUrl, { replace: true })
      } else {
        navigate(accountType === 'ADMIN' ? '/admin/knowledge-graph' : '/teacher/knowledge-graph', { replace: true })
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không bỏ qua được — thử lại')
      setSubmitting(false)
    }
  }

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload: SurveyData = { ...data, accountType: surveyAccountType }
      await api.post('/users/me/career-survey', payload)
      // Confetti
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } })
      setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { y: 0.4 } }), 250)
      // Clear draft
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      toast.success(isRetake
        ? 'Đã cập nhật khảo sát! KG sẽ làm mới theo lựa chọn mới.'
        : 'Cảm ơn bạn! Bắt đầu xây dựng skill ngay nhé'
      )
      // Redirect after short delay
      setTimeout(() => {
        const returnUrl = searchParams.get('return')
        if (returnUrl) {
          navigate(returnUrl, { replace: true })
        } else {
          navigate(accountType === 'ADMIN' ? '/admin/knowledge-graph' : '/teacher/knowledge-graph', { replace: true })
        }
      }, 1200)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không lưu được khảo sát, thử lại nhé')
      setSubmitting(false)
    }
  }

  // ── UI ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-3 border ${
            isRetake
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            {isRetake ? 'Đang chỉnh sửa khảo sát' : 'Khảo sát đầu vào'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {isRetake ? 'Làm lại khảo sát nghề nghiệp' : `Khảo sát nghề nghiệp ${isParent ? 'phụ huynh' : surveyAccountType === 'ADMIN' ? 'quản trị' : 'giáo viên'}`}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {isRetake
              ? 'Bạn đã hoàn thành khảo sát trước đây — giờ có thể chọn lại nghề / cập nhật rating / đổi mục tiêu. KG sẽ tự cập nhật theo dữ liệu mới.'
              : 'Trả lời nhanh 4 bước (~3 phút) để AeroEduVision cá nhân hoá lộ trình phát triển skill phù hợp với bạn.'
            }
          </p>
        </div>

        {/* Retake banner */}
        {isRetake && retakeLoaded && (
          <div className="mb-6 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 px-4 py-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-200 mb-0.5">
                Đã tải dữ liệu khảo sát trước đó
              </p>
              <p className="text-xs text-amber-300/70 leading-relaxed">
                Mọi câu trả lời đã được điền sẵn. Bạn có thể chỉnh sửa từng phần
                (chọn lại nghề, đổi rating, cập nhật mục tiêu) rồi bấm "Lưu lại"
                ở bước cuối — các thay đổi sẽ ghi đè khảo sát cũ.
              </p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground">Bước {step + 1}/4</div>
            <div className="text-xs text-muted-foreground">{Math.round(((step + 1) / 4) * 100)}%</div>
          </div>
          <div className="h-1.5 rounded-full bg-card overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {['Thông tin', 'Năng lực', 'Mục tiêu', 'Xác nhận'].map((label, i) => (
              <div
                key={label}
                className={`text-center text-[11px] py-1.5 rounded ${
                  i === step
                    ? 'bg-purple-500/15 text-purple-300 font-semibold'
                    : i < step
                      ? 'text-emerald-400'
                      : 'text-muted-foreground'
                }`}
              >
                {i < step && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-6">
          {step === 0 && (
            <Step1Career
              data={data}
              setData={setData}
              isParent={isParent}
            />
          )}
          {step === 1 && (
            <Step2Skills
              skillList={skillList}
              currentSkills={data.currentSkills}
              setCurrentSkills={(v) => setData(d => ({ ...d, currentSkills: v }))}
            />
          )}
          {step === 2 && (
            <Step3Goals
              skillList={skillList}
              data={data}
              setData={setData}
            />
          )}
          {step === 3 && (
            <Step4Confirm
              data={data}
              skillList={skillList}
              isParent={isParent}
            />
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2 | 3) : s))}
            disabled={step === 0 || submitting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* V2: Bỏ qua khảo sát — chỉ show khi không phải retake (đã làm rồi) */}
            {!isRetake && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                title="Bỏ qua khảo sát — KG sẽ ít data ban đầu, tự phát triển qua hoạt động"
              >
                Bỏ qua
              </button>
            )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (!canProceed) {
                  toast.error('Vui lòng điền đủ thông tin bắt buộc')
                  return
                }
                setStep((s) => ((s + 1) as 0 | 1 | 2 | 3))
              }}
              disabled={!canProceed}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
            >
              Tiếp theo
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold disabled:opacity-60 shadow-lg shadow-purple-500/30"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting
                ? 'Đang lưu...'
                : isRetake
                  ? 'Lưu lại khảo sát (ghi đè cũ)'
                  : 'Hoàn thành khảo sát & Bắt đầu xây dựng skill'}
            </button>
          )}
          </div>
        </div>

        {/* Skip hint banner — chỉ show ở step 0 để đỡ rối UI */}
        {step === 0 && !isRetake && (
          <p className="text-[11.5px] text-muted-foreground text-center mt-3">
            💡 Khảo sát giúp KG có dữ liệu phong phú ngay từ đầu.
            Nếu bỏ qua, KG sẽ tự phát triển dần qua các hoạt động học/dạy của bạn.
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Thông tin nghề nghiệp
// ─────────────────────────────────────────────────────────────────────────────

function Step1Career({
  data, setData, isParent,
}: {
  data: SurveyData
  setData: React.Dispatch<React.SetStateAction<SurveyData>>
  isParent: boolean
}) {
  const updateProf = (patch: Partial<SurveyData['profession']>) =>
    setData((d) => ({ ...d, profession: { ...d.profession, ...patch } }))

  const selectedCareers = data.profession.selectedCareers || []

  const toggleCareer = (careerId: string) => {
    const cur = selectedCareers
    if (cur.includes(careerId)) {
      updateProf({ selectedCareers: cur.filter((c) => c !== careerId) })
    } else {
      if (cur.length >= MAX_CAREERS) {
        toast.error(`Tối đa ${MAX_CAREERS} nghề. Bỏ chọn nghề khác trước nhé`)
        return
      }
      updateProf({ selectedCareers: [...cur, careerId] })
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Briefcase className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-bold">Thông tin nghề nghiệp</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {isParent
          ? 'Giúp chúng tôi hiểu rõ bối cảnh của bạn để đưa ra gợi ý phù hợp.'
          : 'Thông tin cơ bản về môn dạy và cấp học của bạn.'}
      </p>

      {/* ── Multi-career picker (BẮT BUỘC ≥ 1 nghề) ─────────────────────────── */}
      <CareerMultiPicker
        selectedIds={selectedCareers}
        onToggle={toggleCareer}
        isParent={isParent}
      />

      {/* Divider giữa career picker và info phụ */}
      <div className="my-6 border-t border-border" />

      <p className="text-xs text-muted-foreground mb-4">
        Thông tin phụ dưới đây giúp cá nhân hoá thêm — nhưng nghề đã chọn ở trên đã đủ để tạo Cây tri thức.
      </p>

      {isParent ? (
        <div className="space-y-5">
          {/* Nghề nghiệp hiện tại — TUỲ CHỌN */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nghề nghiệp cụ thể <span className="text-muted-foreground font-normal">(tuỳ chọn — bổ sung chi tiết)</span>
            </label>
            <input
              type="text"
              list="job-suggest"
              value={data.profession.job || ''}
              onChange={(e) => updateProf({ job: e.target.value })}
              placeholder="VD: Kỹ sư phần mềm, Bác sĩ..."
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <datalist id="job-suggest">
              {JOB_SUGGESTIONS.map(j => <option key={j} value={j} />)}
            </datalist>
          </div>

          {/* Lĩnh vực */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Lĩnh vực <span className="text-muted-foreground font-normal">(tuỳ chọn)</span>
            </label>
            <select
              value={data.profession.industry || ''}
              onChange={(e) => updateProf({ industry: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Chọn lĩnh vực —</option>
              {INDUSTRIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Năm kinh nghiệm */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Số năm kinh nghiệm</label>
            <input
              type="number"
              min={0}
              max={60}
              value={data.profession.yearsExperience ?? ''}
              onChange={(e) => updateProf({ yearsExperience: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Số con đang học */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Số con đang học <span className="text-muted-foreground font-normal">(tuỳ chọn)</span>
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={data.profession.childrenCount ?? ''}
              onChange={(e) => updateProf({ childrenCount: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })}
              placeholder="VD: 2"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Lớp các con đang học */}
          <div>
            <label className="block text-sm font-medium mb-2">Lớp các con đang học</label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => {
                const sel = data.profession.childrenGrades?.includes(g) || false
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => {
                      const cur = data.profession.childrenGrades || []
                      const next = sel ? cur.filter(x => x !== g) : [...cur, g].sort((a, b) => a - b)
                      updateProf({ childrenGrades: next })
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      sel
                        ? 'bg-pink-500/20 border-pink-500/50 text-pink-200'
                        : 'bg-card border-border text-muted-foreground hover:border-pink-500/30'
                    }`}
                  >
                    Lớp {g}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Môn dạy chính — TUỲ CHỌN */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Môn dạy chính <span className="text-muted-foreground font-normal">(tuỳ chọn — chi tiết hoá KG Giáo viên)</span>
            </label>
            <select
              value={data.profession.primarySubject || ''}
              onChange={(e) => updateProf({ primarySubject: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Chọn môn dạy —</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Cấp học — multi-select (1 GV có thể dạy nhiều cấp) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Cấp học bạn dạy
              <span className="text-muted-foreground font-normal ml-1">
                (có thể chọn nhiều cấp)
              </span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {EDUCATION_LEVELS.map((l) => {
                // Merge: dùng educationLevels[] mới + fallback educationLevel cũ (single string)
                const currentLevels = data.profession.educationLevels
                  ?? (data.profession.educationLevel ? [data.profession.educationLevel] : [])
                const sel = currentLevels.includes(l.value)
                return (
                  <button
                    type="button"
                    key={l.value}
                    onClick={() => {
                      const next = sel
                        ? currentLevels.filter(v => v !== l.value)
                        : [...currentLevels, l.value]
                      // Cập nhật cả 2 field — educationLevels mới + educationLevel cũ
                      // (= phần tử đầu của mảng) để backward-compat với code đọc legacy
                      updateProf({
                        educationLevels: next,
                        educationLevel: next[0],
                      })
                    }}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition ${
                      sel
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                        : 'bg-card border-border text-muted-foreground hover:border-purple-500/30'
                    }`}
                  >
                    {l.label} {sel && '✓'}
                  </button>
                )
              })}
            </div>
            {((data.profession.educationLevels?.length ?? 0) >= 2) && (
              <p className="text-[11px] text-purple-300 mt-1.5">
                ✓ Đã chọn {data.profession.educationLevels!.length} cấp —
                gợi ý nội dung phù hợp cho cả {data.profession.educationLevels!.map(v =>
                  EDUCATION_LEVELS.find(l => l.value === v)?.label).join(', ')}
              </p>
            )}
          </div>

          {/* Năm kinh nghiệm — TUỲ CHỌN */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Số năm kinh nghiệm <span className="text-muted-foreground font-normal">(tuỳ chọn)</span>
            </label>
            <input
              type="number"
              min={0}
              max={40}
              value={data.profession.yearsExperience ?? ''}
              onChange={(e) => updateProf({ yearsExperience: e.target.value === '' ? undefined : Math.max(0, Math.min(40, +e.target.value)) })}
              placeholder="VD: 5"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Trường công tác */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Trường đang công tác <span className="text-muted-foreground font-normal">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={data.profession.school || ''}
              onChange={(e) => updateProf({ school: e.target.value })}
              placeholder="VD: THPT Chu Văn An"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Năng lực hiện tại
// ─────────────────────────────────────────────────────────────────────────────

function Step2Skills({
  skillList, currentSkills, setCurrentSkills,
}: {
  skillList: SkillItem[]
  currentSkills: Record<string, number>
  setCurrentSkills: (v: Record<string, number>) => void
}) {
  // Group skills by category
  const grouped = useMemo(() => {
    const map = new Map<string, { color: string; items: SkillItem[] }>()
    for (const s of skillList) {
      if (!map.has(s.category)) map.set(s.category, { color: s.catColor, items: [] })
      map.get(s.category)!.items.push(s)
    }
    return Array.from(map.entries())
  }, [skillList])

  const ratedCount = Object.keys(currentSkills).length
  const needed = Math.ceil(skillList.length / 2)
  const remaining = Math.max(0, needed - ratedCount)

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold">Năng lực hiện tại</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        Tự đánh giá mức độ hiện tại cho từng kỹ năng (1 = Chưa biết, 5 = Chuyên gia).
      </p>
      <div className="flex items-center gap-2 mb-6 text-xs">
        <span className={`px-2 py-1 rounded ${ratedCount >= needed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
          Đã đánh giá: {ratedCount}/{skillList.length}
        </span>
        {remaining > 0 && (
          <span className="text-muted-foreground">Còn cần đánh giá ít nhất {remaining} kỹ năng nữa</span>
        )}
      </div>

      <div className="space-y-6">
        {grouped.map(([catName, { color, items }]) => {
          const c = CAT_COLOR_CLASSES[color] || CAT_COLOR_CLASSES.purple
          return (
            <div key={catName}>
              <div className={`text-sm font-semibold mb-3 px-3 py-1.5 rounded-md inline-flex items-center gap-2 ${c.bg} ${c.text} border ${c.border}`}>
                {catName}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((s) => (
                  <SkillRatingCard
                    key={s.id}
                    skill={s}
                    value={currentSkills[s.id] || 0}
                    onChange={(v) => {
                      const next = { ...currentSkills }
                      if (v === 0) delete next[s.id]
                      else next[s.id] = v
                      setCurrentSkills(next)
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillRatingCard({
  skill, value, onChange,
}: {
  skill: SkillItem
  value: number
  onChange: (v: number) => void
}) {
  const c = CAT_COLOR_CLASSES[skill.catColor] || CAT_COLOR_CLASSES.purple
  return (
    <div className={`p-3 rounded-xl bg-card border ${value > 0 ? c.border : 'border-border'} transition`}>
      <div className="text-sm font-semibold mb-0.5">{skill.label}</div>
      <div className="text-xs text-muted-foreground mb-2.5 line-clamp-2">{skill.description}</div>

      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => onChange(value === n ? 0 : n)}
            aria-label={`Chọn mức ${n}: ${RATING_LABELS[n - 1]}`}
            className={`flex-1 h-9 rounded-md text-xs font-bold transition border ${
              value >= n
                ? `${c.fill} text-white border-transparent`
                : 'bg-background border-border text-muted-foreground hover:border-foreground/30'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1.5 text-center">
        {value > 0 ? RATING_LABELS[value - 1] : 'Chưa chọn'}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Mục tiêu phát triển
// ─────────────────────────────────────────────────────────────────────────────

function Step3Goals({
  skillList, data, setData,
}: {
  skillList: SkillItem[]
  data: SurveyData
  setData: React.Dispatch<React.SetStateAction<SurveyData>>
}) {
  const toggleGoal = (id: string) => {
    setData((d) => {
      const cur = d.developmentGoals
      if (cur.includes(id)) return { ...d, developmentGoals: cur.filter(x => x !== id) }
      if (cur.length >= 5) {
        toast.error('Chỉ chọn tối đa 5 kỹ năng để tập trung phát triển')
        return d
      }
      return { ...d, developmentGoals: [...cur, id] }
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-bold">Mục tiêu phát triển</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Chọn 1–5 kỹ năng bạn muốn phát triển trong 6 tháng tới, cùng với động lực và thời gian sẵn sàng.
      </p>

      {/* Goals — multi-select */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">
            Bạn muốn phát triển kỹ năng nào trong 6 tháng tới? <span className="text-red-400">*</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Đã chọn {data.developmentGoals.length}/5
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {skillList.map((s) => {
            const sel = data.developmentGoals.includes(s.id)
            const c = CAT_COLOR_CLASSES[s.catColor] || CAT_COLOR_CLASSES.purple
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => toggleGoal(s.id)}
                className={`text-left p-3 rounded-xl border transition ${
                  sel
                    ? `${c.bg} ${c.border} ${c.ring} ring-2`
                    : 'bg-card border-border hover:border-foreground/20'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center ${
                    sel ? `${c.fill} border-transparent` : 'border-border'
                  }`}>
                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">{s.description}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Motivation */}
      <div className="mb-6">
        <div className="text-sm font-medium mb-3">
          Lý do bạn muốn phát triển? <span className="text-red-400">*</span>
        </div>
        <div className="space-y-2">
          {MOTIVATION_OPTIONS.map((m) => {
            const sel = data.motivation === m.value
            return (
              <button
                type="button"
                key={m.value}
                onClick={() => setData((d) => ({ ...d, motivation: m.value }))}
                className={`w-full text-left px-4 py-3 rounded-lg border transition flex items-center gap-3 ${
                  sel
                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-100'
                    : 'bg-card border-border hover:border-purple-500/30'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  sel ? 'border-purple-400 bg-purple-500' : 'border-border'
                }`}>
                  {sel && <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-1" />}
                </div>
                <span className="text-sm font-medium">{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Weekly time */}
      <div>
        <div className="text-sm font-medium mb-3">
          Thời gian bạn có thể dành mỗi tuần? <span className="text-red-400">*</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {TIME_OPTIONS.map((t) => {
            const sel = data.weeklyTimeCommitment === t.value
            return (
              <button
                type="button"
                key={t.value}
                onClick={() => setData((d) => ({ ...d, weeklyTimeCommitment: t.value }))}
                className={`px-3 py-3 rounded-lg text-sm font-medium border transition ${
                  sel
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-100'
                    : 'bg-card border-border text-muted-foreground hover:border-indigo-500/30'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Xác nhận
// ─────────────────────────────────────────────────────────────────────────────

function Step4Confirm({
  data, skillList, isParent,
}: {
  data: SurveyData
  skillList: SkillItem[]
  isParent: boolean
}) {
  const skillMap = useMemo(() => new Map(skillList.map(s => [s.id, s])), [skillList])
  const motivationLabel = MOTIVATION_OPTIONS.find(m => m.value === data.motivation)?.label || '—'
  const timeLabel = TIME_OPTIONS.find(t => t.value === data.weeklyTimeCommitment)?.label || '—'
  // V2: hiển thị multi-grade — list các cấp đã chọn, fallback về single cũ
  const levelLabel = (data.profession.educationLevels && data.profession.educationLevels.length > 0)
    ? data.profession.educationLevels.map(v => EDUCATION_LEVELS.find(l => l.value === v)?.label).filter(Boolean).join(', ')
    : EDUCATION_LEVELS.find(l => l.value === data.profession.educationLevel)?.label

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold">Xác nhận thông tin</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Kiểm tra lại trước khi gửi. Bạn có thể quay lại chỉnh sửa bất cứ lúc nào.
      </p>

      <div className="space-y-5">
        {/* Profession */}
        <section className="p-4 rounded-xl bg-background border border-border">
          <div className="text-xs font-semibold text-purple-300 mb-2 uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5 inline mr-1.5" />
            Thông tin nghề nghiệp
          </div>

          {/* Selected careers chips */}
          {(data.profession.selectedCareers?.length ?? 0) > 0 && (
            <div className="mb-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">
                Nghề đã chọn ({data.profession.selectedCareers!.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(data.profession.selectedCareers || []).map((id) => {
                  const meta = getCareerLabel(id)
                  if (!meta) return null
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-xs">
                      <span>{meta.icon}</span>
                      <span className="font-medium">{meta.name}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {isParent ? (
              <>
                <Row label="Nghề nghiệp" value={data.profession.job || '—'} />
                <Row label="Lĩnh vực" value={data.profession.industry || '—'} />
                <Row label="Năm kinh nghiệm" value={data.profession.yearsExperience !== undefined ? `${data.profession.yearsExperience} năm` : '—'} />
                <Row label="Số con đang học" value={data.profession.childrenCount !== undefined ? `${data.profession.childrenCount}` : '—'} />
                {data.profession.childrenGrades && data.profession.childrenGrades.length > 0 && (
                  <Row label="Lớp các con" value={data.profession.childrenGrades.map(g => `Lớp ${g}`).join(', ')} fullWidth />
                )}
              </>
            ) : (
              <>
                <Row label="Môn dạy" value={data.profession.primarySubject || '—'} />
                <Row label="Cấp học" value={levelLabel || '—'} />
                <Row label="Năm kinh nghiệm" value={data.profession.yearsExperience !== undefined ? `${data.profession.yearsExperience} năm` : '—'} />
                <Row label="Trường" value={data.profession.school || '—'} />
              </>
            )}
          </div>
        </section>

        {/* Skills rated */}
        <section className="p-4 rounded-xl bg-background border border-border">
          <div className="text-xs font-semibold text-amber-300 mb-2 uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 inline mr-1.5" />
            Năng lực đã đánh giá ({Object.keys(data.currentSkills).length}/{skillList.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.currentSkills)
              .sort((a, b) => b[1] - a[1])
              .map(([id, score]) => {
                const s = skillMap.get(id)
                if (!s) return null
                const c = CAT_COLOR_CLASSES[s.catColor] || CAT_COLOR_CLASSES.purple
                return (
                  <span key={id} className={`text-xs px-2 py-1 rounded ${c.bg} ${c.text} border ${c.border}`}>
                    {s.label} · <strong>{score}/5</strong>
                  </span>
                )
              })}
          </div>
        </section>

        {/* Development goals */}
        <section className="p-4 rounded-xl bg-background border border-border">
          <div className="text-xs font-semibold text-indigo-300 mb-2 uppercase tracking-wider">
            <Target className="w-3.5 h-3.5 inline mr-1.5" />
            Mục tiêu phát triển 6 tháng tới
          </div>
          <ul className="space-y-1.5 mb-3">
            {data.developmentGoals.map((id) => {
              const s = skillMap.get(id)
              return s ? (
                <li key={id} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{s.label}</span>
                </li>
              ) : null
            })}
          </ul>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pt-3 border-t border-border">
            <Row label="Động lực" value={motivationLabel} />
            <Row label="Thời gian/tuần" value={timeLabel} />
          </div>
        </section>

        <div className="text-center text-xs text-muted-foreground">
          Sau khi xác nhận, lộ trình phát triển skill sẽ được kích hoạt và hiển thị trong Cây tri thức.
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CareerMultiPicker — Lưới 25 nghề, click toggle, max 5
// ─────────────────────────────────────────────────────────────────────────────

function CareerMultiPicker({
  selectedIds, onToggle, isParent,
}: {
  selectedIds: string[]
  onToggle: (careerId: string) => void
  isParent: boolean
}) {
  const allCareers = useMemo(() => getAllCareers(), [])
  const categories = useMemo(() => getCategoryOrder(), [])

  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all')

  // Filtered + grouped careers
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allCareers.filter((c) => {
      if (activeCat !== 'all' && c.category !== activeCat) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    })
  }, [allCareers, query, activeCat])

  const selectedSet = new Set(selectedIds)

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div>
          <label className="block text-sm font-semibold">
            Chọn nghề nghiệp của bạn <span className="text-red-400">*</span>
            <span className="text-muted-foreground font-normal text-xs ml-1">
              (tối đa {MAX_CAREERS} nghề · {isParent ? 'của con/bản thân' : 'của bạn'})
            </span>
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mỗi nghề có 1 Cây tri thức riêng. Có thể chọn nhiều nghề — các skill chung sẽ tự liên kết.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`px-2 py-1 rounded font-semibold ${
            selectedIds.length === 0
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            Đã chọn {selectedIds.length}/{MAX_CAREERS}
          </span>
        </div>
      </div>

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
          {selectedIds.map((id) => {
            const meta = getCareerLabel(id)
            if (!meta) return null
            return (
              <button
                key={id}
                type="button"
                onClick={() => onToggle(id)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/20 border border-purple-500/40 text-xs text-purple-100 hover:bg-purple-500/30"
                title="Bỏ chọn"
              >
                <span className="text-sm">{meta.icon}</span>
                <span className="font-medium">{meta.name}</span>
                <X className="w-3 h-3 opacity-70" />
              </button>
            )
          })}
        </div>
      )}

      {/* Search + category filter */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm nghề (VD: lập trình, bác sĩ...)"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={activeCat}
          onChange={(e) => setActiveCat(e.target.value)}
          className="px-2.5 py-2 rounded-lg border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Tất cả ({allCareers.length})</option>
          {categories.map((cat) => {
            const count = allCareers.filter((c) => c.category === cat).length
            return <option key={cat} value={cat}>{cat} ({count})</option>
          })}
        </select>
      </div>

      {/* Career card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {visible.map((c) => {
          const sel = selectedSet.has(c.id)
          const atLimit = !sel && selectedIds.length >= MAX_CAREERS
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onToggle(c.id)}
              disabled={atLimit}
              className={`group text-left p-2.5 rounded-xl border transition relative ${
                sel
                  ? 'bg-purple-500/20 border-purple-500/60 ring-2 ring-purple-500/40'
                  : atLimit
                    ? 'bg-card border-border opacity-40 cursor-not-allowed'
                    : 'bg-card border-border hover:border-purple-500/40 hover:bg-purple-500/5'
              }`}
              title={atLimit ? `Đã đạt giới hạn ${MAX_CAREERS} nghề` : c.name}
            >
              {sel && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="text-2xl mb-1 leading-none">{c.icon}</div>
              <div className="text-xs font-semibold leading-tight line-clamp-2 mb-1">{c.name}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider line-clamp-1">
                {c.category}
              </div>
            </button>
          )
        })}
        {visible.length === 0 && (
          <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
            Không tìm thấy nghề phù hợp. Thử từ khoá khác nhé.
          </div>
        )}
      </div>
    </div>
  )
}

/** Wrapper an toàn quanh getCareerCategories — fallback empty nếu lib lỗi. */
function getCategoryOrder(): string[] {
  try {
    return getCareerCategories()
  } catch {
    return []
  }
}
