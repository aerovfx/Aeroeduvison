/**
 * StemScrumPanel — Agile Scrum cho STEM project.
 *
 * User: "cập nhật như 1 dự án áp dụng Agile Scrum để quản lí.
 *  Cập nhật timeline,..."
 *
 * Sections:
 *  1. 🏃 Sprint hiện tại — header với goal + dates + days remaining + progress
 *  2. 📊 Velocity + Burndown — metrics + line chart SVG
 *  3. 📋 Sprint backlog — milestones trong sprint hiện tại (status + story points)
 *  4. 📦 Product Backlog — milestones chưa gắn sprint
 *  5. 🗂 Sprint list — past + planned sprints
 *  6. 💬 Daily Standup — yesterday / today / blockers
 *  7. 🔍 Retrospective — wentWell / didNotGoWell / improvements
 *  8. ✅ Definition of Done — checklist project-wide
 */
import { useMemo, useState } from 'react'
import {
  Plus, Play, Check, Calendar, Trash2, Edit3,
  X, ArrowRight, ListChecks, Flag, MessageSquare,
  TrendingDown, Zap, Target, AlertTriangle,
  Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react'
import type {
  STEMProject, Sprint, Milestone, SprintRetro, DailyStandup,
} from '../../pages/stem/stemStore'
import {
  createSprint, updateSprint, activateSprint, completeSprint, deleteSprint,
  assignMilestoneToSprint, setMilestoneStoryPoints,
  addStandup, deleteStandup, updateRetro, setDefinitionOfDone,
  computeVelocity, sprintTotalPoints, sprintCompletedPoints,
} from '../../pages/stem/stemStore'

// ─── Props ──────────────────────────────────────────────────────────────

interface Props {
  project: STEMProject
  onChange: (p: STEMProject) => void
}

// ─── Helpers ────────────────────────────────────────────────────────────

const POINTS_SCALE = [1, 2, 3, 5, 8, 13] as const

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

function daysRemaining(endDate: string): number {
  return daysBetween(new Date().toISOString().slice(0, 10), endDate)
}

function formatDate(s: string): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return s }
}

function shortDate(s: string): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' })
  } catch { return s }
}

// ─── Burndown chart (SVG) ───────────────────────────────────────────────

function BurndownChart({ sprint, milestones }: { sprint: Sprint; milestones: Milestone[] }) {
  const totalPts = milestones.reduce((s, m) => s + (m.storyPoints || 0), 0)
  if (totalPts === 0) {
    return (
      <div className="text-xs text-white/40 text-center py-6">
        Chưa estimate story points — chưa vẽ được burndown
      </div>
    )
  }
  const durationDays = Math.max(1, daysBetween(sprint.startDate, sprint.endDate))

  // Build burn data: each milestone "completed" → subtract storyPoints on its
  // completion date. Without true completedAt field, distribute completed pts
  // evenly across day-of-completion = today (proxy). For Phase 1: simple model.
  // Ideal line: linear from totalPts → 0 over durationDays.
  const today = new Date().toISOString().slice(0, 10)
  const elapsed = Math.min(durationDays, daysBetween(sprint.startDate, today))
  const remaining = totalPts - milestones
    .filter((m) => m.status === 'completed')
    .reduce((s, m) => s + (m.storyPoints || 0), 0)

  // Chart geometry
  const W = 320, H = 110, P = 18
  const xScale = (d: number) => P + (W - 2 * P) * (d / durationDays)
  const yScale = (pts: number) => H - P - (H - 2 * P) * (pts / totalPts)

  // Ideal line: (0, totalPts) → (durationDays, 0)
  const idealPath = `M ${xScale(0)},${yScale(totalPts)} L ${xScale(durationDays)},${yScale(0)}`

  // Actual: 2 points — (0, totalPts) → (elapsed, remaining)
  const actualPath = `M ${xScale(0)},${yScale(totalPts)} L ${xScale(elapsed)},${yScale(remaining)}`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t}
          x1={P} y1={P + (H - 2 * P) * t}
          x2={W - P} y2={P + (H - 2 * P) * t}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {/* Ideal line (dashed) */}
      <path d={idealPath} fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Actual line */}
      <path d={actualPath} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
      {/* Endpoints */}
      <circle cx={xScale(0)} cy={yScale(totalPts)} r="3" fill="#22d3ee" />
      <circle cx={xScale(elapsed)} cy={yScale(remaining)} r="3" fill="#22d3ee" />
      {/* Labels */}
      <text x={P} y={H - 4} fontSize="9" fill="rgba(255,255,255,0.4)">Ngày 0</text>
      <text x={W - P - 32} y={H - 4} fontSize="9" fill="rgba(255,255,255,0.4)">Ngày {durationDays}</text>
      <text x={3} y={yScale(totalPts) + 3} fontSize="9" fill="rgba(255,255,255,0.4)">{totalPts}</text>
      <text x={3} y={yScale(0) + 3} fontSize="9" fill="rgba(255,255,255,0.4)">0</text>
      {/* Legend */}
      <g transform={`translate(${W - 130}, ${P})`}>
        <line x1="0" y1="4" x2="14" y2="4" stroke="rgba(148,163,184,0.5)" strokeWidth="1.5" strokeDasharray="3 2" />
        <text x="18" y="7" fontSize="9" fill="rgba(255,255,255,0.5)">Ideal</text>
        <line x1="50" y1="4" x2="64" y2="4" stroke="#22d3ee" strokeWidth="2" />
        <text x="68" y="7" fontSize="9" fill="rgba(255,255,255,0.5)">Thực tế</text>
      </g>
    </svg>
  )
}

