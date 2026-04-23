import React, { useState, useMemo } from 'react';
import {
  BookOpen, AlertTriangle, TrendingDown, TrendingUp,
  Search, Filter, Star, BarChart3, CheckCircle2,
  Sparkles, ChevronDown, ChevronUp, Eye, Edit3,
  Trash2, RefreshCw, Plus, Award, Users, Zap,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */
interface ContentItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  author: string;
  completion: number;   // 0–1
  masteryGain: number;  // 0–1
  dropOff: number;      // 0–1
  quality: number;      // 0–10
  views: number;
  needsReview: boolean;
  aiSuggestion?: string;
  tags: string[];
  updatedAt: string;
}

type SortKey = 'quality' | 'completion' | 'dropOff' | 'masteryGain';
type FilterKey = 'all' | 'review' | 'ok';

/* ─── Mock data ──────────────────────────────────────────── */
const CONTENTS: ContentItem[] = [
  {
    id: 'c1', title: 'Linear Equations Module',  subject: 'Toán',        grade: '9',  author: 'Nguyễn T. Lan',
    completion: 0.92, masteryGain: 0.15, dropOff: 0.05, quality: 9.2, views: 1240,
    needsReview: false, tags: ['algebra', 'core'],
    updatedAt: '10/04/2026',
  },
  {
    id: 'c2', title: 'Trigonometry Basics',      subject: 'Toán',        grade: '10', author: 'Trần V. Minh',
    completion: 0.65, masteryGain: 0.08, dropOff: 0.32, quality: 6.5, views: 875,
    needsReview: true,
    aiSuggestion: 'Tỷ lệ bỏ học cao (32%). Hãy xem xét đơn giản hoá phần giải thích hoặc bổ sung thêm hình minh hoạ tương tác.',
    tags: ['trigonometry', 'needs-work'],
    updatedAt: '08/04/2026',
  },
  {
    id: 'c3', title: 'Quadratic Functions',       subject: 'Toán',        grade: '9',  author: 'Lê T. Hoa',
    completion: 0.88, masteryGain: 0.12, dropOff: 0.08, quality: 8.5, views: 1080,
    needsReview: false, tags: ['algebra', 'functions'],
    updatedAt: '11/04/2026',
  },
  {
    id: 'c4', title: 'Calculus Introduction',    subject: 'Toán',        grade: '11', author: 'Phạm V. Đức',
    completion: 0.55, masteryGain: 0.05, dropOff: 0.45, quality: 5.8, views: 620,
    needsReview: true,
    aiSuggestion: 'Tỷ lệ hoàn thành rất thấp (55%). Nên chia nhỏ module thành các bài học ngắn hơn và thêm quiz sau mỗi phần.',
    tags: ['calculus', 'advanced', 'needs-work'],
    updatedAt: '07/04/2026',
  },
  {
    id: 'c5', title: "Newton's Laws of Motion",  subject: 'Vật lý',      grade: '10', author: 'Nguyễn T. Lan',
    completion: 0.84, masteryGain: 0.18, dropOff: 0.12, quality: 8.8, views: 930,
    needsReview: false, tags: ['physics', 'mechanics'],
    updatedAt: '09/04/2026',
  },
  {
    id: 'c6', title: 'Acid–Base Reactions',      subject: 'Hóa học',     grade: '9',  author: 'Trần V. Minh',
    completion: 0.71, masteryGain: 0.10, dropOff: 0.22, quality: 7.1, views: 750,
    needsReview: false, tags: ['chemistry', 'reactions'],
    updatedAt: '06/04/2026',
  },
  {
    id: 'c7', title: 'Cell Biology & Mitosis',   subject: 'Sinh học',    grade: '8',  author: 'Lê T. Hoa',
    completion: 0.79, masteryGain: 0.13, dropOff: 0.17, quality: 7.9, views: 815,
    needsReview: false, tags: ['biology', 'cells'],
    updatedAt: '08/04/2026',
  },
  {
    id: 'c8', title: 'Organic Chemistry I',      subject: 'Hóa học',     grade: '11', author: 'Phạm V. Đức',
    completion: 0.48, masteryGain: 0.04, dropOff: 0.52, quality: 5.2, views: 420,
    needsReview: true,
    aiSuggestion: 'Tỷ lệ bỏ học vượt 50%. Nội dung quá dày đặc — cân nhắc chia thành 3 module riêng biệt và thêm video minh hoạ phân tử.',
    tags: ['chemistry', 'organic', 'needs-work'],
    updatedAt: '05/04/2026',
  },
];

