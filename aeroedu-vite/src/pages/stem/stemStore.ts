/**
 * Shared STEM project store.
 * Seeds localStorage with INITIAL_PROJECTS on first load.
 * All STEM pages import from here to share the same key + data.
 */

export const STEM_KEY = 'stem-projects'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  name: string
  role: string
}

export interface Milestone {
  id: string
  title: string
  status: 'pending' | 'in-progress' | 'completed'
  dueDate: string
  // ── Agile Scrum extensions (optional, backward-compat) ──
  /** Fibonacci estimate: 1, 2, 3, 5, 8, 13. Null = chưa estimate. */
  storyPoints?: number
  /** ID Sprint mà milestone thuộc về. null/undefined = Backlog. */
  sprintId?: string | null
  /** Tiêu chí "Done" — check từng dòng để complete milestone. */
  acceptanceCriteria?: string[]
  /** ID teamMember chịu trách nhiệm. */
  assigneeId?: string
  /** Description chi tiết (story format: As X, I want Y, so Z) */
  description?: string
}

// ─── Scrum types ─────────────────────────────────────────────────────────

export interface SprintRetro {
  wentWell: string[]
  didNotGoWell: string[]
  improvements: string[]
}

export interface Sprint {
  id: string
  number: number                    // Sprint #1, #2, ...
  name: string                      // "Sprint 1: MVP cảm biến"
  goal: string                      // Sprint goal — what should be achieved
  startDate: string                 // ISO date
  endDate: string                   // ISO date (default 2 weeks)
  status: 'planned' | 'active' | 'completed'
  /** Story points dự kiến cho sprint (capacity). */
  capacity?: number
  /** Demo notes / sản phẩm bàn giao của sprint. */
  reviewNotes?: string
  retro?: SprintRetro
  createdAt: string
}

export interface DailyStandup {
  id: string
  sprintId: string
  date: string                      // ISO date (only)
  author: string
  yesterday: string                 // hôm qua đã làm
  today: string                     // hôm nay sẽ làm
  blockers: string                  // chặn ngại
}

export interface Feedback {
  id: string
  author: string
  content: string
  date: string
  type: 'suggestion' | 'approval' | 'revision'
}

// ─── Mở rộng cho hồ sơ + tiến độ chi tiết ────────────────────────────────────

/** Nhật ký cập nhật hằng ngày — ghi nhận "Hôm nay đã làm gì" */
export interface ProgressLog {
  id: string
  date: string                      // ISO timestamp
  author: string                    // tên HS/GV log
  content: string                   // nội dung cập nhật
  hours?: number                    // số giờ làm trong session này
  photoUrl?: string                 // URL ảnh tiến độ (optional)
}

/** Vấn đề gặp phải + giải pháp */
export interface Issue {
  id: string
  date: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'resolved'
  resolution?: string
  resolvedAt?: string
}

/** Tài liệu/link tham khảo */
export interface Resource {
  id: string
  type: 'link' | 'video' | 'paper' | 'datasheet'
  title: string
  url: string
  notes?: string
}

/** BOM linh kiện với trạng thái mua sắm */
export interface BOMItem {
  id: string
  name: string
  qty: number
  unitPrice: number                 // VND
  status: 'planned' | 'ordered' | 'received' | 'used'
  notes?: string
}

export interface STEMProject {
  id: string
  title: string
  description: string
  category: 'Science' | 'Technology' | 'Engineering' | 'Math'
  status: 'draft' | 'in-progress' | 'review' | 'completed' | 'published'
  teamMembers: TeamMember[]
  instructor: { id: string; name: string }
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  progress: number
  milestones: Milestone[]
  feedback: Feedback[]
  isPublic: boolean