// ─── Story points picker ────────────────────────────────────────────────

function PointsPicker({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {POINTS_SCALE.map((p) => (
        <button
          key={p}
          onClick={(e) => { e.stopPropagation(); onChange(value === p ? undefined : p) }}
          className={`w-7 h-6 rounded text-[10px] font-bold transition ${
            value === p
              ? 'bg-cyan-500 text-white'
              : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

// ─── Milestone row (sprint backlog item) ─────────────────────────────────

function MilestoneRow({
  m, sprints, onAssign, onPoints,
}: {
  m: Milestone
  sprints: Sprint[]
  onAssign: (sprintId: string | null) => void
  onPoints: (p: number | undefined) => void
}) {
  const statusBadge = m.status === 'completed'
    ? { bg: 'bg-emerald-500/15', text: 'text-emerald-300', label: 'Done' }
    : m.status === 'in-progress'
      ? { bg: 'bg-blue-500/15', text: 'text-blue-300', label: 'Doing' }
      : { bg: 'bg-amber-500/15', text: 'text-amber-300', label: 'Todo' }
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] p-3 transition flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white/85 truncate">{m.title}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${statusBadge.bg} ${statusBadge.text}`}>
            {statusBadge.label}
          </span>
          {m.dueDate && (
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> {shortDate(m.dueDate)}
            </span>
          )}
        </div>
      </div>
      <PointsPicker value={m.storyPoints} onChange={onPoints} />
      <select
        value={m.sprintId || ''}
        onChange={(e) => onAssign(e.target.value || null)}
        className="text-[11px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/70 outline-none"
        title="Gán vào sprint"
      >
        <option value="">📦 Backlog</option>
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Sprint card ────────────────────────────────────────────────────────

function SprintCard({
  sprint, project, onActivate, onComplete, onDelete, onEdit,
}: {
  sprint: Sprint
  project: STEMProject
  onActivate: () => void
  onComplete: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  const totalPts = sprintTotalPoints(project, sprint.id)
  const donePts = sprintCompletedPoints(project, sprint.id)
  const pct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0
  const msCount = project.milestones.filter((m) => m.sprintId === sprint.id).length

  const statusMeta = sprint.status === 'active'
    ? { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-300', emoji: '🏃' }
    : sprint.status === 'completed'
      ? { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', emoji: '✅' }
      : { bg: 'bg-white/[0.04]', border: 'border-white/[0.08]', text: 'text-white/50', emoji: '📅' }

  const daysLeft = sprint.status === 'active' ? daysRemaining(sprint.endDate) : null

  return (
    <div className={`rounded-xl ${statusMeta.bg} border ${statusMeta.border} p-4 transition hover:border-white/[0.15]`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusMeta.emoji}</span>
            <h4 className="font-bold text-white/90 text-sm truncate">{sprint.name}</h4>
          </div>
          <p className={`text-[11px] ${statusMeta.text} mt-0.5 italic line-clamp-2`}>
            {sprint.goal || '(chưa đặt sprint goal)'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1 hover:bg-white/[0.06] rounded transition" title="Sửa">
            <Edit3 className="w-3.5 h-3.5 text-white/40" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-500/10 rounded transition" title="Xoá">
            <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10.5px] text-white/50 mb-3">
        <span>{shortDate(sprint.startDate)} → {shortDate(sprint.endDate)}</span>
        {daysLeft !== null && (
          <span className={daysLeft <= 2 ? 'text-rose-300 font-bold' : 'text-blue-300'}>
            • còn {daysLeft} ngày
          </span>
        )}
        <span>• {msCount} milestone</span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
          <span>{donePts}/{totalPts} pts</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        {sprint.status === 'planned' && (
          <button onClick={onActivate}
            className="flex-1 py-1.5 text-[11px] font-bold bg-blue-500 hover:bg-blue-600 text-white rounded transition flex items-center justify-center gap-1">
            <Play className="w-3 h-3" /> Bắt đầu
          </button>
        )}
        {sprint.status === 'active' && (
          <button onClick={onComplete}
            className="flex-1 py-1.5 text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded transition flex items-center justify-center gap-1">
            <Check className="w-3 h-3" /> Đóng sprint
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────

export default function StemScrumPanel({ project, onChange }: Props) {
  const [showCreateSprint, setShowCreateSprint] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)
  const [standupOpen, setStandupOpen] = useState(false)
  const [retroExpanded, setRetroExpanded] = useState<string | null>(null)
  const [dodEdit, setDodEdit] = useState(false)

  const sprints = project.sprints || []
  const standups = project.standups || []
  const activeSprint = useMemo(() => sprints.find((s) => s.status === 'active'), [sprints])
  const plannedSprints = sprints.filter((s) => s.status === 'planned')
  const completedSprints = sprints.filter((s) => s.status === 'completed')

  const velocity = useMemo(() => computeVelocity(project), [project])

  const backlogMilestones = project.milestones.filter((m) => !m.sprintId)
  const activeSprintMilestones = activeSprint
    ? project.milestones.filter((m) => m.sprintId === activeSprint.id)
    : []

  // ─── Actions ──────────────────────────────────────────────────
  const mutate = (op: (id: string) => STEMProject | undefined) => {
    const p = op(project.id)
    if (p) onChange(p)
  }

  return (
    <div className="space-y-6">
      {/* ── Header w/ Velocity ── */}
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500/[0.06] to-blue-500/[0.04] border border-cyan-500/20 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white/90">Agile Scrum</h3>
              <p className="text-xs text-white/50">
                {sprints.length} sprint · velocity {velocity > 0 ? `${velocity} pts/sprint` : 'chưa có dữ liệu'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateSprint(true)}
            className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Sprint mới
          </button>
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Sprint active" value={activeSprint ? '1' : '0'} icon={Play} color="text-blue-300" />
          <Metric label="Sprint xong" value={String(completedSprints.length)} icon={Check} color="text-emerald-300" />
          <Metric label="Velocity" value={velocity > 0 ? `${velocity} pts` : '—'} icon={TrendingDown} color="text-cyan-300" />
          <Metric label="Backlog" value={String(backlogMilestones.length)} icon={ListChecks} color="text-amber-300" />
        </div>
      </div>

      {/* ── Active Sprint Detail (or empty) ── */}
      {activeSprint ? (
        <div className="rounded-2xl bg-blue-500/[0.04] border-2 border-blue-500/25 p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏃</span>
                <h3 className="text-xl font-bold text-white/90">{activeSprint.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  ĐANG CHẠY
                </span>
              </div>
              <p className="text-sm text-blue-200/80 italic mt-1 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" />
                {activeSprint.goal || '(chưa đặt sprint goal — bấm sửa để thêm)'}
              </p>
              <p className="text-xs text-white/40 mt-1.5">
                {formatDate(activeSprint.startDate)} → {formatDate(activeSprint.endDate)} ·
                còn <strong className="text-blue-300">{daysRemaining(activeSprint.endDate)} ngày</strong>
              </p>
            </div>
          </div>

          {/* Burndown */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white/80">Burndown chart</h4>
            </div>
            <BurndownChart sprint={activeSprint} milestones={activeSprintMilestones} />
          </div>

          {/* Sprint backlog */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-white/80 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-400" />
                Sprint backlog ({activeSprintMilestones.length})
              </h4>
              <span className="text-[11px] text-white/40">
                {sprintCompletedPoints(project, activeSprint.id)}/{sprintTotalPoints(project, activeSprint.id)} pts
              </span>
            </div>
            <div className="space-y-2">
              {activeSprintMilestones.length === 0 ? (
                <div className="text-xs text-white/40 italic text-center py-4 border border-dashed border-white/[0.08] rounded-lg">
                  Chưa có milestone nào trong sprint — kéo từ Backlog xuống
                </div>
              ) : activeSprintMilestones.map((m) => (
                <MilestoneRow
                  key={m.id} m={m} sprints={sprints}
                  onAssign={(sid) => mutate((id) => assignMilestoneToSprint(id, m.id, sid))}
                  onPoints={(p) => mutate((id) => setMilestoneStoryPoints(id, m.id, p))}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.02] border-2 border-dashed border-white/[0.08] p-8 text-center">
          <Sparkles className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/50">
            Chưa có sprint nào đang chạy.{' '}
            <button onClick={() => setShowCreateSprint(true)} className="text-cyan-400 hover:text-cyan-300 underline">
              Tạo sprint đầu tiên
            </button>
            {plannedSprints.length > 0 && ' hoặc kích hoạt sprint đã lập kế hoạch ở dưới'}
          </p>
        </div>
      )}

      {/* ── Daily Standup ── */}
      {activeSprint && (
        <DailyStandupSection
          sprintId={activeSprint.id}
          standups={standups.filter((s) => s.sprintId === activeSprint.id)}
          isOpen={standupOpen}
          onToggle={() => setStandupOpen(!standupOpen)}
          onAdd={(note) => mutate((id) => addStandup(id, activeSprint.id, note))}
          onDelete={(sid) => mutate((id) => deleteStandup(id, sid))}
        />
      )}

      {/* ── Other Sprints ── */}
      {(plannedSprints.length > 0 || completedSprints.length > 0) && (
        <div>
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/40" />
            Sprints khác ({plannedSprints.length + completedSprints.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...plannedSprints, ...completedSprints].map((s) => (
              <SprintCard
                key={s.id} sprint={s} project={project}
                onActivate={() => mutate((id) => activateSprint(id, s.id))}
                onComplete={() => mutate((id) => completeSprint(id, s.id))}
                onDelete={() => {
                  if (confirm(`Xoá ${s.name}? Milestones sẽ trả về Backlog.`)) {
                    mutate((id) => deleteSprint(id, s.id))
                  }
                }}
                onEdit={() => setEditingSprint(s)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Retrospective per completed sprint ── */}
      {completedSprints.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-wide mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Sprint Retrospectives
          </h3>
          <div className="space-y-3">
            {completedSprints.map((s) => (
              <RetroEditor
                key={s.id} sprint={s}
                expanded={retroExpanded === s.id}
                onToggle={() => setRetroExpanded(retroExpanded === s.id ? null : s.id)}
                onSave={(retro) => mutate((id) => updateRetro(id, s.id, retro))}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Product Backlog ── */}
      <div>
        <h3 className="text-sm font-bold text-white/70 uppercase tracking-wide mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-amber-400" />
          Product Backlog ({backlogMilestones.length})
        </h3>
        <div className="space-y-2">
          {backlogMilestones.length === 0 ? (
            <p className="text-xs text-white/40 italic text-center py-4 border border-dashed border-white/[0.08] rounded-lg">
              Tất cả milestones đã được gán sprint
            </p>
          ) : backlogMilestones.map((m) => (
            <MilestoneRow
              key={m.id} m={m} sprints={sprints}
              onAssign={(sid) => mutate((id) => assignMilestoneToSprint(id, m.id, sid))}
              onPoints={(p) => mutate((id) => setMilestoneStoryPoints(id, m.id, p))}
            />
          ))}
        </div>
      </div>

      {/* ── Definition of Done ── */}
      <DefinitionOfDone
        items={project.definitionOfDone || []}
        editing={dodEdit}
        onEdit={() => setDodEdit(true)}
        onSave={(items) => { mutate((id) => setDefinitionOfDone(id, items)); setDodEdit(false) }}
        onCancel={() => setDodEdit(false)}
      />

      {/* ── Create Sprint modal ── */}
      {showCreateSprint && (
        <SprintEditModal
          onClose={() => setShowCreateSprint(false)}
          onSave={(fields) => { mutate((id) => createSprint(id, fields)); setShowCreateSprint(false) }}
        />
      )}
      {/* ── Edit Sprint modal ── */}
      {editingSprint && (
        <SprintEditModal
          initial={editingSprint}
          onClose={() => setEditingSprint(null)}
          onSave={(fields) => {
            mutate((id) => updateSprint(id, editingSprint.id, fields))
            setEditingSprint(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function Metric({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: typeof Zap; color: string
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
      <div className={`flex items-center gap-1 ${color} text-[10px] font-bold uppercase tracking-wide mb-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-lg font-bold text-white/90">{value}</div>
    </div>
  )
}

// ─── Daily Standup section ──────────────────────────────────────────────

function DailyStandupSection({
  sprintId, standups, isOpen, onToggle, onAdd, onDelete,
}: {
  sprintId: string
  standups: DailyStandup[]
  isOpen: boolean
  onToggle: () => void
  onAdd: (note: Omit<DailyStandup, 'id' | 'sprintId'>) => void
  onDelete: (id: string) => void
}) {
  const [author, setAuthor] = useState('')
  const [yesterday, setYesterday] = useState('')
  const [today, setToday] = useState('')
  const [blockers, setBlockers] = useState('')

  const handleSave = () => {
    if (!author.trim() || !today.trim()) {
      alert('Cần nhập tên + "Hôm nay làm gì"')
      return
    }
    onAdd({
      date: new Date().toISOString().slice(0, 10),
      author: author.trim(),
      yesterday: yesterday.trim(),
      today: today.trim(),
      blockers: blockers.trim(),
    })
    setYesterday(''); setToday(''); setBlockers('')
  }

  const sorted = [...standups].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-bold text-white/85">Daily Standup ({sorted.length})</h4>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          {/* Add form */}
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
            <input
              value={author} onChange={(e) => setAuthor(e.target.value)}
              placeholder="Tên (VD: Bạn An)"
              className="w-full mb-2 px-2 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-white/90 outline-none focus:border-purple-500/40"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <textarea
                value={yesterday} onChange={(e) => setYesterday(e.target.value)}
                placeholder="🟢 Hôm qua đã làm..." rows={2}
                className="px-2 py-1.5 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded text-white/85 outline-none focus:border-purple-500/40 resize-none"
              />
              <textarea
                value={today} onChange={(e) => setToday(e.target.value)}
                placeholder="🎯 Hôm nay sẽ làm... *" rows={2}
                className="px-2 py-1.5 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded text-white/85 outline-none focus:border-purple-500/40 resize-none"
              />
              <textarea
                value={blockers} onChange={(e) => setBlockers(e.target.value)}
                placeholder="🚧 Đang bị kẹt..." rows={2}
                className="px-2 py-1.5 text-[12px] bg-white/[0.04] border border-white/[0.08] rounded text-white/85 outline-none focus:border-purple-500/40 resize-none"
              />
            </div>
            <button
              onClick={handleSave}
              className="mt-2 w-full py-1.5 text-xs font-bold bg-purple-500 hover:bg-purple-600 text-white rounded transition flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> Ghi nhận standup hôm nay
            </button>
          </div>

          {/* List */}
          {sorted.length > 0 && (
            <div className="space-y-2">
              {sorted.slice(0, 10).map((s) => (
                <div key={s.id} className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs">
                      <span className="font-bold text-white/85">{s.author}</span>
                      <span className="text-white/40 ml-1.5">· {formatDate(s.date)}</span>
                    </div>
                    <button onClick={() => onDelete(s.id)} className="text-red-400/60 hover:text-red-400 p-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    {s.yesterday && (
                      <div>
                        <div className="text-emerald-300/60 font-bold mb-0.5">🟢 Hôm qua</div>
                        <div className="text-white/65">{s.yesterday}</div>
                      </div>
                    )}
                    {s.today && (
                      <div>
                        <div className="text-blue-300/70 font-bold mb-0.5">🎯 Hôm nay</div>
                        <div className="text-white/65">{s.today}</div>
                      </div>
                    )}
                    {s.blockers && (
                      <div>
                        <div className="text-rose-300/70 font-bold mb-0.5">🚧 Kẹt ở</div>
                        <div className="text-white/65">{s.blockers}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Retrospective editor ───────────────────────────────────────────────

function RetroEditor({ sprint, expanded, onToggle, onSave }: {
  sprint: Sprint
  expanded: boolean
  onToggle: () => void
  onSave: (retro: SprintRetro) => void
}) {
  const initial: SprintRetro = sprint.retro || { wentWell: [], didNotGoWell: [], improvements: [] }
  const [retro, setRetro] = useState<SprintRetro>(initial)

  const addItem = (key: keyof SprintRetro, value: string) => {
    if (!value.trim()) return
    setRetro({ ...retro, [key]: [...retro[key], value.trim()] })
  }
  const removeItem = (key: keyof SprintRetro, idx: number) => {
    setRetro({ ...retro, [key]: retro[key].filter((_, i) => i !== idx) })
  }

  const totalItems = retro.wentWell.length + retro.didNotGoWell.length + retro.improvements.length

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <button onClick={onToggle} className="w-full p-3 flex items-center justify-between hover:bg-white/[0.02] transition">
        <div className="text-sm font-bold text-white/85 flex items-center gap-2">
          <span>{sprint.name}</span>
          <span className="text-[10px] text-white/40">
            {totalItems > 0 ? `${totalItems} điểm reflect` : '(chưa retro)'}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>
      {expanded && (
        <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RetroColumn
            title="🟢 Đi tốt" color="emerald" items={retro.wentWell}
            onAdd={(v) => addItem('wentWell', v)}
            onRemove={(i) => removeItem('wentWell', i)}
          />
          <RetroColumn
            title="🔴 Chưa tốt" color="rose" items={retro.didNotGoWell}
            onAdd={(v) => addItem('didNotGoWell', v)}
            onRemove={(i) => removeItem('didNotGoWell', i)}
          />
          <RetroColumn
            title="🟡 Cải thiện" color="amber" items={retro.improvements}
            onAdd={(v) => addItem('improvements', v)}
            onRemove={(i) => removeItem('improvements', i)}
          />
          <button
            onClick={() => onSave(retro)}
            className="col-span-full mt-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded transition flex items-center justify-center gap-1"
          >
            <Check className="w-3 h-3" /> Lưu retrospective
          </button>
        </div>
      )}
    </div>
  )
}

function RetroColumn({ title, color, items, onAdd, onRemove }: {
  title: string
  color: 'emerald' | 'rose' | 'amber'
  items: string[]
  onAdd: (v: string) => void
  onRemove: (i: number) => void
}) {
  const [input, setInput] = useState('')
  const colorMap = {
    emerald: { bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/20', text: 'text-emerald-300' },
    rose: { bg: 'bg-rose-500/[0.06]', border: 'border-rose-500/20', text: 'text-rose-300' },
    amber: { bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/20', text: 'text-amber-300' },
  }[color]
  return (
    <div className={`rounded-lg ${colorMap.bg} border ${colorMap.border} p-3`}>
      <h5 className={`text-xs font-bold ${colorMap.text} mb-2`}>{title}</h5>
      <div className="space-y-1 mb-2">
        {items.map((item, i) => (
          <div key={i} className="text-[11px] text-white/75 bg-white/[0.04] rounded p-2 flex items-start gap-1.5">
            <span className="flex-1">{item}</span>
            <button onClick={() => onRemove(i)} className="text-white/30 hover:text-rose-400 shrink-0">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && <div className="text-[11px] text-white/30 italic">(chưa có)</div>}
      </div>
      <div className="flex gap-1">
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) { onAdd(input); setInput('') }
          }}
          placeholder="+ thêm"
          className="flex-1 px-2 py-1 text-[11px] bg-white/[0.04] border border-white/[0.08] rounded text-white/85 outline-none focus:border-white/[0.2]"
        />
        <button
          onClick={() => { if (input.trim()) { onAdd(input); setInput('') } }}
          className="px-2 py-1 text-[10px] bg-white/[0.06] hover:bg-white/[0.1] text-white/70 rounded"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ─── Definition of Done ─────────────────────────────────────────────────

function DefinitionOfDone({ items, editing, onEdit, onSave, onCancel }: {
  items: string[]; editing: boolean
  onEdit: () => void
  onSave: (items: string[]) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<string[]>(items)
  const [newItem, setNewItem] = useState('')

  // Reset draft khi enter editing mode
  useMemo(() => { if (editing) setDraft(items) }, [editing, items])

  if (!editing) {
    return (
      <div className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-emerald-200/90 flex items-center gap-2">
            <Check className="w-4 h-4" /> Definition of Done ({items.length})
          </h3>
          <button onClick={onEdit} className="text-xs text-emerald-300 hover:text-emerald-200 underline">
            Sửa
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-white/40 italic">
            Chưa định nghĩa "Done". Đây là checklist áp dụng cho mọi milestone — VD: code review, có unit test, demo được, đã merge.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={i} className="text-xs text-white/75 flex items-start gap-2">
                <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-emerald-500/[0.04] border-2 border-emerald-500/30 p-4">
      <h3 className="text-sm font-bold text-emerald-200/90 mb-3 flex items-center gap-2">
        <Edit3 className="w-4 h-4" /> Sửa Definition of Done
      </h3>
      <div className="space-y-2 mb-3">
        {draft.map((it, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/[0.04] rounded p-2">
            <input
              value={it}
              onChange={(e) => {
                const next = [...draft]; next[i] = e.target.value; setDraft(next)
              }}
              className="flex-1 bg-transparent text-sm text-white/85 outline-none"
            />
            <button onClick={() => setDraft(draft.filter((_, j) => j !== i))} className="text-rose-400/60 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mb-3">
        <input
          value={newItem} onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.trim()) {
              setDraft([...draft, newItem.trim()]); setNewItem('')
            }
          }}
          placeholder="+ Thêm tiêu chí mới (VD: Có demo · merge code · test pass)"
          className="flex-1 px-2 py-1.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded text-white/85 outline-none"
        />
        <button
          onClick={() => { if (newItem.trim()) { setDraft([...draft, newItem.trim()]); setNewItem('') } }}
          className="px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.1] text-white/70 rounded"
        >
          + Thêm
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(draft.filter((x) => x.trim()))}
          className="flex-1 py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded flex items-center justify-center gap-1">
          <Check className="w-3.5 h-3.5" /> Lưu
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 text-sm bg-white/[0.06] hover:bg-white/[0.1] text-white/70 rounded">
          Huỷ
        </button>
      </div>
    </div>
  )
}

// ─── Sprint Edit Modal ──────────────────────────────────────────────────

function SprintEditModal({ initial, onClose, onSave }: {
  initial?: Sprint
  onClose: () => void
  onSave: (fields: Partial<Sprint>) => void
}) {
  const [name, setName] = useState(initial?.name || '')
  const [goal, setGoal] = useState(initial?.goal || '')
  const [startDate, setStartDate] = useState(
    initial?.startDate || new Date().toISOString().slice(0, 10),
  )
  const [endDate, setEndDate] = useState(
    initial?.endDate || new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
  )
  const [capacity, setCapacity] = useState<string>(String(initial?.capacity || ''))

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-[hsl(260,30%,13%)] border border-white/[0.08] rounded-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white/90">
            {initial ? `Sửa ${initial.name}` : '🏃 Tạo Sprint mới'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/[0.06] rounded">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1 block">Tên sprint</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sprint 1 — MVP cảm biến"
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white/90 outline-none focus:border-cyan-500/40" />
          </div>
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1 block flex items-center gap-1">
              <Flag className="w-3 h-3" /> Sprint Goal
            </label>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder="Mục tiêu cụ thể cần đạt sau sprint này..." rows={2}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white/90 outline-none focus:border-cyan-500/40 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1 block">Bắt đầu</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white/90 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1 block">Kết thúc</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white/90 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1 block">
              Capacity (story points dự kiến)
            </label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)}
              placeholder="VD: 20"
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded text-white/90 outline-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => onSave({
              name: name.trim(), goal: goal.trim(),
              startDate, endDate,
              capacity: capacity ? Number(capacity) : undefined,
            })}
            disabled={!name.trim()}
            className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-white/[0.04] disabled:text-white/30 text-white font-bold rounded transition flex items-center justify-center gap-1"
          >
            <Check className="w-4 h-4" /> {initial ? 'Cập nhật' : 'Tạo sprint'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 rounded">
            Huỷ
          </button>
        </div>
      </div>
    </div>
  )
}