/* ─── Helpers ────────────────────────────────────────────── */
function qualityColor(q: number) {
  if (q >= 8.5) return { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' };
  if (q >= 7)   return { text: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
  if (q >= 6)   return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
  return              { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' };
}

function qualityStars(q: number) {
  const full = Math.round(q / 2);
  return Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`w-3 h-3 ${i < full ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'}`} />
  ));
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
      <span className={`text-lg font-black ${color}`}>{value}</span>
      <span className="text-[9px] text-white/35 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-white/[0.05] rounded-full h-1.5">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

/* ─── Content Card ───────────────────────────────────────── */
function ContentCard({ item }: { item: ContentItem }) {
  const [expanded, setExpanded] = useState(false);
  const qc = qualityColor(item.quality);

  return (
    <div className={`bg-[hsl(260,30%,8%)] rounded-2xl border transition-all hover:border-purple-500/20
      ${item.needsReview ? 'border-orange-500/30' : 'border-white/[0.06]'}`}>

      {/* Top row */}
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${item.needsReview ? 'bg-orange-500/10' : 'bg-purple-500/10'}`}>
            <BookOpen className={`w-5 h-5 ${item.needsReview ? 'text-orange-400' : 'text-purple-400'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-bold text-white/90">{item.title}</h3>
              {item.needsReview && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  <AlertTriangle className="w-3 h-3" /> Cần xem xét
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/40">
              <span className="font-medium text-indigo-300">{item.subject}</span>
              <span>Khối {item.grade}</span>
              <span>{item.author}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views.toLocaleString()}</span>
              <span>Cập nhật: {item.updatedAt}</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {qualityStars(item.quality)}
            </div>
          </div>
        </div>

        {/* Quality score */}
        <div className={`flex flex-col items-center px-3 py-2 rounded-xl border ${qc.bg} ${qc.border} flex-shrink-0`}>
          <span className={`text-2xl font-black leading-none ${qc.text}`}>{item.quality}</span>
          <span className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">Quality</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="px-5 pb-4 flex items-center gap-3 flex-wrap">
        <MetricPill label="Hoàn thành" value={`${Math.round(item.completion * 100)}%`}
          color={item.completion >= 0.75 ? 'text-green-400' : item.completion >= 0.6 ? 'text-yellow-400' : 'text-red-400'} />
        <MetricPill label="Tăng thành thạo" value={`+${Math.round(item.masteryGain * 100)}%`}
          color="text-indigo-300" />
        <MetricPill label="Tỷ lệ bỏ học" value={`${Math.round(item.dropOff * 100)}%`}
          color={item.dropOff <= 0.1 ? 'text-green-400' : item.dropOff <= 0.25 ? 'text-yellow-400' : 'text-red-400'} />

        {/* Mini bars */}
        <div className="flex-1 min-w-[140px] space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/30 w-20 text-right">Hoàn thành</span>
            <ProgressBar value={item.completion * 100} color="#6366f1" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/30 w-20 text-right">Bỏ học</span>
            <ProgressBar value={item.dropOff * 100}
              color={item.dropOff > 0.3 ? '#ef4444' : item.dropOff > 0.15 ? '#f97316' : '#22c55e'} />
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1 flex-wrap">
          {item.tags.map(t => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/35 font-medium">
              {t}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-white/40 hover:text-white/80 transition-all">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-white/40 hover:text-white/80 transition-all">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.05] hover:border-red-500/20 text-white/40 hover:text-red-400 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {item.needsReview && item.aiSuggestion && (
            <button
              onClick={() => setExpanded(p => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 text-orange-400 text-[10px] font-bold transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* AI suggestion (expanded) */}
      {expanded && item.aiSuggestion && (
        <div className="mx-5 mb-5 p-4 rounded-xl bg-orange-500/[0.07] border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Đề xuất AI</span>
          </div>
          <p className="text-sm text-orange-200/80 leading-relaxed">{item.aiSuggestion}</p>
          <div className="flex items-center gap-2 mt-3">
            <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white border border-white/[0.08] hover:bg-white/[0.06] transition-all">
              Bỏ qua
            </button>
            <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
              Chỉnh sửa nội dung
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function AdminContent() {
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<FilterKey>('all');
  const [subject, setSubject]   = useState('all');
  const [sortBy, setSortBy]     = useState<SortKey>('quality');
  const [sortDir, setSortDir]   = useState<'desc' | 'asc'>('desc');

  const subjects = useMemo(() => ['all', ...Array.from(new Set(CONTENTS.map(c => c.subject)))], []);

  const displayed = useMemo(() => {
    let list = CONTENTS.filter(c => {
      const matchSearch  = c.title.toLowerCase().includes(search.toLowerCase()) ||
                           c.subject.toLowerCase().includes(search.toLowerCase()) ||
                           c.author.toLowerCase().includes(search.toLowerCase());
      const matchFilter  = filter === 'all' ? true : filter === 'review' ? c.needsReview : !c.needsReview;
      const matchSubject = subject === 'all' ? true : c.subject === subject;
      return matchSearch && matchFilter && matchSubject;
    });

    list = [...list].sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      return sortDir === 'desc' ? bv - av : av - bv;
    });

    return list;
  }, [search, filter, subject, sortBy, sortDir]);

  const reviewCount  = CONTENTS.filter(c => c.needsReview).length;
  const avgQuality   = (CONTENTS.reduce((s, c) => s + c.quality, 0) / CONTENTS.length).toFixed(1);
  const avgCompletion = Math.round(CONTENTS.reduce((s, c) => s + c.completion, 0) / CONTENTS.length * 100);
  const totalViews   = CONTENTS.reduce((s, c) => s + c.views, 0);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(key); setSortDir('desc'); }
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative">

      {/* Ambient blobs */}
      <div className="fixed -bottom-24 -left-24 w-80 h-80 bg-purple-600/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed -top-24 -right-24  w-80 h-80 bg-pink-600/[0.03]   rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg,#a855f7 0%,#ec4899 100%)' }}>
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight"
              style={{ background: 'linear-gradient(135deg,#a855f7 0%,#ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Content & Curriculum Monitor
            </h1>
          </div>
          <p className="text-sm text-white/50">Giám sát chất lượng nội dung và hiệu quả giảng dạy toàn trường</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white text-sm transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
            <Plus className="w-4 h-4" /> Thêm nội dung
          </button>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Tổng nội dung', value: CONTENTS.length,  icon: BookOpen, color: '#a855f7', sub: 'module' },
          { label: 'Điểm CL trung bình', value: avgQuality,   icon: Award,   color: '#f59e0b', sub: '/ 10.0' },
          { label: 'Hoàn thành TB',  value: `${avgCompletion}%`, icon: CheckCircle2, color: '#22c55e', sub: 'học sinh' },
          { label: 'Cần xem xét',   value: reviewCount,      icon: AlertTriangle, color: '#ef4444', sub: 'module' },
        ].map(s => (
          <div key={s.label} className="bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-5 group hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl text-white group-hover:scale-110 transition-transform"
                style={{ background: s.color, boxShadow: `0 0 14px ${s.color}50` }}>
                <s.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-white/30 font-mono">{s.sub}</span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">{s.label}</p>
            <p className="text-2xl font-black text-white/90">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter / Search bar ────────────────────────────── */}
      <div className="bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm nội dung, môn, tác giả..."
            className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-0.5 border border-white/[0.05]">
          {(['all', 'ok', 'review'] as FilterKey[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                ${filter === f ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
              style={filter === f ? { background: 'linear-gradient(135deg,#667eea,#764ba2)' } : {}}>
              {f === 'all' ? 'Tất cả' : f === 'ok' ? '✓ Đạt' : '⚠ Cần review'}
            </button>
          ))}
        </div>

        {/* Subject select */}
        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        >
          <option value="all" className="bg-[#1a1a2e]">Tất cả môn</option>
          {subjects.filter(s => s !== 'all').map(s => (
            <option key={s} value={s} className="bg-[#1a1a2e]">{s}</option>
          ))}
        </select>

        {/* Sort */}
        <div className="flex items-center gap-1 ml-auto text-[10px] text-white/40">
          <span>Sắp xếp:</span>
          {(['quality', 'completion', 'dropOff', 'masteryGain'] as SortKey[]).map(k => (
            <button key={k} onClick={() => toggleSort(k)}
              className={`px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-0.5
                ${sortBy === k ? 'text-indigo-300 bg-indigo-500/10' : 'text-white/30 hover:text-white/60'}`}>
              {k === 'quality' ? 'CL' : k === 'completion' ? 'Hoàn thành' : k === 'dropOff' ? 'Bỏ học' : 'Thành thạo'}
              {sortBy === k && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content list ──────────────────────────────────── */}
      <div className="space-y-4">
        {displayed.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Không tìm thấy nội dung nào</p>
          </div>
        ) : (
          displayed.map(item => <ContentCard key={item.id} item={item} />)
        )}
      </div>

      {/* Footer count */}
      {displayed.length > 0 && (
        <p className="text-center text-[10px] text-white/25 mt-6">
          Hiển thị {displayed.length} / {CONTENTS.length} nội dung
        </p>
      )}
    </div>
  );
}