  // ── Hồ sơ chi tiết (optional, backward compat) ──
  objective?: string                // Mục tiêu cụ thể
  methodology?: string              // Phương pháp khoa học áp dụng
  expectedOutcomes?: string         // Kết quả mong đợi (sản phẩm/báo cáo/video)
  subject?: string                  // Môn học liên kết (Vật lí/Hoá/Sinh/...)
  schoolYear?: string               // Năm học (vd "2025-2026")
  coverImage?: string               // URL ảnh bìa

  // ── BOM + ngân sách ──
  bom?: BOMItem[]
  budgetTotal?: number              // Ngân sách tổng dự kiến VND

  // ── Tiến độ ──
  progressLogs?: ProgressLog[]
  totalHoursSpent?: number          // Tự cộng dồn từ progressLogs
  lastWorkedAt?: string

  // ── Vấn đề ──
  issues?: Issue[]

  // ── Tài nguyên tham khảo ──
  resources?: Resource[]

  // ── Agile Scrum ──
  sprints?: Sprint[]
  standups?: DailyStandup[]
  /** Definition of Done project-wide — checklist tiêu chí "xong" áp dụng cho mọi
   *  milestone. Khi tạo milestone mới, list này được dùng làm acceptanceCriteria
   *  mặc định. */
  definitionOfDone?: string[]
}

// ─── Seed data ─────────────────────────────────────────────────────────────────

