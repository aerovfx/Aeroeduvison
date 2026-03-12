"use client";

import "@/styles/neumorphic-theme.css";
import { useState, useEffect } from "react";
import { Settings, Brain, Calendar, BarChart3, FileQuestion, Briefcase, Save, Loader2 } from "lucide-react";
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
        body: JSON.stringify({
          "ai-tutor": aiTutor,
          "study-planner": studyPlanner,
        }),
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
      <div className="flex items-center justify-center min-h-[60vh]" style={{ color: "var(--neu-text-secondary)" }}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-full"
      style={{
        background: "linear-gradient(135deg, var(--neu-bg-gradient-start) 0%, var(--neu-bg-gradient-mid) 50%, var(--neu-bg-gradient-end) 100%)",
      }}
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div
          className="flex items-center gap-4 mb-8"
          style={{
            background: "var(--neu-card-bg)",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light)",
            border: "1px solid var(--neu-border)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "6px 6px 12px rgba(102, 126, 234, 0.4), -4px -4px 8px var(--neu-shadow-light)",
            }}
          >
            <Settings className="h-7 w-7" style={{ color: "var(--neu-text-inverse)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--neu-text-primary)" }}>
              Cài đặt Agents
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--neu-text-secondary)" }}>
              Tùy chỉnh Trợ lý học tập, Kế hoạch học và các agent khác
            </p>
          </div>
        </div>

        {/* AI Tutor - Trợ lý học tập */}
        <section
          className="mb-8"
          style={{
            background: "var(--neu-card-bg)",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light)",
            border: "1px solid var(--neu-border)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              style={{
                width: "44px",
                height: "44px",
                background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Brain className="h-5 w-5" style={{ color: "var(--neu-text-inverse)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--neu-text-primary)" }}>
                Gia Sư AI (Trợ lý học tập)
              </h2>
              <p className="text-sm" style={{ color: "var(--neu-text-secondary)" }}>
                Độ sâu giải thích, độ khó, phong cách học
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--neu-text-secondary)" }}>
                Độ sâu giải thích
              </label>
              <select
                value={aiTutor.explanationDepth}
                onChange={(e) => setAiTutor((p) => ({ ...p, explanationDepth: e.target.value as typeof p.explanationDepth }))}
                style={{
                  width: "100%",
                  background: "var(--neu-input-bg)",
                  border: "1px solid var(--neu-border)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: "var(--neu-text-primary)",
                  boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                }}
              >
                <option value="short">Ngắn gọn</option>
                <option value="medium">Vừa phải</option>
                <option value="detailed">Chi tiết</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--neu-text-secondary)" }}>
                Độ khó mặc định
              </label>
              <select
                value={aiTutor.difficulty}
                onChange={(e) => setAiTutor((p) => ({ ...p, difficulty: e.target.value as typeof p.difficulty }))}
                style={{
                  width: "100%",
                  background: "var(--neu-input-bg)",
                  border: "1px solid var(--neu-border)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: "var(--neu-text-primary)",
                  boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                }}
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--neu-text-secondary)" }}>
                Phong cách học
              </label>
              <select
                value={aiTutor.learningStyle}
                onChange={(e) => setAiTutor((p) => ({ ...p, learningStyle: e.target.value as typeof p.learningStyle }))}
                style={{
                  width: "100%",
                  background: "var(--neu-input-bg)",
                  border: "1px solid var(--neu-border)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: "var(--neu-text-primary)",
                  boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                }}
              >
                <option value="visual">Trực quan</option>
                <option value="auditory">Nghe</option>
                <option value="kinesthetic">Thực hành</option>
                <option value="mixed">Kết hợp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--neu-text-secondary)" }}>
                Môn mặc định
              </label>
              <select
                value={aiTutor.defaultSubject}
                onChange={(e) => setAiTutor((p) => ({ ...p, defaultSubject: e.target.value }))}
                style={{
                  width: "100%",
                  background: "var(--neu-input-bg)",
                  border: "1px solid var(--neu-border)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: "var(--neu-text-primary)",
                  boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                }}
              >
                <option value="Toán">Toán</option>
                <option value="Lý">Vật Lý</option>
                <option value="Hóa">Hóa Học</option>
                <option value="Sinh">Sinh Học</option>
                <option value="Văn">Ngữ Văn</option>
                <option value="Anh">Tiếng Anh</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="socratic"
                checked={aiTutor.useSocraticMethod}
                onChange={(e) => setAiTutor((p) => ({ ...p, useSocraticMethod: e.target.checked }))}
                style={{ accentColor: "var(--neu-accent-primary)" }}
              />
              <label htmlFor="socratic" className="text-sm font-medium" style={{ color: "var(--neu-text-primary)" }}>
                Dùng phương pháp Socratic (hỏi gợi mở thay vì đưa đáp án ngay)
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--neu-text-secondary)" }}>
                Nhiệt độ AI (0–1): {aiTutor.temperature}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={aiTutor.temperature}
                onChange={(e) => setAiTutor((p) => ({ ...p, temperature: parseFloat(e.target.value) }))}
                style={{ width: "100%", accentColor: "var(--neu-accent-primary)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--neu-text-secondary)" }}>
                Số token tối đa: {aiTutor.maxTokens}
              </label>
              <input
                type="number"
                min={512}
                max={4096}
                step={256}
                value={aiTutor.maxTokens}
                onChange={(e) => setAiTutor((p) => ({ ...p, maxTokens: parseInt(e.target.value, 10) || 2048 }))}
                style={{
                  width: "100%",
                  background: "var(--neu-input-bg)",
                  border: "1px solid var(--neu-border)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: "var(--neu-text-primary)",
                  boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                }}
              />
            </div>
          </div>
        </section>

        {/* Study Planner */}
        <section
          className="mb-8"
          style={{
            background: "var(--neu-card-bg)",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light)",
            border: "1px solid var(--neu-border)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              style={{
                width: "44px",
                height: "44px",
                background: "linear-gradient(135deg, var(--neu-accent-success) 0%, #38a169 100%)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar className="h-5 w-5" style={{ color: "white" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--neu-text-primary)" }}>
                Trợ lý Kế hoạch học (Study Planner)
              </h2>
              <p className="text-sm" style={{ color: "var(--neu-text-secondary)" }}>
                Giờ nhắc học, mục tiêu mỗi ngày
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--neu-text-secondary)" }}>
                Giờ nhắc học mỗi ngày
              </label>
              <input
                type="time"
                value={studyPlanner.reminderTime}
                onChange={(e) => setStudyPlanner((p) => ({ ...p, reminderTime: e.target.value }))}
                style={{
                  width: "100%",
                  background: "var(--neu-input-bg)",
                  border: "1px solid var(--neu-border)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: "var(--neu-text-primary)",
                  boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--neu-text-secondary)" }}>
                Mục tiêu học mỗi ngày (phút)
              </label>
              <input
                type="number"
                min={30}
                max={480}
                step={15}
                value={studyPlanner.dailyGoalMinutes}
                onChange={(e) => setStudyPlanner((p) => ({ ...p, dailyGoalMinutes: parseInt(e.target.value, 10) || 120 }))}
                style={{
                  width: "100%",
                  background: "var(--neu-input-bg)",
                  border: "1px solid var(--neu-border)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: "var(--neu-text-primary)",
                  boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--neu-text-secondary)" }}>
                Nhắc trước giờ học (phút)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={studyPlanner.reminderBeforeMinutes}
                onChange={(e) => setStudyPlanner((p) => ({ ...p, reminderBeforeMinutes: parseInt(e.target.value, 10) || 30 }))}
                style={{
                  width: "100%",
                  background: "var(--neu-input-bg)",
                  border: "1px solid var(--neu-border)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  color: "var(--neu-text-primary)",
                  boxShadow: "inset 4px 4px 8px var(--neu-shadow-inset-dark), inset -4px -4px 8px var(--neu-shadow-inset-light)",
                }}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="weekdays"
                checked={studyPlanner.weekdaysOnly}
                onChange={(e) => setStudyPlanner((p) => ({ ...p, weekdaysOnly: e.target.checked }))}
                style={{ accentColor: "var(--neu-accent-primary)" }}
              />
              <label htmlFor="weekdays" className="text-sm font-medium" style={{ color: "var(--neu-text-primary)" }}>
                Chỉ nhắc vào ngày thường (thứ 2 – thứ 6)
              </label>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, var(--neu-accent-primary) 0%, var(--neu-accent-secondary) 100%)",
              boxShadow: "8px 8px 16px rgba(102, 126, 234, 0.4), -6px -6px 12px var(--neu-shadow-light)",
            }}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
