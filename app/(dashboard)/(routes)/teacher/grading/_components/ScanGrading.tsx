'use client';

import { useState, useCallback, useRef, useEffect, DragEvent, ChangeEvent, useMemo } from 'react';
import {
  Upload, FileUp, X, Loader2, CheckCircle, Sparkles, Eye, EyeOff,
  Plus, Trash2, Save, Send, AlertTriangle, Edit3, ChevronDown, ChevronUp,
  FileText, Image, Camera, RotateCcw, Download, ZoomIn, Search, Filter,
  ArrowUpDown, Printer, ClipboardCheck, BarChart3, AlertCircle
} from 'lucide-react';

// ===================== TYPES =====================

export interface EssayQuestion {
  id: string;
  questionText: string;
  maxScore: number;
  rubric: string;
  sampleAnswer: string;
  notes: string;
}

export interface AnswerKey {
  dbId?: string;     // Database ID
  examName: string;
  examCode: string;
  examDate: string;
  studentName: string;
  studentId: string;
  examSite: string;
  examRoom: string;
  dob: string;
  part1: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
  part2: Record<number, Record<string, boolean | null>>;
  part3: Record<number, string>;
  essayQuestions: EssayQuestion[];
}

interface SheetBounds {
  left: number;   // % of image width
  top: number;    // % of image height
  right: number;  // % of image width
  bottom: number; // % of image height
}

interface ScannedSheet {
  id: string;
  dbId?: string;
  fileName: string;
  preview: string;           // Mặt trước (trắc nghiệm)
  backPreview: string;       // Mặt sau (tự luận)
  backFileName: string;
  frontFile?: File;          // Actual file for upload
  backFile?: File;           // Actual file for upload
  frontImageUrl?: string;    // Persisted URL after upload
  backImageUrl?: string;     // Persisted URL after upload
  status: 'scanning' | 'scanned' | 'error';
  studentName: string;
  studentId: string;
  examCode: string;
  sheetBounds?: SheetBounds;
  detectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
  detectedPart2: Record<number, Record<string, boolean | null>>;
  detectedPart3: Record<number, string>;
  essayScores: Record<string, number>;
  essayNotes: Record<string, string>;
  overrides: Set<number>;
  totalScore: number;
  maxScore: number;
  reviewed: boolean;
  published: boolean;
}

// ===================== HELPERS =====================

function simulateScan(answerKey: AnswerKey): {
  answers: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
  part2: Record<number, Record<string, boolean | null>>;
  part3: Record<number, string>;
  name: string;
  sid: string;
} {
  // Simulate OCR: randomly fill answers with ~85% accuracy vs answer key
  const answers: Record<number, 'A' | 'B' | 'C' | 'D' | null> = {};
  const opts: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  for (let q = 1; q <= 40; q++) {
    if (answerKey.part1[q] !== null) {
      if (Math.random() < 0.85) {
        answers[q] = answerKey.part1[q];
      } else {
        answers[q] = opts[Math.floor(Math.random() * 4)];
      }
    } else {
      answers[q] = opts[Math.floor(Math.random() * 4)];
    }
  }

  const part2: Record<number, Record<string, boolean | null>> = {};
  for (let q = 1; q <= 8; q++) {
    part2[q] = {};
    for (const sub of ['a', 'b', 'c', 'd']) {
      if (answerKey.part2[q]?.[sub] !== null && answerKey.part2[q]?.[sub] !== undefined) {
        part2[q][sub] = Math.random() < 0.8 ? answerKey.part2[q][sub] : !answerKey.part2[q][sub];
      } else {
        part2[q][sub] = Math.random() > 0.5;
      }
    }
  }

  const part3: Record<number, string> = {};
  for (let q = 1; q <= 6; q++) {
    if (answerKey.part3[q]?.length > 0 && Math.random() < 0.75) {
      part3[q] = answerKey.part3[q];
    } else {
      part3[q] = String(Math.floor(Math.random() * 100));
    }
  }

  const names = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Minh C', 'Phạm Hồng D', 'Hoàng Thu E', 'Đỗ Quang F', 'Vũ Thị G', 'Bùi Văn H'];
  return {
    answers,
    part2,
    part3,
    name: names[Math.floor(Math.random() * names.length)],
    sid: String(100000 + Math.floor(Math.random() * 900000)),
  };
}

function gradeAgainstKey(
  studentAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | null>,
  studentPart2: Record<number, Record<string, boolean | null>>,
  studentPart3: Record<number, string>,
  essayScores: Record<string, number>,
  answerKey: AnswerKey
): { score: number; maxScore: number } {
  let score = 0;
  let maxScore = 0;

  // Part I: 0.25đ mỗi câu
  for (let q = 1; q <= 40; q++) {
    if (answerKey.part1[q] !== null) {
      maxScore += 0.25;
      if (studentAnswers[q] === answerKey.part1[q]) score += 0.25;
    }
  }

  // Part II: 4 ý đúng hết = 1đ, 3 đúng = 0.5đ
  for (let q = 1; q <= 8; q++) {
    const subs = ['a', 'b', 'c', 'd'];
    let correct = 0;
    let hasAnswer = false;
    for (const sub of subs) {
      if (answerKey.part2[q]?.[sub] !== null && answerKey.part2[q]?.[sub] !== undefined) {
        hasAnswer = true;
        if (studentPart2[q]?.[sub] === answerKey.part2[q][sub]) correct++;
      }
    }
    if (hasAnswer) {
      maxScore += 1;
      if (correct === 4) score += 1;
      else if (correct === 3) score += 0.5;
    }
  }

  // Part III: 1đ mỗi câu đúng
  for (let q = 1; q <= 6; q++) {
    if (answerKey.part3[q]?.length > 0) {
      maxScore += 1;
      if (studentPart3[q]?.trim() === answerKey.part3[q]?.trim()) score += 1;
    }
  }

  // Essay
  for (const eq of answerKey.essayQuestions) {
    maxScore += eq.maxScore;
    score += Math.min(essayScores[eq.id] || 0, eq.maxScore);
  }

  return { score: Math.round(score * 100) / 100, maxScore: Math.round(maxScore * 100) / 100 };
}

// ===================== SUB-COMPONENTS =====================

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card rounded-xl shadow-sm border border-border p-6 ${className}`}>{children}</div>;
}

function AIBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const v: Record<string, string> = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200',
    success: 'bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-yellow-200',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-red-600 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${v[variant]}`}>
      {children}
    </span>
  );
}

// ===================== RESULTS VIEW (dò lại bài đã chấm) =====================