export const INITIAL_PROJECTS: STEMProject[] = [
  {
    id: '1',
    title: 'Smart Traffic Light System',
    description: 'Thiết kế hệ thống đèn giao thông thông minh dùng AI để nhận diện mật độ phương tiện và tự động điều chỉnh thời gian đèn',
    category: 'Engineering',
    status: 'completed',
    teamMembers: [
      { id: '1', name: 'Nguyễn Văn An', role: 'AI Engineer' },
      { id: '2', name: 'Trần Thị Bình', role: 'Hardware Developer' },
      { id: '3', name: 'Lê Văn Cường', role: 'IoT Specialist' },
    ],
    instructor: { id: 'teacher1', name: 'Thầy Phạm Minh Giao thông' },
    createdAt: '2024-09-01',
    updatedAt: '2024-10-25',
    dueDate: '2024-10-25',
    tags: ['AI', 'IoT', 'Transportation', 'Arduino'],
    difficulty: 'advanced',
    progress: 100,
    milestones: [
      { id: 'm1', title: 'Khảo sát và ý tưởng', status: 'completed', dueDate: '2024-09-10' },
      { id: 'm2', title: 'Thiết kế mạch điều khiển', status: 'completed', dueDate: '2024-09-25' },
      { id: 'm3', title: 'Lập trình AI nhận diện xe', status: 'completed', dueDate: '2024-10-10' },
      { id: 'm4', title: 'Thử nghiệm mô hình', status: 'completed', dueDate: '2024-10-25' },
    ],
    feedback: [{ id: 'f1', author: 'Thầy Phạm Minh Giao thông', content: 'Dự án xuất sắc! Hệ thống AI hoạt động rất chính xác.', date: '2024-10-25', type: 'approval' }],
    isPublic: true,
  },
  {
    id: '2',
    title: 'AI Tutor for Math',
    description: 'Phát triển trợ lý AI hỗ trợ học sinh giải toán từng bước và gợi ý cách học hiệu quả',
    category: 'Technology',
    status: 'in-progress',
    teamMembers: [
      { id: '4', name: 'Phạm Thị Dung', role: 'AI Developer' },
      { id: '5', name: 'Hoàng Văn Đức', role: 'NLP Engineer' },
    ],
    instructor: { id: 'teacher2', name: 'Cô Nguyễn Thị Toán học' },
    createdAt: '2024-09-01',
    updatedAt: '2024-10-30',
    dueDate: '2024-10-30',
    tags: ['AI', 'NLP', 'Math', 'Education'],
    difficulty: 'advanced',
    progress: 75,
    milestones: [
      { id: 'm1', title: 'Thu thập bộ đề toán', status: 'completed', dueDate: '2024-09-15' },
      { id: 'm2', title: 'Huấn luyện AI giải toán', status: 'completed', dueDate: '2024-10-01' },
      { id: 'm3', title: 'Thử nghiệm với học sinh', status: 'in-progress', dueDate: '2024-10-15' },
      { id: 'm4', title: 'Triển khai bản demo', status: 'pending', dueDate: '2024-10-30' },
    ],
    feedback: [{ id: 'f2', author: 'Cô Nguyễn Thị Toán học', content: 'AI tutor rất hữu ích! Học sinh phản hồi tích cực.', date: '2024-10-15', type: 'suggestion' }],
    isPublic: true,
  },
  {
    id: '3',
    title: 'Ocean Cleaner Boat',
    description: 'Chế tạo thuyền tự động thu gom rác nhựa trên mặt nước bằng robot điều khiển từ xa',
    category: 'Engineering',
    status: 'completed',
    teamMembers: [
      { id: '6', name: 'Vũ Thị Giang', role: 'Robotics Engineer' },
      { id: '7', name: 'Đặng Văn Hùng', role: 'Marine Engineer' },
    ],
    instructor: { id: 'teacher3', name: 'Thầy Lê Minh Môi trường' },
    createdAt: '2024-09-01',
    updatedAt: '2024-10-20',
    dueDate: '2024-10-20',
    tags: ['Robotics', 'Environment', 'Marine', 'Arduino'],
    difficulty: 'advanced',
    progress: 100,
    milestones: [
      { id: 'm1', title: 'Thiết kế nguyên mẫu thuyền', status: 'completed', dueDate: '2024-09-05' },
      { id: 'm2', title: 'Tích hợp hệ thống thu gom rác', status: 'completed', dueDate: '2024-09-20' },
      { id: 'm3', title: 'Thử nghiệm điều khiển từ xa', status: 'completed', dueDate: '2024-10-05' },
      { id: 'm4', title: 'Báo cáo và cải tiến', status: 'completed', dueDate: '2024-10-20' },
    ],
    feedback: [{ id: 'f3', author: 'Thầy Lê Minh Môi trường', content: 'Dự án có ý nghĩa lớn cho môi trường!', date: '2024-10-20', type: 'approval' }],
    isPublic: true,
  },
  {
    id: '4',
    title: 'Renewable Energy House Model',
    description: 'Xây dựng mô hình nhà nhỏ vận hành bằng năng lượng mặt trời và gió',
    category: 'Engineering',
    status: 'completed',
    teamMembers: [
      { id: '8', name: 'Bùi Thị Hoa', role: 'Energy Engineer' },
      { id: '9', name: 'Ngô Văn Khoa', role: 'Electrical Engineer' },
    ],
    instructor: { id: 'teacher4', name: 'Cô Phạm Minh Năng lượng' },
    createdAt: '2024-08-01',
    updatedAt: '2024-09-15',
    dueDate: '2024-09-15',
    tags: ['Renewable Energy', 'Engineering', 'Green Tech'],
    difficulty: 'intermediate',
    progress: 100,
    milestones: [
      { id: 'm1', title: 'Lập kế hoạch năng lượng', status: 'completed', dueDate: '2024-08-01' },
      { id: 'm2', title: 'Thiết kế mô hình', status: 'completed', dueDate: '2024-08-15' },
      { id: 'm3', title: 'Lắp đặt hệ thống điện', status: 'completed', dueDate: '2024-08-30' },
      { id: 'm4', title: 'Thử nghiệm', status: 'completed', dueDate: '2024-09-15' },
    ],
    feedback: [{ id: 'f4', author: 'Cô Phạm Minh Năng lượng', content: 'Mô hình hoạt động tốt! Hệ thống năng lượng tái tạo rất hiệu quả.', date: '2024-09-15', type: 'approval' }],
    isPublic: true,
  },
  {
    id: '5',
    title: 'Virtual Chemistry Lab',
    description: 'Phát triển phòng thí nghiệm ảo cho học sinh thực hành phản ứng hóa học trong môi trường an toàn',
    category: 'Science',
    status: 'review',
    teamMembers: [
      { id: '10', name: 'Lý Thị Lan', role: 'VR Developer' },
      { id: '11', name: 'Trần Văn Minh', role: 'Chemistry Expert' },
    ],
    instructor: { id: 'teacher5', name: 'Thầy Hoàng Văn Hóa học' },
    createdAt: '2024-08-20',
    updatedAt: '2024-10-05',
    dueDate: '2024-10-05',
    tags: ['VR', 'Education', 'Chemistry', 'Simulation'],
    difficulty: 'advanced',
    progress: 90,
    milestones: [
      { id: 'm1', title: 'Nghiên cứu mô phỏng phản ứng', status: 'completed', dueDate: '2024-08-20' },
      { id: 'm2', title: 'Thiết kế giao diện VR', status: 'completed', dueDate: '2024-09-01' },
      { id: 'm3', title: 'Lập trình và tích hợp', status: 'completed', dueDate: '2024-09-20' },
      { id: 'm4', title: 'Trình bày sản phẩm', status: 'in-progress', dueDate: '2024-10-05' },
    ],
    feedback: [{ id: 'f5', author: 'Thầy Hoàng Văn Hóa học', content: 'Phòng thí nghiệm ảo rất thực tế!', date: '2024-10-05', type: 'approval' }],
    isPublic: true,
  },
  {
    id: '6',
    title: 'Earthquake Early Warning System',
    description: 'Hệ thống cảnh báo động đất dựa trên cảm biến địa chấn và AI phân tích sóng P',
    category: 'Engineering',
    status: 'in-progress',
    teamMembers: [
      { id: '12', name: 'Nguyễn Thị Nam', role: 'Sensor Engineer' },
      { id: '13', name: 'Phạm Văn Oai', role: 'Data Scientist' },
      { id: '14', name: 'Lê Thị Phương', role: 'Mobile Developer' },
    ],
    instructor: { id: 'teacher6', name: 'Thầy Đức Địa chất' },
    createdAt: '2024-09-15',
    updatedAt: '2024-10-30',
    dueDate: '2024-11-30',
    tags: ['IoT', 'AI', 'Safety', 'Sensors'],
    difficulty: 'advanced',
    progress: 45,
    milestones: [
      { id: 'm1', title: 'Nghiên cứu cảm biến địa chấn', status: 'completed', dueDate: '2024-09-30' },
      { id: 'm2', title: 'Xây dựng mô hình AI phân tích', status: 'in-progress', dueDate: '2024-10-30' },
      { id: 'm3', title: 'Phát triển app cảnh báo', status: 'pending', dueDate: '2024-11-15' },
      { id: 'm4', title: 'Thử nghiệm thực tế', status: 'pending', dueDate: '2024-11-30' },
    ],
    feedback: [],
    isPublic: false,
  },
  {
    id: '7',
    title: 'Math Visualization Tool',
    description: 'Công cụ trực quan hóa các khái niệm toán học nâng cao với đồ thị 3D tương tác',
    category: 'Math',
    status: 'draft',
    teamMembers: [
      { id: '15', name: 'Hoàng Văn Quang', role: 'Frontend Developer' },
    ],
    instructor: { id: 'teacher7', name: 'Thầy Hoàng Toán' },
    createdAt: '2024-10-01',
    updatedAt: '2024-10-01',
    dueDate: '2024-12-15',
    tags: ['Math', 'Visualization', 'Education', '3D'],
    difficulty: 'beginner',
    progress: 10,
    milestones: [
      { id: 'm1', title: 'Lên kế hoạch tính năng', status: 'in-progress', dueDate: '2024-10-15' },
      { id: 'm2', title: 'Xây dựng đồ thị 2D', status: 'pending', dueDate: '2024-11-01' },
      { id: 'm3', title: 'Thêm đồ thị 3D', status: 'pending', dueDate: '2024-11-20' },
      { id: 'm4', title: 'Hoàn thiện và xuất bản', status: 'pending', dueDate: '2024-12-15' },
    ],
    feedback: [],
    isPublic: false,
  },
]

