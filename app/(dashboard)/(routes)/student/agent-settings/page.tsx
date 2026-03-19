"use client";

import { useState, useEffect } from "react";
import { Settings, Brain, Calendar, Save, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

const DEFAULT_AI_TUTOR = {
  explanationDepth: "medium",
  difficulty: "medium",
  learningStyle: "mixed",
  defaultSubject: "Toán",
  useSocraticMethod: true,
  temperature: 0.7,
  maxTokens: 2048,
} as const;

const selectStyle = "w-full bg-black/25 backdrop-blur-sm border border-white/[0.06] rounded-xl px-3.5 py-3 text-sm text-white/85 focus:outline-none focus:border-[hsl(245,85%,65%)]/40 focus:shadow-[0_0_15px_rgba(120,100,255,0.1)] transition-all";
const inputStyle = selectStyle;
const labelStyle = "block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider";

export default function StudentAgentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [aiTutor, setAiTutor] = useState(DEFAULT_AI_TUTOR);
  const [studyPlanner, setStudyPlanner] = useState({
    reminderTime: "08:00",
    dailyGoalMinutes: 120,
    weekdaysOnly: false,
    reminderBeforeMinutes: 30,
  });

  useEffect(() => {
    fetch("/api/student/agent-settings")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Failed to load")))
      .then((data) => {
        setSettings(data.settings || {});
        const at = (data.settings || {})["ai-tutor"] as Record<string, unknown> | undefined;
        if (at) {
          setAiTutor((prev) => ({
            ...prev,
            explanationDepth: (at.explanationDepth as string) || prev.explanationDepth,
            difficulty: (at.difficulty as string) || prev.difficulty,
            learningStyle: (at.learningStyle as string) || prev.learningStyle,
            defaultSubject: (at.defaultSubject as string) || prev.defaultSubject,
            useSocraticMethod: at.useSocraticMethod !== false,
            temperature: typeof at.temperature === "number" ? at.temperature : prev.temperature,
            maxTokens: typeof at.maxTokens === "number" ? at.maxTokens : prev.maxTokens,
          }));
        }
        const sp = (data.settings || {})["study-planner"] as Record<string, unknown> | undefined;
        if (sp) {
          setStudyPlanner((prev) => ({
            reminderTime: (sp.reminderTime as string) || prev.reminderTime,
            dailyGoalMinutes: typeof sp.dailyGoalMinutes === "number" ? sp.dailyGoalMinutes : prev.dailyGoalMinutes,
            weekdaysOnly: sp.weekdaysOnly === true,
            reminderBeforeMinutes: typeof sp.reminderBeforeMinutes === "number" ? sp.reminderBeforeMinutes : prev.reminderBeforeMinutes,
          }));
        }
      })
      .catch(() => toast.error("Không tải được cài đặt"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/student/agent-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "ai-tutor": aiTutor, "study-planner": studyPlanner }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setSettings(data.settings || {});
      toast.success("Đã lưu cài đặt");
    } catch {
      toast.error("Không lưu được cài đặt");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 bg-white/[0.02] backdrop-blur-xl rounded-2xl p-6 border border-white/[0.06]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center shadow-[0_0_20px_rgba(120,100,255,0.3)]">
            <Settings className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white/90">Cài đặt Agents</h1>
            <p className="text-sm text-white/40 mt-0.5">Tùy chỉnh Trợ lý học tập, Kế hoạch học và các agent khác</p>
          </div>
        </div>

        {/* AI Tutor */}
        <section className="bg-white/[0.02] backdrop-blur-xl rounded-2xl p-7 border border-white/[0.06]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center shadow-[0_0_16px_rgba(120,100,255,0.25)]">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white/90">Gia Sư AI (Trợ lý học tập)</h2>
              <p className="text-xs text-white/40">Độ sâu giải thích, độ khó, phong cách học</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelStyle}>Độ sâu giải thích</label>
              <select value={aiTutor.explanationDepth} onChange={(e) => setAiTutor((p) => ({ ...p, explanationDepth: e.target.value as typeof p.explanationDepth }))} className={selectStyle}>
                <option value="short">Ngắn gọn</option>
                <option value="medium">Vừa phải</option>
                <option value="detailed">Chi tiết</option>
              </select>
            </div>
            <div>
              <label className={labelStyle}>Độ khó mặc định</label>
              <select value={aiTutor.difficulty} onChange={(e) => setAiTutor((p) => ({ ...p, difficulty: e.target.value as typeof p.difficulty }))} className={selectStyle}>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
            <div>
              <label className={labelStyle}>Phong cách học</label>
              <select value={aiTutor.learningStyle} onChange={(e) => setAiTutor((p) => ({ ...p, learningStyle: e.target.value as typeof p.learningStyle }))} className={selectStyle}>
                <option value="visual">Trực quan</option>
                <option value="auditory">Nghe</option>
                <option value="kinesthetic">Thực hành</option>
                <option value="mixed">Kết hợp</option>
              </select>
            </div>
            <div>
              <label className={labelStyle}>Môn mặc định</label>
              <select value={aiTutor.defaultSubject} onChange={(e) => setAiTutor((p) => ({ ...p, defaultSubject: e.target.value }))} className={selectStyle}>
                <option value="Toán">Toán</option>
                <option value="Lý">Vật Lý</option>
                <option value="Hóa">Hóa Học</option>
                <option value="Sinh">Sinh Học</option>
                <option value="Văn">Ngữ Văn</option>
                <option value="Anh">Tiếng Anh</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-2.5 py-1">
              <input
                type="checkbox"
                id="socratic"
                checked={aiTutor.useSocraticMethod}
                onChange={(e) => setAiTutor((p) => ({ ...p, useSocraticMethod: e.target.checked }))}
                className="accent-[hsl(245,85%,65%)] w-4 h-4"
              />
              <label htmlFor="socratic" className="text-sm text-white/70">
                Dùng phương pháp Socratic (hỏi gợi mở thay vì đưa đáp án ngay)
              </label>
            </div>
            <div>
              <label className={labelStyle}>Nhiệt độ AI (0-1): {aiTutor.temperature}</label>
              <input
                type="range"
                min={0} max={1} step={0.1}
                value={aiTutor.temperature}
                onChange={(e) => setAiTutor((p) => ({ ...p, temperature: parseFloat(e.target.value) }))}
                className="w-full accent-[hsl(245,85%,65%)]"
              />
            </div>
            <div>
              <label className={labelStyle}>Số token tối đa: {aiTutor.maxTokens}</label>
              <input
                type="number"
                min={512} max={4096} step={256}
                value={aiTutor.maxTokens}
                onChange={(e) => setAiTutor((p) => ({ ...p, maxTokens: parseInt(e.target.value, 10) || 2048 }))}
                className={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* Study Planner */}
        <section className="bg-white/[0.02] backdrop-blur-xl rounded-2xl p-7 border border-white/[0.06]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(175,80%,45%)] to-[hsl(160,70%,40%)] flex items-center justify-center shadow-[0_0_16px_rgba(0,210,180,0.25)]">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white/90">Trợ lý Kế hoạch học (Study Planner)</h2>
              <p className="text-xs text-white/40">Giờ nhắc học, mục tiêu mỗi ngày</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelStyle}>Giờ nhắc học mỗi ngày</label>
              <input
                type="time"
                value={studyPlanner.reminderTime}
                onChange={(e) => setStudyPlanner((p) => ({ ...p, reminderTime: e.target.value }))}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Mục tiêu học mỗi ngày (phút)</label>
              <input
                type="number"
                min={30} max={480} step={15}
                value={studyPlanner.dailyGoalMinutes}
                onChange={(e) => setStudyPlanner((p) => ({ ...p, dailyGoalMinutes: parseInt(e.target.value, 10) || 120 }))}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Nhắc trước giờ học (phút)</label>
              <input
                type="number"
                min={5} max={120}
                value={studyPlanner.reminderBeforeMinutes}
                onChange={(e) => setStudyPlanner((p) => ({ ...p, reminderBeforeMinutes: parseInt(e.target.value, 10) || 30 }))}
                className={inputStyle}
              />
            </div>
            <div className="flex items-center gap-2.5 sm:col-span-2 py-1">
              <input
                type="checkbox"
                id="weekdays"
                checked={studyPlanner.weekdaysOnly}
                onChange={(e) => setStudyPlanner((p) => ({ ...p, weekdaysOnly: e.target.checked }))}
                className="accent-[hsl(245,85%,65%)] w-4 h-4"
              />
              <label htmlFor="weekdays" className="text-sm text-white/70">
                Chỉ nhắc vào ngày thường (thứ 2 - thứ 6)
              </label>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-60 bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.35)] hover:brightness-110"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
