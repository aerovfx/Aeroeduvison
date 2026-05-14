/**
 * STEM Projects Dashboard v2 — Blueprint.am-inspired
 *
 * Trước: chỉ là list dự án của HS.
 * Giờ: 1 hub đa dạng với 4 mảng nội dung:
 *   🤖 AI Project Generator — mô tả ý tưởng → AI sinh kế hoạch + BOM + steps
 *   📂 Dự án của tôi        — list cũ giữ nguyên (tab 1)
 *   📚 Thư viện linh kiện   — Arduino/ESP32/sensors với specs + giá tham khảo
 *   🎯 Mẫu khởi đầu         — 6 starter templates 1-click
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Eye, Edit, Trash2, MoreHorizontal, Zap,
  FlaskConical, Cpu, Wrench, Calculator, Users, Calendar,
  Target, CheckCircle, AlertCircle, Clock, MessageSquare,
  Download, Share, UserCheck, Sparkles, Loader2, Package,
  Layers, X, BookOpen, ChevronRight, Lightbulb,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'
import { loadProjects, saveProjects, type STEMProject } from '@/pages/stem/stemStore'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getStatusLabel(status: string) {
  switch (status) {
    case 'draft': return 'Bản nháp'
    case 'in-progress': return 'Đang thực hiện'
    case 'review': return 'Chờ duyệt'
    case 'completed': return 'Hoàn thành'
    case 'published': return 'Đã xuất bản'
    default: return status
  }
}
function getStatusClasses(status: string) {
  switch (status) {
    case 'draft': return 'bg-white/[0.06] text-white/50 border border-white/[0.08]'
    case 'in-progress': return 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
    case 'review': return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/25'
    case 'completed': return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
    case 'published': return 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
    default: return 'bg-white/[0.06] text-white/50'
  }
}
function getProgressColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-emerald-500'
    case 'in-progress': return 'bg-blue-500'
    case 'review': return 'bg-yellow-500'
    default: return 'bg-white/30'
  }
}
function getCategoryClasses(category: string) {
  switch (category) {
    case 'Science': return { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25', icon: 'text-blue-400' }
    case 'Technology': return { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', icon: 'text-emerald-400' }
    case 'Engineering': return { badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25', icon: 'text-orange-400' }
    case 'Math': return { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/25', icon: 'text-purple-400' }
    default: return { badge: 'bg-white/[0.06] text-white/50 border-white/[0.08]', icon: 'text-white/50' }
  }
}
function getCategoryIcon(category: string, className = 'h-5 w-5') {
  switch (category) {
    case 'Science': return <FlaskConical className={className} />
    case 'Technology': return <Cpu className={className} />
    case 'Engineering': return <Wrench className={className} />
    case 'Math': return <Calculator className={className} />
    default: return <Zap className={className} />
  }
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 3)
}
function fmtPrice(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}

// ─────────────────────────────────────────────
// STATIC DATA — Component library + Templates
// ─────────────────────────────────────────────
interface Component {
  name: string
  category: 'controller' | 'sensor' | 'actuator' | 'display' | 'misc'
  price: number          // VND tham khảo
  desc: string
  specs: string[]
}

const COMPONENT_LIB: Component[] = [
  { name: 'Arduino UNO R3',        category: 'controller', price: 180_000, desc: 'MCU phổ biến nhất cho người mới',                specs: ['ATmega328P', '14 chân digital', '6 chân analog', '5V/3.3V'] },
  { name: 'ESP32 DevKit',          category: 'controller', price: 150_000, desc: 'Wi-Fi + Bluetooth tích hợp, mạnh hơn Arduino',  specs: ['240MHz dual-core', 'Wi-Fi 2.4GHz', 'BLE 4.2', '34 GPIO'] },
  { name: 'Raspberry Pi Pico W',   category: 'controller', price: 220_000, desc: 'Linux-free MCU với Wi-Fi, Python/C',            specs: ['RP2040 ARM', '264KB SRAM', 'Wi-Fi b/g/n', '26 GPIO'] },
  { name: 'DHT22 (cảm biến)',      category: 'sensor',     price: 65_000,  desc: 'Đo nhiệt độ + độ ẩm chính xác cao',             specs: ['-40~80°C ±0.5°C', '0-100% RH', '1 dây dữ liệu', '3.3-5V'] },
  { name: 'HC-SR04 (siêu âm)',     category: 'sensor',     price: 18_000,  desc: 'Đo khoảng cách 2cm-4m, dùng cho robot',         specs: ['Tầm 2-400cm', 'Độ chính xác 3mm', 'Trigger + Echo', '5V'] },
  { name: 'MPU6050 (gia tốc/gyro)',category: 'sensor',     price: 55_000,  desc: 'Cảm biến 6-trục đo độ nghiêng, chuyển động',    specs: ['3 trục accel', '3 trục gyro', 'I2C', '±2/4/8/16g'] },
  { name: 'Servo SG90',            category: 'actuator',   price: 35_000,  desc: 'Động cơ servo nhỏ quay 180°, cho cánh tay robot',specs: ['180° quay', 'Torque 1.8kg.cm', '4.8-6V', 'PWM 50Hz'] },
  { name: 'Motor DC + L298N',      category: 'actuator',   price: 45_000,  desc: 'Combo điều khiển 2 động cơ cho robot 2 bánh',   specs: ['Driver 2 kênh', '0-46V', '2A/kênh', 'PWM'] },
  { name: 'LCD 16x2 I2C',          category: 'display',    price: 50_000,  desc: 'Màn hình 2 dòng 16 ký tự, giao tiếp I2C đơn giản', specs: ['16×2 ký tự', 'I2C address 0x27', '5V', 'Backlight'] },
  { name: 'OLED 0.96"',            category: 'display',    price: 70_000,  desc: 'Màn hình OLED nhỏ độ phân giải 128x64',          specs: ['128×64 pixel', 'I2C/SPI', '3.3-5V', 'Đen-trắng'] },
  { name: 'Breadboard 830 lỗ',     category: 'misc',       price: 30_000,  desc: 'Bo cắm linh kiện không cần hàn',                 specs: ['830 điểm cắm', '2 thanh nguồn', 'Tái sử dụng nhiều lần'] },
  { name: 'Pin sạc 18650 + bo',    category: 'misc',       price: 90_000,  desc: 'Nguồn cho dự án di động (robot, IoT)',          specs: ['3.7V 2200mAh', 'TP4056 sạc', '5V output', 'Bảo vệ'] },
]

interface Template {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  duration: string
  category: string
  components: number
  emoji: string
  outcomes: string[]
}

const TEMPLATES: Template[] = [
  { id: 'temp-1', title: 'Đèn LED chớp tắt theo nhịp', emoji: '💡', difficulty: 'easy', duration: '30 phút', category: 'Technology', components: 3,
    description: 'Bài đầu tay với Arduino: học cách lập trình chân digital và delay()',
    outcomes: ['Cú pháp digitalWrite()', 'Mạch điện cơ bản', 'Nguyên lý điện trở'] },
  { id: 'temp-2', title: 'Trạm thời tiết DHT22', emoji: '🌡️', difficulty: 'medium', duration: '2 giờ', category: 'Science', components: 5,
    description: 'Đọc nhiệt độ + độ ẩm từ cảm biến, hiển thị OLED, log lên Wi-Fi',
    outcomes: ['Đọc cảm biến số', 'Giao tiếp I2C', 'Gửi data lên cloud'] },
  { id: 'temp-3', title: 'Robot tránh vật cản', emoji: '🤖', difficulty: 'medium', duration: '4 giờ', category: 'Engineering', components: 8,
    description: 'Robot 2 bánh dùng siêu âm HC-SR04 + servo quét, tự né vật cản',
    outcomes: ['Điều khiển motor PWM', 'Đọc sensor analog', 'Logic tránh va chạm'] },
  { id: 'temp-4', title: 'Đàn piano cảm ứng', emoji: '🎹', difficulty: 'easy', duration: '1.5 giờ', category: 'Technology', components: 5,
    description: 'Tạo đàn piano mini với 7 nút bấm và loa buzzer phát nhạc',
    outcomes: ['Đọc input số nhiều chân', 'Phát tần số âm thanh', 'Mảng dữ liệu'] },
  { id: 'temp-5', title: 'Đếm bước chân (pedometer)', emoji: '🚶', difficulty: 'hard', duration: '6 giờ', category: 'Engineering', components: 6,
    description: 'Đeo tay với MPU6050 + ESP32 BLE đếm bước, gửi điện thoại',
    outcomes: ['Xử lý tín hiệu gia tốc', 'Filtering noise', 'BLE truyền dữ liệu'] },
  { id: 'temp-6', title: 'Máy đo pH dung dịch', emoji: '🧪', difficulty: 'medium', duration: '3 giờ', category: 'Science', components: 4,
    description: 'Đầu dò pH analog + Arduino, hiển thị giá trị trên LCD',
    outcomes: ['Đo điện áp analog', 'Hiệu chuẩn 2 điểm', 'Hoá học acid-base'] },
]

// ─────────────────────────────────────────────
// AI PROJECT GENERATOR
// ─────────────────────────────────────────────
interface GeneratedProject {
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  durationHours: number
  category: string
  components: { name: string; qty: number; estimatedPrice: number }[]
  steps: string[]
  learningOutcomes: string[]
  tags: string[]
}

function AIGenerator() {
  const [prompt, setPrompt] = useState('')
  const [level, setLevel] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GeneratedProject | null>(null)
  const [totalCost, setTotalCost] = useState(0)

  const samples = [
    'Hệ thống tưới cây tự động khi đất khô',
    'Đèn ngủ tự động bật khi trời tối',
    'Cảm biến đo chất lượng không khí trong phòng',
    'Cánh tay robot điều khiển bằng giọng nói',
  ]

  const generate = async () => {
    if (prompt.trim().length < 5) {
      toast.error('Nhập ít nhất 5 ký tự mô tả ý tưởng')
      return
    }
    setGenerating(true)
    try {
      const res = await api.post<{ project: GeneratedProject; totalCost: number; tookMs: number }>(
        '/stem/ai-generate',
        { prompt: prompt.trim(), level },
        { timeout: 60_000 }
      )
      setResult(res.data.project)
      setTotalCost(res.data.totalCost)
      toast.success(`AI sinh xong trong ${(res.data.tookMs / 1000).toFixed(1)}s`)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'AI không phản hồi, thử lại sau')
    } finally {
      setGenerating(false)
    }
  }

  const saveAsProject = () => {
    if (!result) return
    const existing = loadProjects()
    const newProject: STEMProject = {
      id: 'p-' + Date.now().toString(36),
      title: result.title,
      description: result.description,
      category: (result.category as STEMProject['category']) || 'Technology',
      status: 'draft',
      progress: 0,
      teamMembers: [],
      tags: result.tags,
      instructor: { id: 'self', name: 'Tự tạo' },
      dueDate: '',
      feedback: [],
      milestones: [],
      difficulty: result.difficulty === 'easy' ? 'beginner' : result.difficulty === 'hard' ? 'advanced' : 'intermediate',
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveProjects([newProject, ...existing])
    toast.success(`Đã lưu "${result.title}" vào "Dự án của tôi"`)
    setResult(null)
    setPrompt('')
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-purple-600/15 via-blue-600/10 to-emerald-600/10 border border-purple-500/30 p-6 mb-8 relative overflow-hidden">
      {/* Bg glow */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/40">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Project Generator</h2>
            <p className="text-sm text-white/50">Mô tả ý tưởng STEM bằng tiếng Việt — AI sẽ sinh kế hoạch chi tiết + BOM + các bước</p>
          </div>
        </div>

        {!result ? (
          <>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="VD: Tôi muốn làm một thiết bị đo độ ẩm đất và tự tưới cây khi cần..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50 resize-none"
            />

            {/* Sample prompts */}
            <div className="flex flex-wrap gap-2 mt-3">
              {samples.map(s => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  disabled={generating}
                  className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-purple-500/15 hover:border-purple-500/30 hover:text-purple-300 transition-colors"
                >
                  <Lightbulb className="inline w-3 h-3 mr-1" />{s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/50">Mức độ:</span>
                {(['easy', 'medium', 'hard'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      level === l
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {l === 'easy' ? 'Dễ' : l === 'medium' ? 'Trung bình' : 'Nâng cao'}
                  </button>
                ))}
              </div>
              <button
                onClick={generate}
                disabled={generating || prompt.trim().length < 5}
                className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-purple-900/30"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'AI đang nghĩ...' : 'Sinh kế hoạch'}
              </button>
            </div>
          </>
        ) : (
          /* RESULT */
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{result.title}</h3>
                <p className="text-sm text-white/60">{result.description}</p>
              </div>
              <button onClick={() => setResult(null)} className="text-white/40 hover:text-white/80 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats line */}
            <div className="flex items-center flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getCategoryClasses(result.category).badge}`}>
                {result.category}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-white/70 border border-white/10">
                ⏱ ~{result.durationHours} giờ
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-white/70 border border-white/10">
                {result.difficulty === 'easy' ? '⭐ Dễ' : result.difficulty === 'hard' ? '⭐⭐⭐ Nâng cao' : '⭐⭐ Trung bình'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-300 border border-green-500/30">
                💰 ~{totalCost.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* BOM */}
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <h4 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />Linh kiện cần dùng ({result.components.length})
                </h4>
                <ul className="space-y-1.5">
                  {result.components.map((c, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="text-white/70">
                        <span className="text-white/40">×{c.qty}</span> {c.name}
                      </span>
                      <span className="text-white/40 font-mono">{fmtPrice(c.estimatedPrice * c.qty)}đ</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outcomes */}
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <h4 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />Kiến thức/kỹ năng đạt được
                </h4>
                <ul className="space-y-1.5">
                  {result.learningOutcomes.map((o, i) => (
                    <li key={i} className="text-xs text-white/70 flex gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Steps */}
            <div className="rounded-xl bg-black/30 border border-white/10 p-4">
              <h4 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />Các bước thực hiện ({result.steps.length})
              </h4>
              <ol className="space-y-2">
                {result.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-xs text-white/70">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setResult(null); setPrompt('') }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                Sinh ý tưởng khác
              </button>
              <button
                onClick={saveAsProject}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors"
              >
                <Plus className="w-4 h-4" />Lưu vào "Dự án của tôi"
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENT LIBRARY TAB
// ─────────────────────────────────────────────
function ComponentLibrary() {
  const [cat, setCat] = useState<Component['category'] | 'all'>('all')
  const filtered = COMPONENT_LIB.filter(c => cat === 'all' || c.category === cat)

  const catLabels = {
    all: 'Tất cả', controller: 'MCU/Board', sensor: 'Cảm biến',
    actuator: 'Cơ cấu', display: 'Hiển thị', misc: 'Phụ kiện',
  } as const

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(Object.keys(catLabels) as Array<keyof typeof catLabels>).map(k => (
          <button
            key={k}
            onClick={() => setCat(k as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              cat === k
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
            }`}
          >
            {catLabels[k]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.name} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-bold text-white/90 leading-tight">{c.name}</h4>
              <span className="text-xs text-emerald-400 font-mono">{fmtPrice(c.price)}đ</span>
            </div>
            <p className="text-xs text-white/50 mb-3">{c.desc}</p>
            <ul className="space-y-1">
              {c.specs.map((s, i) => (
                <li key={i} className="text-[11px] text-white/40 flex gap-1.5">
                  <span className="text-blue-400">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-xs text-white/30 mt-4 text-center">
        💡 Giá tham khảo, có thể thay đổi theo nhà cung cấp. Khuyến nghị mua tại Hshop / Linh kiện điện tử / nshopvn.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// TEMPLATES TAB
// ─────────────────────────────────────────────
function TemplatesTab({ onUseTemplate }: { onUseTemplate: (t: Template) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {TEMPLATES.map(t => (
        <div key={t.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 hover:border-purple-500/30 transition-colors group">
          <div className="flex items-start justify-between mb-3">
            <div className="text-4xl">{t.emoji}</div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              t.difficulty === 'easy' ? 'bg-green-500/15 text-green-300 border border-green-500/30' :
              t.difficulty === 'medium' ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' :
              'bg-red-500/15 text-red-300 border border-red-500/30'
            }`}>
              {t.difficulty === 'easy' ? 'DỄ' : t.difficulty === 'medium' ? 'T.BÌNH' : 'NÂNG CAO'}
            </span>
          </div>
          <h4 className="font-bold text-white/90 mb-1 text-base leading-tight">{t.title}</h4>
          <p className="text-xs text-white/50 mb-3 line-clamp-2">{t.description}</p>
          <div className="flex items-center gap-3 text-[11px] text-white/40 mb-3">
            <span>⏱ {t.duration}</span>
            <span>•</span>
            <span>{t.components} linh kiện</span>
            <span>•</span>
            <span>{t.category}</span>
          </div>
          <div className="mb-3 space-y-1">
            {t.outcomes.slice(0, 3).map((o, i) => (
              <p key={i} className="text-[11px] text-white/50 flex gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{o}</span>
              </p>
            ))}
          </div>
          <button
            onClick={() => onUseTemplate(t)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-colors group-hover:bg-purple-500/30"
          >
            Dùng mẫu này <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// DROPDOWN MENU (preserved from original)
// ─────────────────────────────────────────────
function ProjectMenu({ project, onDelete }: { project: STEMProject; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/[0.06] hover:text-white/80 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 w-44 rounded-xl border border-white/[0.08] bg-[hsl(260,30%,10%)] shadow-xl z-20 py-1">
            <p className="px-3 py-1.5 text-[0.65rem] uppercase tracking-wider text-white/25 font-semibold">Hành động</p>
            <Link to={`/dashboard/stem/${project.id}`} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
              <Eye className="h-4 w-4" /> Xem chi tiết
            </Link>
            <Link to={`/dashboard/stem/${project.id}/edit`} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
              <Edit className="h-4 w-4" /> Chỉnh sửa
            </Link>
            <Link to={`/dashboard/stem/${project.id}/timeline`} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
              <Calendar className="h-4 w-4" /> Timeline
            </Link>
            <div className="my-1 border-t border-white/[0.06]" />
            <button onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
              <Share className="h-4 w-4" /> Chia sẻ
            </button>
            <button onClick={() => { setOpen(false); onDelete() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
              <Trash2 className="h-4 w-4" /> Xóa
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// PROJECT CARD (preserved)
// ─────────────────────────────────────────────
function ProjectCard({ project, onDelete }: { project: STEMProject; onDelete: () => void }) {
  const catClass = getCategoryClasses(project.category)
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 flex flex-col">
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${catClass.badge} border`}>
              <span className={catClass.icon}>{getCategoryIcon(project.category)}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white/85 leading-snug line-clamp-2 mb-1.5">{project.title}</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.6rem] font-semibold border ${getStatusClasses(project.status)}`}>{getStatusLabel(project.status)}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.6rem] font-medium border ${catClass.badge}`}>{project.category}</span>
              </div>
            </div>
          </div>
          <ProjectMenu project={project} onDelete={onDelete} />
        </div>
        <p className="text-xs text-white/40 leading-relaxed line-clamp-3 mb-4">{project.description}</p>
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/40">Tiến độ</span>
            <span className="font-semibold text-white/70">{project.progress}%</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${getProgressColor(project.status)}`} style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="h-3.5 w-3.5 text-white/30" />
            <span className="text-xs text-white/35">Nhóm ({project.teamMembers.length})</span>
          </div>
          <div className="flex -space-x-1.5">
            {project.teamMembers.slice(0, 3).map(m => (
              <div key={m.id} className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-[hsl(260,30%,8%)] bg-blue-500/20 text-blue-300" title={m.name}>
                <span className="text-[0.55rem] font-bold">{getInitials(m.name)}</span>
              </div>
            ))}
            {project.teamMembers.length > 3 && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-[hsl(260,30%,8%)] bg-white/[0.08] text-white/50">
                <span className="text-[0.55rem] font-bold">+{project.teamMembers.length - 3}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {project.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="px-2 py-0.5 text-[0.6rem] rounded border border-white/[0.08] text-white/35">{tag}</span>
          ))}
          {project.tags.length > 3 && (
            <span className="px-2 py-0.5 text-[0.6rem] rounded border border-white/[0.08] text-white/25">+{project.tags.length - 3}</span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-white/35 mb-3">
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            <span className="truncate max-w-[130px]">{project.instructor.name}</span>
          </div>
          {project.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(project.dueDate).toLocaleDateString('vi-VN')}</span>
            </div>
          )}
        </div>
        {project.feedback.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-white/30 mb-3">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{project.feedback.length} phản hồi từ giáo viên</span>
          </div>
        )}
      </div>
      <div className="px-5 pb-5 mt-auto flex gap-2">
        <Link to={`/dashboard/stem/${project.id}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/60 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/85 transition-all">
          <Eye className="h-3.5 w-3.5" />Xem
        </Link>
        <Link to={`/dashboard/stem/${project.id}/edit`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/60 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/85 transition-all">
          <Edit className="h-3.5 w-3.5" />Sửa
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
type Tab = 'projects' | 'library' | 'templates'

export default function StemPage() {
  const [tab, setTab] = useState<Tab>('projects')
  const [projects, setProjects] = useState<STEMProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    const timer = setTimeout(() => {
      setProjects(loadProjects())
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const handleDelete = (id: string) => {
    if (!confirm('Xóa dự án này?')) return
    const updated = projects.filter(p => p.id !== id)
    setProjects(updated)
    saveProjects(updated)
  }

  const useTemplate = (t: Template) => {
    const newProject: STEMProject = {
      id: 'p-' + Date.now().toString(36),
      title: t.title,
      description: t.description,
      category: (t.category as STEMProject['category']) || 'Technology',
      status: 'draft',
      progress: 0,
      teamMembers: [],
      tags: [t.category, t.difficulty, 'từ-mẫu'],
      instructor: { id: 'self', name: 'Tự tạo từ mẫu' },
      dueDate: '',
      feedback: [],
      milestones: [],
      difficulty: t.difficulty === 'easy' ? 'beginner' : t.difficulty === 'hard' ? 'advanced' : 'intermediate',
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [newProject, ...projects]
    setProjects(updated)
    saveProjects(updated)
    setTab('projects')
    toast.success(`Đã tạo "${t.title}" từ mẫu — vào "Dự án của tôi" để tiếp tục`)
  }

  const filtered = projects.filter(p => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter
    return matchSearch && matchStatus && matchCat
  })

  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    inProgress: projects.filter(p => p.status === 'in-progress').length,
    draft: projects.filter(p => p.status === 'draft').length,
    review: projects.filter(p => p.status === 'review').length,
  }

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white/90 mb-2">STEM Lab</h1>
              <p className="text-white/40">Sáng tạo dự án STEM với AI Generator, thư viện linh kiện và mẫu khởi đầu</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/dashboard/stem/templates" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 border border-white/[0.1] hover:bg-white/[0.05] hover:text-white/80 transition-all">
                <Download className="h-4 w-4" />Mẫu chi tiết
              </Link>
              <Link to="/dashboard/stem/create" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/30">
                <Plus className="h-4 w-4" />Tạo dự án thủ công
              </Link>
            </div>
          </div>
        </div>

        {/* ── AI Generator hero ── */}
        <AIGenerator />

        {/* ── Tab nav ── */}
        <div className="flex items-center gap-1 mb-5 border-b border-white/[0.08]">
          {([
            { key: 'projects'  as const, label: 'Dự án của tôi',     icon: Layers,     count: projects.length },
            { key: 'library'   as const, label: 'Thư viện linh kiện', icon: Cpu,        count: COMPONENT_LIB.length },
            { key: 'templates' as const, label: 'Mẫu khởi đầu',      icon: Sparkles,   count: TEMPLATES.length },
          ]).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === key
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/60 ml-1">{count}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Projects ── */}
        {tab === 'projects' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
              {[
                { label: 'Tổng', value: stats.total, icon: Target, color: 'text-blue-400' },
                { label: 'Hoàn thành', value: stats.completed, icon: CheckCircle, color: 'text-emerald-400' },
                { label: 'Đang làm', value: stats.inProgress, icon: Clock, color: 'text-blue-400' },
                { label: 'Bản nháp', value: stats.draft, icon: Edit, color: 'text-white/60' },
                { label: 'Chờ duyệt', value: stats.review, icon: AlertCircle, color: 'text-yellow-400' },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/40 font-medium mb-1 uppercase tracking-wider">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-5">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                  <input type="text" placeholder="Tìm kiếm dự án..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/80 placeholder:text-white/25 text-sm focus:outline-none focus:border-purple-500/50 transition-all" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/70 text-sm focus:outline-none focus:border-purple-500/50 min-w-[150px]">
                  <option value="all">Tất cả trạng thái</option>
                  <option value="draft">Bản nháp</option>
                  <option value="in-progress">Đang thực hiện</option>
                  <option value="review">Chờ duyệt</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="published">Đã xuất bản</option>
                </select>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/70 text-sm focus:outline-none focus:border-purple-500/50 min-w-[140px]">
                  <option value="all">Tất cả lĩnh vực</option>
                  <option value="Science">Khoa học</option>
                  <option value="Technology">Công nghệ</option>
                  <option value="Engineering">Kỹ thuật</option>
                  <option value="Math">Toán học</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Đang tải dự án...</p>
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(project => (
                  <ProjectCard key={project.id} project={project} onDelete={() => handleDelete(project.id)} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white/80 mb-2">Bắt đầu hành trình STEM của bạn</h3>
                <p className="text-white/50 mb-6 text-sm max-w-md mx-auto">
                  Mô tả ý tưởng ở khung AI bên trên, hoặc chọn từ <button onClick={() => setTab('templates')} className="text-purple-400 underline hover:text-purple-300">mẫu khởi đầu</button>
                </p>
              </div>
            ) : (
              <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <Target className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">Không có dự án nào khớp bộ lọc</p>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Library ── */}
        {tab === 'library' && <ComponentLibrary />}

        {/* ── Tab: Templates ── */}
        {tab === 'templates' && <TemplatesTab onUseTemplate={useTemplate} />}
      </div>
    </div>
  )
}