// ─── Store helpers ─────────────────────────────────────────────────────────────

export function loadProjects(): STEMProject[] {
  try {
    const raw = localStorage.getItem(STEM_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as STEMProject[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  // Seed localStorage on first load
  saveProjects(INITIAL_PROJECTS)
  return INITIAL_PROJECTS
}

export function saveProjects(projects: STEMProject[]): void {
  try {
    localStorage.setItem(STEM_KEY, JSON.stringify(projects))
  } catch { /* quota exceeded */ }
}

export function getProject(id: string): STEMProject | undefined {
  return loadProjects().find((p) => p.id === id)
}

export function updateProject(updated: STEMProject): void {
  const projects = loadProjects()
  const idx = projects.findIndex((p) => p.id === updated.id)
  if (idx >= 0) {
    projects[idx] = updated
  } else {
    projects.push(updated)
  }
  saveProjects(projects)
}

export function deleteProject(id: string): void {
  saveProjects(loadProjects().filter((p) => p.id !== id))
}

export function createProject(project: Omit<STEMProject, 'id' | 'createdAt' | 'updatedAt'>): STEMProject {
  const now = new Date().toISOString()
  const newProject: STEMProject = {
    ...project,
    id: `project_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  const projects = loadProjects()
  projects.push(newProject)
  saveProjects(projects)
  return newProject
}

// ─── Milestone CRUD — Scrum board ⇄ Timeline sync ────────────────────────────
//
// Scrum board is the single source of truth for milestone state. Timeline reads
// the same array. Project.progress recomputes on every mutation so the progress
// bar in StemDetail/StemTimeline stays in sync automatically.

/** Recompute project.progress as % of completed milestones (0 if none). */
function recomputeProgress(milestones: Milestone[]): number {
  if (!milestones.length) return 0
  const done = milestones.filter((m) => m.status === 'completed').length
  return Math.round((done / milestones.length) * 100)
}

/** Persist milestones for a project + recompute progress + bump updatedAt. */
function withMilestones(projectId: string, mutator: (ms: Milestone[]) => Milestone[]): STEMProject | undefined {
  const projects = loadProjects()
  const idx = projects.findIndex((p) => p.id === projectId)
  if (idx < 0) return undefined
  const next = mutator(projects[idx].milestones)
  const updated: STEMProject = {
    ...projects[idx],
    milestones: next,
    progress: recomputeProgress(next),
    updatedAt: new Date().toISOString(),
  }
  projects[idx] = updated
  saveProjects(projects)
  return updated
}

/** Append milestone — auto-generates id if missing. */
export function addMilestone(projectId: string, m: Partial<Milestone> & { title: string }): STEMProject | undefined {
  const milestone: Milestone = {
    id: m.id ?? `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: m.title.trim(),
    status: m.status ?? 'pending',
    dueDate: m.dueDate ?? '',
  }
  return withMilestones(projectId, (ms) => [...ms, milestone])
}

/** Change just the status — used by [→] [←] move buttons. */
export function updateMilestoneStatus(
  projectId: string,
  milestoneId: string,
  status: Milestone['status'],
): STEMProject | undefined {
  return withMilestones(projectId, (ms) =>
    ms.map((m) => (m.id === milestoneId ? { ...m, status } : m)),
  )
}

/** Generic field patch — used by inline rename + edit modal. */
export function updateMilestoneFields(
  projectId: string,
  milestoneId: string,
  fields: Partial<Milestone>,
): STEMProject | undefined {
  return withMilestones(projectId, (ms) =>
    ms.map((m) => (m.id === milestoneId ? { ...m, ...fields, id: m.id } : m)),
  )
}

/** Remove a milestone — confirm prompt is caller's responsibility. */
export function deleteMilestone(projectId: string, milestoneId: string): STEMProject | undefined {
  return withMilestones(projectId, (ms) => ms.filter((m) => m.id !== milestoneId))
}

/** Reorder within column or across timeline (direction: -1 = up, +1 = down). */
export function moveMilestone(
  projectId: string,
  milestoneId: string,
  direction: -1 | 1,
): STEMProject | undefined {
  return withMilestones(projectId, (ms) => {
    const idx = ms.findIndex((m) => m.id === milestoneId)
    if (idx < 0) return ms
    const target = idx + direction
    if (target < 0 || target >= ms.length) return ms
    const next = [...ms]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    return next
  })
}

// ═══════════════════════════════════════════════════════════════════════
// Agile Scrum — Sprint / Standup / Retro / DoD CRUD
// ═══════════════════════════════════════════════════════════════════════

/** Persist project mutation + bump updatedAt. */
function withProject(
  projectId: string,
  mutator: (p: STEMProject) => STEMProject,
): STEMProject | undefined {
  const projects = loadProjects()
  const idx = projects.findIndex((p) => p.id === projectId)
  if (idx < 0) return undefined
  const updated: STEMProject = {
    ...mutator(projects[idx]),
    id: projects[idx].id,
    updatedAt: new Date().toISOString(),
  }
  projects[idx] = updated
  saveProjects(projects)
  return updated
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

/** Đếm sprint number tiếp theo (max + 1, hoặc 1 nếu trống). */
function nextSprintNumber(sprints: Sprint[] | undefined): number {
  if (!sprints || sprints.length === 0) return 1
  return Math.max(...sprints.map((s) => s.number)) + 1
}

/** Tạo sprint mới (default 14 ngày, status planned). */
export function createSprint(
  projectId: string,
  input: Partial<Sprint> & { name?: string; goal?: string },
): STEMProject | undefined {
  return withProject(projectId, (p) => {
    const number = nextSprintNumber(p.sprints)
    const start = input.startDate || new Date().toISOString().slice(0, 10)
    const endDefault = new Date(new Date(start).getTime() + 14 * 86400_000)
      .toISOString().slice(0, 10)
    const sprint: Sprint = {
      id: newId('spr'),
      number,
      name: input.name?.trim() || `Sprint ${number}`,
      goal: input.goal?.trim() || '',
      startDate: start,
      endDate: input.endDate || endDefault,
      status: input.status || 'planned',
      capacity: input.capacity,
      createdAt: new Date().toISOString(),
    }
    return { ...p, sprints: [...(p.sprints || []), sprint] }
  })
}

/** Cập nhật fields cho 1 sprint. */
export function updateSprint(
  projectId: string,
  sprintId: string,
  fields: Partial<Sprint>,
): STEMProject | undefined {
  return withProject(projectId, (p) => ({
    ...p,
    sprints: (p.sprints || []).map((s) =>
      s.id === sprintId ? { ...s, ...fields, id: s.id } : s,
    ),
  }))
}

/** Kích hoạt sprint — đổi status. Chỉ cho phép 1 sprint active cùng lúc. */
export function activateSprint(projectId: string, sprintId: string): STEMProject | undefined {
  return withProject(projectId, (p) => ({
    ...p,
    sprints: (p.sprints || []).map((s) =>
      s.id === sprintId
        ? { ...s, status: 'active' as const }
        : s.status === 'active'
          ? { ...s, status: 'completed' as const }
          : s,
    ),
  }))
}

/** Đóng sprint — chuyển status sang completed. */
export function completeSprint(projectId: string, sprintId: string): STEMProject | undefined {
  return withProject(projectId, (p) => ({
    ...p,
    sprints: (p.sprints || []).map((s) =>
      s.id === sprintId ? { ...s, status: 'completed' as const } : s,
    ),
  }))
}

/** Xoá sprint — milestone trong sprint trở về Backlog (sprintId = null). */
export function deleteSprint(projectId: string, sprintId: string): STEMProject | undefined {
  return withProject(projectId, (p) => ({
    ...p,
    sprints: (p.sprints || []).filter((s) => s.id !== sprintId),
    milestones: p.milestones.map((m) =>
      m.sprintId === sprintId ? { ...m, sprintId: null } : m,
    ),
    standups: (p.standups || []).filter((st) => st.sprintId !== sprintId),
  }))
}

/** Gán milestone vào sprint (sprintId = null để đưa về Backlog). */
export function assignMilestoneToSprint(
  projectId: string,
  milestoneId: string,
  sprintId: string | null,
): STEMProject | undefined {
  return withMilestones(projectId, (ms) =>
    ms.map((m) => (m.id === milestoneId ? { ...m, sprintId } : m)),
  )
}

/** Cập nhật story points cho milestone. */
export function setMilestoneStoryPoints(
  projectId: string,
  milestoneId: string,
  points: number | undefined,
): STEMProject | undefined {
  return withMilestones(projectId, (ms) =>
    ms.map((m) => (m.id === milestoneId ? { ...m, storyPoints: points } : m)),
  )
}

/** Thêm daily standup note. */
export function addStandup(
  projectId: string,
  sprintId: string,
  note: Omit<DailyStandup, 'id' | 'sprintId'>,
): STEMProject | undefined {
  return withProject(projectId, (p) => {
    const standup: DailyStandup = { ...note, id: newId('su'), sprintId }
    return { ...p, standups: [...(p.standups || []), standup] }
  })
}

export function deleteStandup(projectId: string, standupId: string): STEMProject | undefined {
  return withProject(projectId, (p) => ({
    ...p,
    standups: (p.standups || []).filter((s) => s.id !== standupId),
  }))
}

/** Cập nhật retro cho 1 sprint (3 cột: wentWell / didNotGoWell / improvements). */
export function updateRetro(
  projectId: string,
  sprintId: string,
  retro: SprintRetro,
): STEMProject | undefined {
  return updateSprint(projectId, sprintId, { retro })
}

/** Cập nhật Definition of Done project-wide. */
export function setDefinitionOfDone(
  projectId: string,
  items: string[],
): STEMProject | undefined {
  return withProject(projectId, (p) => ({ ...p, definitionOfDone: items }))
}

// ─── Computed helpers (Velocity / Burndown) ──────────────────────────────

/** Velocity = avg story points hoàn thành / sprint (chỉ tính completed sprints). */
export function computeVelocity(project: STEMProject): number {
  const sprints = (project.sprints || []).filter((s) => s.status === 'completed')
  if (sprints.length === 0) return 0
  const total = sprints.reduce((sum, sprint) => {
    const ms = project.milestones.filter(
      (m) => m.sprintId === sprint.id && m.status === 'completed',
    )
    return sum + ms.reduce((s, m) => s + (m.storyPoints || 0), 0)
  }, 0)
  return Math.round((total / sprints.length) * 10) / 10
}

/** Tổng story points của milestones trong 1 sprint. */
export function sprintTotalPoints(project: STEMProject, sprintId: string): number {
  return project.milestones
    .filter((m) => m.sprintId === sprintId)
    .reduce((s, m) => s + (m.storyPoints || 0), 0)
}

/** Story points đã hoàn thành trong 1 sprint. */
export function sprintCompletedPoints(project: STEMProject, sprintId: string): number {
  return project.milestones
    .filter((m) => m.sprintId === sprintId && m.status === 'completed')
    .reduce((s, m) => s + (m.storyPoints || 0), 0)
}