function ResultsView({
  sheets,
  answerKey,
  isPublished,
  setIsPublished,
  setSheets,
  setViewMode,
  setLightboxImg,
  overridePart1,
  overridePart2,
  overridePart3,
  updateEssayScore,
  updateEssayNote,
  updateStudentName,
  recalcAll,
  publishAll,
  isSaving,
  setPendingBackId,
  backInputRef,
  showOverlay,
  setShowOverlay,
}: {
  sheets: ScannedSheet[];
  answerKey: AnswerKey;
  isPublished: boolean;
  setIsPublished: (v: boolean) => void;
  setSheets: React.Dispatch<React.SetStateAction<ScannedSheet[]>>;
  setViewMode: (v: 'scan' | 'review' | 'results') => void;
  setLightboxImg: (v: string | null) => void;
  overridePart1: (sheetId: string, q: number, ans: 'A' | 'B' | 'C' | 'D') => void;
  overridePart2: (sheetId: string, q: number, sub: string, val: boolean) => void;
  overridePart3: (sheetId: string, q: number, val: string) => void;
  updateEssayScore: (sheetId: string, eqId: string, score: number) => void;
  updateEssayNote: (sheetId: string, eqId: string, note: string) => void;
  setPendingBackId: (id: string | null) => void;
  backInputRef: React.RefObject<HTMLInputElement | null>;
  updateStudentName: (sheetId: string, name: string) => void;
  recalcAll: () => void;
  publishAll: () => void;
  isSaving: boolean;
  showOverlay: boolean;
  setShowOverlay: (v: boolean) => void;
}) {
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [resultView, setResultView] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'score-desc' | 'score-asc' | 'name' | 'id'>('score-desc');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const published = sheets.filter(s => s.published);

  const sortedSheets = useMemo(() => {
    let result = [...published];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.studentName.toLowerCase().includes(q) || s.studentId.includes(q)
      );
    }

    // Filter by grade
    if (filterGrade !== 'all') {
      result = result.filter(s => {
        const pct = s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0;
        const g = pct >= 90 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : pct >= 30 ? 'D' : 'F';
        return g === filterGrade;
      });
    }

    // Sort
    switch (sortBy) {
      case 'score-desc': result.sort((a, b) => b.totalScore - a.totalScore); break;
      case 'score-asc': result.sort((a, b) => a.totalScore - b.totalScore); break;
      case 'name': result.sort((a, b) => a.studentName.localeCompare(b.studentName)); break;
      case 'id': result.sort((a, b) => a.studentId.localeCompare(b.studentId)); break;
    }
    return result;
  }, [published, searchQuery, filterGrade, sortBy]);

  // Stats
  const stats = useMemo(() => {
    if (published.length === 0) return null;
    const avg = published.reduce((s, r) => s + r.totalScore, 0) / published.length;
    const max = Math.max(...published.map(r => r.totalScore));
    const min = Math.min(...published.map(r => r.totalScore));
    const maxPossible = published[0]?.maxScore || 0;
    const passCount = published.filter(r => maxPossible > 0 && (r.totalScore / maxPossible) >= 0.5).length;
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    published.forEach(s => {
      const pct = s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0;
      const g = pct >= 90 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : pct >= 30 ? 'D' : 'F';
      gradeDistribution[g]++;
    });
    return { avg, max, min, maxPossible, passCount, gradeDistribution, total: published.length };
  }, [published]);

  // Helper: get part I stats for a sheet
  const getPart1Stats = (sheet: ScannedSheet) => {
    let correct = 0, total = 0;
    for (let q = 1; q <= 40; q++) {
      if (answerKey.part1[q] !== null) {
        total++;
        if (sheet.detectedAnswers[q] === answerKey.part1[q]) correct++;
      }
    }
    return { correct, total };
  };

  const getPart2Stats = (sheet: ScannedSheet) => {
    let score = 0, total = 0;
    for (let q = 1; q <= 8; q++) {
      const subs = ['a', 'b', 'c', 'd'];
      let correctCount = 0, hasAnswer = false;
      for (const sub of subs) {
        if (answerKey.part2[q]?.[sub] !== null && answerKey.part2[q]?.[sub] !== undefined) {
          hasAnswer = true;
          if (sheet.detectedPart2[q]?.[sub] === answerKey.part2[q][sub]) correctCount++;
        }
      }
      if (hasAnswer) {
        total++;
        if (correctCount === 4) score += 1;
        else if (correctCount === 3) score += 0.5;
      }
    }
    return { score, total };
  };

  const getPart3Stats = (sheet: ScannedSheet) => {
    let correct = 0, total = 0;
    for (let q = 1; q <= 6; q++) {
      if (answerKey.part3[q]?.length > 0) {
        total++;
        if (sheet.detectedPart3[q]?.trim() === answerKey.part3[q]?.trim()) correct++;
      }
    }
    return { correct, total };
  };

  if (!isPublished || published.length === 0) {
    return (
      <GlassCard>
        <div className="text-center py-8">
          <Send className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-foreground font-semibold">Chưa có kết quả công bố</p>
          <p className="text-sm text-muted-foreground mt-1">Upload phiếu, đánh giá, rồi nhấn &quot;Công bố kết quả&quot;</p>
          <button onClick={() => setViewMode(sheets.length > 0 ? 'review' : 'scan')} className="ai-button-primary text-white px-5 py-2.5 rounded-xl font-semibold mt-3 text-sm shadow-sm transition-all hover:shadow-[0_0_30px_rgba(120,100,255,0.35)]">
            {sheets.length > 0 ? 'Đánh giá' : 'Upload phiếu'}
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Kết quả đã công bố — Dò bài</h3>
            <p className="text-xs text-muted-foreground">
              Mã đề: {answerKey?.examCode || '—'} | {answerKey?.examName || '—'} | {published.length} bài
            </p>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setIsPublished(false);
                setSheets(prev => prev.map(s => ({ ...s, published: false, reviewed: false })));
                setViewMode('review');
              }}
              className="ai-button text-yellow-600 px-4 py-2 rounded-xl text-sm font-semibold border border-yellow-200 hover:border-[hsl(var(--warning)/0.5)] transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Chấm lại
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Tổng số</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.avg.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Điểm TB</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.max}</p>
              <p className="text-xs text-muted-foreground">Cao nhất</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.min}</p>
              <p className="text-xs text-muted-foreground">Thấp nhất</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-500">{stats.total > 0 ? Math.round((stats.passCount / stats.total) * 100) : 0}%</p>
              <p className="text-xs text-muted-foreground">Tỷ lệ đạt</p>
            </div>
          </div>
        )}

        {/* Grade distribution bar */}
        {stats && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> Phân bố xếp loại
            </p>
            <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
              {(['A', 'B', 'C', 'D', 'F'] as const).map(g => {
                const count = stats.gradeDistribution[g];
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                if (pct === 0) return null;
                const colors = {
                  A: 'bg-emerald-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500',
                };
                return (
                  <div
                    key={g}
                    className={`${colors[g]} flex items-center justify-center text-white text-[10px] font-bold transition-all relative group`}
                    style={{ width: `${pct}%`, minWidth: pct > 0 ? '24px' : 0 }}
                    title={`${g}: ${count} (${Math.round(pct)}%)`}
                  >
                    {pct >= 10 && `${g}:${count}`}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-1.5 flex-wrap">
              {(['A', 'B', 'C', 'D', 'F'] as const).map(g => {
                const count = stats.gradeDistribution[g];
                const dotColors = { A: 'bg-emerald-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500' };
                return (
                  <span key={g} className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${dotColors[g]}`} /> {g}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Toolbar: search, filter, sort, view toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc SBD..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-[hsl(var(--background))] text-sm text-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] placeholder:text-muted-foreground"
          />
        </div>

        {/* Grade filter */}
        <select
          value={filterGrade}
          onChange={e => setFilterGrade(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-[hsl(var(--background))] text-sm text-foreground"
        >
          <option value="all">Tất cả xếp loại</option>
          <option value="A">Loại A (≥90%)</option>
          <option value="B">Loại B (≥70%)</option>
          <option value="C">Loại C (≥50%)</option>
          <option value="D">Loại D (≥30%)</option>
          <option value="F">Loại F ({'<'}30%)</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-border bg-[hsl(var(--background))] text-sm text-foreground"
        >
          <option value="score-desc">Điểm cao → thấp</option>
          <option value="score-asc">Điểm thấp → cao</option>
          <option value="name">Tên A → Z</option>
          <option value="id">SBD tăng dần</option>
        </select>

        {/* View toggle */}
        <div className="flex rounded-xl border border-border overflow-hidden glass-panel">
          <button
            onClick={() => setResultView('cards')}
            className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-all
              ${resultView === 'cards' ? 'ai-button-primary text-white' : 'ai-button text-foreground'}`}
          >
            <Image className="w-4 h-4" /> Thẻ
          </button>
          <button
            onClick={() => setResultView('table')}
            className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-all
              ${resultView === 'table' ? 'ai-button-primary text-white' : 'ai-button text-foreground'}`}
          >
            <ClipboardCheck className="w-4 h-4" /> Bảng
          </button>
        </div>
      </div>

      {/* Result count */}
      {searchQuery || filterGrade !== 'all' ? (
        <p className="text-xs text-muted-foreground">
          Hiển thị {sortedSheets.length}/{published.length} bài
          {searchQuery && <span> · Tìm: &quot;{searchQuery}&quot;</span>}
          {filterGrade !== 'all' && <span> · Loại: {filterGrade}</span>}
        </p>
      ) : null}

      {/* ====== TABLE VIEW ====== */}
      {resultView === 'table' && (
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left p-3 font-bold text-foreground">STT</th>
                  <th className="text-left p-3 font-bold text-foreground">Ảnh</th>
                  <th className="text-left p-3 font-bold text-foreground">Họ tên</th>
                  <th className="text-center p-3 font-bold text-foreground">SBD</th>
                  <th className="text-center p-3 font-bold text-foreground">Mã đề</th>
                  <th className="text-center p-3 font-bold text-foreground">P.I</th>
                  <th className="text-center p-3 font-bold text-foreground">P.II</th>
                  <th className="text-center p-3 font-bold text-foreground">P.III</th>
                  {answerKey.essayQuestions.length > 0 && <th className="text-center p-3 font-bold text-foreground">TL</th>}
                  <th className="text-right p-3 font-bold text-foreground">Tổng</th>
                  <th className="text-right p-3 font-bold text-foreground">%</th>
                  <th className="text-center p-3 font-bold text-foreground">Loại</th>
                  <th className="text-center p-3 font-bold text-foreground">Dò</th>
                </tr>
              </thead>
              <tbody>
                {sortedSheets.map((s, i) => {
                  const pct = s.maxScore > 0 ? Math.round((s.totalScore / s.maxScore) * 100) : 0;
                  const grade = pct >= 90 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : pct >= 30 ? 'D' : 'F';
                  const gradeColor = grade === 'A' ? 'text-emerald-500' : grade === 'B' ? 'text-blue-500' : grade === 'C' ? 'text-yellow-500' : grade === 'D' ? 'text-orange-500' : 'text-red-500';
                  const p1 = getPart1Stats(s);
                  const p2 = getPart2Stats(s);
                  const p3 = getPart3Stats(s);
                  const essayTotal = answerKey.essayQuestions.reduce((sum, eq) => sum + (s.essayScores[eq.id] || 0), 0);
                  const essayMax = answerKey.essayQuestions.reduce((sum, eq) => sum + eq.maxScore, 0);
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--primary)/0.02)] transition-colors">
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {s.preview && (
                            <img
                              src={s.preview}
                              alt=""
                              className="w-8 h-8 rounded object-cover border border-rose-300 dark:border-rose-700 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setLightboxImg(s.preview)}
                            />
                          )}
                          {s.backPreview && (
                            <img
                              src={s.backPreview}
                              alt=""
                              className="w-8 h-8 rounded object-cover border border-blue-300 dark:border-blue-700 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setLightboxImg(s.backPreview)}
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-foreground">{s.studentName || 'Noname'}</td>
                      <td className="p-3 text-center text-muted-foreground font-mono text-xs">{s.studentId || '—'}</td>
                      <td className="p-3 text-center text-purple-600 dark:text-purple-400 font-mono text-xs font-bold">{s.examCode || '—'}</td>
                      <td className="p-3 text-center text-xs">
                        <span className={p1.correct === p1.total ? 'text-emerald-500 font-bold' : 'text-foreground'}>
                          {p1.correct}/{p1.total}
                        </span>
                      </td>
                      <td className="p-3 text-center text-xs">{p2.score}/{p2.total}</td>
                      <td className="p-3 text-center text-xs">{p3.correct}/{p3.total}</td>
                      {answerKey.essayQuestions.length > 0 && (
                        <td className="p-3 text-center text-xs">{essayTotal}/{essayMax}</td>
                      )}
                      <td className="p-3 text-right font-bold text-foreground">{s.totalScore}/{s.maxScore}</td>
                      <td className="p-3 text-right font-semibold text-foreground">{pct}%</td>
                      <td className={`p-3 text-center font-black text-base ${gradeColor}`}>{grade}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => { setResultView('cards'); setExpandedResultId(s.id); }}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          title="Dò bài chi tiết"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ====== CARD VIEW (with images + answer detail for dò bài) ====== */}
      {resultView === 'cards' && (
        <div className="space-y-4">
          {sortedSheets.map((sheet, sIdx) => {
            const pct = sheet.maxScore > 0 ? Math.round((sheet.totalScore / sheet.maxScore) * 100) : 0;
            const grade = pct >= 90 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : pct >= 30 ? 'D' : 'F';
            const gradeColor = grade === 'A' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' :
                               grade === 'B' ? 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' :
                               grade === 'C' ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                               grade === 'D' ? 'text-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' :
                               'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
            const isExpanded = expandedResultId === sheet.id;
            const p1 = getPart1Stats(sheet);
            const p2 = getPart2Stats(sheet);
            const p3 = getPart3Stats(sheet);

            return (
              <GlassCard key={sheet.id} className="!p-0 overflow-hidden">
                {/* Card header: student info + score + images preview */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[hsl(var(--primary)/0.02)] transition-colors"
                  onClick={() => setExpandedResultId(isExpanded ? null : sheet.id)}
                >
                  {/* Rank badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${gradeColor}`}>
                    {grade}
                  </div>

                  {/* Thumbnails */}
                  <div className="flex gap-1.5 shrink-0">
                    {sheet.preview ? (
                      <img
                        src={sheet.preview}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border-2 border-rose-200 dark:border-rose-800 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={e => { e.stopPropagation(); setLightboxImg(sheet.preview); }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center border border-rose-200 dark:border-rose-800">
                        <FileText className="w-5 h-5 text-rose-300" />
                      </div>
                    )}
                    {sheet.backPreview ? (
                      <img
                        src={sheet.backPreview}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border-2 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={e => { e.stopPropagation(); setLightboxImg(sheet.backPreview); }}
                      />
                    ) : answerKey.essayQuestions.length > 0 ? (
                      <div className="w-12 h-12 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-center border border-dashed border-blue-200 dark:border-blue-800">
                        <AlertCircle className="w-4 h-4 text-blue-300" />
                      </div>
                    ) : null}
                  </div>

                  {/* Student info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {sheet.studentName || 'Noname'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono">SBD: {sheet.studentId || '—'}</span>
                      {sheet.examCode && <span className="text-[10px] text-purple-500 font-mono font-bold">Mã đề: {sheet.examCode}</span>}
                      <span className="text-[10px] text-rose-500 font-semibold">I: {p1.correct}/{p1.total}</span>
                      <span className="text-[10px] text-rose-500 font-semibold">II: {p2.score}/{p2.total}</span>
                      <span className="text-[10px] text-rose-500 font-semibold">III: {p3.correct}/{p3.total}</span>
                      {answerKey.essayQuestions.length > 0 && (
                        <span className="text-[10px] text-blue-500 font-semibold">
                          TL: {answerKey.essayQuestions.reduce((s, eq) => s + (sheet.essayScores[eq.id] || 0), 0)}/{answerKey.essayQuestions.reduce((s, eq) => s + eq.maxScore, 0)}
                        </span>
                      )}
                      {sheet.overrides.size > 0 && (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">{sheet.overrides.size} sửa</span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-black ${pct >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {sheet.totalScore}<span className="text-sm font-normal text-muted-foreground">/{sheet.maxScore}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{pct}%</p>
                  </div>

                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
                </div>

                {/* ====== EXPANDED: Full detail for dò bài ====== */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Images side by side — large */}
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Image className="w-4 h-4" /> Ảnh phiếu trả lời
                        </h4>
                        <div className="flex items-center gap-3">
                          {showOverlay && (
                            <div className="flex items-center gap-2 text-[9px] font-medium text-muted-foreground">
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-emerald-400/25 inline-block" /> Đúng</span>
                              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-red-400/25 inline-block" /> Sai (hiện đáp án đúng)</span>
                            </div>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); setShowOverlay(!showOverlay); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                              showOverlay
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {showOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {showOverlay ? 'Đáp án: BẬT' : 'Đáp án: TẮT'}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sheet.preview && (
                          <div>
                            <p className="text-[10px] font-bold text-rose-500 mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-500" /> Mặt trước — Trắc nghiệm
                            </p>
                            <div className="max-h-[600px] overflow-auto rounded-xl border-2 border-rose-200 dark:border-rose-800">
                              <div className="relative cursor-pointer" onClick={() => setLightboxImg(sheet.preview)}>
                                <img
                                  src={sheet.preview}
                                  alt="Mặt trước"
                                  className="w-full h-auto block rounded-xl hover:shadow-xl transition-shadow bg-card dark:bg-zinc-900"
                                />
                                {showOverlay && <AnswerOverlay answerKey={answerKey} sheet={sheet} />}
                              </div>
                            </div>
                          </div>
                        )}
                        {sheet.backPreview ? (
                          <div>
                            <p className="text-[10px] font-bold text-blue-500 mb-1.5 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500" /> Mặt sau — Tự luận
                            </p>
                            <img
                              src={sheet.backPreview}
                              alt="Mặt sau"
                              className="w-full max-h-[500px] object-contain rounded-xl border-2 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-xl transition-shadow bg-card dark:bg-zinc-900"
                              onClick={() => setLightboxImg(sheet.backPreview)}
                            />
                            <button
                              className="mt-1 text-[10px] text-blue-400 hover:text-blue-500 underline underline-offset-2"
                              onClick={() => {
                                setPendingBackId(sheet.id);
                                backInputRef.current?.click();
                              }}
                            >
                              Đổi ảnh mặt sau
                            </button>
                          </div>
                        ) : (
                          <div
                            className="min-h-[200px] border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all"
                            onClick={() => {
                              setPendingBackId(sheet.id);
                              backInputRef.current?.click();
                            }}
                          >
                            <Camera className="w-8 h-8 text-blue-400 mb-2" />
                            <span className="text-sm font-semibold text-blue-400">Đính kèm mặt sau</span>
                            <span className="text-xs text-blue-300 mt-0.5">(bài tự luận)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Part I: Answer grid comparison */}
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded">PHẦN I</span>
                          Trắc nghiệm — {p1.correct}/{p1.total} đúng ({p1.total > 0 ? Math.round((p1.correct / p1.total) * 100) : 0}%)
                        </h4>
                        <span className="text-xs font-bold text-foreground">{(p1.correct * 0.25).toFixed(2)}đ / {(p1.total * 0.25).toFixed(2)}đ</span>
                      </div>
                      <div className="grid grid-cols-10 gap-1">
                        {Array.from({ length: 40 }, (_, i) => i + 1).map(q => {
                          const detected = sheet.detectedAnswers[q];
                          const correct = answerKey.part1[q];
                          const isCorrect = detected === correct;
                          const isOverridden = sheet.overrides.has(q);
                          return (
                            <div key={q} className={`text-center rounded-lg p-0.5 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20' : detected !== null ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                                <span className="text-[9px] font-bold text-muted-foreground">{q}</span>
                                {isOverridden && <Edit3 className="w-2 h-2 text-amber-500" />}
                              </div>
                              <div className="flex flex-col items-center gap-[1px]">
                                {(['A', 'B', 'C', 'D'] as const).map(opt => {
                                  const isDetected = detected === opt;
                                  const isAnswer = correct === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => overridePart1(sheet.id, q, opt)}
                                      className={`w-[18px] h-[18px] rounded-full text-[8px] font-bold border transition-all
                                        ${isDetected && isAnswer ? 'bg-emerald-500 border-emerald-500 text-white' :
                                          isDetected && !isAnswer ? 'bg-red-500 border-red-500 text-white' :
                                          !isDetected && isAnswer ? 'bg-transparent border-emerald-400 text-emerald-500 ring-1 ring-emerald-300' :
                                          'border-border text-muted-foreground hover:border-[hsl(var(--primary)/0.5)]'
                                        }`}
                                      title={isAnswer ? `Đáp án đúng: ${opt}` : ''}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Đúng</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Sai</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-emerald-400 inline-block" /> Đáp án</span>
                        <span className="flex items-center gap-1"><Edit3 className="w-3 h-3 text-amber-500" /> GV đã sửa</span>
                      </div>
                    </div>

                    {/* Part II comparison */}
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded">PHẦN II</span>
                          Đúng/Sai — {p2.score}/{p2.total}đ
                        </h4>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {Array.from({ length: 8 }, (_, i) => i + 1).map(q => (
                          <div key={q} className="border border-border rounded-lg overflow-hidden">
                            <div className="bg-rose-50 dark:bg-rose-950/20 text-center text-[10px] font-bold py-1 text-rose-600 dark:text-rose-400">Câu {q}</div>
                            <div className="p-1.5 space-y-0.5">
                              {(['a', 'b', 'c', 'd'] as const).map(sub => {
                                const detected = sheet.detectedPart2[q]?.[sub];
                                const correct = answerKey.part2[q]?.[sub];
                                const isCorrect = detected === correct;
                                return (
                                  <div key={sub} className="flex items-center gap-1">
                                    <span className="text-[9px] font-semibold text-muted-foreground w-3">{sub})</span>
                                    <button
                                      onClick={() => overridePart2(sheet.id, q, sub, true)}
                                      className={`w-[22px] h-[22px] rounded-full text-[8px] font-bold border transition-all
                                        ${detected === true && correct === true ? 'bg-emerald-500 border-emerald-500 text-white' :
                                          detected === true && correct !== true ? 'bg-red-500 border-red-500 text-white' :
                                          detected !== true && correct === true ? 'border-emerald-400 text-emerald-500 ring-1 ring-emerald-300' :
                                          'border-border text-muted-foreground hover:border-rose-400'
                                        }`}
                                    >Đ</button>
                                    <button
                                      onClick={() => overridePart2(sheet.id, q, sub, false)}
                                      className={`w-[22px] h-[22px] rounded-full text-[8px] font-bold border transition-all
                                        ${detected === false && correct === false ? 'bg-emerald-500 border-emerald-500 text-white' :
                                          detected === false && correct !== false ? 'bg-red-500 border-red-500 text-white' :
                                          detected !== false && correct === false ? 'border-emerald-400 text-emerald-500 ring-1 ring-emerald-300' :
                                          'border-border text-muted-foreground hover:border-rose-400'
                                        }`}
                                    >S</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Part III comparison */}
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded">PHẦN III</span>
                          Trả lời ngắn — {p3.correct}/{p3.total} đúng
                        </h4>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {Array.from({ length: 6 }, (_, i) => i + 1).map(q => {
                          const detected = sheet.detectedPart3[q] || '';
                          const correct = answerKey.part3[q] || '';
                          const isCorrect = detected.trim() === correct.trim() && correct.length > 0;
                          return (
                            <div key={q} className={`border rounded-lg p-2 ${isCorrect ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10' : detected && correct ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' : 'border-border'}`}>
                              <p className="text-[10px] font-bold text-muted-foreground mb-1">Câu {q}</p>
                              <input
                                type="text"
                                value={detected}
                                onChange={e => overridePart3(sheet.id, q, e.target.value)}
                                className="w-full px-2 py-1 rounded border border-border bg-[hsl(var(--background))] text-sm text-center font-mono font-bold text-foreground outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                              />
                              {correct && (
                                <p className={`text-[9px] mt-1 text-center ${isCorrect ? 'text-emerald-500' : 'text-red-400'}`}>
                                  ĐA: {correct} {isCorrect ? '✓' : '✗'}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Essay section */}
                    {answerKey.essayQuestions.length > 0 && (
                      <div className="p-4 border-b border-border">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                          <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded">TỰ LUẬN</span>
                          {answerKey.essayQuestions.length} câu —
                          {answerKey.essayQuestions.reduce((s, eq) => s + (sheet.essayScores[eq.id] || 0), 0)}/
                          {answerKey.essayQuestions.reduce((s, eq) => s + eq.maxScore, 0)}đ
                        </h4>

                        {/* Show back image inline for reference */}
                        {sheet.backPreview && (
                          <div className="mb-3 p-3 bg-blue-50/30 dark:bg-blue-950/10 rounded-xl border border-blue-100 dark:border-blue-900">
                            <p className="text-[10px] font-bold text-blue-500 mb-2 flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Ảnh bài tự luận (mặt sau) — tham khảo khi dò bài
                            </p>
                            <img
                              src={sheet.backPreview}
                              alt="Bài tự luận"
                              className="w-full max-h-[350px] object-contain rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-shadow bg-card dark:bg-zinc-900"
                              onClick={() => setLightboxImg(sheet.backPreview)}
                            />
                          </div>
                        )}

                        <div className="space-y-3">
                          {answerKey.essayQuestions.map((eq, eIdx) => (
                            <div key={eq.id} className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
                              <div className="bg-blue-50/80 dark:bg-blue-950/30 px-3 py-2 flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">Câu {eIdx + 1}</span>
                                  <span className="text-[11px] text-muted-foreground ml-2 truncate">{eq.questionText}</span>
                                </div>
                                <span className="text-[10px] font-bold text-blue-500 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded shrink-0 ml-2">
                                  {sheet.essayScores[eq.id] || 0}/{eq.maxScore}đ
                                </span>
                              </div>
                              <div className="p-3 space-y-2">
                                {(eq.sampleAnswer || eq.rubric) && (
                                  <div className="bg-blue-50/50 dark:bg-blue-950/10 rounded-lg p-2 text-[11px] text-muted-foreground">
                                    {eq.sampleAnswer && <p><span className="font-bold">Đáp án mẫu:</span> {eq.sampleAnswer}</p>}
                                    {eq.rubric && <p className="mt-1 whitespace-pre-wrap"><span className="font-bold">Rubric:</span> {eq.rubric}</p>}
                                  </div>
                                )}
                                <div className="flex items-center gap-3">
                                  <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Điểm:</label>
                                  <div className="flex items-center border border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => updateEssayScore(sheet.id, eq.id, Math.max(0, (sheet.essayScores[eq.id] || 0) - 0.25))}
                                      className="px-2 py-1 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                    >−</button>
                                    <input
                                      type="number"
                                      value={sheet.essayScores[eq.id] || 0}
                                      onChange={e => updateEssayScore(sheet.id, eq.id, Math.min(eq.maxScore, Math.max(0, parseFloat(e.target.value) || 0)))}
                                      step={0.25}
                                      min={0}
                                      max={eq.maxScore}
                                      className="w-16 text-center text-sm font-bold text-blue-600 dark:text-blue-400 bg-transparent outline-none border-x border-blue-300 dark:border-blue-700 py-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateEssayScore(sheet.id, eq.id, Math.min(eq.maxScore, (sheet.essayScores[eq.id] || 0) + 0.25))}
                                      className="px-2 py-1 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                    >+</button>
                                  </div>
                                  <span className="text-xs text-muted-foreground">/ {eq.maxScore}đ</span>
                                </div>
                                {sheet.essayNotes[eq.id] && (
                                  <p className="text-[11px] text-muted-foreground italic bg-zinc-50 dark:bg-zinc-900/50 rounded-lg px-2.5 py-1.5">
                                    💬 {sheet.essayNotes[eq.id]}
                                  </p>
                                )}
                                <input
                                  type="text"
                                  value={sheet.essayNotes[eq.id] || ''}
                                  onChange={e => updateEssayNote(sheet.id, eq.id, e.target.value)}
                                  placeholder="Ghi chú cho học sinh..."
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-[hsl(var(--background))] text-xs text-foreground outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-zinc-400"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between p-4 bg-[hsl(var(--card)/0.5)]">
                      <div className="text-sm text-muted-foreground">
                        Tổng: <span className="font-bold text-lg text-foreground">{sheet.totalScore}/{sheet.maxScore}</span>
                        <span className="ml-2">({pct}%)</span>
                        <span className={`ml-2 font-black text-lg ${grade === 'A' ? 'text-emerald-500' : grade === 'B' ? 'text-blue-500' : grade === 'C' ? 'text-yellow-500' : grade === 'D' ? 'text-orange-500' : 'text-red-500'}`}>
                          Xếp loại: {grade}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* No results found */}
      {sortedSheets.length === 0 && (searchQuery || filterGrade !== 'all') && (
        <GlassCard>
          <div className="text-center py-8">
            <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-foreground font-semibold">Không tìm thấy kết quả</p>
            <p className="text-sm text-muted-foreground mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            <button
              onClick={() => { setSearchQuery(''); setFilterGrade('all'); }}
              className="text-sm text-purple-600 font-semibold mt-2 hover:underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ===================== ANSWER OVERLAY =====================
// Renders correct answers as colored marks on top of the scanned image.
// Positions are fractions (0–100) within the SHEET content area (bounded by timing marks).
// sheetBounds maps the sheet area onto the full image.

const OVL_PART1 = {
  yStart: 26.8, yEnd: 56.5, rows: 10,
  groups: [
    { q0: 1,  A: 7.8, B: 11.8, C: 15.5, D: 19.5 },
    { q0: 11, A: 31.0, B: 35.0, C: 39.0, D: 42.8 },
    { q0: 21, A: 54.8, B: 58.8, C: 62.5, D: 66.5 },
    { q0: 31, A: 78.5, B: 82.5, C: 86.2, D: 90.2 },
  ],
};

function sheetToImage(
  sheetPct: number,
  boundsStart: number,
  boundsEnd: number,
): number {
  const span = boundsEnd - boundsStart;
  return boundsStart + (sheetPct / 100) * span;
}

function AnswerOverlay({
  answerKey,
  sheet,
  className = '',
}: {
  answerKey: AnswerKey;
  sheet?: ScannedSheet | null;
  className?: string;
}) {
  const b = sheet?.sheetBounds ?? { left: 0, top: 0, right: 100, bottom: 100 };
  const p1 = OVL_PART1;
  const rowStep = p1.rows > 1 ? (p1.yEnd - p1.yStart) / (p1.rows - 1) : 0;

  const marks: { x: number; y: number; label: string; correct: boolean; student: string | null }[] = [];

  for (const g of p1.groups) {
    for (let r = 0; r < p1.rows; r++) {
      const q = g.q0 + r;
      const correctAns = answerKey.part1[q];
      if (!correctAns) continue;
      const relY = p1.yStart + r * rowStep;
      const relX = (g as any)[correctAns] as number;
      const x = sheetToImage(relX, b.left, b.right);
      const y = sheetToImage(relY, b.top, b.bottom);
      const studentAns = sheet?.detectedAnswers[q] || null;
      const isCorrect = studentAns === correctAns;
      marks.push({ x, y, label: correctAns, correct: isCorrect, student: studentAns });
    }
  }

  const markW = (b.right - b.left) * 0.028;
  const markH = (b.bottom - b.top) * 0.018;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {marks.map((m, i) => (
        <div
          key={i}
          className="absolute flex items-center justify-center"
          style={{
            left: `${m.x}%`,
            top: `${m.y}%`,
            transform: 'translate(-50%, -50%)',
            width: `${markW}%`,
            height: `${markH}%`,
          }}
        >
          {m.correct ? (
            <div className="w-full h-full rounded-full border-2 border-emerald-500 bg-emerald-400/25" />
          ) : (
            <div className="w-full h-full rounded-full border-2 border-red-500 bg-red-400/25 flex items-center justify-center">
              <span className="text-[0.55em] font-black text-red-600 leading-none">{m.label}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ===================== MAIN COMPONENT =====================

export default function ScanGrading({
  savedKeys = [],
  selectedKeyIdx = 0,
  setSelectedKeyIdx = () => {},
  onSwitchToAnswerKey = () => {},
}: {
  savedKeys?: AnswerKey[];
  selectedKeyIdx?: number;
  setSelectedKeyIdx?: (idx: number) => void;
  onSwitchToAnswerKey?: () => void;
}) {
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const backBulkRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [draggingBack, setDraggingBack] = useState(false);
  const [sheets, setSheets] = useState<ScannedSheet[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'scan' | 'review' | 'results'>('scan');
  // Track which sheet is awaiting back-side photo
  const [pendingBackId, setPendingBackId] = useState<string | null>(null);
  // Lightbox for viewing scanned images
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [lightboxSheet, setLightboxSheet] = useState<ScannedSheet | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  const openLightbox = (img: string, sheet?: ScannedSheet | null) => {
    setLightboxImg(img);
    setLightboxSheet(sheet && img === sheet.preview ? sheet : null);
  };

  const answerKey = (savedKeys ?? [])[selectedKeyIdx ?? 0];
  const [loadedKeyId, setLoadedKeyId] = useState<string | null>(null);

  // Load previously graded sheets from DB when answer key changes
  useEffect(() => {
    if (!answerKey?.dbId || answerKey.dbId === loadedKeyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/grading/graded-sheets?answerKeyId=${answerKey.dbId}`);
        if (!res.ok || cancelled) return;
        const { sheets: dbSheets } = await res.json();
        if (cancelled || !Array.isArray(dbSheets) || dbSheets.length === 0) return;

        const loaded: ScannedSheet[] = dbSheets.map((d: any) => ({
          id: d.id,
          dbId: d.id,
          fileName: d.frontImageUrl?.split('/').pop() || 'saved',
          preview: d.frontImageUrl ? `/api/grading/file/${d.frontImageUrl.replace('/uploads/grading/', '')}` : '',
          backPreview: d.backImageUrl ? `/api/grading/file/${d.backImageUrl.replace('/uploads/grading/', '')}` : '',
          backFileName: d.backImageUrl?.split('/').pop() || '',
          frontImageUrl: d.frontImageUrl,
          backImageUrl: d.backImageUrl,
          status: (d.status || 'scanned') as 'scanning' | 'scanned' | 'error',
          studentName: d.studentName || '',
          studentId: d.studentId || '',
          examCode: d.examCode || '',
          detectedAnswers: d.detectedAnswers ?? {},
          detectedPart2: d.detectedPart2 ?? {},
          detectedPart3: d.detectedPart3 ?? {},
          essayScores: d.essayScores ?? {},
          essayNotes: d.essayNotes ?? {},
          overrides: new Set<number>(Array.isArray(d.overrides) ? d.overrides : []),
          totalScore: d.totalScore ?? 0,
          maxScore: d.maxScore ?? 10,
          reviewed: d.reviewed ?? false,
          published: d.published ?? false,
        }));

        setSheets(prev => {
          // Merge: keep any new unsaved sheets and add loaded ones that aren't duplicates
          const existingDbIds = new Set(prev.filter(s => s.dbId).map(s => s.dbId));
          const newFromDb = loaded.filter(l => !existingDbIds.has(l.dbId));
          return newFromDb.length > 0 ? [...prev, ...newFromDb] : prev;
        });
        if (loaded.some(s => s.published)) {
          setIsPublished(true);
          setViewMode('results');
        }
        setLoadedKeyId(answerKey.dbId!);
      } catch (err) {
        console.error('Failed to load graded sheets:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [answerKey?.dbId, loadedKeyId]);

  // ===== File handling (front side - trắc nghiệm) =====
  const recognizeSheet = useCallback(async (file: File, sheetId: string) => {
    if (!answerKey) return;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/grading/recognize', { method: 'POST', body: formData });
      const json = await res.json();

      if (!res.ok || !json.success) throw new Error(json.error || 'Recognition failed');

      const d = json.data;
      const answers: Record<number, 'A' | 'B' | 'C' | 'D' | null> = {};
      for (const [k, v] of Object.entries(d.part1 || {})) {
        answers[Number(k)] = v as 'A' | 'B' | 'C' | 'D' | null;
      }

      const p2: Record<number, Record<string, boolean | null>> = {};
      for (const [k, v] of Object.entries(d.part2 || {})) {
        p2[Number(k)] = v as Record<string, boolean | null>;
      }

      const p3: Record<number, string> = {};
      for (const [k, v] of Object.entries(d.part3 || {})) {
        p3[Number(k)] = String(v);
      }

      const emptyEssay: Record<string, number> = {};
      answerKey.essayQuestions.forEach(eq => { emptyEssay[eq.id] = 0; });

      const { score, maxScore } = gradeAgainstKey(answers, p2, p3, emptyEssay, answerKey);

      setSheets(prev => prev.map(s => s.id === sheetId ? {
        ...s,
        status: 'scanned' as const,
        studentName: d.studentName || '',
        studentId: d.studentId || '',
        examCode: d.examCode || '',
        sheetBounds: d.sheetBounds || undefined,
        detectedAnswers: answers,
        detectedPart2: p2,
        detectedPart3: p3,
        essayScores: emptyEssay,
        essayNotes: {},
        totalScore: score,
        maxScore,
      } : s));
    } catch (err: any) {
      console.error('Recognition error:', err);
      // Fallback to simulated scan
      const result = simulateScan(answerKey);
      const emptyEssay: Record<string, number> = {};
      answerKey.essayQuestions.forEach(eq => { emptyEssay[eq.id] = 0; });
      const { score, maxScore } = gradeAgainstKey(result.answers, result.part2, result.part3, emptyEssay, answerKey);
      setSheets(prev => prev.map(s => s.id === sheetId ? {
        ...s,
        status: 'scanned' as const,
        studentName: result.name,
        studentId: result.sid,
        examCode: '',
        detectedAnswers: result.answers,
        detectedPart2: result.part2,
        detectedPart3: result.part3,
        essayScores: emptyEssay,
        essayNotes: {},
        totalScore: score,
        maxScore,
      } : s));
    }
  }, [answerKey]);

  const addFrontFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || !answerKey) return;
    const accepted = Array.from(fileList).filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );

    const newSheets: ScannedSheet[] = accepted.map(f => {
      const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
      return {
        id,
        fileName: f.name,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
        backPreview: '',
        backFileName: '',
        frontFile: f,
        status: 'scanning' as const,
        studentName: '',
        studentId: '',
        examCode: '',
        detectedAnswers: {},
        detectedPart2: {},
        detectedPart3: {},
        essayScores: {},
        essayNotes: {},
        overrides: new Set<number>(),
        totalScore: 0,
        maxScore: 0,
        reviewed: false,
        published: false,
      };
    });

    setSheets(prev => [...prev, ...newSheets]);

    // Real OMR recognition via API
    newSheets.forEach((sheet, i) => {
      const file = accepted[i];
      if (file && file.type.startsWith('image/')) {
        void recognizeSheet(file, sheet.id);
      } else {
        // PDF or unsupported: fallback to simulated scan
        setTimeout(() => {
          const result = simulateScan(answerKey);
          const emptyEssay: Record<string, number> = {};
          answerKey.essayQuestions.forEach(eq => { emptyEssay[eq.id] = 0; });
          const { score, maxScore } = gradeAgainstKey(result.answers, result.part2, result.part3, emptyEssay, answerKey);
          setSheets(prev => prev.map(s => s.id === sheet.id ? {
            ...s,
            status: 'scanned' as const,
            studentName: result.name,
            studentId: result.sid,
            examCode: '',
            detectedAnswers: result.answers,
            detectedPart2: result.part2,
            detectedPart3: result.part3,
            essayScores: emptyEssay,
            essayNotes: {},
            totalScore: score,
            maxScore,
          } : s));
        }, 800);
      }
    });
  }, [answerKey, recognizeSheet]);

  // ===== Add back-side photo (mặt sau - tự luận) =====
  const addBackPhoto = useCallback((sheetId: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    const backUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : '';
    setSheets(prev => prev.map(s =>
      s.id === sheetId ? { ...s, backPreview: backUrl, backFileName: f.name, backFile: f } : s
    ));
    setPendingBackId(null);
  }, []);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFrontFiles(e.dataTransfer.files);
  };

  const handleDropBack = useCallback((e: DragEvent, sheetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingBack(false);
    addBackPhoto(sheetId, e.dataTransfer.files);
  }, [addBackPhoto]);

  // Bulk add back-side photos — auto-assign to sheets without backPreview in order
  const addBackFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const accepted = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (accepted.length === 0) return;

    setSheets(prev => {
      const sheetsWithoutBack = prev
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !s.backPreview);

      const updated = [...prev];
      accepted.forEach((file, fileIdx) => {
        if (fileIdx < sheetsWithoutBack.length) {
          const { i } = sheetsWithoutBack[fileIdx];
          const backUrl = URL.createObjectURL(file);
          updated[i] = {
            ...updated[i],
            backPreview: backUrl,
            backFileName: file.name,
            backFile: file,
          };
        }
      });
      return updated;
    });
  }, []);

  const removeSheet = useCallback((id: string) => {
    setSheets(prev => {
      const s = prev.find(x => x.id === id);
      if (s?.preview) URL.revokeObjectURL(s.preview);
      if (s?.backPreview) URL.revokeObjectURL(s.backPreview);
      return prev.filter(x => x.id !== id);
    });
    if (expandedSheet === id) setExpandedSheet(null);
  }, [expandedSheet]);

  // ===== Answer override =====
  const overridePart1 = useCallback((sheetId: string, q: number, ans: 'A' | 'B' | 'C' | 'D') => {
    setSheets(prev => prev.map(s => {
      if (s.id !== sheetId) return s;
      const newAnswers = { ...s.detectedAnswers, [q]: s.detectedAnswers[q] === ans ? null : ans };
      const newOverrides = new Set(s.overrides);
      newOverrides.add(q);
      const { score, maxScore } = gradeAgainstKey(newAnswers, s.detectedPart2, s.detectedPart3, s.essayScores, answerKey);
      return { ...s, detectedAnswers: newAnswers, overrides: newOverrides, totalScore: score, maxScore };
    }));
  }, [answerKey]);

  const overridePart2 = useCallback((sheetId: string, q: number, sub: string, val: boolean) => {
    setSheets(prev => prev.map(s => {
      if (s.id !== sheetId) return s;
      const newP2 = { ...s.detectedPart2, [q]: { ...s.detectedPart2[q], [sub]: s.detectedPart2[q]?.[sub] === val ? null : val } };
      const { score, maxScore } = gradeAgainstKey(s.detectedAnswers, newP2, s.detectedPart3, s.essayScores, answerKey);
      return { ...s, detectedPart2: newP2, totalScore: score, maxScore };
    }));
  }, [answerKey]);

  const overridePart3 = useCallback((sheetId: string, q: number, val: string) => {
    setSheets(prev => prev.map(s => {
      if (s.id !== sheetId) return s;
      const newP3 = { ...s.detectedPart3, [q]: val };
      const { score, maxScore } = gradeAgainstKey(s.detectedAnswers, s.detectedPart2, newP3, s.essayScores, answerKey);
      return { ...s, detectedPart3: newP3, totalScore: score, maxScore };
    }));
  }, [answerKey]);

  const updateEssayScore = useCallback((sheetId: string, eqId: string, score: number) => {
    setSheets(prev => prev.map(s => {
      if (s.id !== sheetId) return s;
      const newScores = { ...s.essayScores, [eqId]: score };
      const { score: total, maxScore } = gradeAgainstKey(s.detectedAnswers, s.detectedPart2, s.detectedPart3, newScores, answerKey);
      return { ...s, essayScores: newScores, totalScore: total, maxScore };
    }));
  }, [answerKey]);

  const updateEssayNote = useCallback((sheetId: string, eqId: string, note: string) => {
    setSheets(prev => prev.map(s =>
      s.id === sheetId ? { ...s, essayNotes: { ...s.essayNotes, [eqId]: note } } : s
    ));
  }, []);

  const updateStudentName = useCallback((sheetId: string, name: string) => {
    setSheets(prev => prev.map(s => s.id === sheetId ? { ...s, studentName: name } : s));
  }, []);

  const markReviewed = useCallback((sheetId: string) => {
    setSheets(prev => prev.map(s => s.id === sheetId ? { ...s, reviewed: true } : s));
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  const uploadSheetImage = useCallback(async (
    file: File | undefined,
    side: 'front' | 'back',
    answerKeyId: string,
  ): Promise<string | null> => {
    if (!file) return null;
    try {
      const form = new FormData();
      form.append('files', file);
      form.append('side', side);
      form.append('answerKeyId', answerKeyId);
      const res = await fetch('/api/grading/upload', { method: 'POST', body: form });
      if (!res.ok) return null;
      const { uploaded } = await res.json();
      return uploaded?.[0]?.url ?? null;
    } catch { return null; }
  }, []);

  const publishAll = useCallback(async () => {
    const updatedSheets = sheets.map(s => ({
      ...s,
      studentName: s.studentName.trim() || 'Noname',
      published: true,
      reviewed: true,
    }));
    setSheets(updatedSheets);
    setIsPublished(true);
    setViewMode('results');

    const currentKey = (savedKeys ?? [])[selectedKeyIdx ?? 0];
    if (!currentKey?.dbId) {
      console.warn('Answer key has no dbId — graded sheets will not be saved to DB.');
      return;
    }

    setIsSaving(true);
    try {
      // Upload images in parallel for each sheet
      const uploadResults = await Promise.all(
        updatedSheets.map(async (s) => {
          const [frontUrl, backUrl] = await Promise.all([
            uploadSheetImage(s.frontFile, 'front', currentKey.dbId!),
            uploadSheetImage(s.backFile, 'back', currentKey.dbId!),
          ]);
          return { sheetId: s.id, frontUrl, backUrl };
        })
      );

      const urlMap = new Map(uploadResults.map(r => [r.sheetId, r]));

      const payload = updatedSheets.map(s => {
        const urls = urlMap.get(s.id);
        const pct = s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0;
        let gradeLabel = 'F';
        if (pct >= 90) gradeLabel = 'A';
        else if (pct >= 70) gradeLabel = 'B';
        else if (pct >= 50) gradeLabel = 'C';
        else if (pct >= 30) gradeLabel = 'D';
        return {
          answerKeyId: currentKey.dbId,
          studentName: s.studentName,
          studentId: s.studentId,
          frontImageUrl: urls?.frontUrl || s.frontImageUrl || null,
          backImageUrl: urls?.backUrl || s.backImageUrl || null,
          detectedAnswers: s.detectedAnswers,
          detectedPart2: s.detectedPart2,
          detectedPart3: s.detectedPart3,
          essayScores: s.essayScores,
          essayNotes: s.essayNotes,
          overrides: Array.from(s.overrides),
          totalScore: s.totalScore,
          maxScore: s.maxScore,
          percentage: pct,
          gradeLabel,
          reviewed: true,
          published: true,
          status: s.status,
        };
      });

      const res = await fetch('/api/grading/graded-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets: payload }),
      });

      if (res.ok) {
        const { sheets: dbSheets } = await res.json();
        // Update local sheets with DB ids and image URLs
        setSheets(prev => prev.map(s => {
          const dbSheet = dbSheets?.find((d: any) =>
            d.studentId === s.studentId && d.studentName === s.studentName
          );
          const urls = urlMap.get(s.id);
          return dbSheet ? {
            ...s,
            dbId: dbSheet.id,
            frontImageUrl: urls?.frontUrl || s.frontImageUrl,
            backImageUrl: urls?.backUrl || s.backImageUrl,
          } : s;
        }));
      }
    } catch (err) {
      console.error('Failed to save graded sheets to DB:', err);
    } finally {
      setIsSaving(false);
    }
  }, [sheets, savedKeys, selectedKeyIdx, uploadSheetImage]);

  const recalcAll = useCallback(() => {
    if (!answerKey) return;
    setSheets(prev => prev.map(s => {
      const { score, maxScore } = gradeAgainstKey(s.detectedAnswers, s.detectedPart2, s.detectedPart3, s.essayScores, answerKey);
      return { ...s, totalScore: score, maxScore, studentName: s.studentName.trim() || 'Noname' };
    }));
  }, [answerKey]);

  // ===== Stats =====
  const scannedCount = sheets.filter(s => s.status === 'scanned').length;
  const reviewedCount = sheets.filter(s => s.reviewed).length;
  const scanningCount = sheets.filter(s => s.status === 'scanning').length;

  if (savedKeys.length === 0) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-foreground font-semibold">Chưa có đáp án nào</p>
          <p className="text-muted-foreground text-sm mt-1">
            Vui lòng vào tab &quot;Nhập đáp án&quot; để tạo đáp án trước khi chấm bài.
          </p>
          <button
            onClick={onSwitchToAnswerKey}
            className="ai-button-primary text-white px-5 py-2 rounded-xl font-semibold mt-4 inline-flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Nhập đáp án
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Key selector */}
      <GlassCard>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Quét & Chấm phiếu trả lời</h2>
              <p className="text-xs text-muted-foreground">Upload ảnh phiếu trả lời → Quét tự động → So sánh đáp án → Giáo viên đánh giá</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">Đáp án:</label>
            <select
              value={selectedKeyIdx}
              onChange={e => setSelectedKeyIdx(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-border bg-[hsl(var(--background))] text-foreground text-sm"
            >
              {savedKeys.map((k, i) => (
                <option key={i} value={i}>
                  {k.examName || `Đề #${i + 1}`} — Mã {k.examCode || '?'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          {[
            { key: 'scan' as const, label: 'Upload & Quét', icon: Upload, count: scanningCount > 0 ? scanningCount : undefined },
            { key: 'review' as const, label: 'Đánh giá', icon: Eye, count: scannedCount - reviewedCount > 0 ? scannedCount - reviewedCount : undefined },
            { key: 'results' as const, label: 'Kết quả', icon: CheckCircle, count: isPublished ? sheets.length : undefined },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all
                ${viewMode === tab.key
                  ? 'bg-[hsl(var(--primary))] text-white shadow-md'
                  : 'bg-[hsl(var(--card))] text-foreground hover:bg-purple-50 dark:hover:bg-purple-950/20 border border-border'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${viewMode === tab.key ? 'bg-card/20' : 'bg-[hsl(var(--primary)/0.15)] text-purple-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        {sheets.length > 0 && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <AIBadge variant={scanningCount > 0 ? 'warning' : 'success'}>
              {scanningCount > 0 ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
              Đã nhận diện: {scannedCount}/{sheets.length}
            </AIBadge>
            <AIBadge variant={reviewedCount === scannedCount && scannedCount > 0 ? 'success' : 'default'}>
              Đã duyệt: {reviewedCount}/{scannedCount}
            </AIBadge>
            {isPublished && <AIBadge className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Đã công bố</AIBadge>}
          </div>
        )}
      </GlassCard>

      {/* ====== VIEW: SCAN / UPLOAD ====== */}
      {viewMode === 'scan' && (
        <>
          {/* Drop zone - Mặt trước (trắc nghiệm) */}
          <GlassCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Upload phiếu trả lời trắc nghiệm</h3>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-rose-500">Mặt trước:</span> Phiếu trắc nghiệm (Phần I, II, III) —
                  <span className="font-semibold text-blue-500 ml-1">Mặt sau:</span> Bài tự luận (đính kèm sau)
                </p>
              </div>
            </div>

            {/* Diagram showing front/back */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Front side upload */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => frontInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                  ${dragging
                    ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 scale-[1.01]'
                    : 'border-rose-200 dark:border-rose-800 hover:border-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-950/10'
                  }`}
              >
                <input
                  ref={frontInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { addFrontFiles(e.target.files); e.target.value = ''; }}
                />
                <div className="bg-rose-100 dark:bg-rose-900/30 w-16 h-20 mx-auto mb-3 rounded-lg border-2 border-rose-300 dark:border-rose-700 flex flex-col items-center justify-center relative">
                  <span className="text-[8px] font-black text-rose-500 uppercase">Phiếu TN</span>
                  <div className="flex gap-[2px] mt-1">
                    {[1,2,3,4].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full border border-rose-400" />)}
                  </div>
                  <div className="flex gap-[2px] mt-0.5">
                    {[1,2,3,4].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full border border-rose-400" />)}
                  </div>
                  <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[7px] font-bold px-1 rounded">MẶT TRƯỚC</span>
                </div>
                <p className="text-foreground font-semibold">
                  {dragging ? 'Thả vào đây...' : 'Mặt trước — Trắc nghiệm'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kéo thả hoặc nhấn chọn ảnh phiếu (nhiều phiếu)
                </p>
                <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> Chụp</span>
                  <span className="flex items-center gap-1"><Image className="w-3 h-3" /> JPG/PNG</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>
                </div>
              </div>

              {/* Back side upload */}
              <div
                onDragOver={e => { e.preventDefault(); setDraggingBack(true); }}
                onDragLeave={() => setDraggingBack(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDraggingBack(false);
                  addBackFiles(e.dataTransfer.files);
                }}
                onClick={() => backBulkRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                  ${draggingBack
                    ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]'
                    : 'border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/10'
                  }`}
              >
                <input
                  ref={backBulkRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { addBackFiles(e.target.files); e.target.value = ''; }}
                />
                <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-20 mx-auto mb-3 rounded-lg border-2 border-blue-300 dark:border-blue-700 flex flex-col items-center justify-center relative">
                  <span className="text-[8px] font-black text-blue-500 uppercase">Tự luận</span>
                  <div className="mt-1 space-y-0.5">
                    <div className="w-8 h-[2px] bg-blue-300 rounded" />
                    <div className="w-6 h-[2px] bg-blue-300 rounded" />
                    <div className="w-7 h-[2px] bg-blue-300 rounded" />
                  </div>
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[7px] font-bold px-1 rounded">MẶT SAU</span>
                </div>
                <p className="text-foreground font-semibold">
                  {draggingBack ? 'Thả vào đây...' : 'Mặt sau — Tự luận'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kéo thả hoặc nhấn chọn ảnh mặt sau (nhiều ảnh)
                </p>
                {(() => {
                  const sheetsWithoutBack = sheets.filter(s => !s.backPreview).length;
                  return sheetsWithoutBack > 0 ? (
                    <p className="text-[10px] text-blue-500 mt-2 font-medium">
                      {sheetsWithoutBack} phiếu chưa có ảnh mặt sau — ảnh sẽ tự gán theo thứ tự
                    </p>
                  ) : sheets.length > 0 ? (
                    <p className="text-[10px] text-emerald-500 mt-2 font-medium">
                      ✓ Tất cả phiếu đã có ảnh mặt sau
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Upload mặt trước trước, rồi đính kèm mặt sau
                    </p>
                  );
                })()}
                <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> Chụp</span>
                  <span className="flex items-center gap-1"><Image className="w-3 h-3" /> JPG/PNG</span>
                </div>
              </div>
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-amber-600 dark:text-amber-400">Hướng dẫn:</p>
                <p className="mt-0.5">1. Upload ảnh <strong>mặt trước</strong> (phiếu trắc nghiệm) — hệ thống tự quét đáp án</p>
                <p>2. Đính kèm ảnh <strong>mặt sau</strong> (bài tự luận) cho từng phiếu ở danh sách bên dưới</p>
                <p>3. Giáo viên <strong>duyệt & chấm tự luận</strong> → Công bố kết quả</p>
              </div>
            </div>
          </GlassCard>

          {/* Scanned sheets list */}
          {sheets.length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">
                  Phiếu đã upload ({sheets.length})
                </h3>
                <div className="flex gap-2">
                  {scannedCount > 0 && (
                    <button
                      onClick={() => setViewMode('review')}
                      className="px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Đánh giá ({scannedCount})
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {sheets.map((sheet, idx) => (
                  <div key={sheet.id} className={`rounded-xl border overflow-hidden transition-all
                    ${sheet.status === 'scanned' && sheet.reviewed ? 'border-emerald-300 dark:border-emerald-700' :
                      sheet.status === 'scanned' ? 'border-blue-300 dark:border-blue-700' :
                      sheet.status === 'scanning' ? 'border-yellow-300 dark:border-yellow-700' :
                      'border-red-300 dark:border-red-700'
                    }`}
                  >
                    <div className={`flex items-center gap-3 p-3
                      ${sheet.status === 'scanned' && sheet.reviewed ? 'bg-emerald-50/30 dark:bg-emerald-950/10' :
                        sheet.status === 'scanned' ? 'bg-blue-50/20 dark:bg-blue-950/10' :
                        sheet.status === 'scanning' ? 'bg-yellow-50/20 dark:bg-yellow-950/10' :
                        'bg-red-50/20 dark:bg-red-950/10'
                      }`}
                    >
                      {/* Front preview thumbnail */}
                      <div className="flex gap-2 shrink-0">
                        {sheet.preview ? (
                          <div className="relative cursor-pointer" onClick={() => setLightboxImg(sheet.preview)}>
                            <img src={sheet.preview} alt="" className="w-14 h-14 rounded-lg object-cover border-2 border-rose-300 dark:border-rose-700" />
                            <span className="absolute -top-1 -left-1 bg-rose-500 text-white text-[6px] font-bold px-1 rounded">TRƯỚC</span>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center border-2 border-rose-200 dark:border-rose-800">
                            <FileText className="w-5 h-5 text-rose-400" />
                          </div>
                        )}

                        {/* Back preview or add button */}
                        {sheet.backPreview ? (
                          <div className="relative cursor-pointer" onClick={() => setLightboxImg(sheet.backPreview)}>
                            <img src={sheet.backPreview} alt="" className="w-14 h-14 rounded-lg object-cover border-2 border-blue-300 dark:border-blue-700" />
                            <span className="absolute -top-1 -left-1 bg-blue-500 text-white text-[6px] font-bold px-1 rounded">SAU</span>
                          </div>
                        ) : (
                          <div
                            className="w-14 h-14 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-all relative"
                            onClick={() => {
                              setPendingBackId(sheet.id);
                              backInputRef.current?.click();
                            }}
                          >
                            <Camera className="w-4 h-4 text-blue-400" />
                            <span className="text-[6px] font-bold text-blue-400 mt-0.5">MẶT SAU</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{sheet.fileName}</p>
                          {sheet.status === 'scanning' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin shrink-0" />}
                          {sheet.status === 'scanned' && !sheet.reviewed && <span className="text-[10px] font-bold text-blue-500 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded shrink-0">Cần duyệt</span>}
                          {sheet.reviewed && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sheet.status === 'scanning' && 'Đang nhận diện phiếu trả lời...'}
                          {sheet.status === 'scanned' && (
                            <>
                              <span className="font-medium">{sheet.studentName || 'Chưa rõ tên'}</span>
                              <span className="mx-1">·</span>
                              SBD: {sheet.studentId || '—'}
                              {sheet.examCode && <><span className="mx-1">·</span><span className="text-purple-500 font-bold">Mã đề: {sheet.examCode}</span></>}
                              <span className="mx-1">·</span>
                              <span className="font-bold">{sheet.totalScore}/{sheet.maxScore}đ</span>
                              {!sheet.backPreview && answerKey?.essayQuestions.length > 0 && (
                                <span className="ml-1 text-amber-500 font-medium">⚠ Chưa đính kèm mặt sau</span>
                              )}
                            </>
                          )}
                          {sheet.status === 'error' && 'Lỗi quét phiếu'}
                        </p>
                        {sheet.backFileName && (
                          <p className="text-[10px] text-blue-500 mt-0.5">📎 Mặt sau: {sheet.backFileName}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sheet.status === 'scanned' && (
                          <button
                            onClick={() => { setExpandedSheet(sheet.id); setViewMode('review'); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Xem
                          </button>
                        )}
                        <button
                          onClick={() => removeSheet(sheet.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-[hsl(var(--destructive)/0.1)] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </GlassCard>
          )}
        </>
      )}

      {/* ====== VIEW: REVIEW ====== */}
      {viewMode === 'review' && (
        <>
          {sheets.filter(s => s.status === 'scanned').length === 0 ? (
            <GlassCard>
              <div className="text-center py-8">
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-foreground font-semibold">Chưa có phiếu nào được quét</p>
                <p className="text-sm text-muted-foreground mt-1">Upload ảnh phiếu trả lời ở tab &quot;Upload & Quét&quot;</p>
                <button onClick={() => setViewMode('scan')} className="ai-button-primary text-white px-5 py-2.5 rounded-xl font-semibold mt-3 text-sm shadow-sm transition-all hover:shadow-[0_0_30px_rgba(120,100,255,0.35)]">
                  <Upload className="w-4 h-4 inline mr-1" /> Upload phiếu
                </button>
              </div>
            </GlassCard>
          ) : (
            <>
              {/* Action bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-muted-foreground">
                  Kiểm tra đáp án đã quét, sửa nếu cần, chấm tự luận, rồi công bố kết quả
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={recalcAll}
                    className="ai-button text-foreground px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 border border-border hover:border-purple-200 transition-all"
                  >
                    <Sparkles className="w-4 h-4" /> Tính lại điểm
                  </button>
                  <button
                    onClick={publishAll}
                    disabled={isSaving}
                    className="ai-button-primary text-white px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm transition-all hover:shadow-[0_0_30px_rgba(0,210,180,0.35)] disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSaving ? 'Đang lưu...' : 'Công bố & Lưu kết quả'}
                  </button>
                </div>
              </div>

              {/* Student sheets */}
              <div className="space-y-4">
                {sheets.filter(s => s.status === 'scanned').map((sheet, sIdx) => {
                  const isExpanded = expandedSheet === sheet.id;
                  return (
                    <GlassCard key={sheet.id} className={`!p-0 overflow-hidden ${sheet.reviewed ? 'ring-2 ring-emerald-400/30' : ''}`}>
                      {/* Sheet header */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[hsl(var(--primary)/0.03)] transition-colors"
                        onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${sheet.reviewed ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                          {sIdx + 1}
                        </div>

                        {sheet.preview && (
                          <img src={sheet.preview} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" />
                        )}

                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={sheet.studentName}
                            onChange={e => { e.stopPropagation(); updateStudentName(sheet.id, e.target.value); }}
                            onClick={e => e.stopPropagation()}
                            placeholder="Nhập tên (để trống = Noname)"
                            className="w-full text-sm font-semibold text-foreground bg-transparent border-b border-dashed border-border outline-none focus:border-[hsl(var(--primary))] py-0.5"
                          />
                          <p className="text-xs text-muted-foreground mt-0.5">
                            SBD: {sheet.studentId || '—'}
                            {sheet.examCode && <span className="ml-1.5 text-purple-500 font-bold">Mã đề: {sheet.examCode}</span>}
                            <span className="ml-1.5">· {sheet.fileName}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {sheet.overrides.size > 0 && (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                              {sheet.overrides.size} sửa
                            </span>
                          )}
                          {sheet.reviewed ? (
                            <AIBadge className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Đã duyệt</AIBadge>
                          ) : (
                            <AIBadge variant="warning"><AlertTriangle className="w-3 h-3 mr-1" /> Chưa duyệt</AIBadge>
                          )}
                          <span className={`text-xl font-bold ${sheet.maxScore > 0 && sheet.totalScore / sheet.maxScore >= 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                            {sheet.totalScore}/{sheet.maxScore}
                          </span>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-border">
                          {/* Front & Back images */}
                          <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/30">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Image className="w-4 h-4" /> Ảnh phiếu
                              </h4>
                              <button
                                onClick={e => { e.stopPropagation(); setShowOverlay(!showOverlay); }}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                                  showOverlay
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {showOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                Đáp án
                              </button>
                            </div>
                            <div className="flex gap-4 flex-wrap">
                              {sheet.preview ? (
                                <div className="relative group">
                                  <p className="text-[10px] font-bold text-rose-500 mb-1">🔴 Mặt trước (Trắc nghiệm)</p>
                                  <div className="relative inline-block">
                                    <img
                                      src={sheet.preview}
                                      alt="Mặt trước"
                                      className="w-48 h-auto block rounded-lg border-2 border-rose-300 dark:border-rose-700 cursor-pointer hover:shadow-lg transition-shadow"
                                      onClick={() => setLightboxImg(sheet.preview)}
                                    />
                                    {showOverlay && answerKey && <AnswerOverlay answerKey={answerKey} sheet={sheet} />}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-48 min-h-[120px] border-2 border-dashed border-rose-300 dark:border-rose-700 rounded-lg flex flex-col items-center justify-center">
                                  <FileText className="w-6 h-6 text-rose-300 mb-1" />
                                  <span className="text-xs text-rose-300">Không có ảnh mặt trước</span>
                                </div>
                              )}
                              {sheet.backPreview ? (
                                <div className="relative group">
                                  <p className="text-[10px] font-bold text-blue-500 mb-1">🔵 Mặt sau (Tự luận)</p>
                                  <img
                                    src={sheet.backPreview}
                                    alt="Mặt sau"
                                    className="w-48 h-auto rounded-lg border-2 border-blue-300 dark:border-blue-700 cursor-pointer hover:shadow-lg transition-shadow"
                                    onClick={() => setLightboxImg(sheet.backPreview)}
                                  />
                                  <button
                                    className="mt-1 text-[10px] text-blue-400 hover:text-blue-500 underline underline-offset-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPendingBackId(sheet.id);
                                      backInputRef.current?.click();
                                    }}
                                  >
                                    Đổi ảnh mặt sau
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="w-48 min-h-[120px] border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all"
                                  onClick={() => {
                                    setPendingBackId(sheet.id);
                                    backInputRef.current?.click();
                                  }}
                                >
                                  <Camera className="w-6 h-6 text-blue-400 mb-1" />
                                  <span className="text-xs font-semibold text-blue-400">Đính kèm mặt sau</span>
                                  <span className="text-[10px] text-blue-300">(bài tự luận)</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Part I comparison */}
                          <div className="p-4 border-b border-border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded">PHẦN I</span>
                                Trắc nghiệm (40 câu · 0.25đ/câu)
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                Đúng: {(() => {
                                  let c = 0;
                                  for (let q = 1; q <= 40; q++) {
                                    if (answerKey.part1[q] !== null && sheet.detectedAnswers[q] === answerKey.part1[q]) c++;
                                  }
                                  return c;
                                })()}/40
                              </span>
                            </div>

                            <div className="grid grid-cols-10 gap-1">
                              {Array.from({ length: 40 }, (_, i) => i + 1).map(q => {
                                const detected = sheet.detectedAnswers[q];
                                const correct = answerKey.part1[q];
                                const isCorrect = detected === correct;
                                const isOverridden = sheet.overrides.has(q);
                                return (
                                  <div key={q} className={`text-center rounded-lg p-0.5 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20' : detected !== null ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                                    <div className="flex items-center justify-center gap-0.5 mb-0.5">
                                      <span className="text-[9px] font-bold text-muted-foreground">{q}</span>
                                      {isOverridden && <Edit3 className="w-2 h-2 text-amber-500" />}
                                    </div>
                                    <div className="flex flex-col items-center gap-[1px]">
                                      {(['A', 'B', 'C', 'D'] as const).map(opt => {
                                        const isDetected = detected === opt;
                                        const isAnswer = correct === opt;
                                        return (
                                          <button
                                            key={opt}
                                            type="button"
                                            onClick={() => overridePart1(sheet.id, q, opt)}
                                            className={`w-[18px] h-[18px] rounded-full text-[8px] font-bold border transition-all
                                              ${isDetected && isAnswer ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                isDetected && !isAnswer ? 'bg-red-500 border-red-500 text-white' :
                                                !isDetected && isAnswer ? 'bg-transparent border-emerald-400 text-emerald-500 ring-1 ring-emerald-300' :
                                                'border-border text-muted-foreground hover:border-[hsl(var(--primary)/0.5)]'
                                              }`}
                                            title={isAnswer ? `Đáp án đúng: ${opt}` : ''}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Đúng</span>
                              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Sai</span>
                              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-emerald-400 inline-block" /> Đáp án</span>
                            </div>
                          </div>

                          {/* Part II comparison */}
                          <div className="p-4 border-b border-border">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded">PHẦN II</span>
                              Đúng/Sai (8 câu × 4 ý)
                            </h4>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                              {Array.from({ length: 8 }, (_, i) => i + 1).map(q => (
                                <div key={q} className="border border-border rounded-lg overflow-hidden">
                                  <div className="bg-rose-50 dark:bg-rose-950/20 text-center text-[10px] font-bold py-1 text-rose-600 dark:text-rose-400">Câu {q}</div>
                                  <div className="p-1.5 space-y-0.5">
                                    {(['a', 'b', 'c', 'd'] as const).map(sub => {
                                      const detected = sheet.detectedPart2[q]?.[sub];
                                      const correct = answerKey.part2[q]?.[sub];
                                      const isCorrect = detected === correct;
                                      return (
                                        <div key={sub} className="flex items-center gap-1">
                                          <span className="text-[9px] font-semibold text-muted-foreground w-3">{sub})</span>
                                          <button
                                            onClick={() => overridePart2(sheet.id, q, sub, true)}
                                            className={`w-[22px] h-[22px] rounded-full text-[8px] font-bold border transition-all
                                              ${detected === true && correct === true ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                detected === true && correct !== true ? 'bg-red-500 border-red-500 text-white' :
                                                detected !== true && correct === true ? 'border-emerald-400 text-emerald-500 ring-1 ring-emerald-300' :
                                                'border-border text-muted-foreground hover:border-rose-400'
                                              }`}
                                          >Đ</button>
                                          <button
                                            onClick={() => overridePart2(sheet.id, q, sub, false)}
                                            className={`w-[22px] h-[22px] rounded-full text-[8px] font-bold border transition-all
                                              ${detected === false && correct === false ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                detected === false && correct !== false ? 'bg-red-500 border-red-500 text-white' :
                                                detected !== false && correct === false ? 'border-emerald-400 text-emerald-500 ring-1 ring-emerald-300' :
                                                'border-border text-muted-foreground hover:border-rose-400'
                                              }`}
                                          >S</button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Part III comparison */}
                          <div className="p-4 border-b border-border">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded">PHẦN III</span>
                              Trả lời ngắn (6 câu)
                            </h4>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                              {Array.from({ length: 6 }, (_, i) => i + 1).map(q => {
                                const detected = sheet.detectedPart3[q] || '';
                                const correct = answerKey.part3[q] || '';
                                const isCorrect = detected.trim() === correct.trim() && correct.length > 0;
                                return (
                                  <div key={q} className={`border rounded-lg p-2 ${isCorrect ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10' : detected && correct ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' : 'border-border'}`}>
                                    <p className="text-[10px] font-bold text-muted-foreground mb-1">Câu {q}</p>
                                    <input
                                      type="text"
                                      value={detected}
                                      onChange={e => overridePart3(sheet.id, q, e.target.value)}
                                      className="w-full px-2 py-1 rounded border border-border bg-[hsl(var(--background))] text-sm text-center font-mono font-bold text-foreground outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                                    />
                                    {correct && (
                                      <p className={`text-[9px] mt-1 text-center ${isCorrect ? 'text-emerald-500' : 'text-red-400'}`}>
                                        ĐA: {correct} {isCorrect ? '✓' : '✗'}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Essay grading */}
                          {answerKey.essayQuestions.length > 0 && (
                            <div className="p-4 border-b border-border">
                              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                                <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded">TỰ LUẬN</span>
                                Chấm điểm tự luận ({answerKey.essayQuestions.length} câu)
                              </h4>
                              <div className="space-y-3">
                                {answerKey.essayQuestions.map((eq, eIdx) => (
                                  <div key={eq.id} className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
                                    <div className="bg-blue-50/80 dark:bg-blue-950/30 px-3 py-2 flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">Câu {eIdx + 1}</span>
                                        <span className="text-[11px] text-muted-foreground ml-2 truncate">{eq.questionText}</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-blue-500 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded shrink-0 ml-2">
                                        Tối đa: {eq.maxScore}đ
                                      </span>
                                    </div>
                                    <div className="p-3 space-y-2">
                                      {/* Sample answer / rubric preview */}
                                      {(eq.sampleAnswer || eq.rubric) && (
                                        <div className="bg-blue-50/50 dark:bg-blue-950/10 rounded-lg p-2 text-[11px] text-muted-foreground">
                                          {eq.sampleAnswer && <p><span className="font-bold">Đáp án mẫu:</span> {eq.sampleAnswer}</p>}
                                          {eq.rubric && <p className="mt-1 whitespace-pre-wrap"><span className="font-bold">Rubric:</span> {eq.rubric}</p>}
                                        </div>
                                      )}
                                      {/* Score input */}
                                      <div className="flex items-center gap-3">
                                        <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Điểm:</label>
                                        <div className="flex items-center border border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => updateEssayScore(sheet.id, eq.id, Math.max(0, (sheet.essayScores[eq.id] || 0) - 0.25))}
                                            className="px-2 py-1 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                          >−</button>
                                          <input
                                            type="number"
                                            value={sheet.essayScores[eq.id] || 0}
                                            onChange={e => updateEssayScore(sheet.id, eq.id, Math.min(eq.maxScore, Math.max(0, parseFloat(e.target.value) || 0)))}
                                            step={0.25}
                                            min={0}
                                            max={eq.maxScore}
                                            className="w-16 text-center text-sm font-bold text-blue-600 dark:text-blue-400 bg-transparent outline-none border-x border-blue-300 dark:border-blue-700 py-1"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => updateEssayScore(sheet.id, eq.id, Math.min(eq.maxScore, (sheet.essayScores[eq.id] || 0) + 0.25))}
                                            className="px-2 py-1 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                          >+</button>
                                        </div>
                                        <span className="text-xs text-muted-foreground">/ {eq.maxScore}đ</span>
                                      </div>
                                      {/* Teacher note */}
                                      <input
                                        type="text"
                                        value={sheet.essayNotes[eq.id] || ''}
                                        onChange={e => updateEssayNote(sheet.id, eq.id, e.target.value)}
                                        placeholder="Ghi chú cho học sinh..."
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-[hsl(var(--background))] text-xs text-foreground outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-zinc-400"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Footer actions */}
                          <div className="flex items-center justify-between p-4 bg-[hsl(var(--card)/0.5)]">
                            <div className="text-sm text-muted-foreground">
                              Tổng: <span className="font-bold text-foreground">{sheet.totalScore}/{sheet.maxScore}</span>
                              <span className="ml-2">({sheet.maxScore > 0 ? Math.round((sheet.totalScore / sheet.maxScore) * 100) : 0}%)</span>
                            </div>
                            <div className="flex gap-2">
                              {!sheet.reviewed && (
                                <button
                                  onClick={() => markReviewed(sheet.id)}
                                  className="px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" /> Xác nhận duyệt
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ====== VIEW: RESULTS ====== */}
      {viewMode === 'results' && (
        <ResultsView
          sheets={sheets}
          answerKey={answerKey}
          isPublished={isPublished}
          setIsPublished={setIsPublished}
          setSheets={setSheets}
          setViewMode={setViewMode}
          setLightboxImg={setLightboxImg}
          overridePart1={overridePart1}
          overridePart2={overridePart2}
          overridePart3={overridePart3}
          updateEssayScore={updateEssayScore}
          updateEssayNote={updateEssayNote}
          updateStudentName={updateStudentName}
          recalcAll={recalcAll}
          publishAll={publishAll}
          isSaving={isSaving}
          setPendingBackId={setPendingBackId}
          backInputRef={backInputRef}
          showOverlay={showOverlay}
          setShowOverlay={setShowOverlay}
        />
      )}
      {/* Hidden input for back-side photos — always rendered */}
      <input
        ref={backInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (pendingBackId) addBackPhoto(pendingBackId, e.target.files);
          e.target.value = '';
        }}
      />

      {/* ====== LIGHTBOX ====== */}
      {lightboxImg && (() => {
        const lbSheet = sheets.find(s => s.preview === lightboxImg) || null;
        const isFront = !!lbSheet;
        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxImg(null)}
          >
            <div className="relative max-w-4xl" onClick={e => e.stopPropagation()}>
              <div className="relative inline-block">
                <img
                  src={lightboxImg}
                  alt="Phóng to"
                  className="max-w-full max-h-[90vh] h-auto rounded-lg shadow-2xl"
                />
                {isFront && showOverlay && answerKey && (
                  <AnswerOverlay answerKey={answerKey} sheet={lbSheet} />
                )}
              </div>
              {/* Overlay toggle */}
              {isFront && answerKey && (
                <button
                  onClick={() => setShowOverlay(!showOverlay)}
                  className={`absolute top-3 left-3 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shadow-lg transition-all ${
                    showOverlay
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {showOverlay ? 'Đáp án: BẬT' : 'Đáp án: TẮT'}
                </button>
              )}
              <button
                onClick={() => setLightboxImg(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-card dark:bg-zinc-800 shadow-lg flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
