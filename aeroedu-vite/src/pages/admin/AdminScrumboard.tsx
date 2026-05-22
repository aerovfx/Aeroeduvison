/**
 * AdminScrumboard — /admin/scrumboard
 *
 * Kanban board công việc quản trị hệ thống: kéo thả task giữa các cột
 * Backlog → Đang xử lý → Review → Đã đóng.
 *
 * Subjects: 7 nhóm công việc đặc thù admin
 *   (Vận hành / Hỗ trợ NSD / Hạ tầng IT / Tài chính / Marketing / Pháp lý / Khác)
 *
 * Storage: localStorage key 'inphysic_scrumboard_admin_v1' (tách hoàn toàn
 * khỏi student & teacher boards, mỗi admin có dữ liệu riêng theo browser).
 */
import {
  Cog, LifeBuoy, Server, DollarSign, Megaphone, ScrollText, MoreHorizontal,
} from 'lucide-react'
import ScrumboardCore, {
  type ScrumboardConfig, type Task, type ColKey,
} from '@/components/scrumboard/ScrumboardCore'

const ADMIN_SUBJECTS = [
  { key: 'ops',       label: 'Vận hành',       icon: <Cog          className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
  { key: 'support',   label: 'Hỗ trợ NSD',     icon: <LifeBuoy     className="w-3.5 h-3.5" />, color: 'text-rose-400' },
  { key: 'infra',     label: 'Hạ tầng / IT',   icon: <Server       className="w-3.5 h-3.5" />, color: 'text-violet-400' },
  { key: 'finance',   label: 'Tài chính',      icon: <DollarSign   className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  { key: 'marketing', label: 'Marketing',      icon: <Megaphone    className="w-3.5 h-3.5" />, color: 'text-amber-400' },
  { key: 'legal',     label: 'Pháp lý / Tuân thủ', icon: <ScrollText className="w-3.5 h-3.5" />, color: 'text-blue-400' },
  { key: 'other',     label: 'Khác',           icon: <MoreHorizontal className="w-3.5 h-3.5" />, color: 'text-white/40' },
]

const ADMIN_COLS = [
  { key: 'todo'       as ColKey, title: 'Backlog',         color: 'border-t-white/20',    accent: 'text-white/50' },
  { key: 'inprogress' as ColKey, title: 'Đang xử lý',      color: 'border-t-blue-500',    accent: 'text-blue-400' },
  { key: 'review'     as ColKey, title: 'Review',          color: 'border-t-amber-500',   accent: 'text-amber-400' },
  { key: 'done'       as ColKey, title: 'Đã đóng ✓',       color: 'border-t-emerald-500', accent: 'text-emerald-400' },
]

const NOW = new Date().toISOString()
const ADMIN_DEMO: Record<ColKey, Task[]> = {
  todo: [
    { id: 'at1', title: 'Audit log đăng nhập tháng 5',           desc: 'Kiểm tra IP lạ, bất thường, brute-force',                  subject: 'ops',       priority: 'high',   dueDate: '', tags: ['security', 'q2'],     xp: 200, createdAt: NOW },
    { id: 'at2', title: 'Phản hồi 12 ticket hỗ trợ pending',     desc: 'Queue đang tồn 12 yêu cầu, ưu tiên ticket > 48h',          subject: 'support',   priority: 'high',   dueDate: '', tags: ['gấp', 'sla'],         xp: 180, createdAt: NOW },
    { id: 'at3', title: 'Lên kế hoạch chiến dịch tuyển sinh',    desc: 'Q3 — phối hợp với marketing + sales',                      subject: 'marketing', priority: 'medium', dueDate: '', tags: ['q3'],                 xp: 150, createdAt: NOW },
    { id: 'at4', title: 'Cập nhật chính sách bảo mật theo NĐ 13', desc: 'Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân',  subject: 'legal',     priority: 'medium', dueDate: '', tags: ['compliance', 'pii'],  xp: 220, createdAt: NOW },
  ],
  inprogress: [
    { id: 'at5', title: 'Migrate Cloud Run sang multi-region',   desc: 'Đang setup region asia-east1 (Tokyo) cho redundancy',      subject: 'infra',     priority: 'high',   dueDate: '', tags: ['infrastructure'],     xp: 300, createdAt: NOW },
    { id: 'at6', title: 'Đối soát doanh thu tháng 4 với MoMo',   desc: 'Chênh 2 đơn — đang verify với gateway',                    subject: 'finance',   priority: 'high',   dueDate: '', tags: ['payment'],            xp: 150, createdAt: NOW },
  ],
  review: [
    { id: 'at7', title: 'Review duyệt 8 tin tức từ giáo viên',   desc: 'Đã đọc xong, chờ approve trên /admin/news/review',          subject: 'ops',       priority: 'medium', dueDate: '', tags: ['content-mod'],        xp: 100, createdAt: NOW },
  ],
  done: [
    { id: 'at8', title: 'Triển khai hệ thống monitoring Prometheus', desc: 'Grafana dashboard đã live trên grafana.inphysic.com',    subject: 'infra',     priority: 'high',   dueDate: '', tags: ['monitoring'],         xp: 250, createdAt: NOW },
    { id: 'at9', title: 'Họp ban điều hành tháng 4',              desc: 'Đã chốt KPI Q2, biên bản đã gửi',                          subject: 'ops',       priority: 'medium', dueDate: '', tags: ['leadership'],         xp: 80,  createdAt: NOW },
  ],
}

const CONFIG: ScrumboardConfig = {
  storageKey: 'inphysic_scrumboard_admin_v1',
  pageTitle: 'Scrumboard quản trị',
  pageSubtitle: 'Kế hoạch công việc vận hành — kéo thả task giữa các cột',
  subjects: ADMIN_SUBJECTS,
  cols: ADMIN_COLS,
  demo: ADMIN_DEMO,
  xpLabel: 'điểm',
}

export default function AdminScrumboard() {
  return <ScrumboardCore config={CONFIG} />
}
