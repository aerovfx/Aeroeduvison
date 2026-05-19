import { useState, useEffect } from 'react'
import { Settings, Brain, Calendar, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { tokenStore } from '@/services/api'

// Theme-aware palette via CSS vars (auto light/dark switching)
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  purple:      'var(--td-purple)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  blue:        'var(--td-blue)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
} as const

const DEFAULT_AI_TUTOR = {
  explanationDepth: 'medium',
  difficulty: 'medium',
  learningStyle: 'mixed',
  defaultSubject: 'Toán',
  useSocraticMethod: true,
  temperature: 0.7,
  maxTokens: 2048,
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${D.border}`,
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  color: D.text,
  outline: 'none',
  appearance: 'none' as const,
}

const inputStyle: React.CSSProperties = { ...selectStyle }

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: D.muted,
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

export default function AgentSettings() {
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiTutor, setAiTutor] = useState({ ...DEFAULT_AI_TUTOR })
  const [studyPlanner, setStudyPlanner] = useState({
    reminderTime: '08:00',
    dailyGoalMinutes: 120,
    weekdaysOnly: false,
    reminderBeforeMinutes: 30,
  })

  useEffect(() => {
    const headers: HeadersInit = tokenStore.getAccessToken() ? { Authorization: `Bearer ${tokenStore.getAccessToken()}` } : {}
    fetch('/api/student/agent-settings', { headers })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const at = (data.settings || {})['ai-tutor'] as Record<string, unknown> | undefined
        if (at) {
          setAiTutor(prev => ({
            ...prev,
            explanationDepth: (at.explanationDepth as string) || prev.explanationDepth,
            difficulty: (at.difficulty as string) || prev.difficulty,
            learningStyle: (at.learningStyle as string) || prev.learningStyle,
            defaultSubject: (at.defaultSubject as string) || prev.defaultSubject,
            useSocraticMethod: at.useSocraticMethod !== false,
            temperature: typeof at.temperature === 'number' ? at.temperature : prev.temperature,
            maxTokens: typeof at.maxTokens === 'number' ? at.maxTokens : prev.maxTokens,
          }))
        }
        const sp = (data.settings || {})['study-planner'] as Record<string, unknown> | undefined
        if (sp) {
          setStudyPlanner(prev => ({
            reminderTime: (sp.reminderTime as string) || prev.reminderTime,
            dailyGoalMinutes: typeof sp.dailyGoalMinutes === 'number' ? sp.dailyGoalMinutes : prev.dailyGoalMinutes,
            weekdaysOnly: sp.weekdaysOnly === true,
            reminderBeforeMinutes: typeof sp.reminderBeforeMinutes === 'number' ? sp.reminderBeforeMinutes : prev.reminderBeforeMinutes,
          }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(tokenStore.getAccessToken() ? { Authorization: `Bearer ${tokenStore.getAccessToken()}` } : {}),
      }
      const res = await fetch('/api/student/agent-settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 'ai-tutor': aiTutor, 'study-planner': studyPlanner }),
      })
      if (!res.ok) throw new Error()
      toast.success('Đã lưu cài đặt')
    } catch {
      toast.error('Không lưu được cài đặt')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: D.bg }}>
        <Loader2 style={{ width: 32, height: 32, color: D.muted, animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', background: D.bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: '20px 24px' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
            <Settings style={{ width: 26, height: 26, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: D.text }}>Cài đặt Agents</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: D.muted }}>Tùy chỉnh Trợ lý học tập, Kế hoạch học và các agent khác</p>
          </div>
        </div>

        {/* AI Tutor Section */}
        <section style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(124,58,237,0.25)' }}>
              <Brain style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: D.text }}>Gia Sư AI (Trợ lý học tập)</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: D.muted }}>Độ sâu giải thích, độ khó, phong cách học</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div>
              <label style={labelStyle}>Độ sâu giải thích</label>
              <select value={aiTutor.explanationDepth} onChange={e => setAiTutor(p => ({ ...p, explanationDepth: e.target.value }))} style={selectStyle}>
                <option value="short">Ngắn gọn</option>
                <option value="medium">Vừa phải</option>
                <option value="detailed">Chi tiết</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Độ khó mặc định</label>
              <select value={aiTutor.difficulty} onChange={e => setAiTutor(p => ({ ...p, difficulty: e.target.value }))} style={selectStyle}>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Phong cách học</label>
              <select value={aiTutor.learningStyle} onChange={e => setAiTutor(p => ({ ...p, learningStyle: e.target.value }))} style={selectStyle}>
                <option value="visual">Trực quan</option>
                <option value="auditory">Nghe</option>
                <option value="kinesthetic">Thực hành</option>
                <option value="mixed">Kết hợp</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Môn mặc định</label>
              <select value={aiTutor.defaultSubject} onChange={e => setAiTutor(p => ({ ...p, defaultSubject: e.target.value }))} style={selectStyle}>
                {['Toán','Lý','Hóa','Sinh','Văn','Anh'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <input
                type="checkbox"
                id="socratic"
                checked={aiTutor.useSocraticMethod}
                onChange={e => setAiTutor(p => ({ ...p, useSocraticMethod: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: D.purple }}
              />
              <label htmlFor="socratic" style={{ fontSize: 14, color: D.muted, cursor: 'pointer' }}>
                Dùng phương pháp Socratic (hỏi gợi mở thay vì đưa đáp án ngay)
              </label>
            </div>

            <div>
              <label style={labelStyle}>Nhiệt độ AI (0–1): {aiTutor.temperature}</label>
              <input
                type="range" min={0} max={1} step={0.1}
                value={aiTutor.temperature}
                onChange={e => setAiTutor(p => ({ ...p, temperature: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: D.purple }}
              />
            </div>
            <div>
              <label style={labelStyle}>Số token tối đa: {aiTutor.maxTokens}</label>
              <input
                type="number" min={512} max={4096} step={256}
                value={aiTutor.maxTokens}
                onChange={e => setAiTutor(p => ({ ...p, maxTokens: parseInt(e.target.value, 10) || 2048 }))}
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* Study Planner Section */}
        <section style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#0d9488,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(13,148,136,0.25)' }}>
              <Calendar style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: D.text }}>Trợ lý Kế hoạch học (Study Planner)</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: D.muted }}>Giờ nhắc học, mục tiêu mỗi ngày</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div>
              <label style={labelStyle}>Giờ nhắc học mỗi ngày</label>
              <input
                type="time"
                value={studyPlanner.reminderTime}
                onChange={e => setStudyPlanner(p => ({ ...p, reminderTime: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Mục tiêu học mỗi ngày (phút)</label>
              <input
                type="number" min={30} max={480} step={15}
                value={studyPlanner.dailyGoalMinutes}
                onChange={e => setStudyPlanner(p => ({ ...p, dailyGoalMinutes: parseInt(e.target.value, 10) || 120 }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Nhắc trước giờ học (phút)</label>
              <input
                type="number" min={5} max={120}
                value={studyPlanner.reminderBeforeMinutes}
                onChange={e => setStudyPlanner(p => ({ ...p, reminderBeforeMinutes: parseInt(e.target.value, 10) || 30 }))}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
              <input
                type="checkbox"
                id="weekdays"
                checked={studyPlanner.weekdaysOnly}
                onChange={e => setStudyPlanner(p => ({ ...p, weekdaysOnly: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: D.purple }}
              />
              <label htmlFor="weekdays" style={{ fontSize: 14, color: D.muted, cursor: 'pointer' }}>
                Chỉ nhắc vào ngày thường (Thứ 2–6)
              </label>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: 12, fontWeight: 600,
              fontSize: 14, color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg,#7c3aed,#9333ea)',
              boxShadow: '0 0 20px rgba(124,58,237,0.2)',
              opacity: saving ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {saving
              ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
              : <Save style={{ width: 18, height: 18 }} />}
            Lưu cài đặt
          </button>
        </div>

      </div>
    </div>
  )
}
